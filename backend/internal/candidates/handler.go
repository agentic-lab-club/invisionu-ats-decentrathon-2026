package candidates

import (
	"fmt"

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
// @Summary List candidates for admin review
// @Description Returns candidate applications with optional admin filters.
// @Tags @candidates
// @Produce json
// @Security BearerToken
// @Param program_code query string false "Filter by program code"
// @Param review_stage query string false "Filter by review stage"
// @Param decision query string false "Filter by decision"
// @Param search query string false "Search by applicant name or email"
// @Success 200 {object} ListResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /candidates [get]
func (h *Handler) List(c fiber.Ctx) error {
	items, err := h.service.List(c.Query("program_code"), c.Query("review_stage"), c.Query("decision"), c.Query("search"))
	if err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusInternalServerError)
	}
	return respond.OK(c, ListResponse{Items: items}, nil)
}

// Detail godoc
// @Summary Get candidate detail
// @Description Returns the full admin review view for a candidate application.
// @Tags @candidates
// @Produce json
// @Security BearerToken
// @Param applicationId path string true "Application ID"
// @Success 200 {object} Detail
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /candidates/{applicationId} [get]
func (h *Handler) Detail(c fiber.Ctx) error {
	applicationID, err := uuid.Parse(c.Params("applicationId"))
	if err != nil {
		return respond.ErrorStatus(c, fmt.Errorf("invalid application id"), fiber.StatusBadRequest)
	}
	detail, err := h.service.Detail(applicationID)
	if err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusInternalServerError)
	}
	if detail == nil {
		return respond.ErrorStatus(c, fmt.Errorf("candidate not found"), fiber.StatusNotFound)
	}
	return respond.OK(c, detail, nil)
}

// UpdateStage godoc
// @Summary Update candidate review stage
// @Description Updates the admin review stage and optional decision for a candidate application.
// @Tags @candidates
// @Accept json
// @Produce json
// @Security BearerToken
// @Param applicationId path string true "Application ID"
// @Param request body UpdateStageRequest true "Stage update payload"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /candidates/{applicationId}/stage [patch]
func (h *Handler) UpdateStage(c fiber.Ctx) error {
	applicationID, err := uuid.Parse(c.Params("applicationId"))
	if err != nil {
		return respond.ErrorStatus(c, fmt.Errorf("invalid application id"), fiber.StatusBadRequest)
	}
	req := c.Locals("body").(UpdateStageRequest)
	if err := h.service.UpdateStage(applicationID, req); err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusBadRequest)
	}
	return respond.OK(c, MessageResponse{Message: "Candidate stage updated"}, nil)
}

type MessageResponse struct {
	Message string `json:"message"`
}
