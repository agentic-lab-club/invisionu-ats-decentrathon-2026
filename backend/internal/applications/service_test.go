package applications

import (
	"context"
	"regexp"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	platformMessaging "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/messaging"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"
)

func newApplicationsServiceWithMock(t *testing.T, cfg *config.Config) (*Service, sqlmock.Sqlmock, func()) {
	t.Helper()

	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New() error = %v", err)
	}

	db := database.NewTrackedDB(sqlx.NewDb(sqlDB, "sqlmock"))
	repo := NewRepository(db)

	mock.ExpectQuery(regexp.QuoteMeta("FROM personality_test_options")).
		WillReturnRows(sqlmock.NewRows([]string{"question_id", "m", "p", "r", "l", "v"}))

	logger := zerolog.Nop()
	service := NewService(repo, cfg, platformMessaging.NewStubBus(&logger), nil)

	cleanup := func() {
		_ = sqlDB.Close()
	}

	return service, mock, cleanup
}

func TestServiceCreateAllowsUnverifiedUsersWhenEmailVerificationDisabled(t *testing.T) {
	cfg := &config.Config{
		Email: config.EmailConfig{Enabled: false},
		Messaging: config.MessagingConfig{
			ApplicationSubmittedKey: "application.submitted",
		},
	}
	service, mock, cleanup := newApplicationsServiceWithMock(t, cfg)
	defer cleanup()

	userID := uuid.New()
	programCode := "undergrad_tech"
	programID := 7
	videoFileID := uuid.New()
	applicationID := uuid.New()
	now := time.Now().UTC()

	mock.ExpectQuery(regexp.QuoteMeta("FROM users WHERE id")).
		WillReturnRows(sqlmock.NewRows([]string{"id", "role", "is_email_verified"}).
			AddRow(userID, RoleUser, false))

	mock.ExpectQuery(regexp.QuoteMeta("COUNT(*)")).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

	mock.ExpectQuery(regexp.QuoteMeta("FROM programs")).
		WillReturnRows(sqlmock.NewRows([]string{"id", "code", "is_active"}).
			AddRow(programID, programCode, true))

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("UPDATE users")).
		WillReturnResult(sqlmock.NewResult(0, 1))

	mock.ExpectQuery(regexp.QuoteMeta("INSERT INTO applications")).
		WithArgs(userID, programID, ReviewStageInitialScreening, DecisionPending, videoFileID, ScreeningStatusPending, sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{
			"id",
			"user_id",
			"program_id",
			"review_stage",
			"decision",
			"video_file_id",
			"video_audio_file_id",
			"video_transcript",
			"ai_probability",
			"ielts_score",
			"ent_score",
			"screening_status",
			"screening_error",
			"submitted_at",
			"created_at",
			"updated_at",
		}).AddRow(
			applicationID,
			userID,
			programID,
			ReviewStageInitialScreening,
			DecisionPending,
			videoFileID,
			nil,
			nil,
			nil,
			nil,
			nil,
			ScreeningStatusPending,
			nil,
			now,
			now,
			now,
		))

	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO scoring_runs")).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	response, err := service.Create(context.Background(), userID, CreateRequest{
		FirstName:   "John",
		LastName:    "Doe",
		PhoneNumber: "+1234567",
		ProgramCode: programCode,
		VideoFileID: videoFileID,
	})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if response == nil || response.ApplicationID != applicationID {
		t.Fatalf("unexpected create response: %+v", response)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet SQL expectations: %v", err)
	}
}

func TestServiceCreateRejectsUnverifiedUsersWhenEmailVerificationEnabled(t *testing.T) {
	cfg := &config.Config{
		Email: config.EmailConfig{Enabled: true},
		Messaging: config.MessagingConfig{
			ApplicationSubmittedKey: "application.submitted",
		},
	}
	service, mock, cleanup := newApplicationsServiceWithMock(t, cfg)
	defer cleanup()

	userID := uuid.New()

	mock.ExpectQuery(regexp.QuoteMeta("FROM users WHERE id")).
		WillReturnRows(sqlmock.NewRows([]string{"id", "role", "is_email_verified"}).
			AddRow(userID, RoleUser, false))

	response, err := service.Create(context.Background(), userID, CreateRequest{
		FirstName:   "John",
		LastName:    "Doe",
		PhoneNumber: "+1234567",
		ProgramCode: "undergrad_tech",
		VideoFileID: uuid.New(),
	})
	if err == nil {
		t.Fatal("expected Create to fail for unverified user when email verification is enabled")
	}
	if err.Error() != "email is not verified" {
		t.Fatalf("expected email verification error, got %v", err)
	}
	if response != nil {
		t.Fatal("expected no response on failed create")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet SQL expectations: %v", err)
	}
}
