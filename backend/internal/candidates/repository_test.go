package candidates

import (
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

func TestRepositoryListReturnsEnrichmentFields(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New returned error: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "sqlmock")
	repo := NewRepository(database.NewTrackedDB(sqlxDB))

	rows := sqlmock.NewRows([]string{
		"application_id",
		"full_name",
		"program_name",
		"review_stage",
		"decision",
		"recommendation",
		"ai_probability",
		"ielts_score",
		"ent_score",
	}).AddRow(
		testUUID,
		"Ada Lovelace",
		"Tech",
		"initial_screening",
		"pending",
		"recommend",
		34.4,
		6.5,
		42,
	)

	mock.ExpectQuery(regexp.QuoteMeta(listCandidatesQuery + "\n ORDER BY a.created_at DESC")).
		WillReturnRows(rows)

	items, err := repo.List("", "", "", "")
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	if items[0].AIProbability == nil || *items[0].AIProbability != 34.4 {
		t.Fatalf("expected ai_probability=34.4, got %#v", items[0].AIProbability)
	}
	if items[0].IELTSScore == nil || *items[0].IELTSScore != 6.5 {
		t.Fatalf("expected ielts_score=6.5, got %#v", items[0].IELTSScore)
	}
	if items[0].ENTScore == nil || *items[0].ENTScore != 42 {
		t.Fatalf("expected ent_score=42, got %#v", items[0].ENTScore)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestRepositoryGetDetailReturnsEnrichmentFields(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New returned error: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "sqlmock")
	repo := NewRepository(database.NewTrackedDB(sqlxDB))

	now := time.Now().UTC()
	overallScore := 88.5
	aiProbability := 72.4
	ieltsScore := 7.0
	entScore := 118
	rawJSON := []byte(`{"score":7.0}`)

	detailRows := sqlmock.NewRows([]string{
		"application_id",
		"email",
		"first_name",
		"last_name",
		"phone_number",
		"program_name",
		"review_stage",
		"decision",
		"video_transcript",
		"screening_error",
		"ai_probability",
		"ielts_score",
		"ent_score",
		"overall_score",
	}).AddRow(
		testUUID,
		"ada@example.com",
		"Ada",
		"Lovelace",
		"+77000000000",
		"Tech",
		"initial_screening",
		"pending",
		"hello world",
		nil,
		aiProbability,
		ieltsScore,
		entScore,
		overallScore,
	)

	filesRows := sqlmock.NewRows([]string{
		"id",
		"file_type",
		"original_filename",
		"content_type",
		"size_bytes",
	}).AddRow(uuid.New(), "english_result", "ielts.pdf", "application/pdf", int64(1234))

	scoringRows := func(modelName string) *sqlmock.Rows {
		return sqlmock.NewRows([]string{
			"id",
			"model_name",
			"recommendation",
			"result_json",
			"created_at",
		}).AddRow(uuid.New(), modelName, nil, rawJSON, now)
	}

	mock.ExpectQuery(regexp.QuoteMeta(sqlxDB.Rebind(getCandidateDetailQuery))).
		WithArgs(testUUID).
		WillReturnRows(detailRows)
	mock.ExpectQuery(regexp.QuoteMeta(sqlxDB.Rebind(getCandidateFilesQuery))).
		WithArgs(testUUID).
		WillReturnRows(filesRows)
	mock.ExpectQuery(regexp.QuoteMeta(sqlxDB.Rebind(getLatestScoringRunQuery))).
		WithArgs(testUUID).
		WillReturnRows(scoringRows("parser_ielts"))
	mock.ExpectQuery(regexp.QuoteMeta(sqlxDB.Rebind(getLatestScoringRunByModelQuery))).
		WithArgs(testUUID, "personality_test").
		WillReturnRows(scoringRows("personality_test"))
	mock.ExpectQuery(regexp.QuoteMeta(sqlxDB.Rebind(getLatestScoringRunByModelQuery))).
		WithArgs(testUUID, "llmscoring").
		WillReturnRows(scoringRows("llmscoring"))

	detail, err := repo.GetDetail(testUUID)
	if err != nil {
		t.Fatalf("GetDetail returned error: %v", err)
	}
	if detail == nil {
		t.Fatal("expected detail to be returned")
	}
	if detail.AIProbability == nil || *detail.AIProbability != aiProbability {
		t.Fatalf("expected ai_probability %.2f, got %#v", aiProbability, detail.AIProbability)
	}
	if detail.IELTSScore == nil || *detail.IELTSScore != ieltsScore {
		t.Fatalf("expected ielts_score %.1f, got %#v", ieltsScore, detail.IELTSScore)
	}
	if detail.ENTScore == nil || *detail.ENTScore != entScore {
		t.Fatalf("expected ent_score %d, got %#v", entScore, detail.ENTScore)
	}
	if detail.OverallScore == nil || *detail.OverallScore != overallScore {
		t.Fatalf("expected overall_score %.1f, got %#v", overallScore, detail.OverallScore)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}
