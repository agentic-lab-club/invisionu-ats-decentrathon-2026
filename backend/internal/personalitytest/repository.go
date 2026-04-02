package personalitytest

import (
	"fmt"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	"github.com/google/uuid"
)

type Repository struct {
	db *database.TrackedDB
}

func NewRepository(db *database.TrackedDB) *Repository {
	return &Repository{db: db}
}

// ─── Personality test metrics ─────────────────────────────────────────────────

// PersonalityOptionMetrics объявлен в domain.go — здесь его нет

func (r *Repository) GetMetricsByOptionID(optionID uuid.UUID) (PersonalityOptionMetrics, error) {
	var metrics PersonalityOptionMetrics
	err := r.db.TrackedGet(&metrics, `SELECT m, p, r, l, v FROM personality_test_options WHERE id = $1`, optionID)
	return metrics, err
}

func (r *Repository) GetAllOptionsWithMetrics() (map[uuid.UUID][]PersonalityOptionMetrics, error) {
	var rows []struct {
		QuestionID uuid.UUID `db:"question_id"`
		PersonalityOptionMetrics
	}
	err := r.db.TrackedSelect(&rows, `SELECT question_id, m, p, r, l, v FROM personality_test_options`)
	if err != nil {
		return nil, err
	}
	result := make(map[uuid.UUID][]PersonalityOptionMetrics)
	for _, row := range rows {
		result[row.QuestionID] = append(result[row.QuestionID], row.PersonalityOptionMetrics)
	}
	return result, nil
}

// ─── Test retrieval ───────────────────────────────────────────────────────────

func (r *Repository) GetCurrent() (*Test, error) {
	var rows []row
	if err := r.db.TrackedSelect(&rows, r.db.Rebind(getCurrentTestQuery)); err != nil {
		return nil, fmt.Errorf("failed to get current personality test: %w", err)
	}
	if len(rows) == 0 {
		return nil, nil
	}

	test := &Test{
		ID:    rows[0].TestID,
		Code:  rows[0].Code,
		Title: rows[0].Title,
	}

	questions := make(map[string]*Question)
	for _, item := range rows {
		key := item.QuestionID.String()
		question, ok := questions[key]
		if !ok {
			question = &Question{
				ID:    item.QuestionID,
				Order: item.QuestionOrder,
				Text:  item.QuestionText,
			}
			questions[key] = question
			test.Questions = append(test.Questions, *question)
		}
	}

	for i := range test.Questions {
		question := &test.Questions[i]
		for _, item := range rows {
			if item.QuestionID == question.ID {
				question.Options = append(question.Options, Option{
					ID:    item.OptionID,
					Key:   item.OptionKey,
					Text:  item.OptionText,
					Order: item.OptionOrder,
				})
			}
		}
	}

	return test, nil
}

