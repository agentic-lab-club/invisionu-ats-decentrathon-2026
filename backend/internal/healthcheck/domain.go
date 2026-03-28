package healthcheck

import (
	"errors"
	"time"
)

// Custom errors
var (
	ErrDatabaseUnhealthy = errors.New("database is unhealthy")
	ErrInvalidDuration   = errors.New("invalid duration parameter")
)

// HealthStatus represents the overall health status
type HealthStatus string

const (
	HealthStatusHealthy   HealthStatus = "healthy"
	HealthStatusDegraded  HealthStatus = "degraded"
	HealthStatusUnhealthy HealthStatus = "unhealthy"
)

// HealthCheckResponse is the response structure for health checks
type HealthCheckResponse struct {
	Status    HealthStatus           `json:"status"`
	Timestamp time.Time              `json:"timestamp"`
	Checks    map[string]CheckResult `json:"checks"`
}

// CheckResult represents the result of an individual health check
type CheckResult struct {
	Status  HealthStatus `json:"status"`
	Message string       `json:"message,omitempty"`
	Latency string       `json:"latency,omitempty"`
}

// DatabaseStatsResponse represents database connection pool statistics
type DatabaseStatsResponse struct {
	OpenConnections   int    `json:"open_connections"`
	InUse             int    `json:"in_use"`
	Idle              int    `json:"idle"`
	WaitCount         int64  `json:"wait_count"`
	WaitDuration      string `json:"wait_duration"`
	MaxIdleClosed     int64  `json:"max_idle_closed"`
	MaxLifetimeClosed int64  `json:"max_lifetime_closed"`
	MaxIdleTimeClosed int64  `json:"max_idle_time_closed"`
}

// StatusCodeTestRequest is the request body for status code testing endpoint
type StatusCodeTestRequest struct {
	StatusCode int    `json:"status_code" validate:"required,min=100,max=599"`
	Message    string `json:"message,omitempty"`
}

// LivenessResponse represents liveness probe response
type LivenessResponse struct {
	Status string `json:"status"`
}

// ReadinessResponse represents readiness probe response
type ReadinessResponse struct {
	Status string `json:"status"`
}
