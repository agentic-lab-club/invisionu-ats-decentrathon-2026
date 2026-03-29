package auth

import (
	"fmt"
	"strings"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/timekit"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/auth"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/metrics"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/sms"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/telegram"
)

type Service struct {
	repo         *Repository
	otpGenerator *auth.OTPGenerator
	tokenGen     *auth.TokenGenerator
	rateLimiter  *auth.RateLimiter
	smsClient    *sms.SMSClient
	config       *config.Config
	testAccounts map[string]string
	tgBot        *telegram.Bot
}

func NewService(repo *Repository, cfg *config.Config, tgBot *telegram.Bot) *Service {
	otpGen := auth.NewOTPGenerator(5, 5) // 5 digits, 5 minutes TTL
	tokenGen := auth.NewTokenGenerator(cfg.Auth.JWTSecret, int(cfg.Auth.AccessTokenDuration.Minutes()))
	rateLimiter := auth.NewRateLimiter()

	smsClient := sms.NewSMSClient(
		cfg.SMS.Login,
		cfg.SMS.APIKey,
		cfg.SMS.BaseURL,
		cfg.SMS.Enabled,
	)

	// Parse test accounts from config
	testAccounts := make(map[string]string)
	if cfg.Auth.TestAccounts != "" {
		pairs := strings.Split(cfg.Auth.TestAccounts, ",")
		for _, pair := range pairs {
			parts := strings.Split(strings.TrimSpace(pair), ":")
			if len(parts) == 2 {
				testAccounts[parts[0]] = parts[1]
			}
		}
	}

	return &Service{
		repo:         repo,
		otpGenerator: otpGen,
		tokenGen:     tokenGen,
		rateLimiter:  rateLimiter,
		smsClient:    smsClient,
		config:       cfg,
		testAccounts: testAccounts,
		tgBot:        tgBot,
	}
}

func (s *Service) RequestOTP(phoneNumber string, channel string) (*RateLimitError, error) {
	normalizedPhone := auth.NormalizePhone(phoneNumber)
	if s.config.Auth.RateLimitEnabled {
		result := s.rateLimiter.CheckOTPRequest(normalizedPhone)
		if !result.OK {
			return &RateLimitError{RetryAfter: result.RetryAfter}, nil
		}
	}

	// 1. Проверяем наличие пользователя и флаг fix_otp
	userByPhone, err := s.repo.FindUserByPhone(normalizedPhone)
	if err != nil {
		return nil, fmt.Errorf("database error: %w", err)
	}

	// 2. Если номер тестовый или у пользователя включен fix_otp — не шлём и не сохраняем в БД
	// Коды для них проверяются отдельно в VerifyOTP
	_, isTest := s.testAccounts[normalizedPhone]
	isFixOTP := userByPhone != nil && userByPhone.IsFixOTP && strings.TrimSpace(s.config.Auth.FixedOTPCode) != ""

	if isTest || isFixOTP {
		return nil, nil
	}

	// 3. Генерация и сохранение OTP для обычных пользователей
	otp, err := s.otpGenerator.CreateOTP(normalizedPhone)
	if err != nil {
		return nil, fmt.Errorf("failed to generate OTP: %w", err)
	}
	if err := s.repo.UpsertOTP(otp); err != nil {
		return nil, fmt.Errorf("failed to save OTP: %w", err)
	}

	// 4. Отправка по выбранному каналу
	message := fmt.Sprintf("Ваш код подтверждения: %s", otp.Code)
	ch := strings.ToLower(strings.TrimSpace(channel))
	env := strings.ToLower(strings.TrimSpace(s.config.Environment))
	isProd := env == "prod" || env == "production"
	switch ch {
	case "tg", "telegram":
		// send via telegram only
		// Telegram delivery is implemented via the same SMS provider (tg=1).
		// On prod we must ensure SMS provider is configured and return error if not.
		if isProd {
			if !s.config.SMS.Enabled || s.config.SMS.Login == "" || s.config.SMS.APIKey == "" || s.config.SMS.BaseURL == "" {
				return nil, fmt.Errorf("sms channel is not configured")
			}
			if s.smsClient == nil {
				return nil, fmt.Errorf("sms client not initialized")
			}
			if _, err := s.smsClient.SendTelegram(normalizedPhone, message); err != nil {
				return nil, fmt.Errorf("failed to send OTP via telegram: %w", err)
			}
			return nil, nil
		}

		// Non-prod: try to send if client is available, otherwise treat as no-op to not block development
		if s.smsClient != nil {
			if _, err := s.smsClient.SendTelegram(normalizedPhone, message); err != nil {
				return nil, fmt.Errorf("failed to send OTP via telegram: %w", err)
			}
			return nil, nil
		}
		if s.tgBot != nil {
			if err := s.tgBot.SendMessage(message); err != nil {
				return nil, fmt.Errorf("failed to send OTP via telegram bot: %w", err)
			}
			return nil, nil
		}
		// no client configured in non-prod — silently succeed for developer convenience
		return nil, nil
	case "sms":
		// send via SMS only
		if isProd {
			if !s.config.SMS.Enabled || s.config.SMS.Login == "" || s.config.SMS.APIKey == "" || s.config.SMS.BaseURL == "" {
				return nil, fmt.Errorf("sms channel is not configured")
			}
			if s.smsClient == nil {
				return nil, fmt.Errorf("sms client not initialized")
			}
			if _, err := s.smsClient.SendSMS(normalizedPhone, message); err != nil {
				return nil, fmt.Errorf("failed to send OTP via sms: %w", err)
			}
			return nil, nil
		}

		// Non-prod: attempt send if client exists, otherwise no-op
		if s.smsClient != nil {
			if _, err := s.smsClient.SendSMS(normalizedPhone, message); err != nil {
				return nil, fmt.Errorf("failed to send OTP via sms: %w", err)
			}
		}
		return nil, nil
	default:
		return nil, fmt.Errorf("unsupported channel: %s", channel)
	}
}

func (s *Service) RequestOTPAdmin(phoneNumber string) (string, *RateLimitError, error) {
	normalizedPhone := auth.NormalizePhone(phoneNumber)
	if s.config.Auth.RateLimitEnabled {
		result := s.rateLimiter.CheckOTPRequest(normalizedPhone)
		if !result.OK {
			return "", &RateLimitError{RetryAfter: result.RetryAfter}, nil
		}
	}

	userByPhone, err := s.repo.FindUserByPhone(normalizedPhone)
	if err != nil {
		return "", nil, fmt.Errorf("database error: %w", err)
	}

	if testCode, isTest := s.testAccounts[normalizedPhone]; isTest {
		return testCode, nil, nil
	}

	isFixOTP := userByPhone != nil && userByPhone.IsFixOTP && strings.TrimSpace(s.config.Auth.FixedOTPCode) != ""
	if isFixOTP {
		return strings.TrimSpace(s.config.Auth.FixedOTPCode), nil, nil
	}

	otp, err := s.otpGenerator.CreateOTP(normalizedPhone)
	if err != nil {
		return "", nil, fmt.Errorf("failed to generate OTP: %w", err)
	}
	if err := s.repo.UpsertOTP(otp); err != nil {
		return "", nil, fmt.Errorf("failed to save OTP: %w", err)
	}

	return otp.Code, nil, nil
}

func (s *Service) VerifyOTP(phoneNumber, code string) (*LoginResponse, *RateLimitError, error) {
	normalizedPhone := auth.NormalizePhone(phoneNumber)
	if s.config.Auth.RateLimitEnabled {
		result := s.rateLimiter.CheckLoginAttempt(normalizedPhone)
		if !result.OK {
			return nil, &RateLimitError{RetryAfter: result.RetryAfter}, nil
		}
	}

	userByPhone, err := s.repo.FindUserByPhone(normalizedPhone)
	if err != nil {
		metrics.RecordAuthAttempt("failed", "otp")
		return nil, nil, fmt.Errorf("database error: %w", err)
	}
	// Пользователь с is_fix_otp: принимаем только код из .env (auth.fixed_otp_code)
	if userByPhone != nil && userByPhone.IsFixOTP {
		fixedCode := strings.TrimSpace(s.config.Auth.FixedOTPCode)
		if fixedCode != "" && code == fixedCode {
			// фикс-OTP совпал — пропускаем проверку AUTH_OTP
		} else {
			metrics.RecordAuthAttempt("failed", "otp")
			return nil, nil, fmt.Errorf("invalid OTP code")
		}
	} else if testCode, isTest := s.testAccounts[normalizedPhone]; isTest {
		if code != testCode {
			metrics.RecordAuthAttempt("failed", "otp")
			return nil, nil, fmt.Errorf("invalid OTP code for test account")
		}
	} else {
		otp, err := s.repo.GetOTPByPhone(normalizedPhone)
		if err != nil {
			metrics.RecordAuthAttempt("failed", "otp")
			return nil, nil, fmt.Errorf("database error: %w", err)
		}

		if otp == nil {
			metrics.RecordAuthAttempt("failed", "otp")
			return nil, nil, fmt.Errorf("OTP not found")
		}

		if !otp.IsValid() {
			metrics.RecordAuthAttempt("failed", "otp")
			return nil, nil, fmt.Errorf("OTP is expired or already used")
		}

		if otp.Code != code {
			metrics.RecordAuthAttempt("failed", "otp")
			return nil, nil, fmt.Errorf("invalid OTP code")
		}
		if err := s.repo.MarkOTPAsUsed(otp.ID); err != nil {
			return nil, nil, fmt.Errorf("failed to mark OTP as used: %w", err)
		}
	}

	user, err := s.findOrCreateUser(normalizedPhone)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to find or create user: %w", err)
	}
	token, err := s.tokenGen.GenerateToken(user.ID, user.Role.ID, user.Role.Name)
	if err != nil {
		metrics.RecordAuthAttempt("failed", "otp")
		return nil, nil, fmt.Errorf("failed to generate token: %w", err)
	}

	metrics.RecordAuthAttempt("success", "otp")
	return &LoginResponse{
		Success:     true,
		AccessToken: token,
		ExpiresAt:   timekit.NowUTC().Add(s.tokenGen.TTL),
		User:        *user,
	}, nil, nil
}

func (s *Service) findOrCreateUser(phone string) (*UserInfo, error) {
	user, err := s.repo.FindUserByPhone(phone)
	if err != nil {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	if user != nil {
		switch user.Status {

		case UserStatusSuspended:
			return nil, ErrUserSuspended

		case UserStatusArchived, UserStatusInvited, UserStatusUnverified, UserStatusDraft:
			if err := s.repo.UpdateStatus(user.ID, UserStatusActive); err != nil {
				return nil, err
			}
			user.Status = UserStatusActive
		}

		return user, nil
	}

	// 2️⃣ Пользователь НИКОГДА не существовал → создаём
	defaultRoleID, err := s.repo.GetDefaultRoleID()
	if err != nil {
		return nil, fmt.Errorf("failed to get default role ID: %w", err)
	}

	user, err = s.repo.CreateUser(phone, defaultRoleID)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	metrics.RecordUserAction("created")
	if s.tgBot != nil {
		msg := fmt.Sprintf("👤 <b>Новый пользователь! [%s]</b>\n\n<b>Телефон:</b> <code>%s</code>", s.config.Environment, phone)
		_ = s.tgBot.SendMessage(msg)
	}
	return user, nil
}

func (s *Service) Health() *HealthResponse {
	return &HealthResponse{
		Status:    "ok",
		Timestamp: timekit.NowUTC(),
		Version:   "1.0.0",
	}
}

func (s *Service) RequestOTPLegacy(phoneNumber string) (*RateLimitError, error) {
	normalizedPhone := auth.NormalizePhone(phoneNumber)
	if s.config.Auth.RateLimitEnabled {
		result := s.rateLimiter.CheckOTPRequest(normalizedPhone)
		if !result.OK {
			return &RateLimitError{RetryAfter: result.RetryAfter}, nil
		}
	}

	// 1. Проверяем наличие пользователя и флаг fix_otp
	userByPhone, err := s.repo.FindUserByPhone(normalizedPhone)
	if err != nil {
		return nil, fmt.Errorf("database error: %w", err)
	}

	// 2. Если номер тестовый или у пользователя включен fix_otp — не шлём и не сохраняем в БД
	_, isTest := s.testAccounts[normalizedPhone]
	isFixOTP := userByPhone != nil && userByPhone.IsFixOTP && strings.TrimSpace(s.config.Auth.FixedOTPCode) != ""

	if isTest || isFixOTP {
		return nil, nil
	}

	// 3. Генерация и сохранение OTP
	otp, err := s.otpGenerator.CreateOTP(normalizedPhone)
	if err != nil {
		return nil, fmt.Errorf("failed to generate OTP: %w", err)
	}
	if err := s.repo.UpsertOTP(otp); err != nil {
		return nil, fmt.Errorf("failed to save OTP: %w", err)
	}

	// 4. Отправка с fallback: попытка telegram, затем sms
	message := fmt.Sprintf("Ваш код подтверждения: %s", otp.Code)

	env := strings.ToLower(strings.TrimSpace(s.config.Environment))
	isProd := env == "prod" || env == "production"

	// На prod требуем настроенный SMS, на non-prod разрешаем no-op
	if isProd {
		if !s.config.SMS.Enabled || s.config.SMS.Login == "" || s.config.SMS.APIKey == "" || s.config.SMS.BaseURL == "" {
			return nil, fmt.Errorf("sms channel is not configured")
		}
		if s.smsClient == nil {
			return nil, fmt.Errorf("sms client not initialized")
		}
	}

	// Check both that client exists AND is enabled before calling SendWithFallbackAsync
	// to avoid nil pointer dereference in async fallback goroutine
	if s.smsClient != nil && s.smsClient.Enabled {
		_, err = s.smsClient.SendWithFallbackAsync(normalizedPhone, message, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to send OTP: %w", err)
		}
	}

	return nil, nil
}

func (s *Service) CleanupExpired() error {
	s.rateLimiter.CleanExpired()
	return s.repo.CleanExpiredOTPs()
}
