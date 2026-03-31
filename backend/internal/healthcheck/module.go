package healthcheck

import (
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	"github.com/gofiber/fiber/v3"
)

func Init(server *fiber.App, db *database.TrackedDB, cfg *config.Config) {
	RegisterRoutes(server, db, cfg)
}

func RegisterRoutes(server *fiber.App, db *database.TrackedDB, cfg *config.Config) {
	s := NewService(db, cfg)
	h := NewHandler(s)

	server.Get("/health", h.HealthCheck)
	server.Get("/health/liveness", h.LivenessProbe)
	server.Get("/health/readiness", h.ReadinessProbe)

	legacy := server.Group("/api/v1/healthcheck")
	legacy.Get("/", h.HealthCheck)
	legacy.Get("", h.HealthCheck)
	legacy.Get("/liveness", h.LivenessProbe)
	legacy.Get("/readiness", h.ReadinessProbe)
}
