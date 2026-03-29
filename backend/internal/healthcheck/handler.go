package healthcheck

import (
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

// HealthCheck godoc
// @Summary Health check
// @Description Returns the application health status and dependency checks.
// @Tags @healthcheck
// @Produce json
// @Success 200 {object} HealthCheckResponse
// @Failure 500 {object} map[string]string
// @Failure 503 {object} HealthCheckResponse
// @Router /health [get]
// @Router /api/v1/healthcheck [get]
func (h *Handler) HealthCheck(ctx fiber.Ctx) error {
	l := ctx.Locals("log").(*zerolog.Logger)

	l.Info().Str("event", "healthcheck_start").Msg("Health check request started")

	healthResponse, err := h.service.PerformHealthCheck(ctx.Context())
	if err != nil {
		l.Error().Err(err).Str("event", "healthcheck_failed").Int("http_status", fiber.StatusInternalServerError).Msg("Health check failed")
		return respond.ErrorStatus(ctx, err, fiber.StatusInternalServerError)
	}

	httpStatus := fiber.StatusOK
	if healthResponse.Status == HealthStatusUnhealthy {
		httpStatus = fiber.StatusServiceUnavailable
	}

	l.Info().Str("event", "healthcheck_success").Str("status", string(healthResponse.Status)).Int("http_status", httpStatus).Msg("Health check completed")

	return ctx.Status(httpStatus).JSON(healthResponse)
}

// LivenessProbe godoc
// @Summary Liveness probe
// @Description Returns whether the process is alive.
// @Tags @healthcheck
// @Produce json
// @Success 200 {object} LivenessResponse
// @Router /health/liveness [get]
// @Router /api/v1/healthcheck/liveness [get]
func (h *Handler) LivenessProbe(ctx fiber.Ctx) error {
	return respond.OK(ctx, h.service.CheckLiveness(), nil)
}

// ReadinessProbe godoc
// @Summary Readiness probe
// @Description Returns whether the service is ready to serve traffic.
// @Tags @healthcheck
// @Produce json
// @Success 200 {object} ReadinessResponse
// @Failure 503 {object} map[string]string
// @Router /health/readiness [get]
// @Router /api/v1/healthcheck/readiness [get]
func (h *Handler) ReadinessProbe(ctx fiber.Ctx) error {
	l := ctx.Locals("log").(*zerolog.Logger)

	response, err := h.service.CheckReadiness(ctx.Context())
	if err != nil {
		l.Warn().Err(err).Str("event", "readiness_check_not_ready").Int("http_status", fiber.StatusServiceUnavailable).Msg("Service not ready")
		return respond.WithStatus(ctx, "service not ready", err, fiber.StatusServiceUnavailable)
	}

	return respond.OK(ctx, response, nil)
}
