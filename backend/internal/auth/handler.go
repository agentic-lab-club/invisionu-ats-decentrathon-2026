//go:build ignore

package auth

import (
	"errors"
	"fmt"
	"strings"

	respond "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/responder"
	"github.com/gofiber/fiber/v3"
	"github.com/rs/zerolog"
)

func contains(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

// RequestOTP godoc
// @Summary Request OTP code
// @Description Request a One-Time Password for authentication via SMS or Telegram
// @Tags @auth
// @Accept json
// @Produce json
// @Param channel query string false "Channel for OTP delivery: sms, tg, or telegram"
// @Param request body OTPRequest true "Phone number to send OTP"
// @Success 200 {object} OTPResponse "OTP sent successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 429 {object} map[string]interface{} "Rate limit exceeded"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /auth-otp/request [post]
func (h *Handler) RequestOTP(c fiber.Ctx) error {
	req := c.Locals("body").(OTPRequest)
	l := c.Locals("log").(*zerolog.Logger)

	// channel query param is optional. If provided, use chosen-channel flow.
	// If not provided, fall back to legacy flow with telegram->sms fallback.
	channel := strings.ToLower(strings.TrimSpace(c.Query("channel")))
	if channel != "" && channel != "sms" && channel != "tg" && channel != "telegram" {
		err := errors.New("invalid channel")
		l.Warn().Err(err).Str("event", "auth_otp_request_invalid_channel").Str("channel", channel).Msg("invalid channel param")
		return respond.WithStatus(c, "Invalid channel parameter", err, fiber.StatusBadRequest)
	}

	if channel == "" {
		l.Info().
			Str("event", "auth_otp_request_legacy_start").
			Str("phone_number", req.PhoneNumber).
			Msg("Generate otp request started (legacy, no channel param)")

		rateLimitErr, err := h.service.RequestOTPLegacy(req.PhoneNumber)
		if rateLimitErr != nil {
			rlErr := errors.New("rate limit exceeded")
			c.Set("Retry-After", fmt.Sprintf("%d", rateLimitErr.RetryAfter))
			l.Warn().
				Err(rlErr).
				Str("event", "auth_otp_request_rate_limited").
				Str("phone_number", req.PhoneNumber).
				Int("retry_after", rateLimitErr.RetryAfter).
				Int("http_status", fiber.StatusTooManyRequests).
				Msg("too many otp requests")
			return respond.WithStatus(c, "Too many requests", rlErr, fiber.StatusTooManyRequests)
		}
		if err != nil {
			errMsg := err.Error()
			event := "auth_otp_request_failed"

			switch {
			case contains(errMsg, "failed to generate OTP"):
				event = "auth_otp_generation_failed"
			case contains(errMsg, "failed to save OTP"):
				event = "auth_otp_save_failed"
			case contains(errMsg, "failed to send OTP"):
				event = "auth_otp_send_failed"
			}

			l.Error().
				Err(err).
				Str("event", event).
				Str("phone_number", req.PhoneNumber).
				Int("http_status", fiber.StatusInternalServerError).
				Msg("failed to generate otp request")
			return respond.WithStatus(c, "Failed to send OTP", err, fiber.StatusInternalServerError)
		}

		l.Info().
			Str("event", "auth_otp_request_legacy_success").
			Str("phone_number", req.PhoneNumber).
			Msg("OTP request generate success (legacy)")
		return respond.OK(c, &OTPResponse{
			Success: true,
			Message: "OTP sent successfully",
		}, nil)
	}

	l.Info().
		Str("event", "auth_otp_request_start").
		Str("phone_number", req.PhoneNumber).
		Str("channel", channel).
		Msg("Generate otp request started")

	rateLimitErr, err := h.service.RequestOTP(req.PhoneNumber, channel)
	if rateLimitErr != nil {
		rlErr := errors.New("rate limit exceeded")
		c.Set("Retry-After", fmt.Sprintf("%d", rateLimitErr.RetryAfter))
		l.Warn().
			Err(rlErr).
			Str("event", "auth_otp_request_rate_limited").
			Str("phone_number", req.PhoneNumber).
			Int("retry_after", rateLimitErr.RetryAfter).
			Int("http_status", fiber.StatusTooManyRequests).
			Msg("too many otp requests")
		return respond.WithStatus(c, "Too many requests", rlErr, fiber.StatusTooManyRequests)
	}

	if err != nil {
		errMsg := err.Error()
		event := "auth_otp_request_failed"

		switch {
		case contains(errMsg, "failed to generate OTP"):
			event = "auth_otp_generation_failed"
		case contains(errMsg, "failed to save OTP"):
			event = "auth_otp_save_failed"
		case contains(errMsg, "failed to send OTP"):
			event = "auth_otp_send_failed"
		}

		l.Error().
			Err(err).
			Str("event", event).
			Str("phone_number", req.PhoneNumber).
			Int("http_status", fiber.StatusInternalServerError).
			Msg("failed to generate otp request")
		return respond.WithStatus(c, "Failed to send OTP", err, fiber.StatusInternalServerError)
	}

	l.Info().
		Str("event", "auth_otp_request_success").
		Str("phone_number", req.PhoneNumber).
		Msg("OTP request generate success")
	return respond.OK(c, &OTPResponse{
		Success: true,
		Message: "OTP sent successfully",
	}, nil)
}

// RequestOTPAdmin godoc
// @Summary Request OTP code (admin, no delivery)
// @Description Request a One-Time Password for a phone number without sending SMS/Telegram (admin only)
// @Tags @auth
// @Accept json
// @Produce json
// @Security BearerToken
// @Param request body OTPRequest true "Phone number to generate OTP"
// @Success 200 {object} OTPAdminResponse "OTP generated successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 429 {object} map[string]interface{} "Rate limit exceeded"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /auth-otp/request-admin [post]
func (h *Handler) RequestOTPAdmin(c fiber.Ctx) error {
	req := c.Locals("body").(OTPRequest)
	l := c.Locals("log").(*zerolog.Logger)

	l.Info().
		Str("event", "auth_otp_request_admin_start").
		Str("phone_number", req.PhoneNumber).
		Msg("Generate otp request started (admin, no delivery)")

	code, rateLimitErr, err := h.service.RequestOTPAdmin(req.PhoneNumber)
	if rateLimitErr != nil {
		rlErr := errors.New("rate limit exceeded")
		c.Set("Retry-After", fmt.Sprintf("%d", rateLimitErr.RetryAfter))
		l.Warn().
			Err(rlErr).
			Str("event", "auth_otp_request_admin_rate_limited").
			Str("phone_number", req.PhoneNumber).
			Int("retry_after", rateLimitErr.RetryAfter).
			Int("http_status", fiber.StatusTooManyRequests).
			Msg("too many otp requests")
		return respond.WithStatus(c, "Too many requests", rlErr, fiber.StatusTooManyRequests)
	}

	if err != nil {
		errMsg := err.Error()
		event := "auth_otp_request_admin_failed"

		switch {
		case contains(errMsg, "failed to generate OTP"):
			event = "auth_otp_admin_generation_failed"
		case contains(errMsg, "failed to save OTP"):
			event = "auth_otp_admin_save_failed"
		}

		l.Error().
			Err(err).
			Str("event", event).
			Str("phone_number", req.PhoneNumber).
			Int("http_status", fiber.StatusInternalServerError).
			Msg("failed to generate otp request (admin)")
		return respond.WithStatus(c, "Failed to generate OTP", err, fiber.StatusInternalServerError)
	}

	l.Info().
		Str("event", "auth_otp_request_admin_success").
		Str("phone_number", req.PhoneNumber).
		Msg("OTP request generate success (admin)")
	return respond.OK(c, &OTPAdminResponse{
		Success: true,
		Message: "OTP generated successfully",
		Code:    code,
	}, nil)
}

// VerifyOTP godoc
// @Summary Verify OTP and get JWT token
// @Description Verify One-Time Password and return JWT authentication token
// @Tags @auth
// @Accept json
// @Produce json
// @Param request body OTPLoginRequest true "Phone number and OTP code"
// @Success 200 {object} map[string]interface{} "JWT token returned"
// @Failure 401 {object} map[string]interface{} "Invalid OTP code"
// @Failure 429 {object} map[string]interface{} "Too many login attempts"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /auth-otp/login [post]
func (h *Handler) VerifyOTP(c fiber.Ctx) error {
	req := c.Locals("body").(OTPLoginRequest)
	l := c.Locals("log").(*zerolog.Logger)

	l.Info().
		Str("event", "auth_otp_verify_start").
		Str("phone_number", req.PhoneNumber).
		Msg("Verify otp request started")

	loginResp, rateLimitErr, err := h.service.VerifyOTP(req.PhoneNumber, req.Code)
	if rateLimitErr != nil {
		rlErr := errors.New("too many login attempts")
		c.Set("Retry-After", fmt.Sprintf("%d", rateLimitErr.RetryAfter))
		l.Warn().
			Err(rlErr).
			Str("event", "auth_verify_otp_rate_limited").
			Str("phone_number", req.PhoneNumber).
			Int("retry_after", rateLimitErr.RetryAfter).
			Int("http_status", fiber.StatusTooManyRequests).
			Msg("too many login attempts")
		return respond.WithStatus(c, "Too many login attempts", rlErr, fiber.StatusTooManyRequests)
	}
	if err != nil {
		errMsg := err.Error()
		event := "auth_verify_otp_failed"
		level := zerolog.WarnLevel
		status := fiber.StatusUnauthorized

		// Determine specific error type for better logging
		switch {
		case contains(errMsg, "database error"):
			event = "auth_otp_verify_db_error"
			level = zerolog.ErrorLevel
			status = fiber.StatusInternalServerError
		case contains(errMsg, "OTP not found"):
			event = "auth_otp_verify_not_found"
		case contains(errMsg, "OTP is expired") || contains(errMsg, "already used"):
			event = "auth_otp_verify_invalid"
		case contains(errMsg, "invalid OTP code"):
			event = "auth_otp_verify_code_mismatch"
		case contains(errMsg, "failed to mark OTP as used"):
			event = "auth_otp_mark_used_failed"
			level = zerolog.ErrorLevel
			status = fiber.StatusInternalServerError
		case contains(errMsg, "failed to find or create user"):
			event = "auth_user_find_create_failed"
			level = zerolog.ErrorLevel
			status = fiber.StatusInternalServerError
		case contains(errMsg, "failed to generate token"):
			event = "auth_token_generation_failed"
			level = zerolog.ErrorLevel
			status = fiber.StatusInternalServerError
		case contains(errMsg, "invalid OTP code for test account"):
			event = "auth_otp_verify_test_account_failed"
		}

		l.WithLevel(level).
			Err(err).
			Str("event", event).
			Str("phone_number", req.PhoneNumber).
			Int("http_status", status).
			Msg("authentication failed")
		return respond.WithStatus(c, "Authentication failed", err, status)
	}

	l.Info().
		Str("event", "auth_verify_otp_success").
		Str("phone_number", req.PhoneNumber).
		Str("user_id", loginResp.User.ID.String()).
		Str("user_role", loginResp.User.Role.Name).
		Msg("user authenticated successfully")
	return respond.OK(c, loginResp, nil)
}

func (h *Handler) RequestOTPLegacy(c fiber.Ctx) error {
	req := c.Locals("body").(OTPRequest)
	l := c.Locals("log").(*zerolog.Logger)

	l.Info().
		Str("event", "auth_otp_request_legacy_start").
		Str("phone_number", req.PhoneNumber).
		Msg("Generate otp request started (legacy, no channel param)")

	rateLimitErr, err := h.service.RequestOTPLegacy(req.PhoneNumber)
	if rateLimitErr != nil {
		rlErr := errors.New("rate limit exceeded")
		c.Set("Retry-After", fmt.Sprintf("%d", rateLimitErr.RetryAfter))
		l.Warn().
			Err(rlErr).
			Str("event", "auth_otp_request_rate_limited").
			Str("phone_number", req.PhoneNumber).
			Int("retry_after", rateLimitErr.RetryAfter).
			Int("http_status", fiber.StatusTooManyRequests).
			Msg("too many otp requests")
		return respond.WithStatus(c, "Too many requests", rlErr, fiber.StatusTooManyRequests)
	}

	if err != nil {
		errMsg := err.Error()
		event := "auth_otp_request_failed"

		switch {
		case contains(errMsg, "failed to generate OTP"):
			event = "auth_otp_generation_failed"
		case contains(errMsg, "failed to save OTP"):
			event = "auth_otp_save_failed"
		case contains(errMsg, "failed to send OTP"):
			event = "auth_otp_send_failed"
		}

		l.Error().
			Err(err).
			Str("event", event).
			Str("phone_number", req.PhoneNumber).
			Int("http_status", fiber.StatusInternalServerError).
			Msg("failed to generate otp request")
		return respond.WithStatus(c, "Failed to send OTP", err, fiber.StatusInternalServerError)
	}

	l.Info().
		Str("event", "auth_otp_request_legacy_success").
		Str("phone_number", req.PhoneNumber).
		Msg("OTP request generate success (legacy)")
	return respond.OK(c, &OTPResponse{
		Success: true,
		Message: "OTP sent successfully",
	}, nil)
}

// Health godoc
// @Summary Health check for auth service
// @Description Check if authentication service is operational
// @Tags @auth
// @Produce json
// @Success 200 {object} map[string]interface{} "Service is healthy"
// @Router /auth-otp/health [get]
func (h *Handler) Health(c fiber.Ctx) error {
	l := c.Locals("log").(*zerolog.Logger)

	l.Info().
		Str("event", "auth_health_check").
		Msg("Health check requested")

	health := h.service.Health()
	return respond.OK(c, health, nil)
}

// Rate limiting middleware
func (h *Handler) RateLimitMiddleware() fiber.Handler {
	return func(c fiber.Ctx) error {
		return c.Next()
	}
}
