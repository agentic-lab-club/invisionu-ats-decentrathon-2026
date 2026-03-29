package programs

import (
	"fmt"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
)

type Repository struct {
	db *database.TrackedDB
}

func NewRepository(db *database.TrackedDB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListActive() ([]Program, error) {
	var items []Program
	if err := r.db.TrackedSelect(&items, r.db.Rebind(listActiveProgramsQuery)); err != nil {
		return nil, fmt.Errorf("failed to list active programs: %w", err)
	}
	return items, nil
}
