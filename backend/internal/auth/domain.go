package auth

import (
	"time"

	"errors"

	"github.com/google/uuid"
)

type OTPRequest struct {
	PhoneNumber string `json:"phone_number" validate:"required"`
}

type OTPLoginRequest struct {
	PhoneNumber string `json:"phone_number" validate:"required"`
	Code        string `json:"code" validate:"required"`
}

type OTPResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

type OTPAdminResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Code    string `json:"code"`
}

type LoginResponse struct {
	Success     bool      `json:"success"`
	AccessToken string    `json:"access_token"`
	ExpiresAt   time.Time `json:"expires_at"`
	User        UserInfo  `json:"user"`
}

type UserInfo struct {
	ID          uuid.UUID `json:"id"`
	PhoneNumber string    `json:"phone_number"`
	Status      string    `json:"status"`
	Role        RoleInfo  `json:"role"`
	IsFixOTP    bool      `json:"-"` // из directus_users.is_fix_otp; не отдаём в API
}

type RoleInfo struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

type HealthResponse struct {
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
	Version   string    `json:"version"`
}

type RateLimitError struct {
	RetryAfter int `json:"retry_after"`
}

const (
	UserStatusActive     = "Active"
	UserStatusArchived   = "Archived"
	UserStatusSuspended  = "Suspended"
	UserStatusInvited    = "Invited"
	UserStatusUnverified = "Unverified"
	UserStatusDraft      = "Draft"
)

var (
	ErrUserSuspended = errors.New("user suspended")
)
