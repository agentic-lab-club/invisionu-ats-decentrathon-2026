package applications

import (
	"fmt"

	md "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/middlewares"
	respond "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/responder"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Create godoc
// @Summary Submit application
// @Description Creates a new ATS application for the authenticated applicant and publishes the submission event.
// @Tags @applications
// @Accept json
// @Produce json
// @Security BearerToken
// @Param request body CreateRequest true "Application submission payload"
// @Success 201 {object} CreateResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /applications [post]
func (h *Handler) Create(c fiber.Ctx) error {
	userID, ok := md.AuthID(c)
	if !ok {
		return respond.ErrorStatus(c, fmt.Errorf("unauthorized"), fiber.StatusUnauthorized)
	}
	req := c.Locals("body").(CreateRequest)
	response, err := h.service.Create(c.Context(), userID, req)
	if err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusBadRequest)
	}
	return respond.Created(c, response, nil)
}

// Status godoc
// @Summary Get current application status
// @Description Returns the latest application status for the authenticated applicant.
// @Tags @applications
// @Produce json
// @Security BearerToken
// @Success 200 {object} StatusResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /applications/status [get]
func (h *Handler) Status(c fiber.Ctx) error {
	userID, ok := md.AuthID(c)
	if !ok {
		return respond.ErrorStatus(c, fmt.Errorf("unauthorized"), fiber.StatusUnauthorized)
	}
	status, err := h.service.Status(c.Context(), userID)
	if err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusInternalServerError)
	}
	if status == nil {
		return respond.ErrorStatus(c, fmt.Errorf("application not found"), fiber.StatusNotFound)
	}
	return respond.OK(c, status, nil)
}
