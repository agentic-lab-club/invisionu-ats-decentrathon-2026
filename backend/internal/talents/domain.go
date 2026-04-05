package talents

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

var (
	ErrScraperUnavailable = errors.New("talent scraper is unavailable")
	ErrScraperCacheEmpty  = errors.New("talent scraper cache is empty, wait for scheduled refresh")
)

type TalentLead struct {
	ID                    uuid.UUID  `db:"id" json:"id"`
	Title                 string     `db:"title" json:"title"`
	Link                  string     `db:"link" json:"link"`
	Source                string     `db:"source" json:"source"`
	HighSchoolStudentName *string    `db:"high_school_student_name" json:"high_school_student_name,omitempty"`
	PublishedAt           *time.Time `db:"published_at" json:"published_at,omitempty"`
	PublishedDateRaw      *string    `db:"published_date_raw" json:"published_date_raw,omitempty"`
	WinnerInfo            *string    `db:"winner_info" json:"winner_info,omitempty"`
	RawPayload            []byte     `db:"raw_payload" json:"-"`
	SyncedAt              time.Time  `db:"synced_at" json:"synced_at"`
}

type ListParams struct {
	Source string
	Query  string
	Limit  int
	Offset int
}

type ListResponse struct {
	Items  []TalentLead `json:"items"`
	Total  int          `json:"total"`
	Limit  int          `json:"limit"`
	Offset int          `json:"offset"`
}

type BackendStatus struct {
	TotalInDB    int        `json:"total_in_db" db:"total_in_db"`
	LastSyncedAt *time.Time `json:"last_synced_at,omitempty" db:"last_synced_at"`
}

type ScraperStatus struct {
	UpdatedAtUTC   *string  `json:"updated_at_utc,omitempty"`
	Total          int      `json:"total"`
	SourcesScraped []string `json:"sources_scraped"`
}

type StatusResponse struct {
	Backend BackendStatus `json:"backend"`
	Scraper ScraperStatus `json:"scraper"`
}

type SyncResponse struct {
	ImportedTotal       int     `json:"imported_total"`
	Inserted            int     `json:"inserted"`
	Updated             int     `json:"updated"`
	SyncedAt            string  `json:"synced_at"`
	ScraperUpdatedAtUTC *string `json:"scraper_updated_at_utc,omitempty"`
}

type scraperNewsItem struct {
	Title                 string  `json:"title"`
	Link                  string  `json:"link"`
	Source                string  `json:"source"`
	HighSchoolStudentName *string `json:"high_school_student_name"`
	Date                  *string `json:"date"`
	WinnerInfo            *string `json:"winner_info"`
}

type talentLeadUpsert struct {
	ID                    uuid.UUID
	Title                 string
	Link                  string
	Source                string
	HighSchoolStudentName *string
	PublishedAt           *time.Time
	PublishedDateRaw      *string
	WinnerInfo            *string
	RawPayload            []byte
	SyncedAt              time.Time
}

type RepositoryReader interface {
	List(params ListParams) ([]TalentLead, error)
	Count(params ListParams) (int, error)
	GetBackendStatus() (BackendStatus, error)
	ExistingLinks(links []string) (map[string]struct{}, error)
}

type RepositoryWriter interface {
	Upsert(input talentLeadUpsert) error
}

type Repository interface {
	RepositoryReader
	RepositoryWriter
}

type scraperClient interface {
	Status(ctx context.Context) (ScraperStatus, error)
	News(ctx context.Context) ([]scraperNewsItem, error)
}

type talentService interface {
	List(ctx context.Context, params ListParams) (ListResponse, error)
	Status(ctx context.Context) (StatusResponse, error)
	Sync(ctx context.Context) (SyncResponse, error)
}
