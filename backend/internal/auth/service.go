package auth

import (
	"context"
	"fmt"
	"strings"
	"time"

	platformEmail "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/email"
	pkgAuth "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/auth"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/timekit"
	"github.com/google/uuid"
)

type Service struct {
	repo           *Repository
	cfg            *config.Config
	accessManager  *pkgAuth.TokenManager
	refreshManager *pkgAuth.TokenManager
	emailSender    platformEmail.Sender
	registerLimit  *pkgAuth.RateLimiter
	verifyLimit    *pkgAuth.RateLimiter
}

func NewService(repo *Repository, cfg *config.Config, accessManager *pkgAuth.TokenManager, refreshManager *pkgAuth.TokenManager, sender platformEmail.Sender) *Service {
	return &Service{
		repo:           repo,
		cfg:            cfg,
		accessManager:  accessManager,
		refreshManager: refreshManager,
		emailSender:    sender,
		registerLimit:  pkgAuth.NewRateLimiter(),
		verifyLimit:    pkgAuth.NewRateLimiter(),
	}
}

func (s *Service) Register(ctx context.Context, req RegisterRequest) (bool, error) {
	requiresVerification := s.emailVerificationRequired()
	email := normalizeEmail(req.Email)
	if limit := s.registerLimit.Check("auth_register", email, 3, 60); !limit.OK {
		return false, fmt.Errorf("register rate limit exceeded")
	}

	existingUser, err := s.repo.FindUserByEmail(email)
	if err != nil {
		return false, err
	}
	if existingUser != nil {
		return false, fmt.Errorf("user already exists")
	}

	passwordHash, err := pkgAuth.HashPassword(req.Password)
	if err != nil {
		return false, err
	}

	user, err := s.repo.CreateUser(email, passwordHash, RoleUser, !requiresVerification)
	if err != nil {
		return false, err
	}

	if !requiresVerification {
		return false, nil
	}

	if err := s.issueVerificationCode(ctx, user.ID, user.Email); err != nil {
		return false, err
	}

	return true, nil
}

func (s *Service) VerifyEmail(ctx context.Context, req VerifyEmailRequest) error {
	if !s.emailVerificationRequired() {
		return fmt.Errorf("email verification is disabled")
	}

	email := normalizeEmail(req.Email)
	if limit := s.verifyLimit.Check("auth_verify_email", email, 5, 300); !limit.OK {
		return fmt.Errorf("verification rate limit exceeded")
	}

	user, err := s.repo.FindUserByEmail(email)
	if err != nil {
		return err
	}
	if user == nil {
		return fmt.Errorf("user not found")
	}

	authCode, err := s.repo.FindLatestActiveAuthCode(user.ID, PurposeEmailVerification)
	if err != nil {
		return err
	}
	if authCode == nil {
		return fmt.Errorf("verification code not found")
	}
	if authCode.ConsumedAt != nil || timekit.NowUTC().After(authCode.ExpiresAt) {
		return fmt.Errorf("verification code expired")
	}
	if pkgAuth.HashString(req.Code) != authCode.CodeHash {
		return fmt.Errorf("invalid verification code")
	}

	if err := s.repo.ConsumeAuthCode(authCode.ID); err != nil {
		return err
	}
	if err := s.repo.MarkUserEmailVerified(user.ID); err != nil {
		return err
	}

	return nil
}

func (s *Service) Login(ctx context.Context, req LoginRequest, userAgent string, ipAddress string) (*TokenResponse, error) {
	user, err := s.repo.FindUserByEmail(normalizeEmail(req.Email))
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, fmt.Errorf("invalid credentials")
	}
	if err := pkgAuth.ComparePassword(user.PasswordHash, req.Password); err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}
	if s.emailVerificationRequired() && !user.IsEmailVerified {
		return nil, fmt.Errorf("email is not verified")
	}

	return s.createTokenResponse(ctx, user, userAgent, ipAddress)
}

func (s *Service) Refresh(ctx context.Context, refreshToken string, userAgent string, ipAddress string) (*TokenResponse, error) {
	tokenHash := pkgAuth.HashString(refreshToken)
	session, err := s.repo.FindRefreshSessionByHash(tokenHash)
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, fmt.Errorf("invalid refresh token")
	}
	if session.RevokedAt != nil || timekit.NowUTC().After(session.ExpiresAt) {
		return nil, fmt.Errorf("refresh token expired")
	}

	if err := s.repo.RevokeRefreshSession(session.ID); err != nil {
		return nil, err
	}

	user := &User{
		ID:              session.UserID,
		Email:           session.UserEmail,
		Role:            session.UserRole,
		IsEmailVerified: session.UserIsEmailVerified,
		FirstName:       session.UserFirstName,
		LastName:        session.UserLastName,
		PhoneNumber:     session.UserPhoneNumber,
	}
	return s.createTokenResponse(ctx, user, userAgent, ipAddress)
}

func (s *Service) Logout(_ context.Context, refreshToken string) error {
	tokenHash := pkgAuth.HashString(refreshToken)
	session, err := s.repo.FindRefreshSessionByHash(tokenHash)
	if err != nil {
		return err
	}
	if session == nil {
		return nil
	}
	return s.repo.RevokeRefreshSession(session.ID)
}

func (s *Service) ResendCode(ctx context.Context, email string) error {
	if !s.emailVerificationRequired() {
		return fmt.Errorf("email verification is disabled")
	}

	user, err := s.repo.FindUserByEmail(normalizeEmail(email))
	if err != nil {
		return err
	}
	if user == nil {
		return fmt.Errorf("user not found")
	}
	if user.IsEmailVerified {
		return fmt.Errorf("email is already verified")
	}

	return s.issueVerificationCode(ctx, user.ID, user.Email)
}

func (s *Service) Me(_ context.Context, userID uuid.UUID) (*ResponseUser, error) {
	user, err := s.repo.FindUserByID(userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, fmt.Errorf("user not found")
	}
	response := toResponseUser(user)
	return &response, nil
}

func (s *Service) issueVerificationCode(ctx context.Context, userID uuid.UUID, email string) error {
	code, err := pkgAuth.GenerateVerificationCode(6)
	if err != nil {
		return err
	}

	expiresAt := timekit.NowUTC().Add(s.accessCodeTTL())
	if err := s.repo.CreateAuthCode(userID, PurposeEmailVerification, pkgAuth.HashString(code), expiresAt); err != nil {
		return err
	}

	if err := s.emailSender.SendVerificationCode(ctx, email, code); err != nil {
		return err
	}

	return nil
}

func (s *Service) createTokenResponse(_ context.Context, user *User, userAgent string, ipAddress string) (*TokenResponse, error) {
	accessToken, _, err := s.accessManager.Generate(user.ID, user.Role, pkgAuth.TokenTypeAccess)
	if err != nil {
		return nil, err
	}

	refreshToken, refreshExpiresAt, err := s.refreshManager.Generate(user.ID, user.Role, pkgAuth.TokenTypeRefresh)
	if err != nil {
		return nil, err
	}
	if err := s.repo.CreateRefreshSession(user.ID, pkgAuth.HashString(refreshToken), refreshExpiresAt, userAgent, ipAddress); err != nil {
		return nil, err
	}

	return &TokenResponse{
		AccessToken:      accessToken,
		RefreshToken:     refreshToken,
		TokenType:        "Bearer",
		ExpiresInSeconds: s.cfg.Auth.AccessTokenTTLSeconds,
		User:             toResponseUser(user),
	}, nil
}

func (s *Service) accessCodeTTL() time.Duration {
	return time.Duration(s.cfg.Auth.EmailVerificationCodeTTLSeconds) * time.Second
}

func (s *Service) emailVerificationRequired() bool {
	return s.cfg != nil && s.cfg.Email.Enabled
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func toResponseUser(user *User) ResponseUser {
	return ResponseUser{
		ID:              user.ID,
		Email:           user.Email,
		Role:            user.Role,
		IsEmailVerified: user.IsEmailVerified,
		FirstName:       user.FirstName,
		LastName:        user.LastName,
		PhoneNumber:     user.PhoneNumber,
	}
}
