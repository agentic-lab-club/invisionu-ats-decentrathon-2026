package personalitytest

import (
	"fmt"

	respond "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/responder"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// GetCurrent godoc
// @Summary Get current active personality test
// @Description Returns the active personality test with questions and options for the application form.
// @Tags @personalitytest
// @Produce json
// @Success 200 {object} Test
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /tests/personality/current [get]
func (h *Handler) GetCurrent(c fiber.Ctx) error {
	test, err := h.service.GetCurrent()
	if err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusInternalServerError)
	}
	if test == nil {
		return respond.ErrorStatus(c, fmt.Errorf("active personality test not found"), fiber.StatusNotFound)
	}
	return respond.OK(c, test, nil)
}
