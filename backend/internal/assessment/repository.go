package assessment

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	"github.com/google/uuid"
)

type Repository struct {
	db *database.TrackedDB
}

func NewRepository(db *database.TrackedDB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateSession(userID uuid.UUID, specialization string, expiresAt time.Time, questions []string) (*AssessmentSession, error) {
	var session AssessmentSession
	if err := r.db.TrackedGet(
		&session,
		r.db.Rebind(createSessionQuery),
		userID,
		specialization,
		expiresAt,
		StringList(questions),
		StatusActive,
	); err != nil {
		return nil, fmt.Errorf("failed to create assessment session: %w", err)
	}
	return &session, nil
}

func (r *Repository) FindSessionByID(id uuid.UUID) (*AssessmentSession, error) {
	var session AssessmentSession
	if err := r.db.TrackedGet(&session, r.db.Rebind(findSessionByIDQuery), id); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to find assessment session by id: %w", err)
	}
	return &session, nil
}

func (r *Repository) UpdateSessionStatus(id uuid.UUID, status string) error {
	if _, err := r.db.TrackedUpdate(r.db.Rebind(updateSessionStatusQuery), status, id); err != nil {
		return fmt.Errorf("failed to update assessment session status: %w", err)
	}
	return nil
}

func (r *Repository) SaveAnswers(id uuid.UUID, answers []string, startedAt time.Time) error {
	if _, err := r.db.TrackedUpdate(r.db.Rebind(saveAnswersQuery), StringList(answers), StatusAnswered, startedAt, id); err != nil {
		return fmt.Errorf("failed to save assessment answers: %w", err)
	}
	return nil
}

func (r *Repository) SaveEvaluation(id uuid.UUID, evaluation EvaluationPayload, rawOutput string, completedAt time.Time) error {
	if _, err := r.db.TrackedUpdate(
		r.db.Rebind(saveEvaluationQuery),
		evaluation,
		evaluation.OverallScore,
		evaluation.LeadershipScore,
		StatusEvaluated,
		completedAt,
		rawOutput,
		id,
	); err != nil {
		return fmt.Errorf("failed to save assessment evaluation: %w", err)
	}
	return nil
}

func (r *Repository) SaveErrorLog(id uuid.UUID, errorLog string) error {
	if _, err := r.db.TrackedUpdate(r.db.Rebind(saveErrorLogQuery), errorLog, id); err != nil {
		return fmt.Errorf("failed to save assessment error log: %w", err)
	}
	return nil
}

func (r *Repository) CreateEvaluationAudit(sessionID uuid.UUID, prompt string, rawResponse string, parsedResult EvaluationPayload, evaluatorModel string) error {
	if _, err := r.db.TrackedInsert(
		r.db.Rebind(createEvaluationAuditQuery),
		sessionID,
		prompt,
		rawResponse,
		parsedResult,
		evaluatorModel,
	); err != nil {
		return fmt.Errorf("failed to create evaluation audit record: %w", err)
	}
	return nil
}
