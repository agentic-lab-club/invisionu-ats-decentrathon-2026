package assessment

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/timekit"
	"github.com/google/uuid"
)

var (
	ErrSessionNotFound   = errors.New("assessment session not found")
	ErrAssessmentExpired = errors.New("assessment time expired")
	ErrSessionForbidden  = errors.New("assessment session forbidden")
	ErrAnswersMissing    = errors.New("assessment answers not submitted")
	ErrInvalidInput      = errors.New("invalid assessment input")
)

type SessionRepository interface {
	CreateSession(userID uuid.UUID, specialization string, expiresAt time.Time, questions []string) (*AssessmentSession, error)
	FindSessionByID(id uuid.UUID) (*AssessmentSession, error)
	UpdateSessionStatus(id uuid.UUID, status string) error
	SaveAnswers(id uuid.UUID, answers []string, startedAt time.Time) error
	SaveEvaluation(id uuid.UUID, evaluation EvaluationPayload, rawOutput string, completedAt time.Time) error
	SaveErrorLog(id uuid.UUID, errorLog string) error
	CreateEvaluationAudit(sessionID uuid.UUID, prompt string, rawResponse string, parsedResult EvaluationPayload, evaluatorModel string) error
}

type LLMClient interface {
	GenerateQuestions(ctx context.Context, specialization string, numQuestions int) ([]string, error)
	EvaluateAnswers(ctx context.Context, session *AssessmentSession, timeoutMinutes int) (EvaluationPayload, string, string, error)
}

type Service struct {
	repo      SessionRepository
	llmClient LLMClient
	cfg       *config.Config
}

func NewService(repo SessionRepository, llmClient LLMClient, cfg *config.Config) *Service {
	return &Service{repo: repo, llmClient: llmClient, cfg: cfg}
}

func (s *Service) GenerateQuestions(ctx context.Context, userID uuid.UUID, req GenerateQuestionsRequest) (*GenerateQuestionsResponse, error) {
	specialization := strings.TrimSpace(req.Specialization)
	if specialization == "" {
		return nil, fmt.Errorf("%w: specialization is required", ErrInvalidInput)
	}

	numQuestions := req.NumQuestions
	if numQuestions == 0 {
		numQuestions = 5
	}

	questions, err := s.llmClient.GenerateQuestions(ctx, specialization, numQuestions)
	if err != nil {
		return nil, fmt.Errorf("failed to generate questions: %w", err)
	}
	if len(questions) != numQuestions {
		return nil, fmt.Errorf("failed to generate exact number of questions")
	}

	expiresAt := timekit.NowUTC().Add(time.Duration(s.cfg.Assessment.TimeoutMinutes) * time.Minute)
	session, err := s.repo.CreateSession(userID, specialization, expiresAt, questions)
	if err != nil {
		return nil, err
	}

	return &GenerateQuestionsResponse{
		SessionID:      session.ID,
		Questions:      questions,
		ExpiresAt:      expiresAt,
		TimeoutMinutes: s.cfg.Assessment.TimeoutMinutes,
	}, nil
}

func (s *Service) GetSessionStatus(userID uuid.UUID, sessionID uuid.UUID) (*SessionStatusResponse, error) {
	session, err := s.loadOwnedSession(userID, sessionID)
	if err != nil {
		return nil, err
	}

	now := timekit.NowUTC()
	if session.Status != StatusEvaluated && now.After(session.ExpiresAt) {
		if err := s.repo.UpdateSessionStatus(session.ID, StatusExpired); err != nil {
			return nil, err
		}
		session.Status = StatusExpired
	}

	var evaluation *EvaluationPayload
	if session.Status == StatusEvaluated || session.CompletedAt != nil {
		evaluated := session.Evaluation
		if evaluated.EvaluatedAt.IsZero() && session.CompletedAt != nil {
			evaluated.EvaluatedAt = *session.CompletedAt
		}
		evaluation = &evaluated
	}

	return &SessionStatusResponse{
		SessionID:            session.ID,
		Status:               session.Status,
		TimeRemainingSeconds: max(0, int(session.ExpiresAt.Sub(now).Seconds())),
		QuestionsCount:       len(session.Questions),
		HasAnswers:           len(session.Answers) > 0,
		Evaluation:           evaluation,
	}, nil
}

func (s *Service) SubmitAnswers(userID uuid.UUID, sessionID uuid.UUID, req SubmitAnswersRequest) (*SubmitAnswersResponse, error) {
	session, err := s.loadOwnedSession(userID, sessionID)
	if err != nil {
		return nil, err
	}

	if timekit.NowUTC().After(session.ExpiresAt) {
		if err := s.repo.UpdateSessionStatus(session.ID, StatusExpired); err != nil {
			return nil, err
		}
		return nil, ErrAssessmentExpired
	}

	answers := sanitizeAnswers(req.Answers)
	if len(answers) != len(session.Questions) {
		return nil, fmt.Errorf("%w: expected %d answers, got %d", ErrInvalidInput, len(session.Questions), len(answers))
	}

	if err := s.repo.SaveAnswers(session.ID, answers, timekit.NowUTC()); err != nil {
		return nil, err
	}

	return &SubmitAnswersResponse{
		Status:    "ok",
		Message:   "Answers saved. Evaluation can be started.",
		SessionID: session.ID,
	}, nil
}

func (s *Service) Evaluate(userID uuid.UUID, sessionID uuid.UUID, ctx context.Context) (*EvaluationPayload, error) {
	session, err := s.loadOwnedSession(userID, sessionID)
	if err != nil {
		return nil, err
	}

	if len(session.Answers) == 0 {
		return nil, ErrAnswersMissing
	}

	if session.Status == StatusEvaluated {
		evaluation := session.Evaluation
		if evaluation.EvaluatedAt.IsZero() && session.CompletedAt != nil {
			evaluation.EvaluatedAt = *session.CompletedAt
		}
		return &evaluation, nil
	}

	if timekit.NowUTC().After(session.ExpiresAt) {
		if err := s.repo.UpdateSessionStatus(session.ID, StatusExpired); err != nil {
			return nil, err
		}
		return nil, ErrAssessmentExpired
	}

	evaluation, rawResponse, prompt, err := s.llmClient.EvaluateAnswers(ctx, session, s.cfg.Assessment.TimeoutMinutes)
	if err != nil {
		saveErr := s.repo.SaveErrorLog(session.ID, err.Error())
		if saveErr != nil {
			return nil, fmt.Errorf("failed to save assessment error log: %w", saveErr)
		}
		return nil, fmt.Errorf("failed to evaluate assessment answers: %w", err)
	}

	evaluation.OverallScore = clampScore(evaluation.OverallScore)
	evaluation.LeadershipScore = clampScore(evaluation.LeadershipScore)
	evaluation.EvaluatedAt = timekit.NowUTC()

	if err := s.repo.SaveEvaluation(session.ID, evaluation, rawResponse, evaluation.EvaluatedAt); err != nil {
		return nil, err
	}

	if err := s.repo.CreateEvaluationAudit(session.ID, prompt, rawResponse, evaluation, s.cfg.LLMAssessment.EvaluationModel); err != nil {
		return nil, err
	}

	return &evaluation, nil
}

func (s *Service) loadOwnedSession(userID uuid.UUID, sessionID uuid.UUID) (*AssessmentSession, error) {
	session, err := s.repo.FindSessionByID(sessionID)
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, ErrSessionNotFound
	}
	if session.UserID != userID {
		return nil, ErrSessionForbidden
	}
	return session, nil
}

func sanitizeAnswers(answers []string) []string {
	result := make([]string, 0, len(answers))
	for _, answer := range answers {
		trimmed := strings.TrimSpace(answer)
		if trimmed == "" {
			continue
		}
		result = append(result, trimmed)
	}
	return result
}

func clampScore(score int) int {
	if score < 0 {
		return 0
	}
	if score > 100 {
		return 100
	}
	return score
}
