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

func (h *Handler) List(c fiber.Ctx) error {
	items, err := h.service.List(c.Query("program_code"), c.Query("review_stage"), c.Query("decision"), c.Query("search"))
	if err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusInternalServerError)
	}
	return respond.OK(c, ListResponse{Items: items}, nil)
}

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
