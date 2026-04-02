package assessment

import (
	"net/http/httptest"
	"strings"
	"testing"

	pkgAuth "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/auth"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/gofiber/fiber/v3"
)

func TestAssessmentRoutesRequireUserAuth(t *testing.T) {
	app := fiber.New()
	cfg := &config.Config{}
	manager := pkgAuth.NewTokenManager("secret", 3600)

	Init(app, nil, cfg, manager)

	tests := []struct {
		method string
		path   string
		body   string
	}{
		{method: "POST", path: "/api/v1/assessment/questions", body: `{"specialization":"Backend","num_questions":5}`},
		{method: "GET", path: "/api/v1/assessment/sessions/550e8400-e29b-41d4-a716-446655440000"},
		{method: "POST", path: "/api/v1/assessment/sessions/550e8400-e29b-41d4-a716-446655440000/answers", body: `{"answers":["a"]}`},
		{method: "POST", path: "/api/v1/assessment/sessions/550e8400-e29b-41d4-a716-446655440000/evaluate"},
	}

	for _, tt := range tests {
		req := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
		if tt.body != "" {
			req.Header.Set("Content-Type", "application/json")
		}
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("app.Test(%s %s) returned error: %v", tt.method, tt.path, err)
		}
		if resp.StatusCode != fiber.StatusUnauthorized {
			t.Fatalf("expected 401 for %s %s, got %d", tt.method, tt.path, resp.StatusCode)
		}
	}
}
