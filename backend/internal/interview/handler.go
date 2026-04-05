package interview

import (
	"errors"
	"fmt"

	md "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/middlewares"
	respond "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/responder"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

// Handler wires HTTP requests to the Service.
type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// GetSession — только для администраторов
func (h *Handler) GetSession(c fiber.Ctx) error {
	sessionID := c.Locals("id").(uuid.UUID)

	session, err := h.service.GetFullSession(sessionID)
	if err != nil {
		return respond.ErrorStatus(c, fmt.Errorf("failed to get interview session: %w", err), fiber.StatusNotFound)
	}

	return respond.OK(c, session, nil)
}

// GetSessionByApplication — только для администраторов, поиск по application_id кандидата
func (h *Handler) GetSessionByApplication(c fiber.Ctx) error {
	applicationID := c.Locals("application_id").(uuid.UUID)

	session, err := h.service.GetFullSessionByApplicationID(applicationID)
	if err != nil {
		return respond.ErrorStatus(c, fmt.Errorf("failed to get interview session: %w", err), fiber.StatusInternalServerError)
	}
	if session == nil {
		return respond.ErrorStatus(c, fmt.Errorf("no interview session found for this candidate"), fiber.StatusNotFound)
	}

	return respond.OK(c, session, nil)
}

// ── StartSession ──────────────────────────────────────────────────────────────

// StartSession godoc
// @Summary      Start an AI interview session
// @Description  Creates a new interview session for the authenticated applicant and
//               returns the list of questions AIYA will ask.  Idempotent: if an
//               active session already exists it is returned instead of a new one.
// @Tags         @interview
// @Accept       json
// @Produce      json
// @Security     BearerToken
// @Param        request  body      StartSessionRequest   true  "Session start payload"
// @Success      201      {object}  StartSessionResponse
// @Failure      400      {object}  map[string]interface{}
// @Failure      401      {object}  map[string]interface{}
// @Failure      500      {object}  map[string]interface{}
// @Router       /api/v1/interview/sessions [post]
func (h *Handler) StartSession(c fiber.Ctx) error {
	log := loggerFrom(c)
	log.Info().Str("event", "interview_start").Msg("starting interview session")

	userID, ok := md.AuthID(c)
	if !ok {
		return respond.ErrorStatus(c, fmt.Errorf("unauthorized"), fiber.StatusUnauthorized)
	}
	req := c.Locals("body").(StartSessionRequest)

	resp, err := h.service.StartSession(userID, req)
	if err != nil {
		log.Error().Err(err).Str("event", "interview_start_failed").Msg("failed to start interview session")
		return respond.ErrorStatus(c, err, fiber.StatusInternalServerError)
	}

	log.Info().Str("event", "interview_start_ok").Stringer("session_id", resp.SessionID).Msg("interview session started")
	return respond.Created(c, resp, nil)
}

// ── GetStatus ─────────────────────────────────────────────────────────────────

// GetStatus godoc
// @Summary      Get interview session status
// @Description  Returns the current status, answered count, remaining time, and
//               score (if already scored) for an interview session.
// @Tags         @interview
// @Produce      json
// @Security     BearerToken
// @Param        id   path      string  true  "Interview session ID (UUID)"
// @Success      200  {object}  SessionStatusResponse
// @Failure      401  {object}  map[string]interface{}
// @Failure      403  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Router       /api/v1/interview/sessions/{id} [get]
func (h *Handler) GetStatus(c fiber.Ctx) error {
	userID, ok := md.AuthID(c)
	if !ok {
		return respond.ErrorStatus(c, fmt.Errorf("unauthorized"), fiber.StatusUnauthorized)
	}
	sessionID := c.Locals("id").(uuid.UUID)

	resp, err := h.service.GetStatus(userID, sessionID)
	if err != nil {
		return respond.ErrorStatus(c, err, httpStatus(err))
	}
	return respond.OK(c, resp, nil)
}

// ── SubmitAnswer ──────────────────────────────────────────────────────────────

// SubmitAnswer godoc
// @Summary      Submit one answer during an interview
// @Description  Saves the applicant's answer to a specific question (identified by
//               zero-based question_index).  The frontend calls this once per
//               question, immediately after the user finishes speaking.  Answers
//               must be submitted sequentially (index 0, then 1, etc.).
// @Tags         @interview
// @Accept       json
// @Produce      json
// @Security     BearerToken
// @Param        id       path      string              true  "Interview session ID (UUID)"
// @Param        request  body      SubmitAnswerRequest true  "Answer payload"
// @Success      200      {object}  SubmitAnswerResponse
// @Failure      400      {object}  map[string]interface{}
// @Failure      401      {object}  map[string]interface{}
// @Failure      403      {object}  map[string]interface{}
// @Failure      404      {object}  map[string]interface{}
// @Failure      500      {object}  map[string]interface{}
// @Router       /api/v1/interview/sessions/{id}/answers [post]
func (h *Handler) SubmitAnswer(c fiber.Ctx) error {
	log := loggerFrom(c)

	userID, ok := md.AuthID(c)
	if !ok {
		return respond.ErrorStatus(c, fmt.Errorf("unauthorized"), fiber.StatusUnauthorized)
	}
	sessionID := c.Locals("id").(uuid.UUID)
	req := c.Locals("body").(SubmitAnswerRequest)

	log.Info().
		Str("event", "interview_answer_submit").
		Stringer("session_id", sessionID).
		Int("question_index", req.QuestionIndex).
		Msg("submitting interview answer")

	resp, err := h.service.SubmitAnswer(userID, sessionID, req)
	if err != nil {
		status := httpStatus(err)
		log.Error().Err(err).Str("event", "interview_answer_failed").Int("http_status", status).Msg("failed to submit answer")
		return respond.ErrorStatus(c, err, status)
	}

	log.Info().
		Str("event", "interview_answer_ok").
		Int("answered", resp.AnsweredCount).
		Int("total", resp.TotalCount).
		Msg("answer accepted")
	return respond.OK(c, resp, nil)
}

// ── CompleteSession ───────────────────────────────────────────────────────────

// CompleteSession godoc
// @Summary      Complete an interview session
// @Description  Closes the session, generates a preliminary mock score, and returns
//               it.  The ML team will later replace mock scoring with a real model.
//               Idempotent: calling this twice returns the already-saved score.
// @Tags         @interview
// @Accept       json
// @Produce      json
// @Security     BearerToken
// @Param        id       path      string                 true  "Interview session ID (UUID)"
// @Param        request  body      CompleteSessionRequest true  "Completion payload"
// @Success      200      {object}  CompleteSessionResponse
// @Failure      400      {object}  map[string]interface{}
// @Failure      401      {object}  map[string]interface{}
// @Failure      403      {object}  map[string]interface{}
// @Failure      404      {object}  map[string]interface{}
// @Failure      500      {object}  map[string]interface{}
// @Router       /api/v1/interview/sessions/{id}/complete [post]
func (h *Handler) CompleteSession(c fiber.Ctx) error {
	log := loggerFrom(c)
	log.Info().Str("event", "interview_complete_start").Msg("completing interview session")

	userID, ok := md.AuthID(c)
	if !ok {
		return respond.ErrorStatus(c, fmt.Errorf("unauthorized"), fiber.StatusUnauthorized)
	}
	sessionID := c.Locals("id").(uuid.UUID)
	req := c.Locals("body").(CompleteSessionRequest)

	resp, err := h.service.CompleteSession(userID, sessionID, req)
	if err != nil {
		status := httpStatus(err)
		log.Error().Err(err).Str("event", "interview_complete_failed").Int("http_status", status).Msg("failed to complete interview session")
		return respond.ErrorStatus(c, err, status)
	}

	log.Info().Str("event", "interview_complete_ok").Stringer("session_id", sessionID).Msg("interview session completed")
	return respond.OK(c, resp, nil)
}

// ── CancelSession ─────────────────────────────────────────────────────────────

// CancelSession godoc
// @Summary      Cancel an interview session
// @Description  Marks the session as cancelled.  Called when the applicant clicks
//               "End interview" before completing all questions.
// @Tags         @interview
// @Produce      json
// @Security     BearerToken
// @Param        id  path  string  true  "Interview session ID (UUID)"
// @Success      200
// @Failure      401  {object}  map[string]interface{}
// @Failure      403  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Router       /api/v1/interview/sessions/{id}/cancel [post]
func (h *Handler) CancelSession(c fiber.Ctx) error {
	userID, ok := md.AuthID(c)
	if !ok {
		return respond.ErrorStatus(c, fmt.Errorf("unauthorized"), fiber.StatusUnauthorized)
	}
	sessionID := c.Locals("id").(uuid.UUID)

	if err := h.service.CancelSession(userID, sessionID); err != nil {
		return respond.ErrorStatus(c, err, httpStatus(err))
	}
	return respond.EmptyOK(c, nil)
}



// ── Helpers ───────────────────────────────────────────────────────────────────

func httpStatus(err error) int {
	switch {
	case errors.Is(err, ErrSessionNotFound):
		return fiber.StatusNotFound
	case errors.Is(err, ErrSessionForbidden):
		return fiber.StatusForbidden
	case errors.Is(err, ErrSessionExpired),
		errors.Is(err, ErrSessionNotActive),
		errors.Is(err, ErrAlreadyCompleted),
		errors.Is(err, ErrAnswerOutOfRange),
		errors.Is(err, ErrInvalidInput):
		return fiber.StatusBadRequest
	default:
		return fiber.StatusInternalServerError
	}
}

func loggerFrom(c fiber.Ctx) *zerolog.Logger {
	if log, ok := c.Locals("log").(*zerolog.Logger); ok && log != nil {
		return log
	}
	nop := zerolog.Nop()
	return &nop
}