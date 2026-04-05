package talents

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

type stubTalentRepository struct {
	listItems     []TalentLead
	countTotal    int
	backendStatus BackendStatus
	existing      map[string]struct{}
	upserts       []talentLeadUpsert
	listErr       error
	countErr      error
	statusErr     error
	existingErr   error
	upsertErr     error
}

func (r *stubTalentRepository) List(params ListParams) ([]TalentLead, error) {
	if r.listErr != nil {
		return nil, r.listErr
	}
	return r.listItems, nil
}

func (r *stubTalentRepository) Count(params ListParams) (int, error) {
	if r.countErr != nil {
		return 0, r.countErr
	}
	return r.countTotal, nil
}

func (r *stubTalentRepository) GetBackendStatus() (BackendStatus, error) {
	if r.statusErr != nil {
		return BackendStatus{}, r.statusErr
	}
	return r.backendStatus, nil
}

func (r *stubTalentRepository) ExistingLinks(links []string) (map[string]struct{}, error) {
	if r.existingErr != nil {
		return nil, r.existingErr
	}
	out := make(map[string]struct{}, len(r.existing))
	for key := range r.existing {
		out[key] = struct{}{}
	}
	return out, nil
}

func (r *stubTalentRepository) Upsert(input talentLeadUpsert) error {
	if r.upsertErr != nil {
		return r.upsertErr
	}
	r.upserts = append(r.upserts, input)
	return nil
}

type stubScraperClient struct {
	status    ScraperStatus
	news      []scraperNewsItem
	statusErr error
	newsErr   error
}

func (c *stubScraperClient) Status(ctx context.Context) (ScraperStatus, error) {
	if c.statusErr != nil {
		return ScraperStatus{}, c.statusErr
	}
	return c.status, nil
}

func (c *stubScraperClient) News(ctx context.Context) ([]scraperNewsItem, error) {
	if c.newsErr != nil {
		return nil, c.newsErr
	}
	return c.news, nil
}

func TestServiceSyncReturnsControlledErrorWhenScraperCacheIsEmpty(t *testing.T) {
	svc := NewService(&stubTalentRepository{}, &stubScraperClient{
		status: ScraperStatus{Total: 0, SourcesScraped: []string{}},
	})

	_, err := svc.Sync(context.Background())
	if !errors.Is(err, ErrScraperCacheEmpty) {
		t.Fatalf("Sync() error = %v; want ErrScraperCacheEmpty", err)
	}
}

func TestServiceSyncImportsSnapshotAndCountsInsertedUpdated(t *testing.T) {
	repo := &stubTalentRepository{
		existing: map[string]struct{}{
			"https://example.com/existing": {},
		},
	}
	svc := NewService(repo, &stubScraperClient{
		status: ScraperStatus{
			UpdatedAtUTC:   ptrString("2026-04-05T12:00:00Z"),
			Total:          2,
			SourcesScraped: []string{"Daryn.kz"},
		},
		news: []scraperNewsItem{
			{
				Title:  "Existing",
				Link:   "https://example.com/existing",
				Source: "Daryn.kz",
				Date:   ptrString("29.11.2025"),
			},
			{
				Title:                 "New Lead",
				Link:                  "https://example.com/new",
				Source:                "Tengrinews",
				HighSchoolStudentName: ptrString("Имран Кусанов"),
				Date:                  ptrString("2025-11-30"),
				WinnerInfo:            ptrString("winner info"),
			},
		},
	})

	response, err := svc.Sync(context.Background())
	if err != nil {
		t.Fatalf("Sync() error = %v", err)
	}
	if response.ImportedTotal != 2 || response.Inserted != 1 || response.Updated != 1 {
		t.Fatalf("unexpected sync response: %+v", response)
	}
	if len(repo.upserts) != 2 {
		t.Fatalf("expected 2 upserts, got %d", len(repo.upserts))
	}
	if repo.upserts[0].PublishedAt == nil || repo.upserts[1].PublishedAt == nil {
		t.Fatalf("expected published_at to be parsed for both records")
	}
}

func TestServiceMapScraperItemPreservesRawDateWhenParsingFails(t *testing.T) {
	now := time.Date(2026, 4, 5, 14, 23, 45, 0, time.UTC)
	item := scraperNewsItem{
		Title:  "Lead",
		Link:   "https://example.com/new",
		Source: "Daryn.kz",
		Date:   ptrString("непонятная дата"),
	}

	mapped, err := mapScraperItem(item, now)
	if err != nil {
		t.Fatalf("mapScraperItem() error = %v", err)
	}
	if mapped.PublishedAt != nil {
		t.Fatalf("PublishedAt = %v; want nil", mapped.PublishedAt)
	}
	if mapped.PublishedDateRaw == nil || *mapped.PublishedDateRaw != "непонятная дата" {
		t.Fatalf("PublishedDateRaw = %#v; want original value", mapped.PublishedDateRaw)
	}
}

func TestHTTPClientNewsUsesGetNewsEndpoint(t *testing.T) {
	t.Helper()

	var requestedPath string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestedPath = r.URL.Path
		if r.Method != http.MethodGet {
			t.Fatalf("unexpected method: %s", r.Method)
		}

		switch r.URL.Path {
		case "/get_news":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`[]`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	client := &HTTPClient{baseURL: srv.URL, httpClient: srv.Client()}

	items, err := client.News(context.Background())
	if err != nil {
		t.Fatalf("News() error = %v", err)
	}
	if len(items) != 0 {
		t.Fatalf("News() returned %d items; want 0", len(items))
	}
	if requestedPath != "/get_news" {
		t.Fatalf("News() called %q; want /get_news", requestedPath)
	}
}
