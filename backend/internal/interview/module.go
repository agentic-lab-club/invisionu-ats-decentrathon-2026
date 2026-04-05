package interview

import (
	pkgAuth "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/auth"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	md "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/middlewares"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

// Init wires up the interview module: repository → service → handler → routes.
// Called once from cmd/server/main.go alongside the other module initialisers.
//
// Routes registered:
//
//	POST   /api/v1/interview/sessions                      → StartSession
//	GET    /api/v1/interview/sessions/:id                  → GetStatus
//	POST   /api/v1/interview/sessions/:id/answers          → SubmitAnswer
//	POST   /api/v1/interview/sessions/:id/complete         → CompleteSession
//	POST   /api/v1/interview/sessions/:id/cancel           → CancelSession
func Init(server *fiber.App, db *database.TrackedDB, accessManager *pkgAuth.TokenManager) {
	repo := NewRepository(db)
	service := NewService(repo)
	handler := NewHandler(service)

	// All interview routes require an authenticated user role.
	api := server.Group("/api/v1/interview", md.AuthRole(accessManager, md.RoleUser, md.RoleAdmin))

	api.Post(
		"/sessions",
		md.BindAndValidate[StartSessionRequest](),
		handler.StartSession,
	)

	api.Get(
		"/sessions/:id",
		md.ValidateParam[uuid.UUID]("id"),
		handler.GetStatus,
	)

	api.Post(
		"/sessions/:id/answers",
		md.ValidateParam[uuid.UUID]("id"),
		md.BindAndValidate[SubmitAnswerRequest](),
		handler.SubmitAnswer,
	)

	api.Post(
		"/sessions/:id/complete",
		md.ValidateParam[uuid.UUID]("id"),
		md.BindAndValidate[CompleteSessionRequest](),
		handler.CompleteSession,
	)

	api.Post(
		"/sessions/:id/cancel",
		md.ValidateParam[uuid.UUID]("id"),
		handler.CancelSession,
	)
}
