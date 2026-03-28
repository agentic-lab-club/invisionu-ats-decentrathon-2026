package metrics

import (
	"strconv"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/timekit"
	"github.com/gofiber/fiber/v3"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// HTTP Metrics
var (
	HttpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "backend",
			Subsystem: "http",
			Name:      "requests_total",
			Help:      "Total number of HTTP requests",
		},
		[]string{"method", "status"},
	)
	HttpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: "backend",
			Subsystem: "http",
			Name:      "request_duration_seconds",
			Help:      "HTTP request duration in seconds",
			Buckets:   []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10},
		},
		[]string{"method", "status"},
	)
	HttpRequestsInFlight = promauto.NewGauge(
		prometheus.GaugeOpts{
			Namespace: "backend",
			Subsystem: "http",
			Name:      "requests_in_flight",
			Help:      "Current number of HTTP requests being processed",
		},
	)
	HttpRequestsByEndpoint = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "backend",
			Subsystem: "http",
			Name:      "requests_by_endpoint_total",
			Help:      "Total number of HTTP requests by normalized endpoint",
		},
		[]string{"method", "endpoint"},
	)
	HttpRequestSize = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: "backend",
			Subsystem: "http",
			Name:      "request_size_bytes",
			Help:      "HTTP request body size in bytes",
			Buckets:   prometheus.ExponentialBuckets(100, 10, 8),
		},
		[]string{"method"},
	)
	HttpResponseSize = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: "backend",
			Subsystem: "http",
			Name:      "response_size_bytes",
			Help:      "HTTP response body size in bytes",
			Buckets:   prometheus.ExponentialBuckets(100, 10, 8),
		},
		[]string{"method"},
	)
	HttpRateLimitHits = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "backend",
			Subsystem: "http",
			Name:      "rate_limit_hits_total",
			Help:      "Total number of rate-limited requests",
		},
		[]string{"endpoint"},
	)
)

func Middleware() fiber.Handler {
	return func(c fiber.Ctx) error {
		if c.Path() == "/metrics" {
			return c.Next()
		}

		start := timekit.NowUTC()
		method := c.Method()

		HttpRequestsInFlight.Inc()
		defer HttpRequestsInFlight.Dec()

		HttpRequestSize.WithLabelValues(method).Observe(float64(len(c.Body())))

		err := c.Next()

		normalizedPath := c.Route().Path
		duration := time.Since(start).Seconds()
		status := strconv.Itoa(c.Response().StatusCode())
		responseSize := float64(len(c.Response().Body()))

		HttpRequestsTotal.WithLabelValues(method, status).Inc()
		HttpRequestDuration.WithLabelValues(method, status).Observe(duration)
		HttpResponseSize.WithLabelValues(method).Observe(responseSize)
		HttpRequestsByEndpoint.WithLabelValues(method, normalizedPath).Inc()

		return err
	}
}

func RecordRateLimitHit(endpoint, _ string) {
	HttpRateLimitHits.WithLabelValues(endpoint).Inc()
}
