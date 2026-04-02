<<<<<<< HEAD
// Candidates
=======
>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
package candidates

import (
	"time"

	"github.com/google/uuid"
)

type ListItem struct {
	ApplicationID  uuid.UUID `db:"application_id" json:"application_id"`
	FullName       string    `db:"full_name" json:"full_name"`
	ProgramName    string    `db:"program_name" json:"program_name"`
	ReviewStage    string    `db:"review_stage" json:"review_stage"`
	Decision       string    `db:"decision" json:"decision"`
	Recommendation *string   `db:"recommendation" json:"recommendation"`
}

type ListResponse struct {
	Items []ListItem `json:"items"`
}

type Detail struct {
<<<<<<< HEAD
    ApplicationID   uuid.UUID      `json:"application_id"`
    Email           string         `json:"email"`
    FirstName       *string        `json:"first_name,omitempty"`
    LastName        *string        `json:"last_name,omitempty"`
    PhoneNumber     *string        `json:"phone_number,omitempty"`
    ProgramName     string         `json:"program_name"`
    ReviewStage     string         `json:"review_stage"`
    Decision        string         `json:"decision"`
    VideoTranscript *string        `json:"video_transcript,omitempty"`
    ScreeningError  *string        `json:"screening_error,omitempty"`
    Files           []DetailFile   `json:"files"`
    LatestScoringRun *ScoringResult `json:"latest_scoring_run,omitempty"`
=======
	ApplicationID    uuid.UUID      `json:"application_id"`
	Email            string         `json:"email"`
	FirstName        *string        `json:"first_name,omitempty"`
	LastName         *string        `json:"last_name,omitempty"`
	PhoneNumber      *string        `json:"phone_number,omitempty"`
	ProgramName      string         `json:"program_name"`
	ReviewStage      string         `json:"review_stage"`
	Decision         string         `json:"decision"`
	VideoTranscript  *string        `json:"video_transcript,omitempty"`
	ScreeningError   *string        `json:"screening_error,omitempty"`
	Files            []DetailFile   `json:"files"`
	LatestScoringRun *ScoringResult `json:"latest_scoring_run,omitempty"`
>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
}

type DetailFile struct {
	ID               uuid.UUID `db:"id" json:"id"`
	FileType         string    `db:"file_type" json:"file_type"`
	OriginalFilename string    `db:"original_filename" json:"original_filename"`
	ContentType      string    `db:"content_type" json:"content_type"`
	SizeBytes        int64     `db:"size_bytes" json:"size_bytes"`
}

type ScoringResult struct {
<<<<<<< HEAD
    ID             uuid.UUID        `db:"id"             json:"id"`
    ModelName      string           `db:"model_name"     json:"model_name"`
    Recommendation *string          `db:"recommendation" json:"recommendation"`
    ResultJSON     json.RawMessage  `db:"result_json"    json:"result_json"` // []byte → json.RawMessage
    CreatedAt      time.Time        `db:"created_at"     json:"created_at"`
=======
	ID             uuid.UUID `db:"id" json:"id"`
	ModelName      string    `db:"model_name" json:"model_name"`
	Recommendation string    `db:"recommendation" json:"recommendation"`
	ResultJSON     []byte    `db:"result_json" json:"result_json"`
	CreatedAt      time.Time `db:"created_at" json:"created_at"`
>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
}

type UpdateStageRequest struct {
	ReviewStage string  `json:"review_stage" validate:"required,oneof=initial_screening application_review decision"`
	Decision    *string `json:"decision,omitempty" validate:"omitempty,oneof=pending accepted rejected"`
}

type detailRow struct {
	ApplicationID   uuid.UUID `db:"application_id"`
	Email           string    `db:"email"`
	FirstName       *string   `db:"first_name"`
	LastName        *string   `db:"last_name"`
	PhoneNumber     *string   `db:"phone_number"`
	ProgramName     string    `db:"program_name"`
	ReviewStage     string    `db:"review_stage"`
	Decision        string    `db:"decision"`
	VideoTranscript *string   `db:"video_transcript"`
	ScreeningError  *string   `db:"screening_error"`
}
