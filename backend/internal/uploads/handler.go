package uploads

import (
	"fmt"

	md "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/middlewares"
	respond "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/responder"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Upload godoc
// @Summary Upload application file
// @Description Uploads a file for the authenticated applicant and creates an unattached application file record.
// @Tags @uploads
// @Accept multipart/form-data
// @Produce json
// @Security BearerToken
// @Param file_type formData string true "File type"
// @Param file formData file true "Binary file payload"
// @Success 201 {object} Response
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /uploads [post]
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
