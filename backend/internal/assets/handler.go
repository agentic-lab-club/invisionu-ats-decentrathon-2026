package assets

import (
	"fmt"
	"strings"

	md "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/middlewares"
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

// Upload godoc
// @Summary Upload asset
// @Description Uploads a file for the authenticated applicant and creates an unattached application file record.
// @Tags @assets
// @Accept multipart/form-data
// @Produce json
// @Security BearerToken
// @Param file_type formData string true "File type"
// @Param file formData file true "Binary file payload"
// @Success 201 {object} Response
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /assets [post]
func (h *Handler) Upload(c fiber.Ctx) error {
	userID, ok := md.AuthID(c)
	if !ok {
		return respond.ErrorStatus(c, fmt.Errorf("unauthorized"), fiber.StatusUnauthorized)
	}

	fileType := c.FormValue("file_type")
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return respond.ErrorStatus(c, fmt.Errorf("file is required"), fiber.StatusBadRequest)
	}

	response, err := h.service.Upload(c.Context(), userID, fileType, fileHeader)
	if err != nil {
		return respond.ErrorStatus(c, err, fiber.StatusBadRequest)
	}

	return respond.Created(c, response, nil)
}

// GetAsset godoc
// @Summary Get uploaded asset by ID
// @Description Returns the uploaded asset binary payload for the owning applicant or admin reviewer.
// @Tags @assets
// @Produce application/octet-stream
// @Security BearerToken
// @Param id path string true "Asset ID"
// @Success 200 {file} binary
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /assets/{id} [get]
func (h *Handler) GetAsset(c fiber.Ctx) error {
	userID, ok := md.AuthID(c)
	if !ok {
		return respond.ErrorStatus(c, fmt.Errorf("unauthorized"), fiber.StatusUnauthorized)
	}
	role, _ := md.AuthRoleValue(c)
	assetID := c.Locals("id").(uuid.UUID)

	asset, err := h.service.GetAsset(c.Context(), userID, role, assetID)
	if err != nil {
		status := fiber.StatusBadRequest
		switch {
		case strings.Contains(err.Error(), "not found"):
			status = fiber.StatusNotFound
		case strings.Contains(err.Error(), "forbidden"):
			status = fiber.StatusForbidden
		}
		return respond.ErrorStatus(c, err, status)
	}

	c.Set(fiber.HeaderContentType, asset.ContentType)
	c.Set(fiber.HeaderContentDisposition, fmt.Sprintf("inline; filename=%q", asset.OriginalFilename))
	c.Set(fiber.HeaderETag, asset.ETag)
	return c.SendStream(asset.Reader, int(asset.SizeBytes))
}
