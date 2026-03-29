package auth

import (
	"database/sql"
	"fmt"
	"strings"
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

func (r *Repository) FindUserByEmail(email string) (*User, error) {
	var user User
	err := r.db.TrackedGet(&user, r.db.Rebind(findUserByEmailQuery), strings.ToLower(strings.TrimSpace(email)))
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to find user by email: %w", err)
	}
	return &user, nil
}

func (r *Repository) FindUserByID(id uuid.UUID) (*User, error) {
	var user User
	err := r.db.TrackedGet(&user, r.db.Rebind(findUserByIDQuery), id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to find user by id: %w", err)
	}
	return &user, nil
}

func (r *Repository) CreateUser(email string, passwordHash string, role string) (*User, error) {
	var user User
	err := r.db.TrackedGet(&user, r.db.Rebind(createUserQuery), strings.ToLower(strings.TrimSpace(email)), passwordHash, role)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	return &user, nil
}

func (r *Repository) CreateAuthCode(userID uuid.UUID, purpose string, codeHash string, expiresAt time.Time) error {
	_, err := r.db.TrackedInsert(r.db.Rebind(createAuthCodeQuery), userID, purpose, codeHash, expiresAt)
	if err != nil {
		return fmt.Errorf("failed to create auth code: %w", err)
	}
	return nil
}

func (r *Repository) FindLatestActiveAuthCode(userID uuid.UUID, purpose string) (*AuthCode, error) {
	var authCode AuthCode
	err := r.db.TrackedGet(&authCode, r.db.Rebind(findLatestActiveAuthCodeQuery), userID, purpose)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to find latest active auth code: %w", err)
	}
	return &authCode, nil
}

func (r *Repository) ConsumeAuthCode(id uuid.UUID) error {
	_, err := r.db.TrackedUpdate(r.db.Rebind(consumeAuthCodeQuery), id)
	if err != nil {
		return fmt.Errorf("failed to consume auth code: %w", err)
	}
	return nil
}

func (r *Repository) MarkUserEmailVerified(userID uuid.UUID) error {
	_, err := r.db.TrackedUpdate(r.db.Rebind(markUserEmailVerifiedQuery), userID)
	if err != nil {
		return fmt.Errorf("failed to mark user email verified: %w", err)
	}
	return nil
}

func (r *Repository) CreateRefreshSession(userID uuid.UUID, tokenHash string, expiresAt time.Time, userAgent string, ipAddress string) error {
	_, err := r.db.TrackedInsert(r.db.Rebind(createRefreshSessionQuery), userID, tokenHash, expiresAt, nullableString(userAgent), nullableString(ipAddress))
	if err != nil {
		return fmt.Errorf("failed to create refresh session: %w", err)
	}
	return nil
}

func (r *Repository) FindRefreshSessionByHash(tokenHash string) (*SessionWithUser, error) {
	var session SessionWithUser
	err := r.db.TrackedGet(&session, r.db.Rebind(findRefreshSessionByHashQuery), tokenHash)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to find refresh session by hash: %w", err)
	}
	return &session, nil
}

func (r *Repository) RevokeRefreshSession(id uuid.UUID) error {
	_, err := r.db.TrackedUpdate(r.db.Rebind(revokeRefreshSessionQuery), id)
	if err != nil {
		return fmt.Errorf("failed to revoke refresh session: %w", err)
	}
	return nil
}

func nullableString(value string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}
