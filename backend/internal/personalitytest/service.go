package personalitytest

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetCurrent() (*Test, error) {
	return s.repo.GetCurrent()
}
