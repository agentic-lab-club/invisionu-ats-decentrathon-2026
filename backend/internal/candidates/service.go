package candidates

import (
	"fmt"

	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(programCode string, reviewStage string, decision string, search string) ([]ListItem, error) {
	return s.repo.List(programCode, reviewStage, decision, search)
}

func (s *Service) Detail(applicationID uuid.UUID) (*Detail, error) {
	return s.repo.GetDetail(applicationID)
}

func (s *Service) UpdateStage(applicationID uuid.UUID, req UpdateStageRequest) error {
	return s.repo.UpdateStage(applicationID, req.ReviewStage, req.Decision)
}

func (s *Service) SmartFilter(preset string) ([]ListItem, error) {
	if _, ok := ValidSmartFilterPresets[preset]; !ok {
		return nil, fmt.Errorf("invalid preset: %s", preset)
	}
	return s.repo.SmartFilter(preset)
}

func (s *Service) AdvancedFilter(p AdvancedFilterParams) ([]ListItem, error) {
	return s.repo.AdvancedFilter(p)
}