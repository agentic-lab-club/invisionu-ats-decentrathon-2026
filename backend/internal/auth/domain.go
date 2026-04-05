package auth

import (
	"time"

	"github.com/google/uuid"
)

const (
	RoleUser  = "user"
	RoleAdmin = "admin"

	PurposeEmailVerification = "email_verification"
)

type RegisterRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8,max=72"`
}

type VerifyEmailRequest struct {
	Email string `json:"email" validate:"required,email"`
	Code  string `json:"code" validate:"required,len=6"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8,max=72"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type ResendCodeRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type MessageResponse struct {
	Message string `json:"message"`
}

type RegisterResponse struct {
	Message                   string `json:"message"`
	RequiresEmailVerification bool   `json:"requires_email_verification"`
}

type TokenResponse struct {
	AccessToken      string       `json:"access_token"`
	RefreshToken     string       `json:"refresh_token"`
	TokenType        string       `json:"token_type"`
	ExpiresInSeconds int          `json:"expires_in_seconds"`
	User             ResponseUser `json:"user"`
}

type ResponseUser struct {
	ID              uuid.UUID `json:"id"`
	Email           string    `json:"email"`
	Role            string    `json:"role"`
	IsEmailVerified bool      `json:"is_email_verified"`
	FirstName       *string   `json:"first_name,omitempty"`
	LastName        *string   `json:"last_name,omitempty"`
	PhoneNumber     *string   `json:"phone_number,omitempty"`
}

type User struct {
	ID              uuid.UUID `db:"id"`
	Email           string    `db:"email"`
	PasswordHash    string    `db:"password_hash"`
	Role            string    `db:"role"`
	IsEmailVerified bool      `db:"is_email_verified"`
	FirstName       *string   `db:"first_name"`
	LastName        *string   `db:"last_name"`
	PhoneNumber     *string   `db:"phone_number"`
	CreatedAt       time.Time `db:"created_at"`
	UpdatedAt       time.Time `db:"updated_at"`
}

type AuthCode struct {
	ID         uuid.UUID  `db:"id"`
	UserID     uuid.UUID  `db:"user_id"`
	Purpose    string     `db:"purpose"`
	CodeHash   string     `db:"code_hash"`
	ExpiresAt  time.Time  `db:"expires_at"`
	ConsumedAt *time.Time `db:"consumed_at"`
	CreatedAt  time.Time  `db:"created_at"`
}

type RefreshSession struct {
	ID        uuid.UUID  `db:"id"`
	UserID    uuid.UUID  `db:"user_id"`
	TokenHash string     `db:"token_hash"`
	ExpiresAt time.Time  `db:"expires_at"`
	RevokedAt *time.Time `db:"revoked_at"`
	UserAgent *string    `db:"user_agent"`
	IPAddress *string    `db:"ip_address"`
	CreatedAt time.Time  `db:"created_at"`
	UpdatedAt time.Time  `db:"updated_at"`
}

type SessionWithUser struct {
	RefreshSession
	UserEmail           string  `db:"user_email"`
	UserRole            string  `db:"user_role"`
	UserIsEmailVerified bool    `db:"user_is_email_verified"`
	UserFirstName       *string `db:"user_first_name"`
	UserLastName        *string `db:"user_last_name"`
	UserPhoneNumber     *string `db:"user_phone_number"`
}

type meResponse struct {
	User ResponseUser `json:"user"`
}
