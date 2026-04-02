package assessment

import (
	"context"
	"errors"
	"fmt"

	md "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/middlewares"
	respond "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/responder"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// GenerateQuestions godoc
// @Summary Generate assessment questions
// @Description Generates interview questions for the authenticated user and creates an assessment session.
// @Tags @assessment
// @Accept json
// @Produce json
// @Security BearerToken
// @Param request body GenerateQuestionsRequest true "Question generation payload"
// @Success 201 {object} GenerateQuestionsResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/assessment/questions [post]
func (h *Handler) GenerateQuestions(c fiber.Ctx) error {
	log := loggerFromCtx(c)
	log.Info().Str("event", "assessment_generate_start").Msg("starting assessment question generation")

	userID, ok := md.AuthID(c)
	if !ok {
		return respond.ErrorStatus(c, fmt.Errorf("unauthorized"), fiber.StatusUnauthorized)
	}
	req := c.Locals("body").(GenerateQuestionsRequest)

	response, err := h.service.GenerateQuestions(requestContext(c), userID, req)
	if err != nil {
		log.Error().Err(err).Str("event", "assessment_generate_failed").Int("http_status", fiber.StatusInternalServerError).Msg("failed to generate assessment questions")
		return respond.ErrorStatus(c, err, fiber.StatusInternalServerError)
	}

	log.Info().Str("event", "assessment_generate_success").Msg("assessment questions generated")
	return respond.Created(c, response, nil)
}

// GetSessionStatus godoc
// @Summary Get assessment session status
// @Description Returns current status and remaining time for an assessment session.
// @Tags @assessment
// @Produce json
// @Security BearerToken
// @Param id path string true "Assessment session ID"
// @Success 200 {object} SessionStatusResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/assessment/sessions/{id} [get]
func (h *Handler) GetSessionStatus(c fiber.Ctx) error {
	userID, ok := md.AuthID(c)
	if !ok {
		return respond.ErrorStatus(c, fmt.Errorf("unauthorized"), fiber.StatusUnauthorized)
	}
	sessionID := c.Locals("id").(uuid.UUID)

	response, err := h.service.GetSessionStatus(userID, sessionID)
	if err != nil {
		return respond.ErrorStatus(c, err, statusForError(err))
	}
	return respond.OK(c, response, nil)
}

// SubmitAnswers godoc
// @Summary Submit assessment answers
// @Description Saves answers for an active assessment session.
// @Tags @assessment
// @Accept json
// @Produce json
// @Security BearerToken
// @Param id path string true "Assessment session ID"
// @Param request body SubmitAnswersRequest true "Submitted answers"
// @Success 200 {object} SubmitAnswersResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/assessment/sessions/{id}/answers [post]
func (h *Handler) SubmitAnswers(c fiber.Ctx) error {
	log := loggerFromCtx(c)
	log.Info().Str("event", "assessment_submit_start").Msg("submitting assessment answers")

	userID, ok := md.AuthID(c)
	if !ok {
		return respond.ErrorStatus(c, fmt.Errorf("unauthorized"), fiber.StatusUnauthorized)
	}
	sessionID := c.Locals("id").(uuid.UUID)
	req := c.Locals("body").(SubmitAnswersRequest)

	response, err := h.service.SubmitAnswers(userID, sessionID, req)
	if err != nil {
		status := statusForError(err)
		log.Error().Err(err).Str("event", "assessment_submit_failed").Int("http_status", status).Msg("failed to submit assessment answers")
		return respond.ErrorStatus(c, err, status)
	}

	log.Info().Str("event", "assessment_submit_success").Msg("assessment answers submitted")
	return respond.OK(c, response, nil)
}

// Evaluate godoc
// @Summary Evaluate assessment answers
// @Description Evaluates saved answers for an assessment session with the configured LLM.
// @Tags @assessment
// @Produce json
// @Security BearerToken
// @Param id path string true "Assessment session ID"
// @Success 200 {object} EvaluationPayload
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/assessment/sessions/{id}/evaluate [post]
func (h *Handler) Evaluate(c fiber.Ctx) error {
	log := loggerFromCtx(c)
	log.Info().Str("event", "assessment_evaluate_start").Msg("starting assessment evaluation")

	userID, ok := md.AuthID(c)
	if !ok {
		return respond.ErrorStatus(c, fmt.Errorf("unauthorized"), fiber.StatusUnauthorized)
	}
	sessionID := c.Locals("id").(uuid.UUID)

	response, err := h.service.Evaluate(userID, sessionID, requestContext(c))
	if err != nil {
		status := statusForError(err)
		log.Error().Err(err).Str("event", "assessment_evaluate_failed").Int("http_status", status).Msg("failed to evaluate assessment answers")
		return respond.ErrorStatus(c, err, status)
	}

	log.Info().Str("event", "assessment_evaluate_success").Msg("assessment evaluation completed")
	return respond.OK(c, response, nil)
}

func requestContext(c fiber.Ctx) context.Context {
	if ctx, ok := c.Locals("ctx").(context.Context); ok && ctx != nil {
		return ctx
	}
	return context.Background()
}

func loggerFromCtx(c fiber.Ctx) *zerolog.Logger {
	if logger, ok := c.Locals("log").(*zerolog.Logger); ok && logger != nil {
		return logger
	}
	nop := zerolog.Nop()
	return &nop
}

func statusForError(err error) int {
	switch {
	case errors.Is(err, ErrSessionNotFound):
		return fiber.StatusNotFound
	case errors.Is(err, ErrSessionForbidden):
		return fiber.StatusForbidden
	case errors.Is(err, ErrAssessmentExpired), errors.Is(err, ErrAnswersMissing), errors.Is(err, ErrInvalidInput):
		return fiber.StatusBadRequest
	default:
		return fiber.StatusInternalServerError
	}
}
