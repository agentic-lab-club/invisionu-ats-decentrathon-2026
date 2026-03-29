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

func (h *Handler) List(c fiber.Ctx) error {
	items, err := h.service.List()
	if err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusInternalServerError)
	}
	return respond.OK(c, ListResponse{Items: items}, nil)
}
