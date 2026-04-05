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
	StatusPending   = "pending"   // session created, not yet started
	StatusActive    = "active"    // interview in progress
	StatusCompleted = "completed" // all answers submitted, awaiting ML scoring
	StatusScored    = "scored"    // ML scoring result saved
	StatusExpired   = "expired"   // session expired before completion
	StatusCancelled = "cancelled" // user ended early
)

// ── Fixed interview questions (used until ML team delivers dynamic generation) ─

var DefaultQuestions = []string{
	"Why are you applying to inVision U?",
	"Which program are you interested in and why?",
	"What major challenge have you overcome, and what helped you through it?",
	"What are your long-term goals, and how will this program help you reach them? What motivates you in your life?",
	"What does being a leader mean to you? Could you share an example of a time you showed leadership?",
	"Does your family support your decision to join inVision U? Who is your biggest source of encouragement?",
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

// ── Score stored in JSONB ─────────────────────────────────────────────────────

type InterviewScore struct {
	MotivationScore    int    `json:"motivation_score"    db:"motivation_score"`
	LeadershipScore    int    `json:"leadership_score"    db:"leadership_score"`
	CommunicationScore int    `json:"communication_score" db:"communication_score"`
	StructureScore     int    `json:"structure_score"     db:"structure_score"`
	OverallScore       int    `json:"overall_score"       db:"overall_score"`
	Recommendation     string `json:"recommendation"      db:"recommendation"`
	ScoredBy           string `json:"scored_by"           db:"scored_by"`
	ScoredAt           string `json:"scored_at"           db:"scored_at"`
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

// ── DB models ─────────────────────────────────────────────────────────────────

// InterviewSession is the main aggregate stored in interview_sessions.
type InterviewSession struct {
	ID          uuid.UUID       `db:"id"           json:"session_id"`
	UserID      uuid.UUID       `db:"user_id"      json:"-"`
	Status      string          `db:"status"       json:"status"`
	Questions   StringList      `db:"questions"    json:"questions"`
	Answers     StringList      `db:"answers"      json:"answers,omitempty"`
	Score       *InterviewScore `db:"score"        json:"score,omitempty"`
	ExpiresAt   time.Time       `db:"expires_at"   json:"expires_at"`
	StartedAt   *time.Time      `db:"started_at"   json:"started_at,omitempty"`
	CompletedAt *time.Time      `db:"completed_at" json:"completed_at,omitempty"`
	CreatedAt   time.Time       `db:"created_at"   json:"created_at"`
	UpdatedAt   time.Time       `db:"updated_at"   json:"updated_at"`
}

// FullInterviewSession — расширенная модель для администраторов.
type FullInterviewSession struct {
	ID           uuid.UUID       `json:"id"                     db:"id"`
	UserID       uuid.UUID       `json:"user_id"                db:"user_id"`
	Status       string          `json:"status"                 db:"status"`
	Questions    StringList      `json:"questions"              db:"questions"`
	Answers      StringList      `json:"answers"                db:"answers"`
	Score        *InterviewScore `json:"score,omitempty"        db:"score"`
	ExpiresAt    time.Time       `json:"expires_at"             db:"expires_at"`
	StartedAt    *time.Time      `json:"started_at,omitempty"   db:"started_at"`
	CompletedAt  *time.Time      `json:"completed_at,omitempty" db:"completed_at"`
	LLMRawOutput *string         `json:"llm_raw_output,omitempty" db:"llm_raw_output"`
	ErrorLog     *string         `json:"error_log,omitempty"    db:"error_log"`
	CreatedAt    time.Time       `json:"created_at"             db:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"             db:"updated_at"`
}

// ── API request / response types ─────────────────────────────────────────────

type StartSessionRequest struct {
	ProgramCode string `json:"program_code" validate:"omitempty,max=64"`
}

type StartSessionResponse struct {
	SessionID      uuid.UUID `json:"session_id"`
	Status         string    `json:"status"`
	Questions      []string  `json:"questions"`
	ExpiresAt      time.Time `json:"expires_at"`
	TimeoutMinutes int       `json:"timeout_minutes"`
}

type SubmitAnswerRequest struct {
	Answer        string `json:"answer"         validate:"required,min=1,max=8000"`
	QuestionIndex int    `json:"question_index" validate:"gte=0"`
}

type SubmitAnswerResponse struct {
	SessionID     uuid.UUID `json:"session_id"`
	QuestionIndex int       `json:"question_index"`
	Accepted      bool      `json:"accepted"`
	AnsweredCount int       `json:"answered_count"`
	TotalCount    int       `json:"total_count"`
	IsComplete    bool      `json:"is_complete"`
}

type CompleteSessionRequest struct {
	TotalDurationSeconds int `json:"total_duration_seconds" validate:"gte=0"`
}

type CompleteSessionResponse struct {
	SessionID uuid.UUID       `json:"session_id"`
	Status    string          `json:"status"`
	Score     *InterviewScore `json:"score,omitempty"`
	Message   string          `json:"message"`
}

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