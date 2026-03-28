# HealthCheck Module

This module provides health check endpoints and testing utilities for monitoring, observability, and testing purposes. It's designed to work with monitoring systems like Grafana, Prometheus, and Kubernetes health probes.

## Features

- Database connectivity health checks
- Liveness and readiness probes (Kubernetes-compatible)
- Database connection pool statistics
- Testing endpoints for simulating various HTTP status codes and error scenarios
- Detailed latency measurements

## Endpoints

### Public Endpoints (No Authentication Required)

#### `GET /api/v1/healthcheck`
Returns detailed health status of the application and all its dependencies.

**Response Example:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-19T10:30:00Z",
  "checks": {
    "database_ping": {
      "status": "healthy",
      "message": "Database is reachable",
      "latency": "2.5ms"
    },
    "database_query": {
      "status": "healthy",
      "message": "Database queries working",
      "latency": "5.2ms"
    }
  }
}
```

**Status Codes:**
- `200 OK` - System is healthy or degraded
- `503 Service Unavailable` - System is unhealthy

---

#### `GET /api/v1/healthcheck/liveness`
Simple liveness probe indicating the application is running.

**Response Example:**
```json
{
  "status": "alive"
}
```

---

#### `GET /api/v1/healthcheck/readiness`
Readiness probe indicating the application is ready to serve traffic (database is accessible).

**Response Example:**
```json
{
  "status": "ready"
}
```

**Status Codes:**
- `200 OK` - Application is ready
- `503 Service Unavailable` - Application is not ready

---

### Admin Endpoints (Requires Admin Authentication)

#### `GET /api/v1/healthcheck/db-stats`
Returns detailed database connection pool statistics.

**Response Example:**
```json
{
  "open_connections": 5,
  "in_use": 2,
  "idle": 3,
  "wait_count": 10,
  "wait_duration": "15ms",
  "max_idle_closed": 0,
  "max_lifetime_closed": 1,
  "max_idle_time_closed": 0
}
```

---

#### `POST /api/v1/healthcheck/test-status`
Allows testing specific HTTP status codes for observability and alerting configuration.

**Request Body:**
```json
{
  "status_code": 500,
  "message": "Simulated server error"
}
```

**Response Example:**
```json
{
  "status_code": 500,
  "message": "Simulated server error",
  "timestamp": "2026-02-19T10:30:00Z"
}
```

**Use Cases:**
- Test Grafana alert configurations
- Verify monitoring system detects specific status codes
- Test error tracking integrations

---

#### `GET /api/v1/healthcheck/test-error`
Simulates an application error (returns HTTP 500).

**Use Cases:**
- Test error logging
- Verify error monitoring alerts
- Test error recovery mechanisms

---

#### `GET /api/v1/healthcheck/test-panic`
Simulates a panic to test recovery middleware.

**Use Cases:**
- Verify panic recovery middleware works correctly
- Test crash reporting integrations
- Validate error logging for panics

---

#### `GET /api/v1/healthcheck/test-timeout?duration=5`
Simulates a slow/timeout scenario.

**Query Parameters:**
- `duration` (optional, default: 5) - Duration in seconds

**Use Cases:**
- Test timeout configurations
- Verify timeout middleware behavior
- Test monitoring alerts for slow requests

---

## Integration with Monitoring Systems

### Prometheus

The health check endpoints work seamlessly with Prometheus. You can configure Prometheus to scrape the health endpoint and create alerts based on the status.

**Prometheus Alert Example:**
```yaml
- alert: ServiceUnhealthy
  expr: up{job="backend-api"} == 0
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Service {{ $labels.instance }} is unhealthy"
```

### Grafana

Use the health check endpoints to create dashboards showing:
- Database latency over time
- Service availability percentage
- Connection pool statistics
- Error rate trends

### Kubernetes

Use the liveness and readiness probes in your Kubernetes deployment:

```yaml
livenessProbe:
  httpGet:
    path: /api/v1/healthcheck/liveness
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/v1/healthcheck/readiness
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Docker Compose

Add health checks to your docker-compose.yml:

```yaml
services:
  api:
    image: backend-api:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/v1/healthcheck/liveness"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Testing Scenarios

### 1. Test Alert Configuration
```bash
# Trigger a 500 error to test alerts
curl -X POST http://localhost:8080/api/v1/healthcheck/test-status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"status_code": 500, "message": "Testing alert system"}'
```

### 2. Monitor Database Performance
```bash
# Check database statistics
curl http://localhost:8080/api/v1/healthcheck/db-stats \
  -H "Authorization: Bearer <admin-token>"
```

### 3. Test Timeout Handling
```bash
# Simulate a 10-second timeout
curl "http://localhost:8080/api/v1/healthcheck/test-timeout?duration=10" \
  -H "Authorization: Bearer <admin-token>"
```

## Architecture

```
┌─────────────┐
│   Handler   │  ← HTTP Endpoints
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Service   │  ← Business Logic
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Repository  │  ← Database Operations
└─────────────┘
```

## Development

### Adding New Health Checks

To add a new health check:

1. Add the check logic to `service.go`
2. Update the `PerformHealthCheck` method to include your new check
3. Define any new domain types in `domain.go`

**Example:**
```go
// In service.go
func (s *Service) CheckRedisConnection(ctx context.Context) (time.Duration, error) {
    start := time.Now()
    // Check Redis connection
    latency := time.Since(start)
    return latency, nil
}

// Add to PerformHealthCheck
checks["redis"] = CheckResult{
    Status: HealthStatusHealthy,
    Message: "Redis is accessible",
    Latency: latency.String(),
}
```

## Security Considerations

- Testing endpoints are protected with admin authentication
- Status code testing is limited to valid HTTP status codes (100-599)
- Panic endpoint is controlled to prevent abuse
- Rate limiting applies to all endpoints

## Best Practices

1. **Monitor the health endpoint regularly** - Set up automated checks every 30-60 seconds
2. **Use readiness probes** - In Kubernetes/container orchestration for zero-downtime deployments
3. **Set up alerts** - Configure alerts for when health status becomes "degraded" or "unhealthy"
4. **Test your monitoring** - Use the test endpoints to verify your monitoring and alerting configuration
5. **Review database statistics** - Regularly check connection pool statistics to optimize database configuration

---

## Module Architecture and Implementation

### Overview

The healthcheck module has been refactored to align with the project's established patterns and conventions, improving code quality, maintainability, and consistency.

### Implementation Patterns

#### 1. Domain Layer (`domain.go`)

**Custom error definitions** following project conventions:

- `ErrDatabaseUnhealthy` - for database health failures
- `ErrInvalidDuration` - for invalid timeout test parameters

**Structured response types** instead of generic maps:

- `DatabaseStatsResponse` - strongly-typed database statistics
- `LivenessResponse` - dedicated liveness probe response
- `ReadinessResponse` - dedicated readiness probe response

**Benefits:**

- Type safety and compile-time error checking
- Better IDE autocomplete support
- Consistent with other modules (banner, center, etc.)

#### 2. Repository Layer (`repository.go`)

**Implementation details:**

- **Error wrapping** with context using `fmt.Errorf("%w")` pattern
- **Strong typing** - Returns `*DatabaseStatsResponse` instead of `map[string]interface{}`
- **Clean signatures** - Removed unused context parameters where not needed

**Example:**

```go
// Error wrapping with context
if err != nil {
    return latency, fmt.Errorf("database ping failed: %w", err)
}
return latency, nil
```

**Benefits:**

- Better error messages with context
- Error chain preservation for debugging
- Consistent with repository patterns in banner, center, user modules

#### 3. Service Layer (`service.go`)

**Implementation details:**

- **Time operations** - Using `timekit.NowUTC()` instead of `time.Now()` for consistency
- **Strong typing** - Return structured types instead of primitives/booleans
- **Consistent error handling** with proper wrapping

**Service method patterns:**

```go
func (s *Service) CheckLiveness() *LivenessResponse {
    return &LivenessResponse{Status: "alive"}
}

func (s *Service) CheckReadiness(ctx context.Context) (*ReadinessResponse, error) {
    _, err := s.repo.PingDatabase(ctx)
    if err != nil {
        return nil, fmt.Errorf("readiness check failed: %w", err)
    }
    return &ReadinessResponse{Status: "ready"}, nil
}
```

**Benefits:**

- Returns structured data instead of primitives
- Better error reporting
- Follows project time handling standards

#### 4. Handler Layer (`handler.go`)

**Key features:**

- **Comprehensive structured logging** using zerolog (following attendance, center patterns)
- **Request lifecycle logging** - start, success, and failure events
- **Proper error context extraction** from service layer
- **Duration validation** in TestTimeout (max 60 seconds)
- **Better time handling** using `timekit.NowUTC()`

**Logging pattern examples:**

```go
l := ctx.Locals("log").(*zerolog.Logger)

l.Info().
    Str("event", "healthcheck_start").
    Msg("Health check request started")

// ... perform check ...

l.Info().
    Str("event", "healthcheck_success").
    Str("status", string(healthResponse.Status)).
    Int("http_status", httpStatus).
    Msg("Health check completed")
```

**Benefits:**

- Complete request tracing for observability
- Structured logs that can be parsed by log aggregators
- Consistent event naming: `<module>_<action>_<status>`
- Better debugging capabilities
- Matches patterns from attendance, center, user handlers

### Project Patterns Implemented

The module follows established patterns from other modules:

1. **Zerolog Structured Logging** (from `internal/attendance`, `internal/center`)
2. **Error Wrapping** (from `internal/user`, `internal/schedule`)
3. **Custom Error Variables** (from `internal/center`)
4. **Strong Typing** (all modules)
5. **Responder Usage** (all handlers)
6. **Time Utilities** (from `pkg/timekit`)

### Code Quality

**After implementation:**

- ✅ Comprehensive structured logging
- ✅ Strong typing with dedicated response types
- ✅ Error wrapping with context
- ✅ Consistent time handling with timekit
- ✅ Custom error definitions
- ✅ Input validation (timeout duration)
- ✅ Event naming conventions

### Testing

**Manual testing examples:**

```bash
# 1. Test health check
curl http://localhost:8080/api/v1/healthcheck

# 2. Test readiness probe
curl http://localhost:8080/api/v1/healthcheck/readiness

# 3. Test with admin token
curl http://localhost:8080/api/v1/healthcheck/db-stats \
  -H "Authorization: Bearer <admin-token>"

# 4. Test error simulation
curl http://localhost:8080/api/v1/healthcheck/test-error \
  -H "Authorization: Bearer <admin-token>"
```

**Expected log events:**

- `healthcheck_start`
- `healthcheck_success`
- `healthcheck_failed`
- `db_stats_start`
- `db_stats_success`
- `readiness_check_not_ready`
- `test_error_simulated`
- `test_panic_simulated`

### Module Files

1. **domain.go** - Domain types, custom errors, and response structures
2. **repository.go** - Database operations with proper error handling
3. **service.go** - Business logic with timekit usage and structured responses
4. **handler.go** - HTTP handlers with comprehensive logging
5. **module.go** - Route registration and middleware configuration
