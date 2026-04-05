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

// Register godoc
// @Summary Register applicant account
// @Description Creates a new user account and conditionally issues an email verification code.
// @Tags @auth
// @Accept json
// @Produce json
// @Param request body RegisterRequest true "Registration payload"
// @Success 201 {object} RegisterResponse
// @Failure 400 {object} map[string]interface{}
// @Router /auth/register [post]
func (h *Handler) Register(c fiber.Ctx) error {
	req := c.Locals("body").(RegisterRequest)
	l := c.Locals("log").(*zerolog.Logger)
	requiresVerification, err := h.service.Register(c.Context(), req)
	if err != nil {
		l.Warn().Err(err).Str("event", "auth_register_failed").Int("http_status", fiber.StatusBadRequest).Msg("failed to register")
		return respond.ErrorStatus(c, err, fiber.StatusBadRequest)
	}
	message := "Verification code sent"
	if !requiresVerification {
		message = "Account created"
	}
	return respond.Created(c, RegisterResponse{Message: message, RequiresEmailVerification: requiresVerification}, nil)
}

// VerifyEmail godoc
// @Summary Verify email with code
// @Description Verifies a user's email address using the latest active verification code.
// @Tags @auth
// @Accept json
// @Produce json
// @Param request body VerifyEmailRequest true "Email verification payload"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} map[string]interface{}
// @Router /auth/verify-email [post]
func (h *Handler) VerifyEmail(c fiber.Ctx) error {
	req := c.Locals("body").(VerifyEmailRequest)
	l := c.Locals("log").(*zerolog.Logger)
	if err := h.service.VerifyEmail(c.Context(), req); err != nil {
		l.Warn().Err(err).Str("event", "auth_verify_email_failed").Int("http_status", fiber.StatusBadRequest).Msg("failed to verify email")
		return respond.ErrorStatus(c, err, fiber.StatusBadRequest)
	}
	return respond.OK(c, MessageResponse{Message: "Email verified"}, nil)
}

// Login godoc
// @Summary Login with email and password
// @Description Authenticates a user and returns access and refresh tokens. When email verification is enabled, the user must be verified.
// @Tags @auth
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login payload"
// @Success 200 {object} TokenResponse
// @Failure 401 {object} map[string]interface{}
// @Router /auth/login [post]
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

// Refresh godoc
// @Summary Refresh access token
// @Description Rotates the refresh session and returns a new access and refresh token pair.
// @Tags @auth
// @Accept json
// @Produce json
// @Param request body RefreshRequest true "Refresh token payload"
// @Success 200 {object} TokenResponse
// @Failure 401 {object} map[string]interface{}
// @Router /auth/refresh [post]
func (h *Handler) Refresh(c fiber.Ctx) error {
	req := c.Locals("body").(RefreshRequest)
	response, err := h.service.Refresh(c.Context(), req.RefreshToken, c.Get("User-Agent"), c.IP())
	if err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusUnauthorized)
	}
	return respond.OK(c, response, nil)
}

// Logout godoc
// @Summary Logout current refresh session
// @Description Revokes the provided refresh token session.
// @Tags @auth
// @Accept json
// @Produce json
// @Param request body LogoutRequest true "Logout payload"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} map[string]interface{}
// @Router /auth/logout [post]
func (h *Handler) Logout(c fiber.Ctx) error {
	req := c.Locals("body").(LogoutRequest)
	if err := h.service.Logout(c.Context(), req.RefreshToken); err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusBadRequest)
	}
	return respond.OK(c, MessageResponse{Message: "Logged out"}, nil)
}

// ResendCode godoc
// @Summary Resend email verification code
// @Description Issues a new verification code for an existing unverified user.
// @Tags @auth
// @Accept json
// @Produce json
// @Param request body ResendCodeRequest true "Resend code payload"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} map[string]interface{}
// @Router /auth/resend-code [post]
func (h *Handler) ResendCode(c fiber.Ctx) error {
	req := c.Locals("body").(ResendCodeRequest)
	if err := h.service.ResendCode(c.Context(), req.Email); err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusBadRequest)
	}
	return respond.OK(c, MessageResponse{Message: "Verification code sent"}, nil)
}

// Me godoc
// @Summary Get current authenticated user
// @Description Returns the current user profile extracted from the bearer access token.
// @Tags @auth
// @Produce json
// @Security BearerToken
// @Success 200 {object} meResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /auth/me [get]
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
