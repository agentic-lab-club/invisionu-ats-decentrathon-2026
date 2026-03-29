package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

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

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	db, err := database.InitDB(cfg)
	if err != nil {
		panic(err)
	}

	programsPath := filepath.Clean("../docs/seed/programs.json")
	personalityPath := filepath.Clean("../docs/seed/personality-test.json")

	if err := seedPrograms(db, programsPath); err != nil {
		panic(err)
	}
	if err := seedPersonalityTest(db, personalityPath); err != nil {
		panic(err)
	}

	fmt.Println("seed completed")
}

func seedPrograms(db *sqlx.DB, path string) error {
	doc := programsDocument{}
	if err := readJSON(path, &doc); err != nil {
		return err
	}

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

func seedPersonalityTest(db *sqlx.DB, path string) error {
	doc := personalityDocument{}
	if err := readJSON(path, &doc); err != nil {
		return err
	}

	tx, err := db.Beginx()
	if err != nil {
		return fmt.Errorf("failed to begin seed transaction: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`DELETE FROM application_test_answers`); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM personality_test_options`); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM personality_test_questions`); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM personality_tests`); err != nil {
		return err
	}

	testID := uuid.New()
	if _, err := tx.Exec(`
		INSERT INTO personality_tests (id, code, title, is_active)
		VALUES ($1, $2, $3, TRUE)
	`, testID, doc.Code, doc.Title); err != nil {
		return fmt.Errorf("failed to insert personality test: %w", err)
	}

	for _, question := range doc.Questions {
		questionID := uuid.New()
		if _, err := tx.Exec(`
			INSERT INTO personality_test_questions (id, test_id, question_order, question_text, is_active)
			VALUES ($1, $2, $3, $4, TRUE)
		`, questionID, testID, question.Order, question.Text); err != nil {
			return fmt.Errorf("failed to insert question %d: %w", question.Order, err)
		}

		for index, option := range question.Options {
			optionID := uuid.New()
			if _, err := tx.Exec(`
				INSERT INTO personality_test_options (id, question_id, option_order, option_key, option_text)
				VALUES ($1, $2, $3, $4, $5)
			`, optionID, questionID, index+1, string(rune('A'+index)), option); err != nil {
				return fmt.Errorf("failed to insert option %d for question %d: %w", index+1, question.Order, err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit seed transaction: %w", err)
	}
	return nil
}

func readJSON(path string, target any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("failed to read json %s: %w", path, err)
	}
	if err := json.Unmarshal(data, target); err != nil {
		return fmt.Errorf("failed to unmarshal json %s: %w", path, err)
	}
	return nil
}
