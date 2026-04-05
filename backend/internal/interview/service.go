package interview

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/timekit"
	"github.com/google/uuid"
)

var (
	ErrSessionNotFound  = errors.New("interview session not found")
	ErrSessionForbidden = errors.New("interview session forbidden")
	ErrSessionExpired   = errors.New("interview session expired")
	ErrSessionNotActive = errors.New("interview session is not active")
	ErrAlreadyCompleted = errors.New("interview session already completed")
	ErrAnswerOutOfRange = errors.New("question index out of range")
	ErrInvalidInput     = errors.New("invalid input")
)

// SessionRepo is the interface the Service depends on.
type SessionRepo interface {
	CreateSession(userID uuid.UUID, questions []string, expiresAt time.Time) (*InterviewSession, error)
	FindByID(id uuid.UUID) (*InterviewSession, error)
	FindActiveByUser(userID uuid.UUID) (*InterviewSession, error)
	SetActive(id uuid.UUID) error
	AppendAnswer(id uuid.UUID, answerText string) error
	SaveScore(id uuid.UUID, score InterviewScore, completedAt time.Time) error
	UpdateStatus(id uuid.UUID, status string) error
}

// Service contains all business logic for interview sessions.
type Service struct {
	repo SessionRepo
}

func NewService(repo SessionRepo) *Service {
	return &Service{repo: repo}
}

// ── StartSession ──────────────────────────────────────────────────────────────

// StartSession creates a fresh interview session for the user.
// If the user already has a pending/active session, that session is returned
// instead of creating a duplicate (idempotent).
func (s *Service) StartSession(userID uuid.UUID, req StartSessionRequest) (*StartSessionResponse, error) {
	// Idempotency: reuse existing active/pending session.
	existing, err := s.repo.FindActiveByUser(userID)
	if err != nil {
		return nil, fmt.Errorf("interview: start session lookup: %w", err)
	}
	if existing != nil {
		// Refresh expiry check.
		if timekit.NowUTC().After(existing.ExpiresAt) {
			if err := s.repo.UpdateStatus(existing.ID, StatusExpired); err != nil {
				return nil, err
			}
			// Fall through to create a new session.
		} else {
			return buildStartResponse(existing), nil
		}
	}

	questions := DefaultQuestions
	// TODO: when ML team delivers dynamic question generation wired to
	// req.ProgramCode, replace DefaultQuestions with a call to the ML service.

	expiresAt := timekit.NowUTC().Add(SessionTimeoutMinutes * time.Minute)
	session, err := s.repo.CreateSession(userID, questions, expiresAt)
	if err != nil {
		return nil, fmt.Errorf("interview: create session: %w", err)
	}

	// Mark immediately as active so the timer begins on the client side.
	if err := s.repo.SetActive(session.ID); err != nil {
		return nil, fmt.Errorf("interview: activate session: %w", err)
	}
	session.Status = StatusActive

	return buildStartResponse(session), nil
}

// ── GetStatus ─────────────────────────────────────────────────────────────────

// GetStatus returns the current state of a session owned by the user.
func (s *Service) GetStatus(userID uuid.UUID, sessionID uuid.UUID) (*SessionStatusResponse, error) {
	session, err := s.loadOwned(userID, sessionID)
	if err != nil {
		return nil, err
	}

	s.maybeExpire(session)

	remaining := max(0, int(session.ExpiresAt.Sub(timekit.NowUTC()).Seconds()))

	return &SessionStatusResponse{
		SessionID:            session.ID,
		Status:               session.Status,
		Questions:            session.Questions,
		AnsweredCount:        len(session.Answers),
		TotalCount:           len(session.Questions),
		TimeRemainingSeconds: remaining,
		Score:                session.Score,
		StartedAt:            session.StartedAt,
		CompletedAt:          session.CompletedAt,
	}, nil
}

// ── SubmitAnswer ──────────────────────────────────────────────────────────────

// SubmitAnswer appends a single answer to the session.
// The frontend calls this once per question, immediately after the user finishes speaking.
func (s *Service) SubmitAnswer(userID uuid.UUID, sessionID uuid.UUID, req SubmitAnswerRequest) (*SubmitAnswerResponse, error) {
	session, err := s.loadOwned(userID, sessionID)
	if err != nil {
		return nil, err
	}

	if err := s.guardActive(session); err != nil {
		return nil, err
	}

	total := len(session.Questions)
	if req.QuestionIndex < 0 || req.QuestionIndex >= total {
		return nil, fmt.Errorf("%w: index %d, total %d", ErrAnswerOutOfRange, req.QuestionIndex, total)
	}

	// Idempotency: if this index was already answered, silently accept.
	if req.QuestionIndex < len(session.Answers) {
		return &SubmitAnswerResponse{
			SessionID:     sessionID,
			QuestionIndex: req.QuestionIndex,
			Accepted:      true,
			AnsweredCount: len(session.Answers),
			TotalCount:    total,
			IsComplete:    len(session.Answers) >= total,
		}, nil
	}

	// Enforce sequential answering: frontend must not skip questions.
	if req.QuestionIndex != len(session.Answers) {
		return nil, fmt.Errorf(
			"%w: expected index %d, got %d",
			ErrInvalidInput, len(session.Answers), req.QuestionIndex,
		)
	}

	answer := strings.TrimSpace(req.Answer)
	if answer == "" {
		return nil, fmt.Errorf("%w: answer must not be blank", ErrInvalidInput)
	}

	if err := s.repo.AppendAnswer(sessionID, answer); err != nil {
		return nil, err
	}

	newCount := len(session.Answers) + 1
	return &SubmitAnswerResponse{
		SessionID:     sessionID,
		QuestionIndex: req.QuestionIndex,
		Accepted:      true,
		AnsweredCount: newCount,
		TotalCount:    total,
		IsComplete:    newCount >= total,
	}, nil
}

// ── CompleteSession ───────────────────────────────────────────────────────────

// CompleteSession marks the session finished, generates a mock score, and
// persists it.  When the ML team is ready they replace mockScore() with a
// real call.
func (s *Service) CompleteSession(userID uuid.UUID, sessionID uuid.UUID, req CompleteSessionRequest) (*CompleteSessionResponse, error) {
	session, err := s.loadOwned(userID, sessionID)
	if err != nil {
		return nil, err
	}

	// Idempotent: return cached score if already completed.
	if session.Status == StatusCompleted || session.Status == StatusScored {
		return &CompleteSessionResponse{
			SessionID: session.ID,
			Status:    session.Status,
			Score:     session.Score,
			Message:   "Interview already completed. Score is available.",
		}, nil
	}

	if err := s.guardActive(session); err != nil {
		return nil, err
	}

	// Re-fetch to get the latest answers (AppendAnswer may have been called
	// after we loaded the session above).
	fresh, err := s.repo.FindByID(sessionID)
	if err != nil || fresh == nil {
		return nil, fmt.Errorf("interview: reload session: %w", err)
	}

	score := mockScore(fresh)
	completedAt := timekit.NowUTC()

	if err := s.repo.SaveScore(sessionID, score, completedAt); err != nil {
		return nil, fmt.Errorf("interview: save score: %w", err)
	}

	return &CompleteSessionResponse{
		SessionID: sessionID,
		Status:    StatusCompleted,
		Score:     &score,
		Message:   "Interview completed. Score is a preliminary mock — final ML scoring will follow.",
	}, nil
}

// ── CancelSession ─────────────────────────────────────────────────────────────

// CancelSession allows the user to end a session early (e.g. "End interview" button).
func (s *Service) CancelSession(userID uuid.UUID, sessionID uuid.UUID) error {
	session, err := s.loadOwned(userID, sessionID)
	if err != nil {
		return err
	}

	if session.Status == StatusCompleted || session.Status == StatusScored {
		return ErrAlreadyCompleted
	}
	if session.Status == StatusCancelled || session.Status == StatusExpired {
		return nil // already terminal — no-op
	}

	return s.repo.UpdateStatus(sessionID, StatusCancelled)
}

// ── Internal helpers ──────────────────────────────────────────────────────────

func (s *Service) loadOwned(userID uuid.UUID, sessionID uuid.UUID) (*InterviewSession, error) {
	session, err := s.repo.FindByID(sessionID)
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

func (s *Service) guardActive(session *InterviewSession) error {
	if timekit.NowUTC().After(session.ExpiresAt) {
		_ = s.repo.UpdateStatus(session.ID, StatusExpired)
		return ErrSessionExpired
	}
	if session.Status == StatusCompleted || session.Status == StatusScored {
		return ErrAlreadyCompleted
	}
	if session.Status == StatusCancelled {
		return ErrSessionNotActive
	}
	if session.Status == StatusExpired {
		return ErrSessionExpired
	}
	return nil
}

func (s *Service) maybeExpire(session *InterviewSession) {
	terminal := map[string]bool{
		StatusCompleted: true,
		StatusScored:    true,
		StatusExpired:   true,
		StatusCancelled: true,
	}
	if !terminal[session.Status] && timekit.NowUTC().After(session.ExpiresAt) {
		_ = s.repo.UpdateStatus(session.ID, StatusExpired)
		session.Status = StatusExpired
	}
}

// buildStartResponse converts a session into a StartSessionResponse.
func buildStartResponse(s *InterviewSession) *StartSessionResponse {
	return &StartSessionResponse{
		SessionID:      s.ID,
		Status:         s.Status,
		Questions:      s.Questions,
		ExpiresAt:      s.ExpiresAt,
		TimeoutMinutes: SessionTimeoutMinutes,
	}
}

// ── Mock scoring ──────────────────────────────────────────────────────────────
// mockScore generates a deterministic-ish preliminary score based on answer
// length heuristics.  Replace this function body with an ML service call once
// the ML team's API is ready — the signature stays the same.

func mockScore(session *InterviewSession) InterviewScore {
	totalWords := 0
	for _, a := range session.Answers {
		totalWords += len(strings.Fields(a))
	}

	// Simple heuristic: more words → higher preliminary scores, capped at 85
	// to make clear these are not final ML scores.
	base := min(totalWords/10, 70) + 15

	return InterviewScore{
		MotivationScore:    clamp(base+5, 0, 85),
		LeadershipScore:    clamp(base-5, 0, 85),
		CommunicationScore: clamp(base+3, 0, 85),
		StructureScore:     clamp(base, 0, 85),
		OverallScore:       clamp(base+2, 0, 85),
		Recommendation:     mockRecommendation(base),
		ScoredBy:           "mock",
		ScoredAt:           timekit.NowUTC().Format(time.RFC3339),
	}
}

func mockRecommendation(base int) string {
	switch {
	case base >= 60:
		return "promising"
	case base >= 40:
		return "review"
	default:
		return "needs_improvement"
	}
}

func clamp(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}