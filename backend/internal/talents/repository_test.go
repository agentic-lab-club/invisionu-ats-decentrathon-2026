package talents

import (
	"database/sql/driver"
	"regexp"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

func TestRepositoryUpsertExecutesInsertOnConflictQuery(t *testing.T) {
	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New() error = %v", err)
	}
	defer sqlDB.Close()

	db := database.NewTrackedDB(sqlx.NewDb(sqlDB, "sqlmock"))
	repo := NewRepository(db)
	now := time.Now().UTC()

	mock.ExpectExec(regexp.QuoteMeta(db.Rebind(upsertTalentQuery))).
		WithArgs(
			testUUID,
			"Daryn.kz",
			"https://example.com/lead",
			"Lead",
			"Имран Кусанов",
			now,
			"29.11.2025",
			"winner info",
			anyJSONArg{},
			now,
		).
		WillReturnResult(sqlmock.NewResult(0, 1))

	err = repo.Upsert(talentLeadUpsert{
		ID:                    testUUID,
		Source:                "Daryn.kz",
		Link:                  "https://example.com/lead",
		Title:                 "Lead",
		HighSchoolStudentName: ptrString("Имран Кусанов"),
		PublishedAt:           &now,
		PublishedDateRaw:      ptrString("29.11.2025"),
		WinnerInfo:            ptrString("winner info"),
		RawPayload:            []byte(`{"title":"Lead"}`),
		SyncedAt:              now,
	})
	if err != nil {
		t.Fatalf("Upsert() error = %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet SQL expectations: %v", err)
	}
}

func TestRepositoryExistingLinkCanBeUpsertedAgainWithoutDuplicateInsertQueryChange(t *testing.T) {
	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New() error = %v", err)
	}
	defer sqlDB.Close()

	db := database.NewTrackedDB(sqlx.NewDb(sqlDB, "sqlmock"))
	repo := NewRepository(db)
	now := time.Now().UTC()

	for i := 0; i < 2; i++ {
		mock.ExpectExec(regexp.QuoteMeta(db.Rebind(upsertTalentQuery))).
			WithArgs(
				sqlmock.AnyArg(),
				"Daryn.kz",
				"https://example.com/lead",
				"Lead",
				nil,
				nil,
				nil,
				nil,
				anyJSONArg{},
				now,
			).
			WillReturnResult(sqlmock.NewResult(0, 1))
	}

	for i := 0; i < 2; i++ {
		err = repo.Upsert(talentLeadUpsert{
			ID:         uuid.New(),
			Source:     "Daryn.kz",
			Link:       "https://example.com/lead",
			Title:      "Lead",
			RawPayload: []byte(`{"title":"Lead"}`),
			SyncedAt:   now,
		})
		if err != nil {
			t.Fatalf("Upsert() error = %v", err)
		}
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet SQL expectations: %v", err)
	}
}

func TestRepositoryListAppliesFiltersAndPagination(t *testing.T) {
	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New() error = %v", err)
	}
	defer sqlDB.Close()

	db := database.NewTrackedDB(sqlx.NewDb(sqlDB, "sqlmock"))
	repo := NewRepository(db)

	rows := sqlmock.NewRows([]string{
		"id",
		"title",
		"link",
		"source",
		"high_school_student_name",
		"published_at",
		"published_date_raw",
		"winner_info",
		"raw_payload",
		"synced_at",
	}).AddRow(
		testUUID,
		"Lead",
		"https://example.com/lead",
		"Daryn.kz",
		nil,
		nil,
		nil,
		"winner info",
		[]byte(`{"title":"Lead"}`),
		time.Now().UTC(),
	)

	expectedQuery := listTalentsQuery +
		" WHERE LOWER(source) = LOWER(?) AND (LOWER(title) LIKE ? OR LOWER(COALESCE(winner_info, '')) LIKE ?)" +
		" ORDER BY published_at DESC NULLS LAST, synced_at DESC, title ASC LIMIT ? OFFSET ?"

	mock.ExpectQuery(regexp.QuoteMeta(db.Rebind(expectedQuery))).
		WithArgs("Daryn.kz", "%олимпиада%", "%олимпиада%", 25, 50).
		WillReturnRows(rows)

	items, err := repo.List(ListParams{
		Source: "Daryn.kz",
		Query:  "олимпиада",
		Limit:  25,
		Offset: 50,
	})
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
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
