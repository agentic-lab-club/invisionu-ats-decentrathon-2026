package favorites

import "github.com/google/uuid"

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(userID uuid.UUID) ([]uuid.UUID, error) {
	return s.repo.List(userID)
}

func (s *Service) Add(userID, candidateID uuid.UUID) error {
	return s.repo.Add(userID, candidateID)
}

func (s *Service) Remove(userID, candidateID uuid.UUID) error {
	return s.repo.Remove(userID, candidateID)
}