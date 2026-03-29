package auth

import (
	"fmt"

	md "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/middlewares"
	respond "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/responder"
	"github.com/gofiber/fiber/v3"
	"github.com/rs/zerolog"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Register(c fiber.Ctx) error {
	req := c.Locals("body").(RegisterRequest)
	l := c.Locals("log").(*zerolog.Logger)
	if err := h.service.Register(c.Context(), req); err != nil {
		l.Warn().Err(err).Str("event", "auth_register_failed").Int("http_status", fiber.StatusBadRequest).Msg("failed to register")
		return respond.ErrorStatus(c, err, fiber.StatusBadRequest)
	}
	return respond.Created(c, MessageResponse{Message: "Verification code sent"}, nil)
}

func (h *Handler) VerifyEmail(c fiber.Ctx) error {
	req := c.Locals("body").(VerifyEmailRequest)
	l := c.Locals("log").(*zerolog.Logger)
	if err := h.service.VerifyEmail(c.Context(), req); err != nil {
		l.Warn().Err(err).Str("event", "auth_verify_email_failed").Int("http_status", fiber.StatusBadRequest).Msg("failed to verify email")
		return respond.ErrorStatus(c, err, fiber.StatusBadRequest)
	}
	return respond.OK(c, MessageResponse{Message: "Email verified"}, nil)
}

func (h *Handler) Login(c fiber.Ctx) error {
	req := c.Locals("body").(LoginRequest)
	l := c.Locals("log").(*zerolog.Logger)
	response, err := h.service.Login(c.Context(), req, c.Get("User-Agent"), c.IP())
	if err != nil {
		l.Warn().Err(err).Str("event", "auth_login_failed").Int("http_status", fiber.StatusUnauthorized).Msg("failed to login")
		return respond.ErrorStatus(c, err, fiber.StatusUnauthorized)
	}
	return respond.OK(c, response, nil)
}

func (h *Handler) Refresh(c fiber.Ctx) error {
	req := c.Locals("body").(RefreshRequest)
	response, err := h.service.Refresh(c.Context(), req.RefreshToken, c.Get("User-Agent"), c.IP())
	if err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusUnauthorized)
	}
	return respond.OK(c, response, nil)
}

func (h *Handler) Logout(c fiber.Ctx) error {
	req := c.Locals("body").(LogoutRequest)
	if err := h.service.Logout(c.Context(), req.RefreshToken); err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusBadRequest)
	}
	return respond.OK(c, MessageResponse{Message: "Logged out"}, nil)
}

func (h *Handler) ResendCode(c fiber.Ctx) error {
	req := c.Locals("body").(ResendCodeRequest)
	if err := h.service.ResendCode(c.Context(), req.Email); err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusBadRequest)
	}
	return respond.OK(c, MessageResponse{Message: "Verification code sent"}, nil)
}

func (h *Handler) Me(c fiber.Ctx) error {
	userID, ok := md.AuthID(c)
	if !ok {
		return respond.ErrorStatus(c, fmt.Errorf("unauthorized"), fiber.StatusUnauthorized)
	}
	user, err := h.service.Me(c.Context(), userID)
	if err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusNotFound)
	}
	return respond.OK(c, meResponse{User: *user}, nil)
}
