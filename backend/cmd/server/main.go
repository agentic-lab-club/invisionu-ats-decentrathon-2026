package main

// @title InVisionU ATS Backend API
// @version 1.0
// @description Applicant tracking backend for InVisionU ATS.
// @termsOfService https://yourdomain.com/terms/
//
// @contact.name API Support
// @contact.url http://yourdomain.com/support
// @contact.email support@yourdomain.com
//
// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html
//
// @host localhost:8080
// @BasePath /
// @schemes http https
//
// @securityDefinitions.apikey BearerToken
// @in header
// @name Authorization
// @description JWT Token as Bearer: Authorization: Bearer {token}

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/applications"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/assessment"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/assets"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/auth"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/candidates"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/healthcheck"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/personalitytest"
	platformEmail "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/email"
	platformMessaging "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/messaging"
	platformRabbitMQ "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/messaging/rabbitmq"
	platformStorage "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/storage"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/programs"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/seeder"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	md "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/middlewares"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/logger"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/metrics"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/rs/zerolog/log"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/favorites"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/interview"
)

func main() {
	time.Local = time.UTC

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Str("event", "init_config_failed").Msgf("failed to load config: %v", err)
	}

	logger.Init(cfg.Logging)

	db, err := database.InitDB(cfg)
	if err != nil {
		log.Fatal().Err(err).Str("event", "init_db_failed").Msgf("failed to init DB: %v", err)
	}
	if err := seeder.SeedDefaults(db); err != nil {
		log.Fatal().Err(err).Str("event", "init_seed_failed").Msg("failed to seed default backend data")
	}

	trackedDB := database.NewTrackedDB(db)

	emailSender := buildEmailSender(cfg)
	messageBus, err := buildMessageBus(cfg)
	if err != nil {
		log.Fatal().Err(err).Str("event", "init_message_bus_failed").Msg("failed to init message bus")
	}
	objectStorage, err := platformStorage.NewMinIOStorage(cfg.Storage)
	if err != nil {
		log.Fatal().Err(err).Str("event", "init_object_storage_failed").Msg("failed to init object storage")
	}

	// Моя замена
	server := fiber.New(fiber.Config{
		BodyLimit:      100 * 1024 * 1024, // 100 МБ (можно увеличить до 200–500 МБ)
		ReadBufferSize: 32768,             // если ранее уже увеличивали для заголовков
	})
	server.Use(recover.New(recover.Config{EnableStackTrace: true}))
	server.Use(logger.RequestLoggerMiddleware())
	server.Use(md.SecurityHeadersMiddleware())
	server.Use(md.Timeout(md.TimeoutConfig{
		Timeout:      time.Duration(cfg.Security.RequestTimeoutSeconds) * time.Second,
		ErrorMessage: "Request timeout exceeded",
		SkipPaths:    []string{cfg.Metrics.Path, "/health", "/health/liveness", "/health/readiness"},
	}))
	server.Use(md.APIRateLimiterMiddleware(
		cfg.Security.RateLimitMax,
		time.Duration(cfg.Security.RateLimitWindowSeconds)*time.Second,
	))
	server.Use(cors.New(cors.Config{
		AllowHeaders:     cfg.Security.AllowedHeaders,
		AllowOrigins:     cfg.Security.AllowedOrigins,
		AllowCredentials: cfg.Security.AllowCredentials,
		AllowMethods:     cfg.Security.AllowedMethods,
		ExposeHeaders:    cfg.Security.ExposeHeaders,
		MaxAge:           cfg.Security.MaxAge,
	}))

	if cfg.Metrics.Enabled {
		server.Use(metrics.Middleware())
		server.Get(cfg.Metrics.Path, metrics.Handler())
	}

	server.Get("/", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"service":     "invisionu-ats",
			"version":     "1.0.0",
			"environment": cfg.Environment,
			"endpoints": fiber.Map{
				"health":    "/health",
				"readiness": "/health/readiness",
				"liveness":  "/health/liveness",
				"metrics":   cfg.Metrics.Path,
				"docs":      docsPath(),
			},
		})
	})

	registerDocsRoutes(server)
	healthcheck.Init(server, trackedDB, cfg)
	accessManager := auth.Init(server, trackedDB, cfg, emailSender)
	programs.Init(server, trackedDB, accessManager)
	personalitytest.Init(server, trackedDB, accessManager)
	assessment.Init(server, trackedDB, cfg, accessManager)
	assets.Init(server, trackedDB, accessManager, objectStorage)
	applications.Init(server, trackedDB, cfg, accessManager, messageBus, objectStorage)
	candidates.Init(server, trackedDB, accessManager)
	favorites.Init(server, trackedDB, accessManager)
	interview.Init(server, trackedDB, accessManager)
	log.Info().Str("event", "init_http_server_success").Int("port", cfg.Server.Port).Msg("HTTP server initialized successfully")

	if err := server.Listen(fmt.Sprintf(":%d", cfg.Server.Port)); err != nil {
		log.Fatal().Err(err).Str("event", "init_http_server_failed").Msgf("failed to start server: %v", err)
	}
}

func registerDocsRoutes(server *fiber.App) {
	if !fileExists("docs/index.html") {
		log.Warn().Str("event", "init_swagger_endpoint_skipped").Msg("Swagger docs not generated yet; skipping /docs routes")
		return
	}

	server.Get("/docs/swagger.json", serveSwaggerSpec)
	server.Get("/docs", serveDocsIndex)
	server.Get("/docs/", serveDocsIndex)
	server.Get("/docs/*", func(c fiber.Ctx) error {
		p := c.Params("*")
		if p == "" || p == "/" {
			return serveDocsIndex(c)
		}

		target := fmt.Sprintf("docs/%s", p)
		if _, err := os.Stat(target); err != nil {
			return c.Status(fiber.StatusNotFound).SendString("not found")
		}

		return c.SendFile(target)
	})

	log.Info().Str("event", "init_swagger_endpoint_success").Msg("Swagger documentation available at /docs")
}

func serveDocsIndex(c fiber.Ctx) error {
	c.Set(fiber.HeaderContentType, "text/html; charset=utf-8")
	c.Set("Content-Security-Policy", "default-src 'self' https://cdn.jsdelivr.net 'unsafe-inline' data:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://cdn.jsdelivr.net;")
	return c.SendFile("docs/index.html")
}

func serveSwaggerSpec(c fiber.Ctx) error {
	spec, err := os.ReadFile("docs/swagger.json")
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "swagger spec not found"})
	}

	body, err := rewriteSwaggerSpec(spec, requestHost(c), requestScheme(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to render swagger spec"})
	}

	c.Set(fiber.HeaderContentType, "application/json; charset=utf-8")
	return c.Send(body)
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func rewriteSwaggerSpec(spec []byte, host, scheme string) ([]byte, error) {
	var doc map[string]any
	if err := json.Unmarshal(spec, &doc); err != nil {
		return nil, fmt.Errorf("failed to unmarshal swagger spec: %w", err)
	}

	if host != "" {
		doc["host"] = host
	}
	if scheme != "" {
		doc["schemes"] = []string{scheme}
	}

	body, err := json.Marshal(doc)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal swagger spec: %w", err)
	}

	return body, nil
}

func requestHost(c fiber.Ctx) string {
	if host := strings.TrimSpace(c.Get("X-Forwarded-Host")); host != "" {
		return host
	}

	return strings.TrimSpace(c.Get("Host"))
}

func requestScheme(c fiber.Ctx) string {
	if proto := strings.TrimSpace(c.Get("X-Forwarded-Proto")); proto != "" {
		return normalizeScheme(strings.TrimSpace(strings.Split(proto, ",")[0]))
	}

	if c.Secure() {
		return "https"
	}

	if origin := strings.TrimSpace(c.Get("Origin")); origin != "" {
		origin = strings.ToLower(origin)
		switch {
		case strings.HasPrefix(origin, "https://"):
			return "https"
		case strings.HasPrefix(origin, "http://"):
			return "http"
		}
	}

	return "http"
}

func normalizeScheme(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "https", "wss":
		return "https"
	case "http", "ws":
		return "http"
	default:
		if strings.HasPrefix(strings.ToLower(value), "https") {
			return "https"
		}
		return "http"
	}
}

func docsPath() string {
	if fileExists("docs/index.html") {
		return "/docs"
	}
	return "generate with `make swagger` or Docker build"
}

func buildEmailSender(cfg *config.Config) platformEmail.Sender {
	env := strings.ToLower(strings.TrimSpace(cfg.Environment))
	if cfg.Email.Enabled && env == "production" && strings.EqualFold(cfg.Email.Mode, "smtp") {
		return platformEmail.NewSMTPSender(cfg.Email)
	}

	return platformEmail.NewStubSender(&log.Logger)
}

func buildMessageBus(cfg *config.Config) (platformMessaging.Bus, error) {
	if !cfg.Messaging.Enabled || !cfg.LLM.Enabled {
		return platformMessaging.NewStubBus(&log.Logger), nil
	}
	if strings.EqualFold(cfg.Messaging.Mode, "rabbitmq") {
		return platformRabbitMQ.New(cfg.Messaging.URL, cfg.Messaging.Exchange)
	}

	return platformMessaging.NewStubBus(&log.Logger), nil
}
