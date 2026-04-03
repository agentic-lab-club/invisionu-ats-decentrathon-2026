package favorites

import (
	"time"
	"github.com/google/uuid"
)

type Favorite struct {
	UserID      uuid.UUID `db:"user_id"      json:"user_id"`
	CandidateID uuid.UUID `db:"candidate_id" json:"candidate_id"`
	CreatedAt   time.Time `db:"created_at"   json:"created_at"`
}

type ListResponse struct {
	IDs []uuid.UUID `json:"ids"`
}

type AddRequest struct {
	CandidateID uuid.UUID `json:"candidate_id" validate:"required"`
}

type MessageResponse struct {
	Message string `json:"message"`
}