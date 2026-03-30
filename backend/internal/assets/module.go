package assets

import (
	platformStorage "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/storage"
	pkgAuth "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/auth"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	md "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/middlewares"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

func Init(server *fiber.App, db *database.TrackedDB, accessManager *pkgAuth.TokenManager, storage platformStorage.ObjectStorage) {
	repo := NewRepository(db)
	service := NewService(repo, storage)
	handler := NewHandler(service)

	server.Post("/assets", md.AuthRole(accessManager, md.RoleUser), handler.Upload)
	server.Get("/assets/:id", md.AuthRole(accessManager, md.RoleUser, md.RoleAdmin), md.ValidateParam[uuid.UUID]("id"), handler.GetAsset)
}
