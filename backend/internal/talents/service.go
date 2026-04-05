package talents

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/timekit"
	"github.com/google/uuid"
)

const (
	defaultListLimit = 50
	maxListLimit     = 200
)

type Service struct {
	repo    Repository
	scraper scraperClient
}

func NewService(repo Repository, scraper scraperClient) *Service {
	return &Service{repo: repo, scraper: scraper}
}

func (s *Service) List(_ context.Context, params ListParams) (ListResponse, error) {
	params = normalizeListParams(params)

	items, err := s.repo.List(params)
	if err != nil {
		return ListResponse{}, err
	}

	total, err := s.repo.Count(params)
	if err != nil {
		return ListResponse{}, err
	}

	if items == nil {
		items = []TalentLead{}
	}

	return ListResponse{
		Items:  items,
		Total:  total,
		Limit:  params.Limit,
		Offset: params.Offset,
	}, nil
}

func (s *Service) Status(ctx context.Context) (StatusResponse, error) {
	backendStatus, err := s.repo.GetBackendStatus()
	if err != nil {
		return StatusResponse{}, err
	}

	scraperStatus, err := s.scraper.Status(ctx)
	if err != nil {
		return StatusResponse{}, err
	}

	return StatusResponse{
		Backend: backendStatus,
		Scraper: scraperStatus,
	}, nil
}

func (s *Service) Sync(ctx context.Context) (SyncResponse, error) {
	if s.scraper == nil {
		return SyncResponse{}, ErrScraperUnavailable
	}

	status, err := s.scraper.Status(ctx)
	if err != nil {
		return SyncResponse{}, err
	}
	if status.Total == 0 {
		return SyncResponse{}, ErrScraperCacheEmpty
	}

	items, err := s.scraper.News(ctx)
	if err != nil {
		return SyncResponse{}, err
	}

	uniqueItems := dedupeScraperItems(items)
	if len(uniqueItems) == 0 {
		return SyncResponse{}, ErrScraperCacheEmpty
	}

	links := make([]string, 0, len(uniqueItems))
	for _, item := range uniqueItems {
		links = append(links, item.Link)
	}

	existingLinks, err := s.repo.ExistingLinks(links)
	if err != nil {
		return SyncResponse{}, err
	}

	syncedAt := timekit.NowUTC()
	inserted := 0
	updated := 0

	for _, item := range uniqueItems {
		if err := validateScraperItem(item); err != nil {
			return SyncResponse{}, err
		}

		upsert, err := mapScraperItem(item, syncedAt)
		if err != nil {
			return SyncResponse{}, err
		}

		if err := s.repo.Upsert(upsert); err != nil {
			return SyncResponse{}, err
		}

		if _, exists := existingLinks[item.Link]; exists {
			updated++
			continue
		}
		inserted++
	}

	return SyncResponse{
		ImportedTotal:       len(uniqueItems),
		Inserted:            inserted,
		Updated:             updated,
		SyncedAt:            syncedAt.Format(time.RFC3339),
		ScraperUpdatedAtUTC: status.UpdatedAtUTC,
	}, nil
}

type HTTPClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewScraperClient(cfg *config.Config) *HTTPClient {
	if cfg == nil {
		return nil
	}

	baseURL := strings.TrimSpace(cfg.TalentParser.BaseURL)
	if baseURL == "" {
		return nil
	}

	timeout := cfg.TalentParser.RequestTimeoutSecs
	if timeout <= 0 {
		timeout = 30
	}

	return &HTTPClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: time.Duration(timeout) * time.Second,
		},
	}
}

func (c *HTTPClient) Status(ctx context.Context) (ScraperStatus, error) {
	if c == nil || c.httpClient == nil || strings.TrimSpace(c.baseURL) == "" {
		return ScraperStatus{}, ErrScraperUnavailable
	}

	var payload ScraperStatus
	if err := c.getJSON(ctx, "/status", &payload); err != nil {
		return ScraperStatus{}, err
	}
	if payload.SourcesScraped == nil {
		payload.SourcesScraped = []string{}
	}

	return payload, nil
}

func (c *HTTPClient) News(ctx context.Context) ([]scraperNewsItem, error) {
	if c == nil || c.httpClient == nil || strings.TrimSpace(c.baseURL) == "" {
		return nil, ErrScraperUnavailable
	}

	var payload []scraperNewsItem
	if err := c.getJSON(ctx, "/get_news", &payload); err != nil {
		return nil, err
	}
	if payload == nil {
		payload = []scraperNewsItem{}
	}

	return payload, nil
}

func (c *HTTPClient) getJSON(ctx context.Context, path string, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return fmt.Errorf("%w: failed to create talent scraper request: %v", ErrScraperUnavailable, err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("%w: failed to call talent scraper: %v", ErrScraperUnavailable, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("%w: failed to read talent scraper response: %v", ErrScraperUnavailable, err)
	}

	if resp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("%w: talent scraper returned status %d: %s", ErrScraperUnavailable, resp.StatusCode, strings.TrimSpace(string(body)))
	}

	if err := json.Unmarshal(body, out); err != nil {
		return fmt.Errorf("%w: failed to decode talent scraper response: %v", ErrScraperUnavailable, err)
	}

	return nil
}

func normalizeListParams(params ListParams) ListParams {
	if params.Limit <= 0 {
		params.Limit = defaultListLimit
	}
	if params.Limit > maxListLimit {
		params.Limit = maxListLimit
	}
	if params.Offset < 0 {
		params.Offset = 0
	}

	params.Source = strings.TrimSpace(params.Source)
	params.Query = strings.TrimSpace(params.Query)

	return params
}

func dedupeScraperItems(items []scraperNewsItem) []scraperNewsItem {
	byLink := make(map[string]scraperNewsItem, len(items))
	order := make([]string, 0, len(items))

	for _, item := range items {
		link := strings.TrimSpace(item.Link)
		if link == "" {
			continue
		}
		if _, exists := byLink[link]; !exists {
			order = append(order, link)
		}
		item.Link = link
		byLink[link] = item
	}

	result := make([]scraperNewsItem, 0, len(byLink))
	for _, link := range order {
		result = append(result, byLink[link])
	}

	return result
}

func validateScraperItem(item scraperNewsItem) error {
	if strings.TrimSpace(item.Link) == "" {
		return fmt.Errorf("failed to import talent lead: missing link")
	}
	if strings.TrimSpace(item.Title) == "" {
		return fmt.Errorf("failed to import talent lead %s: missing title", item.Link)
	}
	if strings.TrimSpace(item.Source) == "" {
		return fmt.Errorf("failed to import talent lead %s: missing source", item.Link)
	}

	return nil
}

func mapScraperItem(item scraperNewsItem, syncedAt time.Time) (talentLeadUpsert, error) {
	rawPayload, err := json.Marshal(item)
	if err != nil {
		return talentLeadUpsert{}, fmt.Errorf("failed to marshal talent scraper payload: %w", err)
	}

	publishedAt, rawDate := parsePublishedDate(item.Date)

	return talentLeadUpsert{
		ID:                    uuid.New(),
		Title:                 strings.TrimSpace(item.Title),
		Link:                  strings.TrimSpace(item.Link),
		Source:                strings.TrimSpace(item.Source),
		HighSchoolStudentName: trimStringPtr(item.HighSchoolStudentName),
		PublishedAt:           publishedAt,
		PublishedDateRaw:      rawDate,
		WinnerInfo:            trimStringPtr(item.WinnerInfo),
		RawPayload:            rawPayload,
		SyncedAt:              syncedAt,
	}, nil
}

func parsePublishedDate(value *string) (*time.Time, *string) {
	raw := trimStringPtr(value)
	if raw == nil {
		return nil, nil
	}

	trimmed := *raw
	layouts := []string{
		"02.01.2006",
		"2006-01-02",
		time.RFC3339,
	}

	for _, layout := range layouts {
		parsed, err := time.Parse(layout, trimmed)
		if err == nil {
			utc := parsed.UTC()
			return &utc, raw
		}
	}

	if parsed, ok := parseRussianDate(trimmed); ok {
		return &parsed, raw
	}

	return nil, raw
}

func parseRussianDate(value string) (time.Time, bool) {
	months := map[string]time.Month{
		"января":   time.January,
		"февраля":  time.February,
		"марта":    time.March,
		"апреля":   time.April,
		"мая":      time.May,
		"июня":     time.June,
		"июля":     time.July,
		"августа":  time.August,
		"сентября": time.September,
		"октября":  time.October,
		"ноября":   time.November,
		"декабря":  time.December,
	}

	parts := strings.Fields(strings.ToLower(strings.TrimSpace(value)))
	if len(parts) != 3 {
		return time.Time{}, false
	}

	day, err := time.Parse("2", parts[0])
	if err != nil {
		return time.Time{}, false
	}
	month, ok := months[parts[1]]
	if !ok {
		return time.Time{}, false
	}
	year, err := time.Parse("2006", parts[2])
	if err != nil {
		return time.Time{}, false
	}

	parsed := time.Date(year.Year(), month, day.Day(), 0, 0, 0, 0, time.UTC)
	return parsed, true
}

func trimStringPtr(value *string) *string {
	if value == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}

	return &trimmed
}
