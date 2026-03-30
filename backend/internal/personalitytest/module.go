package personalitytest

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

	server.Get("/tests/personality/current", md.AuthRole(accessManager, md.RoleUser, md.RoleAdmin), handler.GetCurrent)
}
