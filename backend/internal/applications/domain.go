package applications

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
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

	ScreeningStatusPending    = "pending"
	ScreeningStatusProcessing = "processing"
	ScreeningStatusCompleted  = "completed"
	ScreeningStatusFailed     = "failed"

	FileTypeVideoPresentation = "video_presentation"
	FileTypeVideoAudio        = "video_audio"
	FileTypePortfolio         = "portfolio"
	FileTypeEnglishResult     = "english_result"
	FileTypeCertificate       = "certificate"
)

// JSONMap — обёртка для хранения map[string]interface{} в PostgreSQL JSONB колонке.
type JSONMap map[string]interface{}

func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	b, err := json.Marshal(j)
	if err != nil {
		return nil, fmt.Errorf("JSONMap marshal error: %w", err)
	}
	return string(b), nil
}

func (j *JSONMap) Scan(src interface{}) error {
	var source []byte
	switch v := src.(type) {
	case string:
		source = []byte(v)
	case []byte:
		source = v
	case nil:
		*j = nil
		return nil
	default:
		return fmt.Errorf("JSONMap: unsupported type %T", src)
	}
	result := make(map[string]interface{})
	if err := json.Unmarshal(source, &result); err != nil {
		return fmt.Errorf("JSONMap unmarshal error: %w", err)
	}
	*j = result
	return nil
}

// ─── Request / Response ──────────────────────────────────────────────────────

type CreateRequest struct {
	FirstName              string        `json:"first_name"    validate:"required,min=1,max=255"`
	LastName               string        `json:"last_name"     validate:"required,min=1,max=255"`
	PhoneNumber            string        `json:"phone_number"  validate:"required,min=3,max=64"`
	ProgramCode            string        `json:"program_code"  validate:"required"`
	VideoFileID            uuid.UUID     `json:"video_file_id" validate:"required"`
	PortfolioFileID        *uuid.UUID    `json:"portfolio_file_id,omitempty"`
	EnglishResultFileID    *uuid.UUID    `json:"english_result_file_id,omitempty"`
	CertificateFileID      *uuid.UUID    `json:"certificate_file_id,omitempty"`
	PersonalityTestAnswers []AnswerInput `json:"personality_test_answers,omitempty"`
}

type AnswerInput struct {
	QuestionID uuid.UUID `json:"question_id" validate:"required"`
	OptionID   uuid.UUID `json:"option_id"   validate:"required"`
}

type CreateResponse struct {
	ApplicationID uuid.UUID `json:"application_id"`
}

type StatusResponse struct {
	ApplicationID   uuid.UUID `json:"application_id" db:"application_id"`
	ReviewStage     string    `json:"review_stage"   db:"review_stage"`
	Decision        string    `json:"decision"       db:"decision"`
	ScreeningStatus string    `json:"screening_status" db:"screening_status"`
	ScreeningError  *string   `json:"screening_error" db:"screening_error"`
}

// ─── Domain entities ─────────────────────────────────────────────────────────

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
	BucketName       string     `db:"bucket_name"`
	ObjectKey        string     `db:"object_key"`
	OriginalFilename string     `db:"original_filename"`
	ContentType      string     `db:"content_type"`
	SizeBytes        int64      `db:"size_bytes"`
	ETag             string     `db:"etag"`
	CreatedAt        time.Time  `db:"created_at"`
}

type Application struct {
	ID               uuid.UUID  `db:"id"`
	UserID           uuid.UUID  `db:"user_id"`
	ProgramID        int        `db:"program_id"`
	ReviewStage      string     `db:"review_stage"`
	Decision         string     `db:"decision"`
	VideoFileID      uuid.UUID  `db:"video_file_id"`
	VideoAudioFileID *uuid.UUID `db:"video_audio_file_id"`
	VideoTranscript  *string    `db:"video_transcript"`
	ScreeningStatus  string     `db:"screening_status"`
	ScreeningError   *string    `db:"screening_error"`
	SubmittedAt      time.Time  `db:"submitted_at"`
	CreatedAt        time.Time  `db:"created_at"`
	UpdatedAt        time.Time  `db:"updated_at"`
}

// ScoringRun хранит результат скоринга для заявки.
// ResultJSON сериализуется в JSONB через тип JSONMap.
type ScoringRun struct {
	ID             uuid.UUID `db:"id"`
	ApplicationID  uuid.UUID `db:"application_id"`
	ModelName      string    `db:"model_name"`
	ResultJSON     JSONMap   `db:"result_json"`
	Recommendation *string   `db:"recommendation"` // nullable — LLM заполняет позже
	CreatedAt      time.Time `db:"created_at"`
}

// ─── Personality test ────────────────────────────────────────────────────────

type PersonalityOptionMetrics struct {
	M int `db:"m"`
	P int `db:"p"`
	R int `db:"r"`
	L int `db:"l"`
	V int `db:"v"`
}

// ─── Events ──────────────────────────────────────────────────────────────────

type SubmittedEvent struct {
	ApplicationID uuid.UUID `json:"application_id"`
}
