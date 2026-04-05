package auth

import (
	"context"
	"regexp"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	platformEmail "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/email"
	pkgAuth "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/auth"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type recordingEmailSender struct {
	calls []recordedEmailSend
}

type recordedEmailSend struct {
	recipient string
	code      string
}

func (s *recordingEmailSender) SendVerificationCode(_ context.Context, recipient string, code string) error {
	s.calls = append(s.calls, recordedEmailSend{recipient: recipient, code: code})
	return nil
}

func newAuthServiceWithMock(t *testing.T, cfg *config.Config, sender platformEmail.Sender) (*Service, sqlmock.Sqlmock, func()) {
	t.Helper()

	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New() error = %v", err)
	}

	db := database.NewTrackedDB(sqlx.NewDb(sqlDB, "sqlmock"))
	repo := NewRepository(db)
	accessManager := pkgAuth.NewTokenManager("access-secret", 3600)
	refreshManager := pkgAuth.NewTokenManager("refresh-secret", 7200)
	service := NewService(repo, cfg, accessManager, refreshManager, sender)

	cleanup := func() {
		_ = sqlDB.Close()
	}
	return service, mock, cleanup
}

func newUserRow(id uuid.UUID, email string, passwordHash string, role string, isEmailVerified bool, now time.Time) *sqlmock.Rows {
	return sqlmock.NewRows([]string{
		"id",
		"email",
		"password_hash",
		"role",
		"is_email_verified",
		"first_name",
		"last_name",
		"phone_number",
		"created_at",
		"updated_at",
	}).AddRow(id, email, passwordHash, role, isEmailVerified, nil, nil, nil, now, now)
}

func TestServiceRegisterSkipsVerificationWhenEmailVerificationDisabled(t *testing.T) {
	cfg := &config.Config{Email: config.EmailConfig{Enabled: false}}
	sender := &recordingEmailSender{}
	service, mock, cleanup := newAuthServiceWithMock(t, cfg, sender)
	defer cleanup()

	email := "new@gmail.com"
	password := "StrongPass123"
	userID := uuid.New()
	now := time.Now().UTC()

	mock.ExpectQuery(regexp.QuoteMeta("FROM users WHERE email")).
		WillReturnRows(sqlmock.NewRows([]string{
			"id",
			"email",
			"password_hash",
			"role",
			"is_email_verified",
			"first_name",
			"last_name",
			"phone_number",
			"created_at",
			"updated_at",
		}))

	mock.ExpectQuery(regexp.QuoteMeta("INSERT INTO users")).
		WithArgs(email, sqlmock.AnyArg(), RoleUser, true).
		WillReturnRows(newUserRow(userID, email, "stored-hash", RoleUser, true, now))

	requiresVerification, err := service.Register(context.Background(), RegisterRequest{
		Email:    email,
		Password: password,
	})
	if err != nil {
		t.Fatalf("Register returned error: %v", err)
	}
	if requiresVerification {
		t.Fatal("expected requiresVerification to be false when email verification is disabled")
	}
	if len(sender.calls) != 0 {
		t.Fatalf("expected no verification email to be sent, got %d calls", len(sender.calls))
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet SQL expectations: %v", err)
	}
}

func TestServiceRegisterIssuesVerificationWhenEmailVerificationEnabled(t *testing.T) {
	cfg := &config.Config{
		Email: config.EmailConfig{Enabled: true},
		Auth:  config.AuthConfig{EmailVerificationCodeTTLSeconds: 900},
	}
	sender := &recordingEmailSender{}
	service, mock, cleanup := newAuthServiceWithMock(t, cfg, sender)
	defer cleanup()

	email := "new@gmail.com"
	password := "StrongPass123"
	userID := uuid.New()
	now := time.Now().UTC()

	mock.ExpectQuery(regexp.QuoteMeta("FROM users WHERE email")).
		WillReturnRows(sqlmock.NewRows([]string{
			"id",
			"email",
			"password_hash",
			"role",
			"is_email_verified",
			"first_name",
			"last_name",
			"phone_number",
			"created_at",
			"updated_at",
		}))

	mock.ExpectQuery(regexp.QuoteMeta("INSERT INTO users")).
		WithArgs(email, sqlmock.AnyArg(), RoleUser, false).
		WillReturnRows(newUserRow(userID, email, "stored-hash", RoleUser, false, now))

	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO auth_codes")).
		WithArgs(userID, PurposeEmailVerification, sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, 1))

	requiresVerification, err := service.Register(context.Background(), RegisterRequest{
		Email:    email,
		Password: password,
	})
	if err != nil {
		t.Fatalf("Register returned error: %v", err)
	}
	if !requiresVerification {
		t.Fatal("expected requiresVerification to be true when email verification is enabled")
	}
	if len(sender.calls) != 1 {
		t.Fatalf("expected one verification email to be sent, got %d calls", len(sender.calls))
	}
	if sender.calls[0].recipient != email {
		t.Fatalf("expected verification email recipient %q, got %q", email, sender.calls[0].recipient)
	}
	if len(sender.calls[0].code) != 6 {
		t.Fatalf("expected 6-digit verification code, got %q", sender.calls[0].code)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet SQL expectations: %v", err)
	}
}

func TestServiceVerificationEndpointsRejectWhenEmailVerificationDisabled(t *testing.T) {
	cfg := &config.Config{Email: config.EmailConfig{Enabled: false}}
	service := NewService(nil, cfg, nil, nil, &recordingEmailSender{})

	tests := []struct {
		name string
		run  func() error
	}{
		{
			name: "verify-email",
			run: func() error {
				return service.VerifyEmail(context.Background(), VerifyEmailRequest{
					Email: "new@gmail.com",
					Code:  "123456",
				})
			},
		},
		{
			name: "resend-code",
			run: func() error {
				return service.ResendCode(context.Background(), "new@gmail.com")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.run()
			if err == nil {
				t.Fatalf("expected %s to return an error", tt.name)
			}
			if err.Error() != "email verification is disabled" {
				t.Fatalf("expected disabled error, got %v", err)
			}
		})
	}
}

func TestServiceLoginAllowsUnverifiedUserWhenEmailVerificationDisabled(t *testing.T) {
	cfg := &config.Config{Email: config.EmailConfig{Enabled: false}}
	service, mock, cleanup := newAuthServiceWithMock(t, cfg, &recordingEmailSender{})
	defer cleanup()

	email := "new@gmail.com"
	password := "StrongPass123"
	passwordHash, err := pkgAuth.HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword returned error: %v", err)
	}
	userID := uuid.New()
	now := time.Now().UTC()

	mock.ExpectQuery(regexp.QuoteMeta("FROM users WHERE email")).
		WillReturnRows(newUserRow(userID, email, passwordHash, RoleUser, false, now))

	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO refresh_sessions")).
		WithArgs(userID, sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, 1))

	response, err := service.Login(context.Background(), LoginRequest{
		Email:    email,
		Password: password,
	}, "test-agent", "127.0.0.1")
	if err != nil {
		t.Fatalf("Login returned error: %v", err)
	}
	if response.User.IsEmailVerified {
		t.Fatal("expected login response to preserve unverified state when verification is disabled")
	}
	if response.AccessToken == "" || response.RefreshToken == "" {
		t.Fatal("expected tokens to be returned")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet SQL expectations: %v", err)
	}
}

func TestServiceLoginRejectsUnverifiedUserWhenEmailVerificationEnabled(t *testing.T) {
	cfg := &config.Config{Email: config.EmailConfig{Enabled: true}}
	service, mock, cleanup := newAuthServiceWithMock(t, cfg, &recordingEmailSender{})
	defer cleanup()

	email := "new@gmail.com"
	password := "StrongPass123"
	passwordHash, err := pkgAuth.HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword returned error: %v", err)
	}
	userID := uuid.New()
	now := time.Now().UTC()

	mock.ExpectQuery(regexp.QuoteMeta("FROM users WHERE email")).
		WillReturnRows(newUserRow(userID, email, passwordHash, RoleUser, false, now))

	response, err := service.Login(context.Background(), LoginRequest{
		Email:    email,
		Password: password,
	}, "test-agent", "127.0.0.1")
	if err == nil {
		t.Fatal("expected login to fail for unverified user when verification is enabled")
	}
	if err.Error() != "email is not verified" {
		t.Fatalf("expected email verification error, got %v", err)
	}
	if response != nil {
		t.Fatal("expected no token response on failed login")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet SQL expectations: %v", err)
	}
}
