package favorites

import (
	"fmt"

	md "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/middlewares"
	respond "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/responder"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// List godoc
// @Summary List favorite candidate IDs
// @Description Returns the list of candidate application IDs saved as favorites by the current admin user.
// @Tags @favorites
// @Produce json
// @Security BearerToken
// @Success 200 {object} ListResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /favorites [get]
func (h *Handler) List(c fiber.Ctx) error {
	userID, ok := md.AuthID(c)
	if !ok {
		return respond.ErrorStatus(c, fmt.Errorf("unauthorized"), fiber.StatusUnauthorized)
	}
	ids, err := h.service.List(userID)
	if err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusInternalServerError)
	}
	if ids == nil {
		ids = []uuid.UUID{}
	}
	return respond.OK(c, ListResponse{IDs: ids}, nil)
}

// Add godoc
// @Summary Add a candidate to favorites
// @Description Adds a candidate application to the current admin user's favorites list.
// @Tags @favorites
// @Accept json
// @Produce json
// @Security BearerToken
// @Param request body AddRequest true "Candidate ID to add"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /favorites [post]
func (h *Handler) Add(c fiber.Ctx) error {
	userID, ok := md.AuthID(c)
	if !ok {
		return respond.ErrorStatus(c, fmt.Errorf("unauthorized"), fiber.StatusUnauthorized)
	}
	req := c.Locals("body").(AddRequest)
	if err := h.service.Add(userID, req.CandidateID); err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusInternalServerError)
	}
	return respond.OK(c, MessageResponse{Message: "Added to favorites"}, nil)
}

// Remove godoc
// @Summary Remove a candidate from favorites
// @Description Removes a candidate application from the current admin user's favorites list.
// @Tags @favorites
// @Produce json
// @Security BearerToken
// @Param candidateId path string true "Candidate Application ID"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /favorites/{candidateId} [delete]
func (h *Handler) Remove(c fiber.Ctx) error {
	userID, ok := md.AuthID(c)
	if !ok {
		return respond.ErrorStatus(c, fmt.Errorf("unauthorized"), fiber.StatusUnauthorized)
	}
	candidateID, err := uuid.Parse(c.Params("candidateId"))
	if err != nil {
		return respond.ErrorStatus(c, fmt.Errorf("invalid candidate id"), fiber.StatusBadRequest)
	}
	if err := h.service.Remove(userID, candidateID); err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusInternalServerError)
	}
	return respond.OK(c, MessageResponse{Message: "Removed from favorites"}, nil)
}