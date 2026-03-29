package healthcheck

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/timekit"
	"github.com/gofiber/fiber/v3"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"
)

func TestRegisterRoutesHealthEndpointsHealthy(t *testing.T) {
	fixedNow := time.Date(2026, 3, 28, 13, 15, 0, 0, time.UTC)
	timekit.SetDefaultClock(timekit.FakeClock{T: fixedNow})
	t.Cleanup(func() {
		timekit.SetDefaultClock(timekit.UTCClock{})
	})

	app, cleanup := newTestApp(t, func(mock sqlmock.Sqlmock) {
		mock.ExpectPing()
		mock.ExpectQuery("SELECT 1").
			WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow(1))
		mock.ExpectPing()
	})
	t.Cleanup(cleanup)

	healthResp := performRequest(t, app, http.MethodGet, "/health")
	if healthResp.StatusCode != http.StatusOK {
		t.Fatalf("GET /health status = %d; want %d", healthResp.StatusCode, http.StatusOK)
	}

	var healthBody HealthCheckResponse
	decodeResponse(t, healthResp, &healthBody)

	if healthBody.Status != HealthStatusHealthy {
		t.Fatalf("GET /health status body = %q; want %q", healthBody.Status, HealthStatusHealthy)
	}
	if !healthBody.Timestamp.Equal(fixedNow) {
		t.Fatalf("GET /health timestamp = %v; want %v", healthBody.Timestamp, fixedNow)
	}
	if got := healthBody.Checks["database_ping"].Status; got != HealthStatusHealthy {
		t.Fatalf("GET /health database_ping = %q; want %q", got, HealthStatusHealthy)
	}
	if got := healthBody.Checks["database_query"].Status; got != HealthStatusHealthy {
		t.Fatalf("GET /health database_query = %q; want %q", got, HealthStatusHealthy)
	}

	readinessResp := performRequest(t, app, http.MethodGet, "/health/readiness")
	if readinessResp.StatusCode != http.StatusOK {
		t.Fatalf("GET /health/readiness status = %d; want %d", readinessResp.StatusCode, http.StatusOK)
	}

	var readinessBody ReadinessResponse
	decodeResponse(t, readinessResp, &readinessBody)
	if readinessBody.Status != "ready" {
		t.Fatalf("GET /health/readiness body status = %q; want %q", readinessBody.Status, "ready")
	}
}

func TestRegisterRoutesHealthCheckAlias(t *testing.T) {
	app, cleanup := newTestApp(t, func(mock sqlmock.Sqlmock) {
		mock.ExpectPing()
		mock.ExpectQuery("SELECT 1").
			WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow(1))
	})
	t.Cleanup(cleanup)

	resp := performRequest(t, app, http.MethodGet, "/api/v1/healthcheck/")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("GET /api/v1/healthcheck/ status = %d; want %d", resp.StatusCode, http.StatusOK)
	}

	var body HealthCheckResponse
	decodeResponse(t, resp, &body)
	if body.Status != HealthStatusHealthy {
		t.Fatalf("GET /api/v1/healthcheck/ body status = %q; want %q", body.Status, HealthStatusHealthy)
	}
}

func TestRegisterRoutesLivenessProbe(t *testing.T) {
	app, cleanup := newTestApp(t, nil)
	t.Cleanup(cleanup)

	resp := performRequest(t, app, http.MethodGet, "/health/liveness")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("GET /health/liveness status = %d; want %d", resp.StatusCode, http.StatusOK)
	}

	var body LivenessResponse
	decodeResponse(t, resp, &body)
	if body.Status != "alive" {
		t.Fatalf("GET /health/liveness body status = %q; want %q", body.Status, "alive")
	}
}

func TestRegisterRoutesReadinessProbeUnhealthy(t *testing.T) {
	app, cleanup := newTestApp(t, func(mock sqlmock.Sqlmock) {
		mock.ExpectPing().WillReturnError(errors.New("db down"))
	})
	t.Cleanup(cleanup)

	resp := performRequest(t, app, http.MethodGet, "/api/v1/healthcheck/readiness")
	if resp.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("GET /api/v1/healthcheck/readiness status = %d; want %d", resp.StatusCode, http.StatusServiceUnavailable)
	}

	var body map[string]string
	decodeResponse(t, resp, &body)
	if body["error"] != "readiness check failed: database ping failed: db down" {
		t.Fatalf("GET /api/v1/healthcheck/readiness error = %q; want %q", body["error"], "readiness check failed: database ping failed: db down")
	}
}

func newTestApp(t *testing.T, prepare func(sqlmock.Sqlmock)) (*fiber.App, func()) {
	t.Helper()

	sqlDB, mock, err := sqlmock.New(sqlmock.MonitorPingsOption(true))
	if err != nil {
		t.Fatalf("sqlmock.New() error = %v", err)
	}

	if prepare != nil {
		prepare(mock)
	}

	sqlxDB := sqlx.NewDb(sqlDB, "sqlmock")
	trackedDB := database.NewTrackedDB(sqlxDB)

	app := fiber.New()
	app.Use(func(c fiber.Ctx) error {
		logger := zerolog.Nop()
		c.Locals("log", &logger)
		return c.Next()
	})

	RegisterRoutes(app, trackedDB, &config.Config{})

	cleanup := func() {
		mock.ExpectClose()
		if err := sqlDB.Close(); err != nil {
			t.Fatalf("sqlDB.Close() error = %v", err)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatalf("unmet SQL expectations: %v", err)
		}
	}

	return app, cleanup
}

func performRequest(t *testing.T, app *fiber.App, method, path string) *http.Response {
	t.Helper()

	req := httptest.NewRequest(method, path, nil)
	resp, err := app.Test(req, fiber.TestConfig{Timeout: 0})
	if err != nil {
		t.Fatalf("%s %s request error = %v", method, path, err)
	}

	return resp
}

func decodeResponse(t *testing.T, resp *http.Response, out any) {
	t.Helper()
	defer resp.Body.Close()

	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		t.Fatalf("json decode error = %v", err)
	}
}
