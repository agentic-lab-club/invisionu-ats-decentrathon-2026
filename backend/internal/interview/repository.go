package interview

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

func (r *Repository) CreateSession(userID uuid.UUID, questions []string, expiresAt time.Time) (*InterviewSession, error) {
	var session InterviewSession
	err := r.db.TrackedGet(&session, r.db.Rebind(createSessionQuery),
		userID, StatusPending, StringList(questions), StringList{}, expiresAt)
	if err != nil {
		return nil, fmt.Errorf("interview: create session: %w", err)
	}
	return &session, nil
}

func (r *Repository) FindByID(id uuid.UUID) (*InterviewSession, error) {
	var session InterviewSession
	err := r.db.TrackedGet(&session, r.db.Rebind(findSessionByIDQuery), id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *Repository) FindActiveByUser(userID uuid.UUID) (*InterviewSession, error) {
	var session InterviewSession
	err := r.db.TrackedGet(&session, r.db.Rebind(findActiveSessionByUserQuery), userID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *Repository) SetActive(id uuid.UUID) error {
	_, err := r.db.TrackedExec("update", r.db.Rebind(updateSessionStatusQuery), StatusActive, true, id)
	return err
}

func (r *Repository) AppendAnswer(id uuid.UUID, answerText string) error {
	_, err := r.db.TrackedExec("update", r.db.Rebind(saveAnswerQuery), answerText, id)
	return err
}

func (r *Repository) SaveScore(id uuid.UUID, score InterviewScore, completedAt time.Time) error {
	_, err := r.db.TrackedExec("update", r.db.Rebind(saveScoreQuery), score, StatusScored, completedAt, id)
	return err
}

func (r *Repository) UpdateStatus(id uuid.UUID, status string) error {
	_, err := r.db.TrackedExec("update", r.db.Rebind(updateSessionStatusQuery), status, false, id)
	return err
}

// Новый метод для админов
func (r *Repository) GetFullSessionById(id uuid.UUID) (*FullInterviewSession, error) {
	var session FullInterviewSession
	err := r.db.Get(&session, r.db.Rebind(GetFullSessionById), id)
	if err != nil {
		return nil, fmt.Errorf("failed to get full interview session: %w", err)
	}
	return &session, nil
}