package talents

import (
	"errors"
	"fmt"
	"strconv"

	respond "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/responder"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	service talentService
}

func NewHandler(service talentService) *Handler {
	return &Handler{service: service}
}

// List godoc
// @Summary List imported talent leads
// @Description Returns talent leads previously imported from TalentParser and stored in PostgreSQL.
// @Tags @talents
// @Produce json
// @Security BearerToken
// @Param source query string false "Filter by source"
// @Param query query string false "Search by title or winner_info"
// @Param limit query int false "Page size (default 50, max 200)"
// @Param offset query int false "Offset (default 0)"
// @Success 200 {object} ListResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /talents [get]
func (h *Handler) List(c fiber.Ctx) error {
	params, err := parseListParams(c)
	if err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusBadRequest)
	}

	response, err := h.service.List(c.Context(), params)
	if err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusInternalServerError)
	}

	return respond.OK(c, response, nil)
}

// Status godoc
// @Summary Get talent lead import status
// @Description Returns backend import metadata together with current TalentParser cache status.
// @Tags @talents
// @Produce json
// @Security BearerToken
// @Success 200 {object} StatusResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 502 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /talents/status [get]
func (h *Handler) Status(c fiber.Ctx) error {
	response, err := h.service.Status(c.Context())
	if err != nil {
		if errors.Is(err, ErrScraperUnavailable) {
			return respond.ErrorStatus(c, err, fiber.StatusBadGateway)
		}
		return respond.ErrorStatus(c, err, fiber.StatusInternalServerError)
	}

	return respond.OK(c, response, nil)
}

// Sync godoc
// @Summary Import current TalentParser cache
// @Description Reads the current TalentParser cache snapshot and stores it in PostgreSQL without triggering a new scrape cycle.
// @Tags @talents
// @Produce json
// @Security BearerToken
// @Success 200 {object} SyncResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 409 {object} map[string]interface{}
// @Failure 502 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /talents/sync [post]
func (h *Handler) Sync(c fiber.Ctx) error {
	response, err := h.service.Sync(c.Context())
	if err != nil {
		switch {
		case errors.Is(err, ErrScraperCacheEmpty):
			return respond.ErrorStatus(c, err, fiber.StatusConflict)
		case errors.Is(err, ErrScraperUnavailable):
			return respond.ErrorStatus(c, err, fiber.StatusBadGateway)
		default:
			return respond.ErrorStatus(c, err, fiber.StatusInternalServerError)
		}
	}

	return respond.OK(c, response, nil)
}

func parseListParams(c fiber.Ctx) (ListParams, error) {
	params := ListParams{
		Source: c.Query("source"),
		Query:  c.Query("query"),
		Limit:  defaultListLimit,
		Offset: 0,
	}

	if rawLimit := c.Query("limit"); rawLimit != "" {
		limit, err := strconv.Atoi(rawLimit)
		if err != nil || limit < 0 {
			return ListParams{}, fmt.Errorf("invalid limit")
		}
		params.Limit = limit
	}

	if rawOffset := c.Query("offset"); rawOffset != "" {
		offset, err := strconv.Atoi(rawOffset)
		if err != nil || offset < 0 {
			return ListParams{}, fmt.Errorf("invalid offset")
		}
		params.Offset = offset
	}

	return normalizeListParams(params), nil
}
