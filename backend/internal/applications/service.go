package applications

import (
	"context"
	"fmt"
	"time"

	platformMessaging "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/messaging"
	platformStorage "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/storage"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/timekit"
	"github.com/google/uuid"
)

type Service struct {
	repo      *Repository
	cfg       *config.Config
	bus       platformMessaging.Bus
	axisMax   map[string]int
	screening *ScreeningProcessor
}

func NewService(repo *Repository, cfg *config.Config, bus platformMessaging.Bus, objectStorage platformStorage.ObjectStorage) *Service {
	s := &Service{
		repo:      repo,
		cfg:       cfg,
		bus:       bus,
		axisMax:   make(map[string]int),
		screening: NewScreeningProcessor(repo, objectStorage, cfg),
	}
	if repo != nil && repo.db != nil {
		if err := s.loadAxisMax(); err != nil {
			// логируем, но не падаем
		}
	}
	return s
}

func (s *Service) loadAxisMax() error {
	allOptions, err := s.repo.GetAllOptionsWithMetrics()
	if err != nil {
		return err
	}
	s.axisMax = map[string]int{"M": 0, "P": 0, "R": 0, "L": 0, "V": 0}
	for _, options := range allOptions {
		for _, opt := range options {
			if opt.M > s.axisMax["M"] {
				s.axisMax["M"] = opt.M
			}
			if opt.P > s.axisMax["P"] {
				s.axisMax["P"] = opt.P
			}
			if opt.R > s.axisMax["R"] {
				s.axisMax["R"] = opt.R
			}
			if opt.L > s.axisMax["L"] {
				s.axisMax["L"] = opt.L
			}
			if opt.V > s.axisMax["V"] {
				s.axisMax["V"] = opt.V
			}
		}
	}
	return nil
}

func (s *Service) computePersonalityScores(answers []AnswerInput) (map[string]interface{}, error) {
	axisRaw := map[string]int{"M": 0, "P": 0, "R": 0, "L": 0, "V": 0}

	for _, ans := range answers {
		metrics, err := s.repo.GetMetricsByOptionID(ans.OptionID)
		if err != nil {
			return nil, fmt.Errorf("failed to get metrics for option %s: %w", ans.OptionID, err)
		}
		axisRaw["M"] += metrics.M
		axisRaw["P"] += metrics.P
		axisRaw["R"] += metrics.R
		axisRaw["L"] += metrics.L
		axisRaw["V"] += metrics.V
	}

	axisNorm := make(map[string]float64)
	for axis, raw := range axisRaw {
		maxVal := s.axisMax[axis]
		if maxVal == 0 {
			axisNorm[axis] = 0
		} else {
			axisNorm[axis] = float64(raw) / float64(maxVal) * 100
		}
	}

	return map[string]interface{}{
		"axis_raw":  axisRaw,
		"axis_max":  s.axisMax,
		"axis_norm": axisNorm,
		"source":    "personality_test",
	}, nil
}
func (s *Service) computeFusionScores(axisNorm map[string]float64) map[string]float64 {
	// Веса test-части из fusion формулы (llm = 0 пока нет LLM)
	testWeights := map[string]float64{
		"M": 0.45,
		"P": 0.55,
		"R": 0.45,
		"L": 0.40,
		"V": 0.55,
	}
	fusion := make(map[string]float64)
	for axis, w := range testWeights {
		fusion[axis] = w * axisNorm[axis]
		// llm часть: 0 пока нет LLM
		// fusion[axis] += (1-w) * llm[axis] * 25
	}
	return fusion
}

func (s *Service) computeRecommendation(fusion map[string]float64) string {
	// balanced_leader weights
	score := 0.15*fusion["M"] + 0.15*fusion["P"] + 0.20*fusion["R"] + 0.35*fusion["L"] + 0.15*fusion["V"]

	switch {
	case score >= 55 && fusion["L"] >= 55*0.40 && fusion["R"] >= 45*0.45 && fusion["V"] >= 40*0.55:
		return "strong_recommend"
	case score >= 40:
		return "recommend"
	case score >= 25:
		return "consider"
	default:
		return "not_recommend"
	}
}
func (s *Service) Create(ctx context.Context, userID uuid.UUID, req CreateRequest) (*CreateResponse, error) {
	user, err := s.repo.FindUserByID(userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, fmt.Errorf("user not found")
	}
	if !user.IsEmailVerified {
		return nil, fmt.Errorf("email is not verified")
	}

	activeCount, err := s.repo.CountActiveApplications(userID)
	if err != nil {
		return nil, err
	}
	if activeCount > 0 {
		return nil, fmt.Errorf("active application already exists")
	}

	program, err := s.repo.FindProgramByCode(req.ProgramCode)
	if err != nil {
		return nil, err
	}
	if program == nil || !program.IsActive {
		return nil, fmt.Errorf("program is invalid or inactive")
	}

	// Валидация файлов
	fileIDs := []struct {
		id       *uuid.UUID
		fileType string
	}{
		{id: &req.VideoFileID, fileType: FileTypeVideoPresentation},
		{id: req.PortfolioFileID, fileType: FileTypePortfolio},
		{id: req.EnglishResultFileID, fileType: FileTypeEnglishResult},
		{id: req.CertificateFileID, fileType: FileTypeCertificate},
	}
	for _, item := range fileIDs {
		if item.id == nil {
			continue
		}
		file, err := s.repo.FindFileByID(*item.id)
		if err != nil {
			return nil, err
		}
		if file == nil {
			return nil, fmt.Errorf("file not found")
		}
		if file.UploadedByUserID != userID {
			return nil, fmt.Errorf("file does not belong to current user")
		}
		if file.ApplicationID != nil {
			return nil, fmt.Errorf("file is already attached")
		}
		if file.FileType != item.fileType {
			return nil, fmt.Errorf("invalid file type")
		}
	}

	// Валидация ответов теста
	for _, answer := range req.PersonalityTestAnswers {
		valid, err := s.repo.ValidateAnswerPair(answer.QuestionID, answer.OptionID)
		if err != nil {
			return nil, err
		}
		if !valid {
			return nil, fmt.Errorf("invalid personality test answer")
		}
	}

	scores, err := s.computePersonalityScores(req.PersonalityTestAnswers)
	if err != nil {
		return nil, err
	}

	tx, err := s.repo.BeginTx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if err := s.repo.UpdateUserProfile(tx, userID, req.FirstName, req.LastName, req.PhoneNumber); err != nil {
		return nil, err
	}

	app, err := s.repo.CreateApplication(tx, userID, program.ID, req.VideoFileID, timekit.NowUTC())
	if err != nil {
		return nil, err
	}

	for _, item := range fileIDs {
		if item.id == nil {
			continue
		}
		if err := s.repo.AttachFileToApplication(tx, app.ID, *item.id); err != nil {
			return nil, err
		}
	}

	for _, answer := range req.PersonalityTestAnswers {
		if err := s.repo.InsertApplicationTestAnswer(tx, app.ID, answer.QuestionID, answer.OptionID); err != nil {
			return nil, err
		}
	}

	scoringRun := &ScoringRun{
		ID:             uuid.New(),
		ApplicationID:  app.ID,
		ModelName:      "personality_test",
		ResultJSON:     scores,
		Recommendation: stringPtr(s.computeRecommendation(s.computeFusionScores(toFloatMap(scores["axis_norm"])))),
		CreatedAt:      time.Now(),
	}
	if err := s.repo.CreateScoringRunInTx(tx, scoringRun); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Публикация события (не критична)
	_ = s.bus.Publish(ctx, s.cfg.Messaging.ApplicationSubmittedKey, SubmittedEvent{ApplicationID: app.ID})
	if s.screening != nil {
		s.screening.Start(app.ID, userID, req.VideoFileID)
	}

	return &CreateResponse{ApplicationID: app.ID}, nil
}

func (s *Service) Status(ctx context.Context, userID uuid.UUID) (*StatusResponse, error) {
	return s.repo.FindStatusByUserID(userID)
}

func toFloatMap(value interface{}) map[string]float64 {
	result := make(map[string]float64)
	axisNorm, ok := value.(map[string]float64)
	if ok {
		return axisNorm
	}
	rawMap, ok := value.(map[string]interface{})
	if !ok {
		return result
	}
	for key, item := range rawMap {
		switch typed := item.(type) {
		case float64:
			result[key] = typed
		case int:
			result[key] = float64(typed)
		}
	}
	return result
}

func stringPtr(value string) *string {
	return &value
}
