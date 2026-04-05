package talents

import (
	pkgAuth "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/auth"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	md "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/middlewares"
	"github.com/gofiber/fiber/v3"
)

func Init(server *fiber.App, db *database.TrackedDB, cfg *config.Config, accessManager *pkgAuth.TokenManager) {
	repo := NewRepository(db)
	scraper := NewScraperClient(cfg)
	service := NewService(repo, scraper)
	handler := NewHandler(service)

	group := server.Group("/talents", md.AuthRole(accessManager, md.RoleAdmin))
	group.Get("/", handler.List)
	group.Get("/status", handler.Status)
	group.Post("/sync", handler.Sync)
}
