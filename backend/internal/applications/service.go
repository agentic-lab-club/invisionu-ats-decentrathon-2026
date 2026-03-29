package applications

import (
	"context"
	"fmt"

	platformMessaging "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/messaging"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/timekit"
	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
	cfg  *config.Config
	bus  platformMessaging.Bus
}

func NewService(repo *Repository, cfg *config.Config, bus platformMessaging.Bus) *Service {
	return &Service{repo: repo, cfg: cfg, bus: bus}
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

	fileIDs := []struct {
		id       *uuid.UUID
		fileType string
	}{
		{id: &req.VideoFileID, fileType: "video_presentation"},
		{id: req.PortfolioFileID, fileType: "portfolio"},
		{id: req.EnglishResultFileID, fileType: "english_result"},
		{id: req.CertificateFileID, fileType: "certificate"},
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

	for _, answer := range req.PersonalityTestAnswers {
		valid, err := s.repo.ValidateAnswerPair(answer.QuestionID, answer.OptionID)
		if err != nil {
			return nil, err
		}
		if !valid {
			return nil, fmt.Errorf("invalid personality test answer")
		}
	}

	tx, err := s.repo.BeginTx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if err := s.repo.UpdateUserProfile(tx, userID, req.FirstName, req.LastName, req.PhoneNumber); err != nil {
		return nil, err
	}

	application, err := s.repo.CreateApplication(tx, userID, program.ID, req.VideoFileID, timekit.NowUTC())
	if err != nil {
		return nil, err
	}

	for _, item := range fileIDs {
		if item.id == nil {
			continue
		}
		if err := s.repo.AttachFileToApplication(tx, application.ID, *item.id); err != nil {
			return nil, err
		}
	}

	for _, answer := range req.PersonalityTestAnswers {
		if err := s.repo.InsertApplicationTestAnswer(tx, application.ID, answer.QuestionID, answer.OptionID); err != nil {
			return nil, err
		}
	}

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
