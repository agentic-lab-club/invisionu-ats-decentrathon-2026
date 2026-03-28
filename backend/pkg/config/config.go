package config

import (
	"flag"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// HttpConfig holds HTTP server settings.
type HttpConfig struct {
	Port int    `mapstructure:"http_port"`
	Host string `mapstructure:"http_host"`
}

// PostgresConfig holds PostgreSQL connection settings.
type PostgresConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	Name     string `mapstructure:"name"`
	SSLMode  string `mapstructure:"sslmode"`
}

// GotenbergConfig holds gotenberg-related settings.
type GotenbergConfig struct {
	URL string `mapstructure:"url"`
}

// LoggingConfig holds logging configuration
type LoggingConfig struct {
	Level      string `mapstructure:"level"`
	Format     string `mapstructure:"format"`
	Output     string `mapstructure:"output"`
	TimeFormat string `mapstructure:"time_format"`
}

// SecurityConfig holds security-related configuration
type SecurityConfig struct {
	AllowedOrigins         []string `mapstructure:"allowed_origins"`
	AllowedMethods         []string `mapstructure:"allowed_methods"`
	AllowedHeaders         []string `mapstructure:"allowed_headers"`
	ExposeHeaders          []string `mapstructure:"expose_headers"`
	AllowCredentials       bool     `mapstructure:"allow_credentials"`
	MaxAge                 int      `mapstructure:"max_age"`
	TrustedProxies         []string `mapstructure:"trusted_proxies"`
	RateLimitMax           int      `mapstructure:"rate_limit_max"`
	RateLimitWindowSeconds int      `mapstructure:"rate_limit_window_seconds"`
	RequestTimeoutSeconds  int      `mapstructure:"request_timeout_seconds"`
}

// MetricsConfig holds metrics configuration
type MetricsConfig struct {
	Enabled   bool   `mapstructure:"enabled"`
	Path      string `mapstructure:"path"`
	Namespace string `mapstructure:"namespace"`
}

// Config is the root configuration.
type Config struct {
	Server      HttpConfig      `mapstructure:"server"`
	Database    PostgresConfig  `mapstructure:"database"`
	Gotenberg   GotenbergConfig `mapstructure:"gotenberg"`
	Environment string          `mapstructure:"environment"`
	Logging     LoggingConfig   `mapstructure:"logging"`
	Security    SecurityConfig  `mapstructure:"security"`
	Metrics     MetricsConfig   `mapstructure:"metrics"`
}

func Load() (cfg *Config, err error) {
	cfgName := flag.String("config", "local", "configuration name (local|dev|prod)")
	flag.Parse()

	viper.SetConfigName(fmt.Sprintf("config.%s", *cfgName))
	viper.AddConfigPath("./config")
	viper.AddConfigPath(".")
	viper.SetConfigType("yaml")
	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	if err = viper.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("reading config file: %w", err)
	}

	if err = viper.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshaling config into struct: %w", err)
	}

	if cfg.Logging.Level == "" {
		cfg.Logging.Level = "info"
	}
	if cfg.Logging.Format == "" {
		cfg.Logging.Format = "json"
	}
	if cfg.Logging.Output == "" {
		cfg.Logging.Output = "stdout"
	}
	if cfg.Logging.TimeFormat == "" {
		cfg.Logging.TimeFormat = time.RFC3339
	}
	if cfg.Security.RateLimitMax == 0 {
		cfg.Security.RateLimitMax = 100
	}
	if cfg.Security.RateLimitWindowSeconds == 0 {
		cfg.Security.RateLimitWindowSeconds = 60
	}
	if cfg.Security.RequestTimeoutSeconds == 0 {
		cfg.Security.RequestTimeoutSeconds = 30
	}
	if cfg.Security.MaxAge == 0 {
		cfg.Security.MaxAge = 300
	}
	if len(cfg.Security.AllowedMethods) == 0 {
		cfg.Security.AllowedMethods = []string{"GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"}
	}
	if len(cfg.Security.AllowedHeaders) == 0 {
		cfg.Security.AllowedHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Request-ID", "X-Correlation-ID"}
	}
	if len(cfg.Security.ExposeHeaders) == 0 {
		cfg.Security.ExposeHeaders = []string{"X-Request-ID", "X-Correlation-ID"}
	}
	if cfg.Metrics.Path == "" {
		cfg.Metrics.Path = "/metrics"
	}
	if cfg.Metrics.Namespace == "" {
		cfg.Metrics.Namespace = "backend"
	}

	overrideFromEnv(cfg)

	return
}

func overrideFromEnv(cfg *Config) {
	if value := os.Getenv("APP_ENV"); value != "" {
		cfg.Environment = value
	}
	if value := os.Getenv("HTTP_HOST"); value != "" {
		cfg.Server.Host = value
	}
	if value := os.Getenv("HTTP_PORT"); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			cfg.Server.Port = parsed
		}
	}
	if value := os.Getenv("DB_HOST"); value != "" {
		cfg.Database.Host = value
	}
	if value := os.Getenv("DB_PORT"); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			cfg.Database.Port = parsed
		}
	}
	if value := os.Getenv("DB_USER"); value != "" {
		cfg.Database.User = value
	}
	if value := os.Getenv("DB_PASSWORD"); value != "" {
		cfg.Database.Password = value
	}
	if value := os.Getenv("DB_DATABASE"); value != "" {
		cfg.Database.Name = value
	}
	if value := os.Getenv("DB_SSLMODE"); value != "" {
		cfg.Database.SSLMode = value
	}
	if value := os.Getenv("METRICS_ENABLED"); value != "" {
		cfg.Metrics.Enabled = strings.EqualFold(value, "true") || value == "1"
	}
	if value := os.Getenv("METRICS_PATH"); value != "" {
		cfg.Metrics.Path = value
	}
}
