package logger

import (
	"io"
	"os"
	"strings"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Logger is the global logger instance
var Logger zerolog.Logger

// Init initializes the global logger and redirects the standard log package
func Init(cfg config.LoggingConfig) {
	zerolog.TimeFieldFormat = cfg.TimeFormat
	level := parseLevel(cfg.Level)
	zerolog.SetGlobalLevel(level)

	var output io.Writer = os.Stdout
	switch cfg.Output {
	case "stderr":
		output = os.Stderr
	case "stdout":
		// Already default
	default:
		if cfg.Output != "" {
			file, err := os.OpenFile(cfg.Output, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
			if err == nil {
				output = file
			} else {
				log.Error().Err(err).Msg("Failed to open log file, defaulting to stdout")
			}
		}
	}

	if cfg.Format == "console" {
		output = zerolog.ConsoleWriter{
			Out:        output,
			TimeFormat: cfg.TimeFormat,
			NoColor:    false,
		}
	}

	Logger = zerolog.New(output).
		With().
		Timestamp().
		Str("service", "backend").
		Logger()

	// Redirect standard logger to zerolog
	log.Logger = Logger
}

// parseLevel converts string log level to zerolog level
func parseLevel(level string) zerolog.Level {
	switch strings.ToLower(level) {
	case "trace":
		return zerolog.TraceLevel
	case "debug":
		return zerolog.DebugLevel
	case "info":
		return zerolog.InfoLevel
	case "warn", "warning":
		return zerolog.WarnLevel
	case "error":
		return zerolog.ErrorLevel
	case "fatal":
		return zerolog.FatalLevel
	case "panic":
		return zerolog.PanicLevel
	default:
		return zerolog.InfoLevel
	}
}
