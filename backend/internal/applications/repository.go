package applications

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type Repository struct {
	db *database.TrackedDB
}

func NewRepository(db *database.TrackedDB) *Repository {
	return &Repository{db: db}
}

<<<<<<< HEAD
// ─── Personality test ────────────────────────────────────────────────────────

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

// ─── Transactions ────────────────────────────────────────────────────────────

func (r *Repository) BeginTx() (*sqlx.Tx, error) {
	tx, err := r.db.DB.Beginx()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	return tx, nil
}

// ─── Users ───────────────────────────────────────────────────────────────────

=======
>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
func (r *Repository) FindUserByID(id uuid.UUID) (*User, error) {
	var user User
	if err := r.db.TrackedGet(&user, r.db.Rebind(findUserByIDQuery), id); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to find user by id: %w", err)
	}
	return &user, nil
}

<<<<<<< HEAD
func (r *Repository) UpdateUserProfile(tx *sqlx.Tx, userID uuid.UUID, firstName string, lastName string, phoneNumber string) error {
	if _, err := tx.Exec(r.db.Rebind(updateUserProfileQuery), firstName, lastName, phoneNumber, userID); err != nil {
		return fmt.Errorf("failed to update user profile: %w", err)
	}
	return nil
}

// ─── Programs ────────────────────────────────────────────────────────────────

=======
>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
func (r *Repository) FindProgramByCode(code string) (*Program, error) {
	var program Program
	if err := r.db.TrackedGet(&program, r.db.Rebind(findProgramByCodeQuery), code); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to find program by code: %w", err)
	}
	return &program, nil
}

<<<<<<< HEAD
// ─── Files ───────────────────────────────────────────────────────────────────

=======
>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
func (r *Repository) FindFileByID(id uuid.UUID) (*FileRecord, error) {
	var file FileRecord
	if err := r.db.TrackedGet(&file, r.db.Rebind(findFileByIDQuery), id); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to find file by id: %w", err)
	}
	return &file, nil
}

<<<<<<< HEAD
func (r *Repository) AttachFileToApplication(tx *sqlx.Tx, applicationID uuid.UUID, fileID uuid.UUID) error {
	if _, err := tx.Exec(r.db.Rebind(attachFileToApplicationQuery), applicationID, fileID); err != nil {
		return fmt.Errorf("failed to attach file to application: %w", err)
	}
	return nil
}

// ─── Applications ────────────────────────────────────────────────────────────

=======
>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
func (r *Repository) CountActiveApplications(userID uuid.UUID) (int, error) {
	var count int
	if err := r.db.TrackedGet(&count, r.db.Rebind(countActiveApplicationsQuery), userID); err != nil {
		return 0, fmt.Errorf("failed to count active applications: %w", err)
	}
	return count, nil
}

<<<<<<< HEAD
=======
func (r *Repository) ValidateAnswerPair(questionID uuid.UUID, optionID uuid.UUID) (bool, error) {
	var count int
	if err := r.db.TrackedGet(&count, r.db.Rebind(validateAnswerPairQuery), questionID, optionID); err != nil {
		return false, fmt.Errorf("failed to validate answer pair: %w", err)
	}
	return count > 0, nil
}

func (r *Repository) BeginTx() (*sqlx.Tx, error) {
	tx, err := r.db.DB.Beginx()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	return tx, nil
}

func (r *Repository) UpdateUserProfile(tx *sqlx.Tx, userID uuid.UUID, firstName string, lastName string, phoneNumber string) error {
	if _, err := tx.Exec(r.db.Rebind(updateUserProfileQuery), firstName, lastName, phoneNumber, userID); err != nil {
		return fmt.Errorf("failed to update user profile: %w", err)
	}
	return nil
}

>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
func (r *Repository) CreateApplication(tx *sqlx.Tx, userID uuid.UUID, programID int, videoFileID uuid.UUID, submittedAt time.Time) (*Application, error) {
	var application Application
	if err := tx.Get(&application, r.db.Rebind(createApplicationQuery), userID, programID, ReviewStageInitialScreening, DecisionPending, videoFileID, submittedAt); err != nil {
		return nil, fmt.Errorf("failed to create application: %w", err)
	}
	return &application, nil
}

<<<<<<< HEAD
=======
func (r *Repository) AttachFileToApplication(tx *sqlx.Tx, applicationID uuid.UUID, fileID uuid.UUID) error {
	if _, err := tx.Exec(r.db.Rebind(attachFileToApplicationQuery), applicationID, fileID); err != nil {
		return fmt.Errorf("failed to attach file to application: %w", err)
	}
	return nil
}

func (r *Repository) InsertApplicationTestAnswer(tx *sqlx.Tx, applicationID uuid.UUID, questionID uuid.UUID, optionID uuid.UUID) error {
	if _, err := tx.Exec(r.db.Rebind(insertApplicationTestAnswerQuery), applicationID, questionID, optionID); err != nil {
		return fmt.Errorf("failed to insert application test answer: %w", err)
	}
	return nil
}

>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
func (r *Repository) FindStatusByUserID(userID uuid.UUID) (*StatusResponse, error) {
	var status StatusResponse
	if err := r.db.TrackedGet(&status, r.db.Rebind(findStatusByUserIDQuery), userID); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to find application status by user id: %w", err)
	}
	return &status, nil
}
<<<<<<< HEAD

// ─── Personality test answers ────────────────────────────────────────────────

func (r *Repository) ValidateAnswerPair(questionID uuid.UUID, optionID uuid.UUID) (bool, error) {
	var count int
	if err := r.db.TrackedGet(&count, r.db.Rebind(validateAnswerPairQuery), questionID, optionID); err != nil {
		return false, fmt.Errorf("failed to validate answer pair: %w", err)
	}
	return count > 0, nil
}

func (r *Repository) InsertApplicationTestAnswer(tx *sqlx.Tx, applicationID uuid.UUID, questionID uuid.UUID, optionID uuid.UUID) error {
	if _, err := tx.Exec(r.db.Rebind(insertApplicationTestAnswerQuery), applicationID, questionID, optionID); err != nil {
		return fmt.Errorf("failed to insert application test answer: %w", err)
	}
	return nil
}

// ─── Scoring runs ────────────────────────────────────────────────────────────

func (r *Repository) CreateScoringRunInTx(tx *sqlx.Tx, sr *ScoringRun) error {
	_, err := tx.NamedExec(`
		INSERT INTO scoring_runs (id, application_id, model_name, result_json, recommendation, created_at)
		VALUES (:id, :application_id, :model_name, :result_json, :recommendation, :created_at)`, sr)
	return err
}
=======
>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
