package applications

import (
	"time"

	"github.com/google/uuid"
)

const (
	ReviewStageInitialScreening  = "initial_screening"
	ReviewStageApplicationReview = "application_review"
	ReviewStageDecision          = "decision"

	DecisionPending  = "pending"
	DecisionAccepted = "accepted"
	DecisionRejected = "rejected"
)

type CreateRequest struct {
	FirstName              string        `json:"first_name" validate:"required,min=1,max=255"`
	LastName               string        `json:"last_name" validate:"required,min=1,max=255"`
	PhoneNumber            string        `json:"phone_number" validate:"required,min=3,max=64"`
	ProgramCode            string        `json:"program_code" validate:"required"`
	VideoFileID            uuid.UUID     `json:"video_file_id" validate:"required"`
	PortfolioFileID        *uuid.UUID    `json:"portfolio_file_id,omitempty"`
	EnglishResultFileID    *uuid.UUID    `json:"english_result_file_id,omitempty"`
	CertificateFileID      *uuid.UUID    `json:"certificate_file_id,omitempty"`
	PersonalityTestAnswers []AnswerInput `json:"personality_test_answers,omitempty"`
}

type AnswerInput struct {
	QuestionID uuid.UUID `json:"question_id" validate:"required"`
	OptionID   uuid.UUID `json:"option_id" validate:"required"`
}

type CreateResponse struct {
	ApplicationID uuid.UUID `json:"application_id"`
}

type StatusResponse struct {
	ApplicationID  uuid.UUID `json:"application_id"`
	ReviewStage    string    `json:"review_stage"`
	Decision       string    `json:"decision"`
	ScreeningError *string   `json:"screening_error"`
}

type User struct {
	ID              uuid.UUID `db:"id"`
	Role            string    `db:"role"`
	IsEmailVerified bool      `db:"is_email_verified"`
}

type Program struct {
	ID       int    `db:"id"`
	Code     string `db:"code"`
	IsActive bool   `db:"is_active"`
}

type FileRecord struct {
	ID               uuid.UUID  `db:"id"`
	UploadedByUserID uuid.UUID  `db:"uploaded_by_user_id"`
	ApplicationID    *uuid.UUID `db:"application_id"`
	FileType         string     `db:"file_type"`
}

type Application struct {
	ID             uuid.UUID `db:"id"`
	UserID         uuid.UUID `db:"user_id"`
	ProgramID      int       `db:"program_id"`
	ReviewStage    string    `db:"review_stage"`
	Decision       string    `db:"decision"`
	VideoFileID    uuid.UUID `db:"video_file_id"`
	ScreeningError *string   `db:"screening_error"`
	SubmittedAt    time.Time `db:"submitted_at"`
	CreatedAt      time.Time `db:"created_at"`
	UpdatedAt      time.Time `db:"updated_at"`
}

type SubmittedEvent struct {
	ApplicationID uuid.UUID `json:"application_id"`
}
