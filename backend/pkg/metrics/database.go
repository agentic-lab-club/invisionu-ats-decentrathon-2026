package metrics

import (
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	DatabaseQueryDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: "backend",
			Subsystem: "database",
			Name:      "query_duration_seconds",
			Help:      "Database query duration in seconds",
			Buckets:   []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1, 2.5},
		},
		[]string{"operation", "table"},
	)

	DatabaseConnectionsOpen = promauto.NewGauge(
		prometheus.GaugeOpts{
			Namespace: "backend",
			Subsystem: "database",
			Name:      "connections_open",
			Help:      "Number of open database connections",
		},
	)

	DatabaseConnectionsInUse = promauto.NewGauge(
		prometheus.GaugeOpts{
			Namespace: "backend",
			Subsystem: "database",
			Name:      "connections_in_use",
			Help:      "Number of database connections currently in use",
		},
	)

	DatabaseQueryErrors = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "backend",
			Subsystem: "database",
			Name:      "query_errors_total",
			Help:      "Total number of database query errors",
		},
		[]string{"operation", "table"},
	)
)

func RecordDBQuery(operation, table string, duration time.Duration, err error) {
	DatabaseQueryDuration.WithLabelValues(operation, table).Observe(duration.Seconds())
	if err != nil {
		DatabaseQueryErrors.WithLabelValues(operation, table).Inc()
	}
}
