package personalitytest

import (
	"fmt"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
)

type Repository struct {
	db *database.TrackedDB
}

func NewRepository(db *database.TrackedDB) *Repository {
	return &Repository{db: db}
}

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
