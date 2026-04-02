package assessment

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/timekit"
	"github.com/google/uuid"
)

type stubRepository struct {
	session           *AssessmentSession
	createdSession    *AssessmentSession
	savedAnswers      []string
	savedStatus       string
	savedErrorLog     string
	savedEvaluation   *EvaluationPayload
	createdAudit      bool
	findErr           error
	createErr         error
	saveAnswersErr    error
	updateStatusErr   error
	saveEvaluationErr error
	saveErrorLogErr   error
	createAuditErr    error
}

func (r *stubRepository) CreateSession(userID uuid.UUID, specialization string, expiresAt time.Time, questions []string) (*AssessmentSession, error) {
	if r.createErr != nil {
		return nil, r.createErr
	}
	r.createdSession = &AssessmentSession{
		ID:             uuid.New(),
		UserID:         userID,
		Specialization: specialization,
		ExpiresAt:      expiresAt,
		Questions:      StringList(questions),
		Status:         StatusActive,
	}
	return r.createdSession, nil
}

func (r *stubRepository) FindSessionByID(id uuid.UUID) (*AssessmentSession, error) {
	if r.findErr != nil {
		return nil, r.findErr
	}
	return r.session, nil
}

func (r *stubRepository) UpdateSessionStatus(id uuid.UUID, status string) error {
	if r.updateStatusErr != nil {
		return r.updateStatusErr
	}
	r.savedStatus = status
	return nil
}

func (r *stubRepository) SaveAnswers(id uuid.UUID, answers []string, startedAt time.Time) error {
	if r.saveAnswersErr != nil {
		return r.saveAnswersErr
	}
	r.savedAnswers = answers
	return nil
}

func (r *stubRepository) SaveEvaluation(id uuid.UUID, evaluation EvaluationPayload, rawOutput string, completedAt time.Time) error {
	if r.saveEvaluationErr != nil {
		return r.saveEvaluationErr
	}
	evaluation.EvaluatedAt = completedAt
	r.savedEvaluation = &evaluation
	return nil
}

func (r *stubRepository) SaveErrorLog(id uuid.UUID, errorLog string) error {
	if r.saveErrorLogErr != nil {
		return r.saveErrorLogErr
	}
	r.savedErrorLog = errorLog
	return nil
}

func (r *stubRepository) CreateEvaluationAudit(sessionID uuid.UUID, prompt string, rawResponse string, parsedResult EvaluationPayload, evaluatorModel string) error {
	if r.createAuditErr != nil {
		return r.createAuditErr
	}
	r.createdAudit = true
	return nil
}

type stubLLMClient struct {
	questions     []string
	evaluation    EvaluationPayload
	rawResponse   string
	prompt        string
	generateErr   error
	evaluationErr error
}

func (c *stubLLMClient) GenerateQuestions(ctx context.Context, specialization string, numQuestions int) ([]string, error) {
	if c.generateErr != nil {
		return nil, c.generateErr
	}
	return c.questions, nil
}

func (c *stubLLMClient) EvaluateAnswers(ctx context.Context, session *AssessmentSession, timeoutMinutes int) (EvaluationPayload, string, string, error) {
	if c.evaluationErr != nil {
		return EvaluationPayload{}, "", "", c.evaluationErr
	}
	return c.evaluation, c.rawResponse, c.prompt, nil
}

func TestServiceGenerateQuestionsCreatesSessionWithConfiguredTimeout(t *testing.T) {
	now := time.Date(2026, 4, 2, 12, 0, 0, 0, time.UTC)
	timekit.SetDefaultClock(timekit.FakeClock{T: now})
	t.Cleanup(func() { timekit.SetDefaultClock(timekit.UTCClock{}) })

	repo := &stubRepository{}
	llm := &stubLLMClient{questions: []string{"Q1", "Q2", "Q3", "Q4", "Q5"}}
	svc := NewService(repo, llm, &config.Config{Assessment: config.AssessmentConfig{TimeoutMinutes: 15}})

	userID := uuid.New()
	response, err := svc.GenerateQuestions(context.Background(), userID, GenerateQuestionsRequest{
		Specialization: "Backend Engineer",
		NumQuestions:   5,
	})
	if err != nil {
		t.Fatalf("GenerateQuestions() error = %v", err)
	}

	if response.TimeoutMinutes != 15 {
		t.Fatalf("TimeoutMinutes = %d; want 15", response.TimeoutMinutes)
	}
	if !response.ExpiresAt.Equal(now.Add(15 * time.Minute)) {
		t.Fatalf("ExpiresAt = %v; want %v", response.ExpiresAt, now.Add(15*time.Minute))
	}
	if repo.createdSession == nil || repo.createdSession.UserID != userID {
		t.Fatalf("session was not created for user %s", userID)
	}
}

func TestServiceSubmitAnswersRejectsAnswerCountMismatch(t *testing.T) {
	userID := uuid.New()
	sessionID := uuid.New()
	repo := &stubRepository{
		session: &AssessmentSession{
			ID:        sessionID,
			UserID:    userID,
			ExpiresAt: time.Now().Add(time.Hour),
			Questions: StringList{"Q1", "Q2"},
			Status:    StatusActive,
		},
	}
	svc := NewService(repo, &stubLLMClient{}, &config.Config{Assessment: config.AssessmentConfig{TimeoutMinutes: 15}})

	_, err := svc.SubmitAnswers(userID, sessionID, SubmitAnswersRequest{Answers: []string{"only one"}})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("SubmitAnswers() error = %v; want ErrInvalidInput", err)
	}
}

func TestServiceEvaluateRejectsExpiredSession(t *testing.T) {
	now := time.Date(2026, 4, 2, 12, 0, 0, 0, time.UTC)
	timekit.SetDefaultClock(timekit.FakeClock{T: now})
	t.Cleanup(func() { timekit.SetDefaultClock(timekit.UTCClock{}) })

	userID := uuid.New()
	sessionID := uuid.New()
	repo := &stubRepository{
		session: &AssessmentSession{
			ID:        sessionID,
			UserID:    userID,
			ExpiresAt: now.Add(-time.Minute),
			Questions: StringList{"Q1"},
			Answers:   StringList{"A1"},
			Status:    StatusAnswered,
		},
	}
	svc := NewService(repo, &stubLLMClient{}, &config.Config{Assessment: config.AssessmentConfig{TimeoutMinutes: 15}})

	_, err := svc.Evaluate(userID, sessionID, context.Background())
	if !errors.Is(err, ErrAssessmentExpired) {
		t.Fatalf("Evaluate() error = %v; want ErrAssessmentExpired", err)
	}
	if repo.savedStatus != StatusExpired {
		t.Fatalf("saved status = %q; want %q", repo.savedStatus, StatusExpired)
	}
}

func TestServiceEvaluateReturnsCachedEvaluation(t *testing.T) {
	userID := uuid.New()
	sessionID := uuid.New()
	completedAt := time.Date(2026, 4, 2, 12, 30, 0, 0, time.UTC)
	repo := &stubRepository{
		session: &AssessmentSession{
			ID:        sessionID,
			UserID:    userID,
			ExpiresAt: completedAt.Add(time.Hour),
			Questions: StringList{"Q1"},
			Answers:   StringList{"A1"},
			Status:    StatusEvaluated,
			Evaluation: EvaluationPayload{
				OverallScore:     81,
				LeadershipScore:  86,
				Reason:           "Good",
				DetailedFeedback: "Detailed",
			},
			CompletedAt: &completedAt,
		},
	}
	svc := NewService(repo, &stubLLMClient{}, &config.Config{Assessment: config.AssessmentConfig{TimeoutMinutes: 15}})

	evaluation, err := svc.Evaluate(userID, sessionID, context.Background())
	if err != nil {
		t.Fatalf("Evaluate() error = %v", err)
	}
	if evaluation.OverallScore != 81 || evaluation.LeadershipScore != 86 {
		t.Fatalf("unexpected cached evaluation: %+v", evaluation)
	}
}

func TestServiceEvaluatePersistsErrorLogOnLLMFailure(t *testing.T) {
	userID := uuid.New()
	sessionID := uuid.New()
	repo := &stubRepository{
		session: &AssessmentSession{
			ID:        sessionID,
			UserID:    userID,
			ExpiresAt: time.Now().Add(time.Hour),
			Questions: StringList{"Q1"},
			Answers:   StringList{"A1"},
			Status:    StatusAnswered,
		},
	}
	svc := NewService(repo, &stubLLMClient{evaluationErr: errors.New("invalid json")}, &config.Config{Assessment: config.AssessmentConfig{TimeoutMinutes: 15}})

	_, err := svc.Evaluate(userID, sessionID, context.Background())
	if err == nil {
		t.Fatalf("Evaluate() error = nil; want non-nil")
	}
	if repo.savedErrorLog == "" {
		t.Fatalf("expected error log to be saved")
	}
}

func TestServiceEvaluateClampsScoresAndWritesAudit(t *testing.T) {
	now := time.Date(2026, 4, 2, 12, 0, 0, 0, time.UTC)
	timekit.SetDefaultClock(timekit.FakeClock{T: now})
	t.Cleanup(func() { timekit.SetDefaultClock(timekit.UTCClock{}) })

	userID := uuid.New()
	sessionID := uuid.New()
	repo := &stubRepository{
		session: &AssessmentSession{
			ID:             sessionID,
			UserID:         userID,
			Specialization: "Backend",
			ExpiresAt:      now.Add(time.Hour),
			Questions:      StringList{"Q1"},
			Answers:        StringList{"A1"},
			Status:         StatusAnswered,
		},
	}
	llm := &stubLLMClient{
		evaluation: EvaluationPayload{
			OverallScore:     120,
			LeadershipScore:  -5,
			Reason:           "Strong",
			DetailedFeedback: "Detailed",
		},
		rawResponse: `{"overall_score":120}`,
		prompt:      "prompt",
	}
	svc := NewService(repo, llm, &config.Config{
		Assessment: config.AssessmentConfig{TimeoutMinutes: 15},
		LLM:        config.LLMConfig{EvaluationModel: "gpt-4o-mini"},
	})

	evaluation, err := svc.Evaluate(userID, sessionID, context.Background())
	if err != nil {
		t.Fatalf("Evaluate() error = %v", err)
	}
	if evaluation.OverallScore != 100 || evaluation.LeadershipScore != 0 {
		t.Fatalf("scores = (%d,%d); want (100,0)", evaluation.OverallScore, evaluation.LeadershipScore)
	}
	if repo.savedEvaluation == nil || !repo.createdAudit {
		t.Fatalf("expected evaluation and audit to be persisted")
	}
}
