// Candidates
package candidates

import (
	"encoding/json"
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
	AIProbability  *float64  `db:"ai_probability" json:"ai_probability,omitempty"`
	IELTSScore     *float64  `db:"ielts_score" json:"ielts_score,omitempty"`
	ENTScore       *int      `db:"ent_score" json:"ent_score,omitempty"`
}

type ListResponse struct {
	Items []ListItem `json:"items"`
}

type Detail struct {
	ApplicationID               uuid.UUID      `json:"application_id"`
	Email                       string         `json:"email"`
	FirstName                   *string        `json:"first_name,omitempty"`
	LastName                    *string        `json:"last_name,omitempty"`
	PhoneNumber                 *string        `json:"phone_number,omitempty"`
	ProgramName                 string         `json:"program_name"`
	ReviewStage                 string         `json:"review_stage"`
	Decision                    string         `json:"decision"`
	VideoTranscript             *string        `json:"video_transcript,omitempty"`
	ScreeningError              *string        `json:"screening_error,omitempty"`
	AIProbability               *float64       `json:"ai_probability,omitempty"`
	IELTSScore                  *float64       `json:"ielts_score,omitempty"`
	ENTScore                    *int           `json:"ent_score,omitempty"`
	Files                       []DetailFile   `json:"files"`
	LatestScoringRun            *ScoringResult `json:"latest_scoring_run,omitempty"`
	LatestPersonalityScoringRun *ScoringResult `json:"latest_personality_scoring_run,omitempty"`
	LatestLLMScoringRun         *ScoringResult `json:"latest_llm_scoring_run,omitempty"`
}

type DetailFile struct {
	ID               uuid.UUID `db:"id" json:"id"`
	FileType         string    `db:"file_type" json:"file_type"`
	OriginalFilename string    `db:"original_filename" json:"original_filename"`
	ContentType      string    `db:"content_type" json:"content_type"`
	SizeBytes        int64     `db:"size_bytes" json:"size_bytes"`
}

type ScoringResult struct {
	ID             uuid.UUID       `db:"id"             json:"id"`
	ModelName      string          `db:"model_name"     json:"model_name"`
	Recommendation *string         `db:"recommendation" json:"recommendation"`
	ResultJSON     json.RawMessage `db:"result_json"    json:"result_json"`
	CreatedAt      time.Time       `db:"created_at"     json:"created_at"`
}

// AdvancedFilterParams holds all metric range constraints for the advanced filter endpoint.
// Every field is optional (zero value = no constraint).
type AdvancedFilterParams struct {
	// LLM aggregated_metrics ranges (scale 0–5)
	MotivationMin    *float64
	MotivationMax    *float64
	LeadershipMin    *float64
	LeadershipMax    *float64
	PlanningMin      *float64
	PlanningMax      *float64
	ResilienceMin    *float64
	ResilienceMax    *float64
	ValuesMin        *float64
	ValuesMax        *float64
	SocialSupportMin *float64
	SocialSupportMax *float64

	// global_score ranges (scale 0–5)
	AdmissionsPotentialMin *float64
	AdmissionsPotentialMax *float64
	LeadershipIndexMin     *float64
	LeadershipIndexMax     *float64

	// Standard list filters
	ProgramCode string
	ReviewStage string
	Decision    string
	Search      string
}

// AdvancedFilterResponse wraps the result for the advanced filter endpoint.
type AdvancedFilterResponse struct {
	Items []ListItem `json:"items"`
}

// SmartFilter preset identifiers — must match frontend PRESETS[].id values.
const (
	PresetHighPotentialLowEnglish     = "high_potential_low_english"
	PresetStrongMotivationWeakSoft    = "strong_motivation_weak_soft"
	PresetLowMotivationHighBackground = "low_motivation_high_background"
	PresetTop10Percent                = "top10_percent"
)

// ValidSmartFilterPresets is the full set of allowed preset values.
var ValidSmartFilterPresets = map[string]struct{}{
	PresetHighPotentialLowEnglish:     {},
	PresetStrongMotivationWeakSoft:    {},
	PresetLowMotivationHighBackground: {},
	PresetTop10Percent:                {},
}

// SmartFilterResponse wraps the result list for the smart-filter endpoint.
type SmartFilterResponse struct {
	Preset string     `json:"preset"`
	Items  []ListItem `json:"items"`
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
	AIProbability   *float64  `db:"ai_probability"`
	IELTSScore      *float64  `db:"ielts_score"`
	ENTScore        *int      `db:"ent_score"`
}
