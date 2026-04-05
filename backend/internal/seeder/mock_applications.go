package seeder

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

const (
	adminSeedPasswordHash     = "$2a$10$1BZBTWq3ZfJPeATm0QMhAum3.AmWE4SCvRtChd972./MTCyMHYrGe"
	applicantSeedPasswordHash = "$2a$10$0zhS5SgSIVlsyanL89TJEeHMFE9jUaQ9mpvGcAansHn6tZH/9ppS6"
)

type adminSeedDefinition struct {
	UserID      string
	Email       string
	FirstName   string
	LastName    string
	PhoneNumber string
	CreatedAt   time.Time
}

type applicantSeedDefinition struct {
	UserID                  string
	ApplicationID           string
	VideoFileID             string
	VideoAudioFileID        string
	PortfolioFileID         string
	EnglishResultFileID     string
	CertificateFileID       string
	PersonalityScoringRunID string
	LLMScoringRunID         string
	Email                   string
	FirstName               string
	LastName                string
	PhoneNumber             string
	ProgramCode             string
	ScoringFilename         string
	SubmittedAt             time.Time
	AnswerPattern           []int
	AIProbability           float64
	IELTSScore              float64
	ENTScore                int
}

type applicantSeedDocument struct {
	def           applicantSeedDefinition
	llmResultJSON map[string]interface{}
	transcript    string
}

type personalityQuestionSeed struct {
	ID            uuid.UUID
	Order         int
	OptionByOrder map[int]personalityOptionSeed
}

type personalityOptionSeed struct {
	ID    uuid.UUID
	Order int
	M     int
	P     int
	R     int
	L     int
	V     int
}

type personalityScorePayload struct {
	resultJSON     map[string]interface{}
	recommendation string
}

var seededAdminUser = adminSeedDefinition{
	UserID:      "00000000-0000-0000-0000-000000000001",
	Email:       "admin@gmail.com",
	FirstName:   "Admissions",
	LastName:    "Admin",
	PhoneNumber: "+77001000001",
	CreatedAt:   time.Date(2026, time.March, 25, 9, 0, 0, 0, time.UTC),
}

var applicantSeedDefinitions = []applicantSeedDefinition{
	{
		UserID:                  "00000000-0000-0000-0000-000000000101",
		ApplicationID:           "00000000-0000-0000-0000-000000000201",
		VideoFileID:             "00000000-0000-0000-0000-000000000301",
		VideoAudioFileID:        "00000000-0000-0000-0000-000000000401",
		PortfolioFileID:         "00000000-0000-0000-0000-000000000501",
		EnglishResultFileID:     "00000000-0000-0000-0000-000000000601",
		CertificateFileID:       "00000000-0000-0000-0000-000000000701",
		PersonalityScoringRunID: "00000000-0000-0000-0000-000000000801",
		LLMScoringRunID:         "00000000-0000-0000-0000-000000000901",
		Email:                   "amir.seed@invisionu.local",
		FirstName:               "Amir",
		LastName:                "Suleimenov",
		PhoneNumber:             "+77001000101",
		ProgramCode:             "undergrad_tech",
		ScoringFilename:         "final_interview_evaluation.json",
		SubmittedAt:             time.Date(2026, time.March, 26, 9, 15, 0, 0, time.UTC),
		AnswerPattern:           []int{3, 2, 1, 2},
		AIProbability:           28.4,
		IELTSScore:              6.0,
		ENTScore:                101,
	},
	{
		UserID:                  "00000000-0000-0000-0000-000000000102",
		ApplicationID:           "00000000-0000-0000-0000-000000000202",
		VideoFileID:             "00000000-0000-0000-0000-000000000302",
		VideoAudioFileID:        "00000000-0000-0000-0000-000000000402",
		PortfolioFileID:         "00000000-0000-0000-0000-000000000502",
		EnglishResultFileID:     "00000000-0000-0000-0000-000000000602",
		CertificateFileID:       "00000000-0000-0000-0000-000000000702",
		PersonalityScoringRunID: "00000000-0000-0000-0000-000000000802",
		LLMScoringRunID:         "00000000-0000-0000-0000-000000000902",
		Email:                   "dana.seed@invisionu.local",
		FirstName:               "Dana",
		LastName:                "Akhmetova",
		PhoneNumber:             "+77001000102",
		ProgramCode:             "undergrad_art_media",
		ScoringFilename:         "final_interview_evaluation (1).json",
		SubmittedAt:             time.Date(2026, time.March, 26, 10, 5, 0, 0, time.UTC),
		AnswerPattern:           []int{2, 1, 1, 3},
		AIProbability:           14.2,
		IELTSScore:              7.5,
		ENTScore:                118,
	},
	{
		UserID:                  "00000000-0000-0000-0000-000000000103",
		ApplicationID:           "00000000-0000-0000-0000-000000000203",
		VideoFileID:             "00000000-0000-0000-0000-000000000303",
		VideoAudioFileID:        "00000000-0000-0000-0000-000000000403",
		PortfolioFileID:         "00000000-0000-0000-0000-000000000503",
		EnglishResultFileID:     "00000000-0000-0000-0000-000000000603",
		CertificateFileID:       "00000000-0000-0000-0000-000000000703",
		PersonalityScoringRunID: "00000000-0000-0000-0000-000000000803",
		LLMScoringRunID:         "00000000-0000-0000-0000-000000000903",
		Email:                   "aliya.seed@invisionu.local",
		FirstName:               "Aliya",
		LastName:                "Turganbayeva",
		PhoneNumber:             "+77001000103",
		ProgramCode:             "undergrad_society",
		ScoringFilename:         "final_interview_evaluation (2).json",
		SubmittedAt:             time.Date(2026, time.March, 26, 11, 10, 0, 0, time.UTC),
		AnswerPattern:           []int{3, 3, 1, 2},
		AIProbability:           6.8,
		IELTSScore:              7.0,
		ENTScore:                124,
	},
	{
		UserID:                  "00000000-0000-0000-0000-000000000104",
		ApplicationID:           "00000000-0000-0000-0000-000000000204",
		VideoFileID:             "00000000-0000-0000-0000-000000000304",
		VideoAudioFileID:        "00000000-0000-0000-0000-000000000404",
		PortfolioFileID:         "00000000-0000-0000-0000-000000000504",
		EnglishResultFileID:     "00000000-0000-0000-0000-000000000604",
		CertificateFileID:       "00000000-0000-0000-0000-000000000704",
		PersonalityScoringRunID: "00000000-0000-0000-0000-000000000804",
		LLMScoringRunID:         "00000000-0000-0000-0000-000000000904",
		Email:                   "dias.seed@invisionu.local",
		FirstName:               "Dias",
		LastName:                "Kairatuly",
		PhoneNumber:             "+77001000104",
		ProgramCode:             "undergrad_tech",
		ScoringFilename:         "final_interview_evaluation (3).json",
		SubmittedAt:             time.Date(2026, time.March, 26, 12, 20, 0, 0, time.UTC),
		AnswerPattern:           []int{4, 2, 3, 1},
		AIProbability:           11.6,
		IELTSScore:              6.5,
		ENTScore:                117,
	},
	{
		UserID:                  "00000000-0000-0000-0000-000000000105",
		ApplicationID:           "00000000-0000-0000-0000-000000000205",
		VideoFileID:             "00000000-0000-0000-0000-000000000305",
		VideoAudioFileID:        "00000000-0000-0000-0000-000000000405",
		PortfolioFileID:         "00000000-0000-0000-0000-000000000505",
		EnglishResultFileID:     "00000000-0000-0000-0000-000000000605",
		CertificateFileID:       "00000000-0000-0000-0000-000000000705",
		PersonalityScoringRunID: "00000000-0000-0000-0000-000000000805",
		LLMScoringRunID:         "00000000-0000-0000-0000-000000000905",
		Email:                   "aida.seed@invisionu.local",
		FirstName:               "Aida",
		LastName:                "Mukasheva",
		PhoneNumber:             "+77001000105",
		ProgramCode:             "undergrad_society",
		ScoringFilename:         "final_interview_evaluation (4).json",
		SubmittedAt:             time.Date(2026, time.March, 26, 13, 5, 0, 0, time.UTC),
		AnswerPattern:           []int{2, 2, 3, 1},
		AIProbability:           19.4,
		IELTSScore:              6.0,
		ENTScore:                109,
	},
	{
		UserID:                  "00000000-0000-0000-0000-000000000106",
		ApplicationID:           "00000000-0000-0000-0000-000000000206",
		VideoFileID:             "00000000-0000-0000-0000-000000000306",
		VideoAudioFileID:        "00000000-0000-0000-0000-000000000406",
		PortfolioFileID:         "00000000-0000-0000-0000-000000000506",
		EnglishResultFileID:     "00000000-0000-0000-0000-000000000606",
		CertificateFileID:       "00000000-0000-0000-0000-000000000706",
		PersonalityScoringRunID: "00000000-0000-0000-0000-000000000806",
		LLMScoringRunID:         "00000000-0000-0000-0000-000000000906",
		Email:                   "nursultan.seed@invisionu.local",
		FirstName:               "Nursultan",
		LastName:                "Bekturov",
		PhoneNumber:             "+77001000106",
		ProgramCode:             "undergrad_tech",
		ScoringFilename:         "final_interview_evaluation (5).json",
		SubmittedAt:             time.Date(2026, time.March, 26, 14, 25, 0, 0, time.UTC),
		AnswerPattern:           []int{3, 1, 2, 2},
		AIProbability:           9.7,
		IELTSScore:              6.5,
		ENTScore:                113,
	},
}

func loadApplicantSeedDocuments() ([]applicantSeedDocument, error) {
	docs := make([]applicantSeedDocument, 0, len(applicantSeedDefinitions))
	for _, def := range applicantSeedDefinitions {
		raw, err := readJSONSeedFile(def.ScoringFilename)
		if err != nil {
			return nil, fmt.Errorf("failed to read applicant scoring seed %s: %w", def.ScoringFilename, err)
		}

		var parsed map[string]interface{}
		if err := json.Unmarshal(raw, &parsed); err != nil {
			return nil, fmt.Errorf("failed to parse applicant scoring seed %s: %w", def.ScoringFilename, err)
		}

		docs = append(docs, applicantSeedDocument{
			def:           def,
			llmResultJSON: parsed,
			transcript:    buildTranscript(parsed),
		})
	}

	return docs, nil
}

func seedMockApplicants(db *sqlx.DB) error {
	docs, err := loadApplicantSeedDocuments()
	if err != nil {
		return err
	}

	tx, err := db.Beginx()
	if err != nil {
		return fmt.Errorf("failed to begin mock applicant seed transaction: %w", err)
	}
	defer tx.Rollback()

	programIDs, err := loadProgramIDs(tx)
	if err != nil {
		return err
	}

	questions, err := loadPersonalityQuestions(tx, "personality_v1")
	if err != nil {
		return err
	}

	if err := upsertAdminUser(tx, seededAdminUser); err != nil {
		return err
	}

	for _, doc := range docs {
		if err := upsertSeedUser(tx, doc.def); err != nil {
			return err
		}
		if err := upsertApplicationFiles(tx, doc.def, doc.transcript, false); err != nil {
			return err
		}
		if err := upsertApplication(tx, doc.def, programIDs[doc.def.ProgramCode], doc.transcript); err != nil {
			return err
		}
		if err := upsertApplicationFiles(tx, doc.def, doc.transcript, true); err != nil {
			return err
		}

		personalityScore, answers, err := buildPersonalityScore(doc.def.AnswerPattern, questions)
		if err != nil {
			return err
		}
		if err := upsertApplicationAnswers(tx, doc.def.ApplicationID, answers); err != nil {
			return err
		}
		if err := upsertScoringRuns(tx, doc, personalityScore); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit mock applicant seed transaction: %w", err)
	}

	return nil
}

func readJSONSeedFile(name string) ([]byte, error) {
	candidates := []string{
		filepath.Join("docs", "jsons", name),
		filepath.Join("backend", "docs", "jsons", name),
		filepath.Join("..", "..", "docs", "jsons", name),
	}

	for _, path := range candidates {
		raw, err := os.ReadFile(path)
		if err == nil {
			return raw, nil
		}
		if !os.IsNotExist(err) {
			return nil, err
		}
	}

	return nil, os.ErrNotExist
}

func buildTranscript(result map[string]interface{}) string {
	breakdown, _ := result["candidate_breakdown"].(map[string]interface{})
	if len(breakdown) == 0 {
		return ""
	}

	keys := make([]string, 0, len(breakdown))
	for key := range breakdown {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		if text, ok := breakdown[key].(string); ok && text != "" {
			parts = append(parts, text)
		}
	}

	return joinTranscript(parts)
}

func joinTranscript(parts []string) string {
	switch len(parts) {
	case 0:
		return ""
	case 1:
		return parts[0]
	}

	result := parts[0]
	for _, part := range parts[1:] {
		result += "\n\n" + part
	}
	return result
}

func loadProgramIDs(tx *sqlx.Tx) (map[string]int, error) {
	rows := []struct {
		ID   int    `db:"id"`
		Code string `db:"code"`
	}{}
	if err := tx.Select(&rows, `SELECT id, code FROM programs WHERE is_active = TRUE`); err != nil {
		return nil, fmt.Errorf("failed to load program ids for mock applicant seed: %w", err)
	}

	result := make(map[string]int, len(rows))
	for _, row := range rows {
		result[row.Code] = row.ID
	}

	for _, def := range applicantSeedDefinitions {
		if _, ok := result[def.ProgramCode]; !ok {
			return nil, fmt.Errorf("missing seeded program for mock applicant: %s", def.ProgramCode)
		}
	}

	return result, nil
}

func loadPersonalityQuestions(tx *sqlx.Tx, code string) ([]personalityQuestionSeed, error) {
	rows := []struct {
		QuestionID    uuid.UUID `db:"question_id"`
		QuestionOrder int       `db:"question_order"`
		OptionID      uuid.UUID `db:"option_id"`
		OptionOrder   int       `db:"option_order"`
		M             int       `db:"m"`
		P             int       `db:"p"`
		R             int       `db:"r"`
		L             int       `db:"l"`
		V             int       `db:"v"`
	}{}

	err := tx.Select(&rows, `
		SELECT
			q.id AS question_id,
			q.question_order,
			o.id AS option_id,
			o.option_order,
			o.m,
			o.p,
			o.r,
			o.l,
			o.v
		FROM personality_tests t
		JOIN personality_test_questions q ON q.test_id = t.id
		JOIN personality_test_options o ON o.question_id = q.id
		WHERE t.code = $1
		  AND q.is_active = TRUE
		ORDER BY q.question_order ASC, o.option_order ASC
	`, code)
	if err != nil {
		return nil, fmt.Errorf("failed to load personality questions for mock applicant seed: %w", err)
	}

	questionMap := make(map[uuid.UUID]*personalityQuestionSeed)
	orderedIDs := make([]uuid.UUID, 0)

	for _, row := range rows {
		question, ok := questionMap[row.QuestionID]
		if !ok {
			question = &personalityQuestionSeed{
				ID:            row.QuestionID,
				Order:         row.QuestionOrder,
				OptionByOrder: make(map[int]personalityOptionSeed),
			}
			questionMap[row.QuestionID] = question
			orderedIDs = append(orderedIDs, row.QuestionID)
		}

		question.OptionByOrder[row.OptionOrder] = personalityOptionSeed{
			ID:    row.OptionID,
			Order: row.OptionOrder,
			M:     row.M,
			P:     row.P,
			R:     row.R,
			L:     row.L,
			V:     row.V,
		}
	}

	questions := make([]personalityQuestionSeed, 0, len(orderedIDs))
	for _, id := range orderedIDs {
		questions = append(questions, *questionMap[id])
	}

	sort.Slice(questions, func(i, j int) bool {
		return questions[i].Order < questions[j].Order
	})

	if len(questions) == 0 {
		return nil, fmt.Errorf("personality questions are empty for mock applicant seed")
	}

	return questions, nil
}

func buildPersonalityScore(pattern []int, questions []personalityQuestionSeed) (*personalityScorePayload, [][2]uuid.UUID, error) {
	if len(pattern) == 0 {
		return nil, nil, fmt.Errorf("mock applicant answer pattern is empty")
	}

	axisRaw := map[string]int{"M": 0, "P": 0, "R": 0, "L": 0, "V": 0}
	axisMax := map[string]int{"M": 0, "P": 0, "R": 0, "L": 0, "V": 0}
	answers := make([][2]uuid.UUID, 0, len(questions))

	for questionIndex, question := range questions {
		selectedOrder := pattern[questionIndex%len(pattern)]
		selectedOption, ok := question.OptionByOrder[selectedOrder]
		if !ok {
			return nil, nil, fmt.Errorf("missing option order %d for question %d", selectedOrder, question.Order)
		}
		answers = append(answers, [2]uuid.UUID{question.ID, selectedOption.ID})

		axisRaw["M"] += selectedOption.M
		axisRaw["P"] += selectedOption.P
		axisRaw["R"] += selectedOption.R
		axisRaw["L"] += selectedOption.L
		axisRaw["V"] += selectedOption.V

		questionMax := map[string]int{"M": 0, "P": 0, "R": 0, "L": 0, "V": 0}
		for _, option := range question.OptionByOrder {
			if option.M > questionMax["M"] {
				questionMax["M"] = option.M
			}
			if option.P > questionMax["P"] {
				questionMax["P"] = option.P
			}
			if option.R > questionMax["R"] {
				questionMax["R"] = option.R
			}
			if option.L > questionMax["L"] {
				questionMax["L"] = option.L
			}
			if option.V > questionMax["V"] {
				questionMax["V"] = option.V
			}
		}
		axisMax["M"] += questionMax["M"]
		axisMax["P"] += questionMax["P"]
		axisMax["R"] += questionMax["R"]
		axisMax["L"] += questionMax["L"]
		axisMax["V"] += questionMax["V"]
	}

	axisNorm := make(map[string]float64, len(axisRaw))
	for axis, raw := range axisRaw {
		maxValue := axisMax[axis]
		if maxValue == 0 {
			axisNorm[axis] = 0
			continue
		}
		axisNorm[axis] = float64(raw) / float64(maxValue) * 100
	}

	fusion := map[string]float64{
		"M": 0.45 * axisNorm["M"],
		"P": 0.55 * axisNorm["P"],
		"R": 0.45 * axisNorm["R"],
		"L": 0.40 * axisNorm["L"],
		"V": 0.55 * axisNorm["V"],
	}

	return &personalityScorePayload{
		resultJSON: map[string]interface{}{
			"axis_raw":  axisRaw,
			"axis_max":  axisMax,
			"axis_norm": axisNorm,
			"source":    "personality_test",
		},
		recommendation: computePersonalityRecommendation(fusion),
	}, answers, nil
}

func computePersonalityRecommendation(fusion map[string]float64) string {
	score := 0.15*fusion["M"] + 0.15*fusion["P"] + 0.20*fusion["R"] + 0.35*fusion["L"] + 0.15*fusion["V"]

	switch {
	case score >= 55 && fusion["L"] >= 22 && fusion["R"] >= 20.25 && fusion["V"] >= 22:
		return "strong_recommend"
	case score >= 40:
		return "recommend"
	case score >= 25:
		return "consider"
	default:
		return "not_recommend"
	}
}

func computeLLMRecommendation(resultJSON map[string]interface{}) string {
	globalScore, _ := resultJSON["global_score"].(map[string]interface{})
	admissionsPotential, _ := globalScore["AdmissionsPotential"].(float64)

	switch {
	case admissionsPotential >= 3.0:
		return "strong_recommend"
	case admissionsPotential >= 2.5:
		return "recommend"
	case admissionsPotential >= 2.0:
		return "consider"
	default:
		return "not_recommend"
	}
}

func upsertAdminUser(tx *sqlx.Tx, def adminSeedDefinition) error {
	if _, err := tx.Exec(`
		DELETE FROM users
		WHERE id = $1
		  AND email <> $2
		  AND EXISTS (
		      SELECT 1
		      FROM users existing_admin
		      WHERE existing_admin.email = $2
		        AND existing_admin.id <> $1
		  )
	`, def.UserID, def.Email); err != nil {
		return fmt.Errorf("failed to clean legacy seeded admin user %s: %w", def.Email, err)
	}

	result, err := tx.Exec(`
		UPDATE users
		SET email = $1,
		    password_hash = $2,
		    role = 'admin',
		    is_email_verified = TRUE,
		    first_name = $3,
		    last_name = $4,
		    phone_number = $5,
		    updated_at = $6
		WHERE email = $1
	`,
		def.Email,
		adminSeedPasswordHash,
		def.FirstName,
		def.LastName,
		def.PhoneNumber,
		def.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to upsert seeded admin user %s: %w", def.Email, err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to inspect seeded admin user upsert result %s: %w", def.Email, err)
	}
	if rowsAffected > 0 {
		return nil
	}

	result, err = tx.Exec(`
		UPDATE users
		SET email = $2,
		    password_hash = $3,
		    role = 'admin',
		    is_email_verified = TRUE,
		    first_name = $4,
		    last_name = $5,
		    phone_number = $6,
		    updated_at = $7
		WHERE id = $1
	`,
		def.UserID,
		def.Email,
		adminSeedPasswordHash,
		def.FirstName,
		def.LastName,
		def.PhoneNumber,
		def.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to update seeded admin user by id %s: %w", def.Email, err)
	}

	rowsAffected, err = result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to inspect seeded admin user update-by-id result %s: %w", def.Email, err)
	}
	if rowsAffected > 0 {
		return nil
	}

	_, err = tx.Exec(`
		INSERT INTO users (
			id,
			email,
			password_hash,
			role,
			is_email_verified,
			first_name,
			last_name,
			phone_number,
			created_at,
			updated_at
		)
		VALUES ($1, $2, $3, 'admin', TRUE, $4, $5, $6, $7, $7)
	`,
		def.UserID,
		def.Email,
		adminSeedPasswordHash,
		def.FirstName,
		def.LastName,
		def.PhoneNumber,
		def.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert seeded admin user %s: %w", def.Email, err)
	}

	return nil
}

func upsertSeedUser(tx *sqlx.Tx, def applicantSeedDefinition) error {
	_, err := tx.Exec(`
		INSERT INTO users (
			id,
			email,
			password_hash,
			role,
			is_email_verified,
			first_name,
			last_name,
			phone_number,
			created_at,
			updated_at
		)
		VALUES ($1, $2, $3, 'user', TRUE, $4, $5, $6, $7, $7)
		ON CONFLICT (id) DO UPDATE
		SET email = EXCLUDED.email,
		    password_hash = EXCLUDED.password_hash,
		    role = EXCLUDED.role,
		    is_email_verified = EXCLUDED.is_email_verified,
		    first_name = EXCLUDED.first_name,
		    last_name = EXCLUDED.last_name,
		    phone_number = EXCLUDED.phone_number,
		    updated_at = EXCLUDED.updated_at
	`,
		def.UserID,
		def.Email,
		applicantSeedPasswordHash,
		def.FirstName,
		def.LastName,
		def.PhoneNumber,
		def.SubmittedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to upsert mock applicant user %s: %w", def.Email, err)
	}

	return nil
}

func upsertApplicationFiles(tx *sqlx.Tx, def applicantSeedDefinition, transcript string, attached bool) error {
	fileSeeds := []struct {
		ID          string
		FileType    string
		Filename    string
		ContentType string
		SizeBytes   int64
		ObjectKey   string
	}{
		{
			ID:          def.VideoFileID,
			FileType:    "video_presentation",
			Filename:    fmt.Sprintf("%s-%s-video.mp4", sanitizeSeedName(def.FirstName), sanitizeSeedName(def.LastName)),
			ContentType: "video/mp4",
			SizeBytes:   int64(len(transcript))*48 + 1_500_000,
			ObjectKey:   fmt.Sprintf("seed/%s/video-presentation.mp4", sanitizeSeedName(def.Email)),
		},
		{
			ID:          def.VideoAudioFileID,
			FileType:    "video_audio",
			Filename:    fmt.Sprintf("%s-%s-audio.mp3", sanitizeSeedName(def.FirstName), sanitizeSeedName(def.LastName)),
			ContentType: "audio/mpeg",
			SizeBytes:   int64(len(transcript))*8 + 210_000,
			ObjectKey:   fmt.Sprintf("seed/%s/video-audio.mp3", sanitizeSeedName(def.Email)),
		},
		{
			ID:          def.PortfolioFileID,
			FileType:    "portfolio",
			Filename:    fmt.Sprintf("%s-%s-portfolio.pdf", sanitizeSeedName(def.FirstName), sanitizeSeedName(def.LastName)),
			ContentType: "application/pdf",
			SizeBytes:   540_000,
			ObjectKey:   fmt.Sprintf("seed/%s/portfolio.pdf", sanitizeSeedName(def.Email)),
		},
		{
			ID:          def.EnglishResultFileID,
			FileType:    "english_result",
			Filename:    fmt.Sprintf("%s-%s-ielts.pdf", sanitizeSeedName(def.FirstName), sanitizeSeedName(def.LastName)),
			ContentType: "application/pdf",
			SizeBytes:   180_000,
			ObjectKey:   fmt.Sprintf("seed/%s/english-result.pdf", sanitizeSeedName(def.Email)),
		},
		{
			ID:          def.CertificateFileID,
			FileType:    "certificate",
			Filename:    fmt.Sprintf("%s-%s-certificate.pdf", sanitizeSeedName(def.FirstName), sanitizeSeedName(def.LastName)),
			ContentType: "application/pdf",
			SizeBytes:   220_000,
			ObjectKey:   fmt.Sprintf("seed/%s/certificate.pdf", sanitizeSeedName(def.Email)),
		},
	}

	var applicationID interface{}
	if attached {
		applicationID = def.ApplicationID
	}

	for _, fileSeed := range fileSeeds {
		_, err := tx.Exec(`
			INSERT INTO application_files (
				id,
				uploaded_by_user_id,
				application_id,
				file_type,
				bucket_name,
				object_key,
				original_filename,
				content_type,
				size_bytes,
				etag,
				created_at
			)
			VALUES ($1, $2, $3, $4, 'mock-seeds', $5, $6, $7, $8, $9, $10)
			ON CONFLICT (id) DO UPDATE
			SET uploaded_by_user_id = EXCLUDED.uploaded_by_user_id,
			    application_id = EXCLUDED.application_id,
			    file_type = EXCLUDED.file_type,
			    bucket_name = EXCLUDED.bucket_name,
			    object_key = EXCLUDED.object_key,
			    original_filename = EXCLUDED.original_filename,
			    content_type = EXCLUDED.content_type,
			    size_bytes = EXCLUDED.size_bytes,
			    etag = EXCLUDED.etag
		`,
			fileSeed.ID,
			def.UserID,
			applicationID,
			fileSeed.FileType,
			fileSeed.ObjectKey,
			fileSeed.Filename,
			fileSeed.ContentType,
			fileSeed.SizeBytes,
			fmt.Sprintf("seed-%s-%s", sanitizeSeedName(def.Email), fileSeed.FileType),
			def.SubmittedAt,
		)
		if err != nil {
			return fmt.Errorf("failed to upsert mock applicant file %s: %w", fileSeed.ID, err)
		}
	}

	return nil
}

func upsertApplication(tx *sqlx.Tx, def applicantSeedDefinition, programID int, transcript string) error {
	_, err := tx.Exec(`
		INSERT INTO applications (
			id,
			user_id,
			program_id,
			review_stage,
			decision,
			video_file_id,
			video_audio_file_id,
			video_transcript,
			screening_status,
			screening_error,
			ai_probability,
			ielts_score,
			ent_score,
			submitted_at,
			created_at,
			updated_at
		)
		VALUES ($1, $2, $3, 'application_review', 'pending', $4, $5, $6, 'completed', NULL, $7, $8, $9, $10, $10, $10)
		ON CONFLICT (id) DO UPDATE
		SET user_id = EXCLUDED.user_id,
		    program_id = EXCLUDED.program_id,
		    review_stage = EXCLUDED.review_stage,
		    decision = EXCLUDED.decision,
		    video_file_id = EXCLUDED.video_file_id,
		    video_audio_file_id = EXCLUDED.video_audio_file_id,
		    video_transcript = EXCLUDED.video_transcript,
		    screening_status = EXCLUDED.screening_status,
		    screening_error = EXCLUDED.screening_error,
		    ai_probability = EXCLUDED.ai_probability,
		    ielts_score = EXCLUDED.ielts_score,
		    ent_score = EXCLUDED.ent_score,
		    submitted_at = EXCLUDED.submitted_at,
		    updated_at = EXCLUDED.updated_at
	`,
		def.ApplicationID,
		def.UserID,
		programID,
		def.VideoFileID,
		def.VideoAudioFileID,
		nullString(transcript),
		def.AIProbability,
		def.IELTSScore,
		def.ENTScore,
		def.SubmittedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to upsert mock application %s: %w", def.ApplicationID, err)
	}

	return nil
}

func upsertApplicationAnswers(tx *sqlx.Tx, applicationID string, answers [][2]uuid.UUID) error {
	for _, answer := range answers {
		_, err := tx.Exec(`
			INSERT INTO application_test_answers (
				application_id,
				question_id,
				option_id,
				created_at
			)
			VALUES ($1, $2, $3, NOW())
			ON CONFLICT (application_id, question_id) DO UPDATE
			SET option_id = EXCLUDED.option_id
		`, applicationID, answer[0], answer[1])
		if err != nil {
			return fmt.Errorf("failed to upsert mock application answer for %s: %w", applicationID, err)
		}
	}

	return nil
}

func upsertScoringRuns(tx *sqlx.Tx, doc applicantSeedDocument, personalityScore *personalityScorePayload) error {
	_, err := tx.Exec(`
		INSERT INTO scoring_runs (
			id,
			application_id,
			model_name,
			result_json,
			recommendation,
			created_at
		)
		VALUES ($1, $2, 'personality_test', $3, $4, $5)
		ON CONFLICT (id) DO UPDATE
		SET application_id = EXCLUDED.application_id,
		    model_name = EXCLUDED.model_name,
		    result_json = EXCLUDED.result_json,
		    recommendation = EXCLUDED.recommendation,
		    created_at = EXCLUDED.created_at
	`,
		doc.def.PersonalityScoringRunID,
		doc.def.ApplicationID,
		mustJSON(personalityScore.resultJSON),
		personalityScore.recommendation,
		doc.def.SubmittedAt.Add(2*time.Minute),
	)
	if err != nil {
		return fmt.Errorf("failed to upsert personality scoring run for %s: %w", doc.def.ApplicationID, err)
	}

	_, err = tx.Exec(`
		INSERT INTO scoring_runs (
			id,
			application_id,
			model_name,
			result_json,
			recommendation,
			created_at
		)
		VALUES ($1, $2, 'llmscoring', $3, $4, $5)
		ON CONFLICT (id) DO UPDATE
		SET application_id = EXCLUDED.application_id,
		    model_name = EXCLUDED.model_name,
		    result_json = EXCLUDED.result_json,
		    recommendation = EXCLUDED.recommendation,
		    created_at = EXCLUDED.created_at
	`,
		doc.def.LLMScoringRunID,
		doc.def.ApplicationID,
		mustJSON(doc.llmResultJSON),
		computeLLMRecommendation(doc.llmResultJSON),
		doc.def.SubmittedAt.Add(5*time.Minute),
	)
	if err != nil {
		return fmt.Errorf("failed to upsert llm scoring run for %s: %w", doc.def.ApplicationID, err)
	}

	return nil
}

func sanitizeSeedName(value string) string {
	result := ""
	for _, r := range value {
		switch {
		case r >= 'a' && r <= 'z':
			result += string(r)
		case r >= 'A' && r <= 'Z':
			result += string(r + ('a' - 'A'))
		case r >= '0' && r <= '9':
			result += string(r)
		case r == '@':
			result += "-at-"
		case r == '.' || r == '-' || r == '_':
			result += string(r)
		default:
			result += "-"
		}
	}
	return result
}

func mustJSON(value interface{}) []byte {
	raw, err := json.Marshal(value)
	if err != nil {
		panic(err)
	}
	return raw
}

func nullString(value string) sql.NullString {
	if value == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: value, Valid: true}
}
