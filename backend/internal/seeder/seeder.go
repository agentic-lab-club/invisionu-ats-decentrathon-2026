package seeder

import (
	_ "embed"
	"encoding/json"
	"fmt"

	"github.com/jmoiron/sqlx"
)

//go:embed data/programs.json
var programsJSON []byte

//go:embed data/personality-test.json
var personalityJSON []byte

type programsDocument struct {
	Programs []programSeed `json:"programs"`
}

type programSeed struct {
	Level     string `json:"level"`
	Code      string `json:"code"`
	Name      string `json:"name"`
	SortOrder int    `json:"sort_order"`
}

type personalityDocument struct {
	Code      string             `json:"code"`
	Title     string             `json:"title"`
	Questions []personalitySeedQ `json:"questions"`
}

type personalitySeedQ struct {
	Order   int      `json:"order"`
	Text    string   `json:"text"`
	Options []string `json:"options"`
}

type seedDocuments struct {
	programs    programsDocument
	personality personalityDocument
}

func SeedDefaults(db *sqlx.DB) error {
	docs, err := loadSeedDocuments()
	if err != nil {
		return err
	}

	if err := seedPrograms(db, docs.programs); err != nil {
		return err
	}
	if err := seedPersonalityTest(db, docs.personality); err != nil {
		return err
	}
	if err := seedMockApplicants(db); err != nil {
		return err
	}

	return nil
}

func loadSeedDocuments() (*seedDocuments, error) {
	docs := &seedDocuments{}
	if err := json.Unmarshal(programsJSON, &docs.programs); err != nil {
		return nil, fmt.Errorf("failed to parse embedded programs seed: %w", err)
	}
	if err := json.Unmarshal(personalityJSON, &docs.personality); err != nil {
		return nil, fmt.Errorf("failed to parse embedded personality test seed: %w", err)
	}
	return docs, nil
}

func seedPrograms(db *sqlx.DB, doc programsDocument) error {
	for _, item := range doc.Programs {
		if _, err := db.Exec(`
			INSERT INTO programs (level, code, name, is_active, sort_order)
			VALUES ($1, $2, $3, TRUE, $4)
			ON CONFLICT (code) DO UPDATE
			SET level = EXCLUDED.level,
			    name = EXCLUDED.name,
			    is_active = TRUE,
			    sort_order = EXCLUDED.sort_order
		`, item.Level, item.Code, item.Name, item.SortOrder); err != nil {
			return fmt.Errorf("failed to seed program %s: %w", item.Code, err)
		}
	}

	return nil
}

func seedPersonalityTest(db *sqlx.DB, doc personalityDocument) error {
	tx, err := db.Beginx()
	if err != nil {
		return fmt.Errorf("failed to begin seed transaction: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`UPDATE personality_tests SET is_active = FALSE WHERE code <> $1`, doc.Code); err != nil {
		return fmt.Errorf("failed to deactivate old personality tests: %w", err)
	}

	var testID string
	if err := tx.QueryRowx(`
		INSERT INTO personality_tests (code, title, is_active)
		VALUES ($1, $2, TRUE)
		ON CONFLICT (code) DO UPDATE
		SET title = EXCLUDED.title,
		    is_active = TRUE
		RETURNING id
	`, doc.Code, doc.Title).Scan(&testID); err != nil {
		return fmt.Errorf("failed to upsert personality test: %w", err)
	}

	for _, question := range doc.Questions {
		var questionID string
		if err := tx.QueryRowx(`
			INSERT INTO personality_test_questions (test_id, question_order, question_text, is_active)
			VALUES ($1, $2, $3, TRUE)
			ON CONFLICT (test_id, question_order) DO UPDATE
			SET question_text = EXCLUDED.question_text,
			    is_active = TRUE
			RETURNING id
		`, testID, question.Order, question.Text).Scan(&questionID); err != nil {
			return fmt.Errorf("failed to upsert question %d: %w", question.Order, err)
		}

		for index, option := range question.Options {
			if _, err := tx.Exec(`
				INSERT INTO personality_test_options (question_id, option_order, option_key, option_text)
				VALUES ($1, $2, $3, $4)
				ON CONFLICT (question_id, option_order) DO UPDATE
				SET option_key = EXCLUDED.option_key,
				    option_text = EXCLUDED.option_text
			`, questionID, index+1, string(rune('A'+index)), option); err != nil {
				return fmt.Errorf("failed to upsert option %d for question %d: %w", index+1, question.Order, err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit seed transaction: %w", err)
	}
	return nil
}
