package applications

import (
	"context"
	"fmt"
<<<<<<< HEAD
	"time"
=======
>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87

	platformMessaging "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/messaging"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/timekit"
	"github.com/google/uuid"
)

type Service struct {
<<<<<<< HEAD
	repo    *Repository
	cfg     *config.Config
	bus     platformMessaging.Bus
	axisMax map[string]int
}

func NewService(repo *Repository, cfg *config.Config, bus platformMessaging.Bus) *Service {
	s := &Service{
		repo:    repo,
		cfg:     cfg,
		bus:     bus,
		axisMax: make(map[string]int),
	}
	if err := s.loadAxisMax(); err != nil {
		// логируем, но не падаем
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
=======
	repo *Repository
	cfg  *config.Config
	bus  platformMessaging.Bus
}

func NewService(repo *Repository, cfg *config.Config, bus platformMessaging.Bus) *Service {
	return &Service{repo: repo, cfg: cfg, bus: bus}
}

>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
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

<<<<<<< HEAD
	// Валидация файлов
=======
>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
	fileIDs := []struct {
		id       *uuid.UUID
		fileType string
	}{
		{id: &req.VideoFileID, fileType: "video_presentation"},
		{id: req.PortfolioFileID, fileType: "portfolio"},
		{id: req.EnglishResultFileID, fileType: "english_result"},
		{id: req.CertificateFileID, fileType: "certificate"},
	}
<<<<<<< HEAD
=======

>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
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

<<<<<<< HEAD
	// Валидация ответов теста
=======
>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
	for _, answer := range req.PersonalityTestAnswers {
		valid, err := s.repo.ValidateAnswerPair(answer.QuestionID, answer.OptionID)
		if err != nil {
			return nil, err
		}
		if !valid {
			return nil, fmt.Errorf("invalid personality test answer")
		}
	}

<<<<<<< HEAD
	scores, err := s.computePersonalityScores(req.PersonalityTestAnswers)
	if err != nil {
		return nil, err
	}

=======
>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
	tx, err := s.repo.BeginTx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if err := s.repo.UpdateUserProfile(tx, userID, req.FirstName, req.LastName, req.PhoneNumber); err != nil {
		return nil, err
	}

<<<<<<< HEAD
	app, err := s.repo.CreateApplication(tx, userID, program.ID, req.VideoFileID, timekit.NowUTC())
=======
	application, err := s.repo.CreateApplication(tx, userID, program.ID, req.VideoFileID, timekit.NowUTC())
>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
	if err != nil {
		return nil, err
	}

	for _, item := range fileIDs {
		if item.id == nil {
			continue
		}
<<<<<<< HEAD
		if err := s.repo.AttachFileToApplication(tx, app.ID, *item.id); err != nil {
=======
		if err := s.repo.AttachFileToApplication(tx, application.ID, *item.id); err != nil {
>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
			return nil, err
		}
	}

	for _, answer := range req.PersonalityTestAnswers {
<<<<<<< HEAD
		if err := s.repo.InsertApplicationTestAnswer(tx, app.ID, answer.QuestionID, answer.OptionID); err != nil {
=======
		if err := s.repo.InsertApplicationTestAnswer(tx, application.ID, answer.QuestionID, answer.OptionID); err != nil {
>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
			return nil, err
		}
	}

<<<<<<< HEAD
	scoringRun := &ScoringRun{
		ID:            uuid.New(),
		ApplicationID: app.ID,
		ModelName:     "personality_test",
		ResultJSON:    scores,
		CreatedAt:     time.Now(),
	}
	if err := s.repo.CreateScoringRunInTx(tx, scoringRun); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Публикация события (не критична)
	_ = s.bus.Publish(ctx, s.cfg.Messaging.ApplicationSubmittedKey, SubmittedEvent{ApplicationID: app.ID})

	return &CreateResponse{ApplicationID: app.ID}, nil
}

func (s *Service) Status(ctx context.Context, userID uuid.UUID) (*StatusResponse, error) {
	return s.repo.FindStatusByUserID(userID)
}
=======
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit application transaction: %w", err)
	}

	if err := s.bus.Publish(ctx, s.cfg.Messaging.ApplicationSubmittedKey, SubmittedEvent{ApplicationID: application.ID}); err != nil {
		return nil, err
	}

	return &CreateResponse{ApplicationID: application.ID}, nil
}

func (s *Service) Status(_ context.Context, userID uuid.UUID) (*StatusResponse, error) {
	return s.repo.FindStatusByUserID(userID)
}
>>>>>>> 6b0b155e42d452c85448ede2ed708fcf55c63c87
