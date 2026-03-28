package metrics

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/adaptor"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rs/zerolog/log"
)

var (
	metricsHandler fiber.Handler
)

func init() {
	log.
		Info().
		Str("event", "init_metrics_handler").
		Msg("Initializing Prometheus metrics handler")

	metricsHandler = adaptor.HTTPHandler(promhttp.HandlerFor(
		prometheus.DefaultGatherer,
		promhttp.HandlerOpts{
			EnableOpenMetrics: true,
			ErrorHandling:     promhttp.ContinueOnError,
		},
	))
}

func Handler() fiber.Handler {
	return metricsHandler
}
