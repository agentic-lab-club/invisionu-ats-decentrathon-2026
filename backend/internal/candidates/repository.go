package candidates

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	"github.com/google/uuid"
)

type Repository struct {
	db *database.TrackedDB
}

func NewRepository(db *database.TrackedDB) *Repository {
	return &Repository{db: db}
}

// ИЗМЕНЕНИЯ, КОТОРЫЕ НУЖНО СДЕЛАТЬ, ИЛЬЯС
func (r *Repository) List(programCode string, reviewStage string, decision string, search string) ([]ListItem, error) {
	var items []ListItem

	query := `
SELECT
    a.id AS application_id,
    TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS full_name,
    p.name AS program_name,
    a.review_stage,
    a.decision,
    sr.recommendation
FROM applications a
JOIN users u ON u.id = a.user_id
JOIN programs p ON p.id = a.program_id
LEFT JOIN LATERAL (
    SELECT recommendation
    FROM scoring_runs
    WHERE application_id = a.id
    ORDER BY created_at DESC
    LIMIT 1
) sr ON TRUE
WHERE 1=1
`

	args := []any{}
	i := 1

	if programCode != "" {
		query += fmt.Sprintf(" AND p.code = $%d", i)
		args = append(args, programCode)
		i++
	}

	if reviewStage != "" {
		query += fmt.Sprintf(" AND a.review_stage = $%d", i)
		args = append(args, reviewStage)
		i++
	}

	if decision != "" {
		query += fmt.Sprintf(" AND a.decision = $%d", i)
		args = append(args, decision)
		i++
	}

	if search != "" {
		query += fmt.Sprintf(`
		AND (
			LOWER(u.first_name || ' ' || u.last_name) LIKE LOWER($%d)
			OR LOWER(u.email) LIKE LOWER($%d)
		)
		`, i, i)

		args = append(args, "%"+search+"%")
		i++
	}

	query += " ORDER BY a.created_at DESC"

	if err := r.db.TrackedSelect(&items, query, args...); err != nil {
		return nil, fmt.Errorf("failed to list candidates: %w", err)
	}

	return items, nil
}

func (r *Repository) GetDetail(applicationID uuid.UUID) (*Detail, error) {
	var row detailRow
	if err := r.db.TrackedGet(&row, r.db.Rebind(getCandidateDetailQuery), applicationID); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get candidate detail: %w", err)
	}

	var files []DetailFile
	if err := r.db.TrackedSelect(&files, r.db.Rebind(getCandidateFilesQuery), applicationID); err != nil {
		return nil, fmt.Errorf("failed to get candidate files: %w", err)
	}

	latest, err := r.getLatestScoringRun(applicationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get latest scoring run: %w", err)
	}

	personalityRun, err := r.getLatestScoringRunByModel(applicationID, "personality_test")
	if err != nil {
		return nil, fmt.Errorf("failed to get latest personality scoring run: %w", err)
	}

	llmRun, err := r.getLatestScoringRunByModel(applicationID, "llmscoring")
	if err != nil {
		return nil, fmt.Errorf("failed to get latest llm scoring run: %w", err)
	}

	return &Detail{
		ApplicationID:               row.ApplicationID,
		Email:                       row.Email,
		FirstName:                   row.FirstName,
		LastName:                    row.LastName,
		PhoneNumber:                 row.PhoneNumber,
		ProgramName:                 row.ProgramName,
		ReviewStage:                 row.ReviewStage,
		Decision:                    row.Decision,
		VideoTranscript:             row.VideoTranscript,
		ScreeningError:              row.ScreeningError,
		Files:                       files,
		LatestScoringRun:            latest,
		LatestPersonalityScoringRun: personalityRun,
		LatestLLMScoringRun:         llmRun,
	}, nil
}

func (r *Repository) UpdateStage(applicationID uuid.UUID, reviewStage string, decision *string) error {
	_, err := r.db.TrackedUpdate(r.db.Rebind(updateCandidateStageQuery), reviewStage, decision, applicationID)
	if err != nil {
		return fmt.Errorf("failed to update candidate stage: %w", err)
	}
	return nil
}

// SmartFilter returns candidates matching one of the predefined smart-filter presets.
// Each preset maps to a dedicated SQL query that filters on JSONB scoring metrics.
func (r *Repository) SmartFilter(preset string) ([]ListItem, error) {
	var query string
	switch preset {
	case PresetHighPotentialLowEnglish:
		query = smartFilterHighPotentialLowEnglishQuery
	case PresetStrongMotivationWeakSoft:
		query = smartFilterStrongMotivationWeakSoftQuery
	case PresetLowMotivationHighBackground:
		query = smartFilterLowMotivationHighBackgroundQuery
	case PresetTop10Percent:
		query = smartFilterTop10PercentQuery
	default:
		return nil, fmt.Errorf("unknown smart filter preset: %s", preset)
	}

	var items []ListItem
	if err := r.db.TrackedSelect(&items, query); err != nil {
		return nil, fmt.Errorf("smart filter query failed (preset=%s): %w", preset, err)
	}
	return items, nil
}

// AdvancedFilter returns candidates matching arbitrary metric range constraints.
// All constraints are optional; omitted fields impose no restriction.
func (r *Repository) AdvancedFilter(p AdvancedFilterParams) ([]ListItem, error) {
	base := `
SELECT
    a.id AS application_id,
    TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS full_name,
    p.name AS program_name,
    a.review_stage,
    a.decision,
    sr.recommendation
FROM applications a
JOIN users u ON u.id = a.user_id
JOIN programs p ON p.id = a.program_id
JOIN LATERAL (
    SELECT recommendation, result_json
    FROM scoring_runs
    WHERE application_id = a.id
    ORDER BY created_at DESC
    LIMIT 1
) sr ON TRUE
WHERE 1=1
`
	args := []any{}
	i := 1

	// helper: adds a JSONB numeric range constraint
	addMetric := func(path, subkey string, min, max *float64) {
		expr := fmt.Sprintf("(sr.result_json -> '%s' ->> '%s')", path, subkey)
		if min != nil {
			base += fmt.Sprintf(" AND (%s) IS NOT NULL AND (%s)::float >= $%d", expr, expr, i)
			args = append(args, *min)
			i++
		}
		if max != nil {
			base += fmt.Sprintf(" AND (%s) IS NOT NULL AND (%s)::float <= $%d", expr, expr, i)
			args = append(args, *max)
			i++
		}
	}

	addMetric("aggregated_metrics", "Motivation", p.MotivationMin, p.MotivationMax)
	addMetric("aggregated_metrics", "Leadership", p.LeadershipMin, p.LeadershipMax)
	addMetric("aggregated_metrics", "Planning", p.PlanningMin, p.PlanningMax)
	addMetric("aggregated_metrics", "Resilience", p.ResilienceMin, p.ResilienceMax)
	addMetric("aggregated_metrics", "Values", p.ValuesMin, p.ValuesMax)
	addMetric("aggregated_metrics", "Social_Support", p.SocialSupportMin, p.SocialSupportMax)
	addMetric("global_score", "AdmissionsPotential", p.AdmissionsPotentialMin, p.AdmissionsPotentialMax)
	addMetric("global_score", "LeadershipIndex", p.LeadershipIndexMin, p.LeadershipIndexMax)

	// Standard list filters
	if p.ProgramCode != "" {
		base += fmt.Sprintf(" AND p.code = $%d", i)
		args = append(args, p.ProgramCode)
		i++
	}
	if p.ReviewStage != "" {
		base += fmt.Sprintf(" AND a.review_stage = $%d", i)
		args = append(args, p.ReviewStage)
		i++
	}
	if p.Decision != "" {
		base += fmt.Sprintf(" AND a.decision = $%d", i)
		args = append(args, p.Decision)
		i++
	}
	if p.Search != "" {
		base += fmt.Sprintf(` AND (LOWER(u.first_name || ' ' || u.last_name) LIKE LOWER($%d) OR LOWER(u.email) LIKE LOWER($%d))`, i, i)
		args = append(args, "%"+p.Search+"%")
		i++
	}

	base += " ORDER BY (sr.result_json -> 'global_score' ->> 'AdmissionsPotential')::float DESC NULLS LAST"

	var items []ListItem
	if err := r.db.TrackedSelect(&items, base, args...); err != nil {
		return nil, fmt.Errorf("advanced filter query failed: %w", err)
	}
	return items, nil
}

func emptyToNil(value string) any {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return value
}

func (r *Repository) getLatestScoringRun(applicationID uuid.UUID) (*ScoringResult, error) {
	var scoring ScoringResult
	if err := r.db.TrackedGet(&scoring, r.db.Rebind(getLatestScoringRunQuery), applicationID); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &scoring, nil
}

func (r *Repository) getLatestScoringRunByModel(applicationID uuid.UUID, modelName string) (*ScoringResult, error) {
	var scoring ScoringResult
	if err := r.db.TrackedGet(&scoring, r.db.Rebind(getLatestScoringRunByModelQuery), applicationID, modelName); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &scoring, nil
}