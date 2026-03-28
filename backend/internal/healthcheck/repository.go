package healthcheck

import (
	"context"
	"fmt"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
)

type Repository struct {
	db *database.TrackedDB
}

func NewRepository(db *database.TrackedDB) *Repository {
	return &Repository{db: db}
}

// PingDatabase checks if the database is reachable
func (r *Repository) PingDatabase(ctx context.Context) (time.Duration, error) {
	start := time.Now()
	err := r.db.PingContext(ctx)
	latency := time.Since(start)
	if err != nil {
		return latency, fmt.Errorf("database ping failed: %w", err)
	}
	return latency, nil
}

// CheckDatabaseConnection performs a simple query to verify database connectivity
func (r *Repository) CheckDatabaseConnection(ctx context.Context) (time.Duration, error) {
	start := time.Now()
	var result int
	err := r.db.QueryRowContext(ctx, "SELECT 1").Scan(&result)
	latency := time.Since(start)
	if err != nil {
		return latency, fmt.Errorf("database query failed: %w", err)
	}
	return latency, nil
}

// GetDatabaseStats returns connection pool statistics
func (r *Repository) GetDatabaseStats() (*DatabaseStatsResponse, error) {
	stats := r.db.Stats()
	return &DatabaseStatsResponse{
		OpenConnections:   stats.OpenConnections,
		InUse:             stats.InUse,
		Idle:              stats.Idle,
		WaitCount:         stats.WaitCount,
		WaitDuration:      stats.WaitDuration.String(),
		MaxIdleClosed:     stats.MaxIdleClosed,
		MaxLifetimeClosed: stats.MaxLifetimeClosed,
		MaxIdleTimeClosed: stats.MaxIdleTimeClosed,
	}, nil
}
