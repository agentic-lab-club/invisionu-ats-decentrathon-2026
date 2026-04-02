package applications

import (
	platformMessaging "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/messaging"
	platformStorage "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/storage"
	pkgAuth "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/auth"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	md "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/middlewares"
	"github.com/gofiber/fiber/v3"
)

func Init(server *fiber.App, db *database.TrackedDB, cfg *config.Config, accessManager *pkgAuth.TokenManager, bus platformMessaging.Bus, objectStorage platformStorage.ObjectStorage) {
	repo := NewRepository(db)
	service := NewService(repo, cfg, bus, objectStorage)
	handler := NewHandler(service)

	api := server.Group("/applications", md.AuthRole(accessManager, md.RoleUser))
	api.Post("/", md.BindAndValidate[CreateRequest](), handler.Create)
	api.Get("/status", handler.Status)
}
