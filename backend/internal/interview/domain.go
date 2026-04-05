package interview

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ── Session statuses ──────────────────────────────────────────────────────────

const (
	StatusPending   = "pending"    // session created, not yet started
	StatusActive    = "active"     // interview in progress
	StatusCompleted = "completed"  // all answers submitted, awaiting ML scoring
	StatusScored    = "scored"     // ML scoring result saved
	StatusExpired   = "expired"    // session expired before completion
	StatusCancelled = "cancelled"  // user ended early
)

// ── Fixed interview questions (used until ML team delivers dynamic generation) ─

var DefaultQuestions = []string{
	"Tell me a little about yourself — your background, interests, and what led you to apply to inVision University.",
	"Describe a significant challenge you have faced and how you overcame it. What did you learn from that experience?",
	"Why are you interested in this particular program, and how does it align with your long-term goals?",
	"Tell me about a time you showed leadership or took initiative in a group or project.",
	"Is there anything else you would like us to know about you that is not covered in your application?",
}

// SessionTimeoutMinutes is the max duration a session may stay active.
const SessionTimeoutMinutes = 60

// ── JSON-serialisable slice stored in JSONB ───────────────────────────────────

type StringList []string

func (s StringList) Value() (driver.Value, error) {
	if s == nil {
		return []byte("[]"), nil
	}
	data, err := json.Marshal([]string(s))
	if err != nil {
		return nil, fmt.Errorf("marshal string list: %w", err)
	}
	return data, nil
}

func (s *StringList) Scan(value any) error {
	if value == nil {
		*s = StringList{}
		return nil
	}
	var raw []byte
	switch v := value.(type) {
	case []byte:
		raw = v
	case string:
		raw = []byte(v)
	default:
		return fmt.Errorf("unsupported string list source type %T", value)
	}
	var items []string
	if err := json.Unmarshal(raw, &items); err != nil {
		return fmt.Errorf("unmarshal string list: %w", err)
	}
	*s = StringList(items)
	return nil
}

// ── Score stored in JSONB (filled by ML later, mocked now) ───────────────────

// InterviewScore is the ML scoring payload.  Fields mirror the final_interview_evaluation
// JSON examples already present in docs/jsons/.
// While ML is not ready, the backend returns a clearly-labelled mock value.
type InterviewScore struct {
	MotivationScore      int    `json:"motivation_score"`
	LeadershipScore      int    `json:"leadership_score"`
	CommunicationScore   int    `json:"communication_score"`
	StructureScore       int    `json:"structure_score"`
	OverallScore         int    `json:"overall_score"`
	Recommendation       string `json:"recommendation"`
	ScoredBy             string `json:"scored_by"`       // "mock" | "ml_service"
	ScoredAt             string `json:"scored_at"`
}

func (s InterviewScore) Value() (driver.Value, error) {
	data, err := json.Marshal(s)
	if err != nil {
		return nil, fmt.Errorf("marshal interview score: %w", err)
	}
	return data, nil
}

func (s *InterviewScore) Scan(value any) error {
	if value == nil {
		*s = InterviewScore{}
		return nil
	}
	var raw []byte
	switch v := value.(type) {
	case []byte:
		raw = v
	case string:
		raw = []byte(v)
	default:
		return fmt.Errorf("unsupported interview score source type %T", value)
	}
	if err := json.Unmarshal(raw, s); err != nil {
		return fmt.Errorf("unmarshal interview score: %w", err)
	}
	return nil
}

// ── DB model ──────────────────────────────────────────────────────────────────

// InterviewSession is the main aggregate stored in interview_sessions.
type InterviewSession struct {
	ID          uuid.UUID      `db:"id"           json:"session_id"`
	UserID      uuid.UUID      `db:"user_id"      json:"-"`
	Status      string         `db:"status"       json:"status"`
	Questions   StringList     `db:"questions"    json:"questions"`
	Answers     StringList     `db:"answers"      json:"answers,omitempty"`
	Score       *InterviewScore `db:"score"       json:"score,omitempty"`
	ExpiresAt   time.Time      `db:"expires_at"   json:"expires_at"`
	StartedAt   *time.Time     `db:"started_at"   json:"started_at,omitempty"`
	CompletedAt *time.Time     `db:"completed_at" json:"completed_at,omitempty"`
	CreatedAt   time.Time      `db:"created_at"   json:"created_at"`
	UpdatedAt   time.Time      `db:"updated_at"   json:"updated_at"`
}

// ── API request / response types ─────────────────────────────────────────────

// StartSessionRequest is the payload for POST /api/v1/interview/sessions.
type StartSessionRequest struct {
	// ProgramCode is optional; used later to tailor question generation.
	ProgramCode string `json:"program_code" validate:"omitempty,max=64"`
}

// StartSessionResponse is returned when a new session is created.
type StartSessionResponse struct {
	SessionID      uuid.UUID  `json:"session_id"`
	Status         string     `json:"status"`
	Questions      []string   `json:"questions"`
	ExpiresAt      time.Time  `json:"expires_at"`
	TimeoutMinutes int        `json:"timeout_minutes"`
}

// SubmitAnswerRequest is the payload for POST /api/v1/interview/sessions/:id/answers/:index.
// The frontend sends one answer at a time, immediately after each question.
type SubmitAnswerRequest struct {
	// Answer is the transcribed or typed text from the user.
	Answer string `json:"answer" validate:"required,min=1,max=8000"`
	// QuestionIndex is the 0-based index of the question being answered.
	// Validated server-side against the session's question list.
	QuestionIndex int `json:"question_index" validate:"gte=0"`
}

// SubmitAnswerResponse acknowledges receipt of a single answer.
type SubmitAnswerResponse struct {
	SessionID     uuid.UUID `json:"session_id"`
	QuestionIndex int       `json:"question_index"`
	Accepted      bool      `json:"accepted"`
	AnsweredCount int       `json:"answered_count"`
	TotalCount    int       `json:"total_count"`
	IsComplete    bool      `json:"is_complete"`
}

// CompleteSessionRequest is the payload for POST /api/v1/interview/sessions/:id/complete.
// The frontend sends this after the user finishes the last question.
type CompleteSessionRequest struct {
	// TotalDurationSeconds is the wall-clock length of the interview for analytics.
	TotalDurationSeconds int `json:"total_duration_seconds" validate:"gte=0"`
}

// CompleteSessionResponse confirms the session is closed and describes next steps.
type CompleteSessionResponse struct {
	SessionID   uuid.UUID       `json:"session_id"`
	Status      string          `json:"status"`
	Score       *InterviewScore `json:"score,omitempty"`
	Message     string          `json:"message"`
}

// SessionStatusResponse is returned by GET /api/v1/interview/sessions/:id.
type SessionStatusResponse struct {
	SessionID            uuid.UUID       `json:"session_id"`
	Status               string          `json:"status"`
	Questions            []string        `json:"questions"`
	AnsweredCount        int             `json:"answered_count"`
	TotalCount           int             `json:"total_count"`
	TimeRemainingSeconds int             `json:"time_remaining_seconds"`
	Score                *InterviewScore `json:"score,omitempty"`
	StartedAt            *time.Time      `json:"started_at,omitempty"`
	CompletedAt          *time.Time      `json:"completed_at,omitempty"`
}