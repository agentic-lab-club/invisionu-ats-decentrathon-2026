package assessment

import (
	pkgAuth "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/auth"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	md "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/middlewares"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

func Init(server *fiber.App, db *database.TrackedDB, cfg *config.Config, accessManager *pkgAuth.TokenManager) {
	repo := NewRepository(db)
	llmClient := NewOpenAIClient(cfg)
	service := NewService(repo, llmClient, cfg)
	handler := NewHandler(service)

	api := server.Group("/api/v1/assessment", md.AuthRole(accessManager, md.RoleUser, md.RoleAdmin))
	api.Post("/questions", md.BindAndValidate[GenerateQuestionsRequest](), handler.GenerateQuestions)
	api.Get("/sessions/:id", md.ValidateParam[uuid.UUID]("id"), handler.GetSessionStatus)
	api.Post("/sessions/:id/answers", md.ValidateParam[uuid.UUID]("id"), md.BindAndValidate[SubmitAnswersRequest](), handler.SubmitAnswers)
	api.Post("/sessions/:id/evaluate", md.ValidateParam[uuid.UUID]("id"), handler.Evaluate)
}
