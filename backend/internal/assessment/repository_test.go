package assessment

import (
	"database/sql/driver"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

func TestRepositoryFindSessionByIDReturnsSession(t *testing.T) {
	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New() error = %v", err)
	}
	defer sqlDB.Close()

	db := database.NewTrackedDB(sqlx.NewDb(sqlDB, "sqlmock"))
	repo := NewRepository(db)
	sessionID := uuid.New()
	userID := uuid.New()
	now := time.Now().UTC()

	rows := sqlmock.NewRows([]string{
		"id", "user_id", "specialization", "created_at", "expires_at", "started_at", "completed_at",
		"questions", "answers", "evaluation", "overall_score", "leadership_score", "status", "llm_raw_output", "error_log",
	}).AddRow(
		sessionID, userID, "Backend", now, now.Add(time.Hour), nil, nil,
		`["Q1","Q2"]`, nil, nil, nil, nil, StatusActive, nil, nil,
	)

	mock.ExpectQuery("SELECT").
		WithArgs(sessionID).
		WillReturnRows(rows)

	session, err := repo.FindSessionByID(sessionID)
	if err != nil {
		t.Fatalf("FindSessionByID() error = %v", err)
	}
	if session == nil || len(session.Questions) != 2 {
		t.Fatalf("unexpected session result: %+v", session)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet SQL expectations: %v", err)
	}
}

func TestRepositorySaveAnswersUpdatesSession(t *testing.T) {
	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New() error = %v", err)
	}
	defer sqlDB.Close()

	db := database.NewTrackedDB(sqlx.NewDb(sqlDB, "sqlmock"))
	repo := NewRepository(db)
	sessionID := uuid.New()
	startedAt := time.Now().UTC()

	mock.ExpectExec("UPDATE assessment_sessions").
		WithArgs(anyJSONArg{}, StatusAnswered, startedAt, sessionID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	if err := repo.SaveAnswers(sessionID, []string{"A1", "A2"}, startedAt); err != nil {
		t.Fatalf("SaveAnswers() error = %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet SQL expectations: %v", err)
	}
}

func TestRepositoryCreateEvaluationAuditInsertsRow(t *testing.T) {
	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New() error = %v", err)
	}
	defer sqlDB.Close()

	db := database.NewTrackedDB(sqlx.NewDb(sqlDB, "sqlmock"))
	repo := NewRepository(db)
	sessionID := uuid.New()

	mock.ExpectExec("INSERT INTO evaluation_audit").
		WithArgs(sessionID, "prompt", "raw", anyJSONArg{}, "gpt-4o-mini").
		WillReturnResult(sqlmock.NewResult(0, 1))

	err = repo.CreateEvaluationAudit(sessionID, "prompt", "raw", EvaluationPayload{
		OverallScore:     80,
		LeadershipScore:  70,
		Reason:           "Good",
		DetailedFeedback: "Detailed",
	}, "gpt-4o-mini")
	if err != nil {
		t.Fatalf("CreateEvaluationAudit() error = %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet SQL expectations: %v", err)
	}
}

type anyJSONArg struct{}

func (a anyJSONArg) Match(v driver.Value) bool {
	switch v.(type) {
	case []byte, string:
		return true
	default:
		return false
	}
}
