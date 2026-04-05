package interview

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	"github.com/google/uuid"
)

// Repository handles all database operations for interview sessions.
type Repository struct {
	db *database.TrackedDB
}

func NewRepository(db *database.TrackedDB) *Repository {
	return &Repository{db: db}
}

// CreateSession inserts a new interview session and returns the created row.
func (r *Repository) CreateSession(
	userID uuid.UUID,
	questions []string,
	expiresAt time.Time,
) (*InterviewSession, error) {
	var session InterviewSession
	if err := r.db.TrackedGet(
		&session,
		r.db.Rebind(createSessionQuery),
		userID,
		StatusPending,
		StringList(questions),
		StringList{}, // answers start empty
		expiresAt,
	); err != nil {
		return nil, fmt.Errorf("interview: create session: %w", err)
	}
	return &session, nil
}

// FindByID looks up a session by primary key.
// Returns (nil, nil) when the row does not exist.
func (r *Repository) FindByID(id uuid.UUID) (*InterviewSession, error) {
	var session InterviewSession
	if err := r.db.TrackedGet(&session, r.db.Rebind(findSessionByIDQuery), id); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("interview: find by id: %w", err)
	}
	return &session, nil
}

// FindActiveByUser returns the most-recent pending or active session for the user.
// Returns (nil, nil) when none exists.
func (r *Repository) FindActiveByUser(userID uuid.UUID) (*InterviewSession, error) {
	var session InterviewSession
	if err := r.db.TrackedGet(&session, r.db.Rebind(findActiveSessionByUserQuery), userID); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("interview: find active by user: %w", err)
	}
	return &session, nil
}

// SetActive marks a session as active and records started_at = NOW().
func (r *Repository) SetActive(id uuid.UUID) error {
	if _, err := r.db.TrackedUpdate(
		r.db.Rebind(updateSessionStatusQuery),
		StatusActive, // status
		true,         // set started_at = NOW()
		id,
	); err != nil {
		return fmt.Errorf("interview: set active: %w", err)
	}
	return nil
}

// AppendAnswer appends a single answer text to the JSONB answers array.
func (r *Repository) AppendAnswer(id uuid.UUID, answerText string) error {
	if _, err := r.db.TrackedUpdate(
		r.db.Rebind(saveAnswerQuery),
		answerText,
		id,
	); err != nil {
		return fmt.Errorf("interview: append answer: %w", err)
	}
	return nil
}

// SaveScore writes the ML (or mock) score, sets status and completed_at.
func (r *Repository) SaveScore(
	id uuid.UUID,
	score InterviewScore,
	completedAt time.Time,
) error {
	status := StatusScored
	if score.ScoredBy == "mock" {
		// Mock scoring is treated as "completed" — ML hasn't run yet.
		status = StatusCompleted
	}
	if _, err := r.db.TrackedUpdate(
		r.db.Rebind(saveScoreQuery),
		score,
		status,
		completedAt,
		id,
	); err != nil {
		return fmt.Errorf("interview: save score: %w", err)
	}
	return nil
}

// UpdateStatus is a general-purpose status setter (e.g. expired, cancelled).
func (r *Repository) UpdateStatus(id uuid.UUID, status string) error {
	if _, err := r.db.TrackedUpdate(
		r.db.Rebind(updateSessionStatusQuery),
		status,
		false, // do not overwrite started_at
		id,
	); err != nil {
		return fmt.Errorf("interview: update status: %w", err)
	}
	return nil
}
