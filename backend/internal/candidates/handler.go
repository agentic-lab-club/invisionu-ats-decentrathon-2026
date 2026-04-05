package candidates

import (
	"fmt"
	"strconv"

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

// List godoc
// @Summary List candidates for admin review
// @Description Returns candidate applications with optional admin filters.
// @Tags @candidates
// @Produce json
// @Security BearerToken
// @Param program_code query string false "Filter by program code"
// @Param review_stage query string false "Filter by review stage"
// @Param decision query string false "Filter by decision"
// @Param search query string false "Search by applicant name or email"
// @Success 200 {object} ListResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /candidates [get]
func (h *Handler) List(c fiber.Ctx) error {
	items, err := h.service.List(c.Query("program_code"), c.Query("review_stage"), c.Query("decision"), c.Query("search"))
	if err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusInternalServerError)
	}
	return respond.OK(c, ListResponse{Items: items}, nil)
}

// Detail godoc
// @Summary Get candidate detail
// @Description Returns the full admin review view for a candidate application.
// @Tags @candidates
// @Produce json
// @Security BearerToken
// @Param applicationId path string true "Application ID"
// @Success 200 {object} Detail
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /candidates/{applicationId} [get]
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

// UpdateStage godoc
// @Summary Update candidate review stage
// @Description Updates the admin review stage and optional decision for a candidate application.
// @Tags @candidates
// @Accept json
// @Produce json
// @Security BearerToken
// @Param applicationId path string true "Application ID"
// @Param request body UpdateStageRequest true "Stage update payload"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /candidates/{applicationId}/stage [patch]
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

// AdvancedFilter godoc
// @Summary Advanced metric-range filter for candidates
// @Description Returns candidates within optional min/max ranges for each LLM scoring metric.
// @Tags @candidates
// @Produce json
// @Security BearerToken
// @Param motivation_min    query number false "Min Motivation (0–5)"
// @Param motivation_max    query number false "Max Motivation (0–5)"
// @Param leadership_min   query number false "Min Leadership (0–5)"
// @Param leadership_max   query number false "Max Leadership (0–5)"
// @Param planning_min     query number false "Min Planning (0–5)"
// @Param planning_max     query number false "Max Planning (0–5)"
// @Param resilience_min   query number false "Min Resilience (0–5)"
// @Param resilience_max   query number false "Max Resilience (0–5)"
// @Param values_min       query number false "Min Values (0–5)"
// @Param values_max       query number false "Max Values (0–5)"
// @Param social_support_min query number false "Min Social Support (0–5)"
// @Param social_support_max query number false "Max Social Support (0–5)"
// @Param admissions_potential_min query number false "Min Admissions Potential (0–5)"
// @Param admissions_potential_max query number false "Max Admissions Potential (0–5)"
// @Param leadership_index_min query number false "Min Leadership Index (0–5)"
// @Param leadership_index_max query number false "Max Leadership Index (0–5)"
// @Param program_code     query string false "Filter by program code"
// @Param review_stage     query string false "Filter by review stage"
// @Param decision         query string false "Filter by decision"
// @Param search           query string false "Search by name or email"
// @Success 200 {object} AdvancedFilterResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /candidates/advanced-filter [get]
func (h *Handler) AdvancedFilter(c fiber.Ctx) error {
	parseFloat := func(key string) *float64 {
		v := c.Query(key)
		if v == "" {
			return nil
		}
		f, err := strconv.ParseFloat(v, 64)
		if err != nil {
			return nil
		}
		return &f
	}

	p := AdvancedFilterParams{
		MotivationMin:          parseFloat("motivation_min"),
		MotivationMax:          parseFloat("motivation_max"),
		LeadershipMin:          parseFloat("leadership_min"),
		LeadershipMax:          parseFloat("leadership_max"),
		PlanningMin:            parseFloat("planning_min"),
		PlanningMax:            parseFloat("planning_max"),
		ResilienceMin:          parseFloat("resilience_min"),
		ResilienceMax:          parseFloat("resilience_max"),
		ValuesMin:              parseFloat("values_min"),
		ValuesMax:              parseFloat("values_max"),
		SocialSupportMin:       parseFloat("social_support_min"),
		SocialSupportMax:       parseFloat("social_support_max"),
		AdmissionsPotentialMin: parseFloat("admissions_potential_min"),
		AdmissionsPotentialMax: parseFloat("admissions_potential_max"),
		LeadershipIndexMin:     parseFloat("leadership_index_min"),
		LeadershipIndexMax:     parseFloat("leadership_index_max"),
		ProgramCode:            c.Query("program_code"),
		ReviewStage:            c.Query("review_stage"),
		Decision:               c.Query("decision"),
		Search:                 c.Query("search"),
	}

	items, err := h.service.AdvancedFilter(p)
	if err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusInternalServerError)
	}
	return respond.OK(c, AdvancedFilterResponse{Items: items}, nil)
}

type MessageResponse struct {
	Message string `json:"message"`
}

// SmartFilter godoc
// @Summary Smart filter candidates by preset
// @Description Returns candidates matching a predefined smart-filter preset based on LLM scoring metrics.
// @Tags @candidates
// @Produce json
// @Security BearerToken
// @Param preset query string true "Smart filter preset ID" Enums(high_potential_low_english,strong_motivation_weak_soft,low_motivation_high_background,top10_percent)
// @Success 200 {object} SmartFilterResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /candidates/smart-filter [get]
func (h *Handler) SmartFilter(c fiber.Ctx) error {
	preset := c.Query("preset")
	if preset == "" {
		return respond.ErrorStatus(c, fmt.Errorf("preset query parameter is required"), fiber.StatusBadRequest)
	}
	if _, ok := ValidSmartFilterPresets[preset]; !ok {
		return respond.ErrorStatus(c, fmt.Errorf("invalid preset: %s", preset), fiber.StatusBadRequest)
	}

	items, err := h.service.SmartFilter(preset)
	if err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusInternalServerError)
	}
	return respond.OK(c, SmartFilterResponse{Preset: preset, Items: items}, nil)
}