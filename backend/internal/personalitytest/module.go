package personalitytest

import (
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	"github.com/gofiber/fiber/v3"
)

func Init(server *fiber.App, db *database.TrackedDB) {
	repo := NewRepository(db)
	service := NewService(repo)
	handler := NewHandler(service)

	server.Get("/tests/personality/current", handler.GetCurrent)
}
