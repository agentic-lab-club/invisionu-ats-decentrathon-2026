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

func (r *Repository) CountActiveApplications(userID uuid.UUID) (int, error) {
	var count int
	if err := r.db.TrackedGet(&count, r.db.Rebind(countActiveApplicationsQuery), userID); err != nil {
		return 0, fmt.Errorf("failed to count active applications: %w", err)
	}
	return count, nil
}

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

func (r *Repository) CreateApplication(tx *sqlx.Tx, userID uuid.UUID, programID int, videoFileID uuid.UUID, submittedAt time.Time) (*Application, error) {
	var application Application
	if err := tx.Get(&application, r.db.Rebind(createApplicationQuery), userID, programID, ReviewStageInitialScreening, DecisionPending, videoFileID, submittedAt); err != nil {
		return nil, fmt.Errorf("failed to create application: %w", err)
	}
	return &application, nil
}

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
