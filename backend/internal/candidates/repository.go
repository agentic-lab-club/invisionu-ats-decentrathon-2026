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

<<<<<<< HEAD
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


=======
func (r *Repository) List(programCode string, reviewStage string, decision string, search string) ([]ListItem, error) {
	var items []ListItem
	search = strings.TrimSpace(search)
	if search != "" {
		search = "%" + strings.ToLower(search) + "%"
	}
	programFilter := emptyToNil(programCode)
	stageFilter := emptyToNil(reviewStage)
	decisionFilter := emptyToNil(decision)
	searchFilter := emptyToNil(search)
	if err := r.db.TrackedSelect(&items, r.db.Rebind(listCandidatesQuery), programFilter, programFilter, stageFilter, stageFilter, decisionFilter, decisionFilter, searchFilter, searchFilter, searchFilter); err != nil {
		return nil, fmt.Errorf("failed to list candidates: %w", err)
	}
	return items, nil
}

>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
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

	var scoring ScoringResult
	var latest *ScoringResult
	if err := r.db.TrackedGet(&scoring, r.db.Rebind(getLatestScoringRunQuery), applicationID); err == nil {
		latest = &scoring
	} else if err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to get latest scoring run: %w", err)
	}

	return &Detail{
		ApplicationID:    row.ApplicationID,
		Email:            row.Email,
		FirstName:        row.FirstName,
		LastName:         row.LastName,
		PhoneNumber:      row.PhoneNumber,
		ProgramName:      row.ProgramName,
		ReviewStage:      row.ReviewStage,
		Decision:         row.Decision,
		VideoTranscript:  row.VideoTranscript,
		ScreeningError:   row.ScreeningError,
		Files:            files,
		LatestScoringRun: latest,
	}, nil
}

func (r *Repository) UpdateStage(applicationID uuid.UUID, reviewStage string, decision *string) error {
	_, err := r.db.TrackedUpdate(r.db.Rebind(updateCandidateStageQuery), reviewStage, decision, applicationID)
	if err != nil {
		return fmt.Errorf("failed to update candidate stage: %w", err)
	}
	return nil
}

func emptyToNil(value string) any {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return value
}
