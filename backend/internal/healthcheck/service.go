package healthcheck

import (
	"context"
	"fmt"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/timekit"
)

type Service struct {
	repo *Repository
	cfg  *config.Config
}

func NewService(db *database.TrackedDB, cfg *config.Config) *Service {
	return &Service{
		repo: NewRepository(db),
		cfg:  cfg,
	}
}

// PerformHealthCheck executes all health checks and returns the overall status
func (s *Service) PerformHealthCheck(ctx context.Context) (*HealthCheckResponse, error) {
	checks := make(map[string]CheckResult)
	overallStatus := HealthStatusHealthy

	// Check database ping
	pingLatency, pingErr := s.repo.PingDatabase(ctx)
	if pingErr != nil {
		checks["database_ping"] = CheckResult{
			Status:  HealthStatusUnhealthy,
			Message: pingErr.Error(),
			Latency: pingLatency.String(),
		}
		overallStatus = HealthStatusUnhealthy
	} else {
		checks["database_ping"] = CheckResult{
			Status:  HealthStatusHealthy,
			Message: "Database is reachable",
			Latency: pingLatency.String(),
		}
	}

	// Check database connection with query
	queryLatency, queryErr := s.repo.CheckDatabaseConnection(ctx)
	if queryErr != nil {
		checks["database_query"] = CheckResult{
			Status:  HealthStatusUnhealthy,
			Message: queryErr.Error(),
			Latency: queryLatency.String(),
		}
		overallStatus = HealthStatusUnhealthy
	} else {
		// Warn if query is slow (> 100ms)
		if queryLatency > 100*time.Millisecond {
			checks["database_query"] = CheckResult{
				Status:  HealthStatusDegraded,
				Message: "Database queries are slow",
				Latency: queryLatency.String(),
			}
			if overallStatus == HealthStatusHealthy {
				overallStatus = HealthStatusDegraded
			}
		} else {
			checks["database_query"] = CheckResult{
				Status:  HealthStatusHealthy,
				Message: "Database queries working",
				Latency: queryLatency.String(),
			}
		}
	}

	return &HealthCheckResponse{
		Status:    overallStatus,
		Timestamp: timekit.NowUTC(),
		Checks:    checks,
	}, nil
}

// GetDatabaseStats returns detailed database connection pool statistics
func (s *Service) GetDatabaseStats() (*DatabaseStatsResponse, error) {
	return s.repo.GetDatabaseStats()
}

// CheckLiveness returns a simple liveness check (application is running)
func (s *Service) CheckLiveness() *LivenessResponse {
	return &LivenessResponse{Status: "alive"}
}

// CheckReadiness checks if the application is ready to serve traffic
func (s *Service) CheckReadiness(ctx context.Context) (*ReadinessResponse, error) {
	// Check if database is accessible
	_, err := s.repo.PingDatabase(ctx)
	if err != nil {
		return nil, fmt.Errorf("readiness check failed: %w", err)
	}
	return &ReadinessResponse{Status: "ready"}, nil
}
