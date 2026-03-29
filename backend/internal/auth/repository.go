package auth

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/auth"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	"github.com/google/uuid"
)

type Repository struct {
	db *database.TrackedDB
}

func NewRepository(db *database.TrackedDB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) UpsertOTP(otp *auth.OTPCode) error {
	query := `
		INSERT INTO "AUTH_OTP" (id, phone_number, code, expires_at, is_used, date_created)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (phone_number) 
		DO UPDATE SET 
			id = EXCLUDED.id,
			code = EXCLUDED.code,
			expires_at = EXCLUDED.expires_at,
			is_used = EXCLUDED.is_used,
			date_created = EXCLUDED.date_created,
			date_updated = NOW()`

	_, err := r.db.TrackedInsert(query, otp.ID, otp.PhoneNumber, otp.Code, otp.ExpiresAt, otp.IsUsed, otp.DateCreated)
	return err
}

func (r *Repository) GetOTPByPhone(phone string) (*auth.OTPCode, error) {
	var otp auth.OTPCode
	query := `
		SELECT id, phone_number, code, expires_at, is_used, date_created
		FROM "AUTH_OTP" 
		WHERE phone_number = $1`

	err := r.db.TrackedGet(&otp, query, phone)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &otp, err
}

func (r *Repository) MarkOTPAsUsed(id uuid.UUID) error {
	query := `UPDATE "AUTH_OTP" SET is_used = true, date_updated = NOW() WHERE id = $1`
	_, err := r.db.TrackedUpdate(query, id)
	return err
}

func (r *Repository) CleanExpiredOTPs() error {
	query := `DELETE FROM "AUTH_OTP" WHERE expires_at < NOW()`
	_, err := r.db.TrackedDelete(query)
	return err
}

func (r *Repository) FindUserByPhone(phone string) (*UserInfo, error) {
	var user struct {
		ID          uuid.UUID `db:"id"`
		PhoneNumber string    `db:"phone_number"`
		RoleID      uuid.UUID `db:"role_id"`
		RoleName    string    `db:"role_name"`
		Status      string    `db:"status"`
		IsFixOTP    bool      `db:"is_fix_otp"`
	}

	query := `
		SELECT u.id, u.phone_number, r.id as role_id, r.name as role_name, u.status, COALESCE(u.is_fix_otp, false) as is_fix_otp
		FROM directus_users u
		LEFT JOIN directus_roles r ON r.id = u.role
		WHERE u.phone_number = $1
		LIMIT 1`

	err := r.db.TrackedGet(&user, query, phone)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &UserInfo{
		ID:          user.ID,
		PhoneNumber: user.PhoneNumber,
		Status:      user.Status,
		Role: RoleInfo{
			ID:   user.RoleID,
			Name: user.RoleName,
		},
		IsFixOTP: user.IsFixOTP,
	}, nil
}

func (r *Repository) CreateUser(phone string, defaultRoleID uuid.UUID) (*UserInfo, error) {
	userID := uuid.New()

	query := `
		INSERT INTO directus_users (id, phone_number, status, role, is_used_first_free_lesson, contacts)
		VALUES ($1, $2, 'Active', $3, false, json_build_object('phone_number', $4::text))`

	_, err := r.db.TrackedInsert(query, userID, phone, defaultRoleID, phone)
	if err != nil {
		return nil, err
	}

	// Get role name
	var roleName string
	roleQuery := `SELECT name FROM directus_roles WHERE id = $1`
	err = r.db.TrackedGet(&roleName, roleQuery, defaultRoleID)
	if err != nil {
		roleName = ""
	}

	return &UserInfo{
		ID:          userID,
		PhoneNumber: phone,
		Role: RoleInfo{
			ID:   defaultRoleID,
			Name: roleName,
		},
	}, nil
}

func (r *Repository) GetDefaultRoleID() (uuid.UUID, error) {
	var roleID uuid.UUID
	query := `SELECT id FROM directus_roles WHERE name = 'User' LIMIT 1`

	err := r.db.TrackedGet(&roleID, query)
	if errors.Is(err, sql.ErrNoRows) {
		return uuid.Nil, fmt.Errorf("default role 'User' not found")
	}
	return roleID, err
}

func (r *Repository) UpdateStatus(userID uuid.UUID, status string) error {
	query := `UPDATE directus_users SET status = $2 WHERE id = $1`
	_, err := r.db.TrackedUpdate(query, userID, status)
	return err
}
