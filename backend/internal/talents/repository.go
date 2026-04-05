package talents

import (
	"fmt"
	"strings"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	"github.com/jmoiron/sqlx"
)

type RepositoryImpl struct {
	db *database.TrackedDB
}

func NewRepository(db *database.TrackedDB) *RepositoryImpl {
	return &RepositoryImpl{db: db}
}

func (r *RepositoryImpl) List(params ListParams) ([]TalentLead, error) {
	filters, args := buildTalentFilters(params)
	query := strings.TrimSpace(listTalentsQuery) + filters +
		" ORDER BY published_at DESC NULLS LAST, synced_at DESC, title ASC LIMIT ? OFFSET ?"
	args = append(args, params.Limit, params.Offset)

	var items []TalentLead
	if err := r.db.TrackedSelect(&items, r.db.Rebind(query), args...); err != nil {
		return nil, fmt.Errorf("failed to list talent leads: %w", err)
	}

	return items, nil
}

func (r *RepositoryImpl) Count(params ListParams) (int, error) {
	filters, args := buildTalentFilters(params)
	query := strings.TrimSpace(countTalentsQuery) + filters

	var row struct {
		Total int `db:"total"`
	}
	if err := r.db.TrackedGet(&row, r.db.Rebind(query), args...); err != nil {
		return 0, fmt.Errorf("failed to count talent leads: %w", err)
	}

	return row.Total, nil
}

func (r *RepositoryImpl) GetBackendStatus() (BackendStatus, error) {
	var status BackendStatus
	if err := r.db.TrackedGet(&status, r.db.Rebind(strings.TrimSpace(getBackendStatusQuery))); err != nil {
		return BackendStatus{}, fmt.Errorf("failed to load talent lead backend status: %w", err)
	}

	return status, nil
}

func (r *RepositoryImpl) ExistingLinks(links []string) (map[string]struct{}, error) {
	result := make(map[string]struct{}, len(links))
	if len(links) == 0 {
		return result, nil
	}

	query, args, err := sqlx.In(strings.TrimSpace(existingTalentLinksQuery), links)
	if err != nil {
		return nil, fmt.Errorf("failed to build existing talent links query: %w", err)
	}

	var rows []struct {
		Link string `db:"link"`
	}
	if err := r.db.TrackedSelect(&rows, r.db.Rebind(query), args...); err != nil {
		return nil, fmt.Errorf("failed to fetch existing talent links: %w", err)
	}

	for _, row := range rows {
		result[row.Link] = struct{}{}
	}

	return result, nil
}

func (r *RepositoryImpl) Upsert(input talentLeadUpsert) error {
	if _, err := r.db.TrackedInsert(
		r.db.Rebind(strings.TrimSpace(upsertTalentQuery)),
		input.ID,
		input.Source,
		input.Link,
		input.Title,
		input.HighSchoolStudentName,
		input.PublishedAt,
		input.PublishedDateRaw,
		input.WinnerInfo,
		input.RawPayload,
		input.SyncedAt,
	); err != nil {
		return fmt.Errorf("failed to upsert talent lead: %w", err)
	}

	return nil
}

func buildTalentFilters(params ListParams) (string, []any) {
	conditions := make([]string, 0, 2)
	args := make([]any, 0, 4)

	source := strings.TrimSpace(params.Source)
	if source != "" {
		conditions = append(conditions, "LOWER(source) = LOWER(?)")
		args = append(args, source)
	}

	query := strings.TrimSpace(params.Query)
	if query != "" {
		search := "%" + strings.ToLower(query) + "%"
		conditions = append(conditions, "(LOWER(title) LIKE ? OR LOWER(COALESCE(winner_info, '')) LIKE ?)")
		args = append(args, search, search)
	}

	if len(conditions) == 0 {
		return "", args
	}

	return " WHERE " + strings.Join(conditions, " AND "), args
}
