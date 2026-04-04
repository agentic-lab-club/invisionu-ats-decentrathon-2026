package candidates

import (
	pkgAuth "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/auth"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	md "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/middlewares"
	"github.com/gofiber/fiber/v3"
)

func Init(server *fiber.App, db *database.TrackedDB, accessManager *pkgAuth.TokenManager) {
	repo := NewRepository(db)
	service := NewService(repo)
	handler := NewHandler(service)

	group := server.Group("/candidates", md.AuthRole(accessManager, md.RoleAdmin))
	group.Get("/", handler.List)
	group.Get("/smart-filter", handler.SmartFilter)
	group.Get("/advanced-filter", handler.AdvancedFilter)
	group.Get("/:applicationId", handler.Detail)
	group.Patch("/:applicationId/stage", md.BindAndValidate[UpdateStageRequest](), handler.UpdateStage)
}