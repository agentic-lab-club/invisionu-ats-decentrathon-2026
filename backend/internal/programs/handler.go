package programs

import (
	respond "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/responder"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// List godoc
// @Summary List active programs
// @Description Returns active programs sorted for the applicant program selection form.
// @Tags @programs
// @Produce json
// @Security BearerToken
// @Success 200 {object} ListResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/programs [get]
func (h *Handler) List(c fiber.Ctx) error {
	items, err := h.service.List()
	if err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusInternalServerError)
	}
	return respond.OK(c, ListResponse{Items: items}, nil)
}
