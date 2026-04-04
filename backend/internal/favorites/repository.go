package favorites

import (
	"fmt"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	"github.com/google/uuid"
)

type Repository struct {
	db *database.TrackedDB
}

func NewRepository(db *database.TrackedDB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) List(userID uuid.UUID) ([]uuid.UUID, error) {
	var rows []struct {
		CandidateID uuid.UUID `db:"candidate_id"`
	}
	if err := r.db.TrackedSelect(&rows, r.db.Rebind(listFavoritesQuery), userID); err != nil {
		return nil, fmt.Errorf("failed to list favorites: %w", err)
	}
	ids := make([]uuid.UUID, len(rows))
	for i, row := range rows {
		ids[i] = row.CandidateID
	}
	return ids, nil
}

func (r *Repository) Add(userID, candidateID uuid.UUID) error {
	if _, err := r.db.TrackedInsert(r.db.Rebind(addFavoriteQuery), userID, candidateID); err != nil {
		return fmt.Errorf("failed to add favorite: %w", err)
	}
	return nil
}

func (r *Repository) Remove(userID, candidateID uuid.UUID) error {
	if _, err := r.db.TrackedDelete(r.db.Rebind(removeFavoriteQuery), userID, candidateID); err != nil {
		return fmt.Errorf("failed to remove favorite: %w", err)
	}
	return nil
}