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
	Level          string   `mapstructure:"level"`
	Format         string   `mapstructure:"format"`
	Output         string   `mapstructure:"output"`
	TimeFormat     string   `mapstructure:"time_format"`
	SensitivePaths []string `mapstructure:"sensitive_paths"`
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

type AuthConfig struct {
	JWTAccessSecret                 string `mapstructure:"jwt_access_secret"`
	JWTRefreshSecret                string `mapstructure:"jwt_refresh_secret"`
	AccessTokenTTLSeconds           int    `mapstructure:"access_token_ttl_seconds"`
	RefreshTokenTTLSeconds          int    `mapstructure:"refresh_token_ttl_seconds"`
	EmailVerificationCodeTTLSeconds int    `mapstructure:"email_verification_code_ttl_seconds"`
}

type StorageConfig struct {
	Provider  string `mapstructure:"provider"`
	Endpoint  string `mapstructure:"endpoint"`
	Region    string `mapstructure:"region"`
	Bucket    string `mapstructure:"bucket"`
	AccessKey string `mapstructure:"access_key"`
	SecretKey string `mapstructure:"secret_key"`
	UseSSL    bool   `mapstructure:"use_ssl"`
}

type MessagingConfig struct {
	Enabled                 bool   `mapstructure:"enabled"`
	Mode                    string `mapstructure:"mode"`
	URL                     string `mapstructure:"url"`
	Exchange                string `mapstructure:"exchange"`
	ApplicationSubmittedKey string `mapstructure:"application_submitted_key"`
}

type EmailConfig struct {
	Enabled   bool   `mapstructure:"enabled"`
	Mode      string `mapstructure:"mode"`
	FromName  string `mapstructure:"from_name"`
	FromEmail string `mapstructure:"from_email"`
	SMTPHost  string `mapstructure:"smtp_host"`
	SMTPPort  int    `mapstructure:"smtp_port"`
	SMTPUser  string `mapstructure:"smtp_user"`
	SMTPPass  string `mapstructure:"smtp_pass"`
}

type LLMConfig struct {
	Enabled bool `mapstructure:"enabled"`
}

type LLMAssessmentConfig struct {
	Provider           string `mapstructure:"provider"`
	BaseURL            string `mapstructure:"base_url"`
	APIKey             string `mapstructure:"api_key"`
	QuestionModel      string `mapstructure:"question_model"`
	EvaluationModel    string `mapstructure:"evaluation_model"`
	RequestTimeoutSecs int    `mapstructure:"request_timeout_seconds"`
}

type AssessmentConfig struct {
	TimeoutMinutes int `mapstructure:"timeout_minutes"`
}

type ScreeningConfig struct {
	STTBaseURL         string `mapstructure:"stt_base_url"`
	LLMBaseURL         string `mapstructure:"llm_base_url"`
	AIDetectBaseURL    string `mapstructure:"ai_detect_base_url"`
	ParserBaseURL      string `mapstructure:"parser_base_url"`
	RequestTimeoutSecs int    `mapstructure:"request_timeout_seconds"`
	PresignTTLSeconds  int    `mapstructure:"presign_ttl_seconds"`
}

// Config is the root configuration.
type Config struct {
	Server        HttpConfig          `mapstructure:"server"`
	Database      PostgresConfig      `mapstructure:"database"`
	Gotenberg     GotenbergConfig     `mapstructure:"gotenberg"`
	Environment   string              `mapstructure:"environment"`
	Logging       LoggingConfig       `mapstructure:"logging"`
	Security      SecurityConfig      `mapstructure:"security"`
	Metrics       MetricsConfig       `mapstructure:"metrics"`
	Auth          AuthConfig          `mapstructure:"auth"`
	Storage       StorageConfig       `mapstructure:"storage"`
	Messaging     MessagingConfig     `mapstructure:"messaging"`
	Email         EmailConfig         `mapstructure:"email"`
	LLM           LLMConfig           `mapstructure:"llm"`
	LLMAssessment LLMAssessmentConfig `mapstructure:"llm_assessment"`
	Assessment    AssessmentConfig    `mapstructure:"assessment"`
	Screening     ScreeningConfig     `mapstructure:"screening"`
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
	if cfg.Auth.AccessTokenTTLSeconds == 0 {
		cfg.Auth.AccessTokenTTLSeconds = 3600
	}
	if cfg.Auth.RefreshTokenTTLSeconds == 0 {
		cfg.Auth.RefreshTokenTTLSeconds = 604800
	}
	if cfg.Auth.EmailVerificationCodeTTLSeconds == 0 {
		cfg.Auth.EmailVerificationCodeTTLSeconds = 900
	}
	if cfg.Storage.Provider == "" {
		cfg.Storage.Provider = "s3"
	}
	if cfg.Storage.Region == "" {
		cfg.Storage.Region = "us-east-1"
	}
	if cfg.Messaging.Mode == "" {
		cfg.Messaging.Mode = "stub"
	}
	if cfg.Messaging.Exchange == "" {
		cfg.Messaging.Exchange = "invisionu.events"
	}
	if cfg.Messaging.ApplicationSubmittedKey == "" {
		cfg.Messaging.ApplicationSubmittedKey = "application.submitted"
	}
	if cfg.Email.Mode == "" {
		cfg.Email.Mode = "stub"
	}
	if cfg.LLMAssessment.Provider == "" {
		cfg.LLMAssessment.Provider = "openai"
	}
	if cfg.LLMAssessment.BaseURL == "" {
		cfg.LLMAssessment.BaseURL = "https://api.openai.com/v1"
	}
	if cfg.LLMAssessment.QuestionModel == "" {
		cfg.LLMAssessment.QuestionModel = "gpt-4o-mini"
	}
	if cfg.LLMAssessment.EvaluationModel == "" {
		cfg.LLMAssessment.EvaluationModel = "gpt-4o-mini"
	}
	if cfg.LLMAssessment.RequestTimeoutSecs == 0 {
		cfg.LLMAssessment.RequestTimeoutSecs = 30
	}
	if cfg.Assessment.TimeoutMinutes == 0 {
		cfg.Assessment.TimeoutMinutes = 15
	}
	if cfg.Screening.STTBaseURL == "" {
		cfg.Screening.STTBaseURL = "http://sttwhisper:9095"
	}
	if cfg.Screening.LLMBaseURL == "" {
		cfg.Screening.LLMBaseURL = "http://llmscoring:9094"
	}
	if cfg.Screening.AIDetectBaseURL == "" {
		cfg.Screening.AIDetectBaseURL = "http://aidetect:9873"
	}
	if cfg.Screening.ParserBaseURL == "" {
		cfg.Screening.ParserBaseURL = "http://parserapi:8001"
	}
	if cfg.Screening.RequestTimeoutSecs == 0 {
		cfg.Screening.RequestTimeoutSecs = 180
	}
	if cfg.Screening.PresignTTLSeconds == 0 {
		cfg.Screening.PresignTTLSeconds = 900
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
	if value := os.Getenv("SCREENING_STT_BASE_URL"); value != "" {
		cfg.Screening.STTBaseURL = value
	}
	if value := os.Getenv("SCREENING_LLM_BASE_URL"); value != "" {
		cfg.Screening.LLMBaseURL = value
	}
	if value := os.Getenv("SCREENING_AI_DETECT_BASE_URL"); value != "" {
		cfg.Screening.AIDetectBaseURL = value
	}
	if value := os.Getenv("SCREENING_PARSER_BASE_URL"); value != "" {
		cfg.Screening.ParserBaseURL = value
	}
	if value := os.Getenv("SCREENING_REQUEST_TIMEOUT_SECONDS"); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			cfg.Screening.RequestTimeoutSecs = parsed
		}
	}
	if value := os.Getenv("SCREENING_PRESIGN_TTL_SECONDS"); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			cfg.Screening.PresignTTLSeconds = parsed
		}
	}
	if value := os.Getenv("METRICS_ENABLED"); value != "" {
		cfg.Metrics.Enabled = strings.EqualFold(value, "true") || value == "1"
	}
	if value := os.Getenv("METRICS_PATH"); value != "" {
		cfg.Metrics.Path = value
	}
	if value := os.Getenv("JWT_ACCESS_SECRET"); value != "" {
		cfg.Auth.JWTAccessSecret = value
	}
	if value := os.Getenv("JWT_REFRESH_SECRET"); value != "" {
		cfg.Auth.JWTRefreshSecret = value
	}
	if value := os.Getenv("ACCESS_TOKEN_TTL_SECONDS"); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			cfg.Auth.AccessTokenTTLSeconds = parsed
		}
	}
	if value := os.Getenv("REFRESH_TOKEN_TTL_SECONDS"); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			cfg.Auth.RefreshTokenTTLSeconds = parsed
		}
	}
	if value := os.Getenv("EMAIL_VERIFICATION_CODE_TTL_SECONDS"); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			cfg.Auth.EmailVerificationCodeTTLSeconds = parsed
		}
	}
	if value := os.Getenv("STORAGE_PROVIDER"); value != "" {
		cfg.Storage.Provider = value
	}
	if value := os.Getenv("STORAGE_ENDPOINT"); value != "" {
		cfg.Storage.Endpoint = value
	}
	if value := os.Getenv("STORAGE_REGION"); value != "" {
		cfg.Storage.Region = value
	}
	if value := os.Getenv("STORAGE_BUCKET"); value != "" {
		cfg.Storage.Bucket = value
	}
	if value := os.Getenv("STORAGE_ACCESS_KEY"); value != "" {
		cfg.Storage.AccessKey = value
	}
	if value := os.Getenv("STORAGE_SECRET_KEY"); value != "" {
		cfg.Storage.SecretKey = value
	}
	if value := os.Getenv("STORAGE_USE_SSL"); value != "" {
		cfg.Storage.UseSSL = strings.EqualFold(value, "true") || value == "1"
	}
	if value := os.Getenv("MESSAGING_MODE"); value != "" {
		cfg.Messaging.Mode = value
	}
	if value := os.Getenv("MESSAGING_ENABLED"); value != "" {
		cfg.Messaging.Enabled = strings.EqualFold(value, "true") || value == "1"
	}
	if value := os.Getenv("RABBITMQ_URL"); value != "" {
		cfg.Messaging.URL = value
	}
	if value := os.Getenv("MESSAGING_EXCHANGE"); value != "" {
		cfg.Messaging.Exchange = value
	}
	if value := os.Getenv("APPLICATION_SUBMITTED_ROUTING_KEY"); value != "" {
		cfg.Messaging.ApplicationSubmittedKey = value
	}
	if value := os.Getenv("EMAIL_MODE"); value != "" {
		cfg.Email.Mode = value
	}
	if value := os.Getenv("SMTP_ENABLED"); value != "" {
		cfg.Email.Enabled = strings.EqualFold(value, "true") || value == "1"
	}
	if value := os.Getenv("EMAIL_FROM_NAME"); value != "" {
		cfg.Email.FromName = value
	}
	if value := os.Getenv("EMAIL_FROM_EMAIL"); value != "" {
		cfg.Email.FromEmail = value
	}
	if value := os.Getenv("SMTP_HOST"); value != "" {
		cfg.Email.SMTPHost = value
	}
	if value := os.Getenv("SMTP_PORT"); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			cfg.Email.SMTPPort = parsed
		}
	}
	if value := os.Getenv("SMTP_USER"); value != "" {
		cfg.Email.SMTPUser = value
	}
	if value := os.Getenv("SMTP_PASS"); value != "" {
		cfg.Email.SMTPPass = value
	}
	if value := os.Getenv("LLM_ENABLED"); value != "" {
		cfg.LLM.Enabled = strings.EqualFold(value, "true") || value == "1"
	}
	if value := os.Getenv("LLM_ASSESSMENT_PROVIDER"); value != "" {
		cfg.LLMAssessment.Provider = value
	}
	if value := os.Getenv("LLM_ASSESSMENT_BASE_URL"); value != "" {
		cfg.LLMAssessment.BaseURL = value
	}
	if value := os.Getenv("LLM_ASSESSMENT_API_KEY"); value != "" {
		cfg.LLMAssessment.APIKey = value
	}
	if value := os.Getenv("LLM_ASSESSMENT_QUESTION_MODEL"); value != "" {
		cfg.LLMAssessment.QuestionModel = value
	}
	if value := os.Getenv("LLM_ASSESSMENT_EVALUATION_MODEL"); value != "" {
		cfg.LLMAssessment.EvaluationModel = value
	}
	if value := os.Getenv("LLM_ASSESSMENT_REQUEST_TIMEOUT_SECONDS"); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			cfg.LLMAssessment.RequestTimeoutSecs = parsed
		}
	}
	if value := os.Getenv("ASSESSMENT_TIMEOUT_MINUTES"); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			cfg.Assessment.TimeoutMinutes = parsed
		}
	}
}
