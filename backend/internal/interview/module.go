package interview

import (
	pkgAuth "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/auth"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	md "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/middlewares"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

func Init(server *fiber.App, db *database.TrackedDB, accessManager *pkgAuth.TokenManager) {
	repo := NewRepository(db)
	service := NewService(repo)
	handler := NewHandler(service)

	api := server.Group("/api/v1/interview")

	// User routes
	api.Post("/sessions",
		md.AuthRole(accessManager, md.RoleUser),
		md.BindAndValidate[StartSessionRequest](),
		handler.StartSession)

	api.Post("/sessions/:id/answers",
		md.AuthRole(accessManager, md.RoleUser),
		md.ValidateParam[uuid.UUID]("id"),
		md.BindAndValidate[SubmitAnswerRequest](),
		handler.SubmitAnswer)

	api.Post("/sessions/:id/complete",
		md.AuthRole(accessManager, md.RoleUser),
		md.ValidateParam[uuid.UUID]("id"),
		md.BindAndValidate[CompleteSessionRequest](),
		handler.CompleteSession)

	api.Post("/sessions/:id/cancel",
		md.AuthRole(accessManager, md.RoleUser),
		md.ValidateParam[uuid.UUID]("id"),
		handler.CancelSession)

	// Admin route — latest interview session by candidate application_id
	// IMPORTANT: must be registered BEFORE /sessions/:id to avoid Fiber matching
	// "by-application" as the :id parameter value.
	api.Get("/sessions/by-application/:application_id",
		md.AuthRole(accessManager, md.RoleAdmin),
		md.ValidateParam[uuid.UUID]("application_id"),
		handler.GetSessionByApplication)

	// Admin route — full session details by session ID
	api.Get("/sessions/:id",
		md.AuthRole(accessManager, md.RoleAdmin),
		md.ValidateParam[uuid.UUID]("id"),
		handler.GetSession)
}