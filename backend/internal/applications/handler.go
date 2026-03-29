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
