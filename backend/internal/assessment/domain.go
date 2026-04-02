package assessment

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

const (
	StatusActive    = "active"
	StatusAnswered  = "answered"
	StatusEvaluated = "evaluated"
	StatusExpired   = "expired"
)

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
	switch typed := value.(type) {
	case []byte:
		raw = typed
	case string:
		raw = []byte(typed)
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

type EvaluationPayload struct {
	OverallScore     int       `json:"overall_score"`
	LeadershipScore  int       `json:"leadership_score"`
	Reason           string    `json:"reason"`
	DetailedFeedback string    `json:"detailed_feedback"`
	EvaluatedAt      time.Time `json:"evaluated_at,omitempty"`
}

func (e EvaluationPayload) Value() (driver.Value, error) {
	data, err := json.Marshal(e)
	if err != nil {
		return nil, fmt.Errorf("marshal evaluation payload: %w", err)
	}
	return data, nil
}

func (e *EvaluationPayload) Scan(value any) error {
	if value == nil {
		*e = EvaluationPayload{}
		return nil
	}

	var raw []byte
	switch typed := value.(type) {
	case []byte:
		raw = typed
	case string:
		raw = []byte(typed)
	default:
		return fmt.Errorf("unsupported evaluation payload source type %T", value)
	}

	if err := json.Unmarshal(raw, e); err != nil {
		return fmt.Errorf("unmarshal evaluation payload: %w", err)
	}
	return nil
}

type AssessmentSession struct {
	ID              uuid.UUID         `db:"id" json:"session_id"`
	UserID          uuid.UUID         `db:"user_id" json:"-"`
	Specialization  string            `db:"specialization" json:"specialization"`
	CreatedAt       time.Time         `db:"created_at" json:"created_at"`
	ExpiresAt       time.Time         `db:"expires_at" json:"expires_at"`
	StartedAt       *time.Time        `db:"started_at" json:"started_at,omitempty"`
	CompletedAt     *time.Time        `db:"completed_at" json:"completed_at,omitempty"`
	Questions       StringList        `db:"questions" json:"questions"`
	Answers         StringList        `db:"answers" json:"answers,omitempty"`
	Evaluation      EvaluationPayload `db:"evaluation" json:"evaluation,omitempty"`
	OverallScore    *float64          `db:"overall_score" json:"overall_score,omitempty"`
	LeadershipScore *float64          `db:"leadership_score" json:"leadership_score,omitempty"`
	Status          string            `db:"status" json:"status"`
	LLMRawOutput    *string           `db:"llm_raw_output" json:"-"`
	ErrorLog        *string           `db:"error_log" json:"-"`
}

type EvaluationAudit struct {
	ID                  uuid.UUID         `db:"id" json:"id"`
	SessionID           uuid.UUID         `db:"session_id" json:"session_id"`
	LLMInputPrompt      string            `db:"llm_input_prompt" json:"llm_input_prompt"`
	LLMRawResponse      string            `db:"llm_raw_response" json:"llm_raw_response"`
	ParsedResult        EvaluationPayload `db:"parsed_result" json:"parsed_result"`
	EvaluationTimestamp time.Time         `db:"evaluation_timestamp" json:"evaluation_timestamp"`
	EvaluatorModel      string            `db:"evaluator_model" json:"evaluator_model"`
}

type GenerateQuestionsRequest struct {
	Specialization string `json:"specialization" validate:"required,min=2,max=100"`
	NumQuestions   int    `json:"num_questions" validate:"gte=0,lte=20"`
}

type GenerateQuestionsResponse struct {
	SessionID      uuid.UUID `json:"session_id"`
	Questions      []string  `json:"questions"`
	ExpiresAt      time.Time `json:"expires_at"`
	TimeoutMinutes int       `json:"timeout_minutes"`
}

type SubmitAnswersRequest struct {
	Answers []string `json:"answers" validate:"required,min=1,dive,required"`
}

type SubmitAnswersResponse struct {
	Status    string    `json:"status"`
	Message   string    `json:"message"`
	SessionID uuid.UUID `json:"session_id"`
}

type SessionStatusResponse struct {
	SessionID            uuid.UUID          `json:"session_id"`
	Status               string             `json:"status"`
	TimeRemainingSeconds int                `json:"time_remaining_seconds"`
	QuestionsCount       int                `json:"questions_count"`
	HasAnswers           bool               `json:"has_answers"`
	Evaluation           *EvaluationPayload `json:"evaluation"`
}

type openAIChatCompletionRequest struct {
	Model          string               `json:"model"`
	Messages       []openAIMessage      `json:"messages"`
	Temperature    float64              `json:"temperature"`
	MaxTokens      int                  `json:"max_tokens"`
	ResponseFormat openAIResponseFormat `json:"response_format"`
}

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIResponseFormat struct {
	Type string `json:"type"`
}

type openAIChatCompletionResponse struct {
	Choices []struct {
		Message openAIMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error,omitempty"`
}
