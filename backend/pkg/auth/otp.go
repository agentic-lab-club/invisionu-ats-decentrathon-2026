package auth

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"regexp"
	"strings"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/timekit"
	"github.com/google/uuid"
)

const (
	DefaultOTPLength = 5
	DefaultTTLMin    = 5
)

type OTPCode struct {
	ID          uuid.UUID `db:"id" json:"id"`
	PhoneNumber string    `db:"phone_number" json:"phone_number"`
	Code        string    `db:"code" json:"code"`
	ExpiresAt   time.Time `db:"expires_at" json:"expires_at"`
	IsUsed      bool      `db:"is_used" json:"is_used"`
	DateCreated time.Time `db:"date_created" json:"date_created"`
}

type OTPGenerator struct {
	Length int
	TTL    time.Duration
}

func NewOTPGenerator(length int, ttlMin int) *OTPGenerator {
	if length <= 0 {
		length = DefaultOTPLength
	}
	if ttlMin <= 0 {
		ttlMin = DefaultTTLMin
	}
	return &OTPGenerator{
		Length: length,
		TTL:    time.Duration(ttlMin) * time.Minute,
	}
}

func (g *OTPGenerator) GenerateCode() (string, error) {
	max := new(big.Int)
	max.Exp(big.NewInt(10), big.NewInt(int64(g.Length)), nil)

	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", fmt.Errorf("failed to generate random number: %w", err)
	}

	code := fmt.Sprintf("%0*s", g.Length, n.String())
	return code, nil
}

func (g *OTPGenerator) CreateOTP(phone string) (*OTPCode, error) {
	if !ValidatePhone(phone) {
		return nil, fmt.Errorf("invalid phone number format")
	}

	code, err := g.GenerateCode()
	if err != nil {
		return nil, err
	}

	normalizedPhone := NormalizePhone(phone)

	return &OTPCode{
		ID:          uuid.New(),
		PhoneNumber: normalizedPhone,
		Code:        code,
		ExpiresAt:   timekit.NowUTC().Add(g.TTL),
		IsUsed:      false,
		DateCreated: timekit.NowUTC(),
	}, nil
}

func ValidatePhone(phone string) bool {
	if phone == "" {
		return false
	}

	trimmed := strings.TrimSpace(phone)
	// E.164 style validation: +7 to 15 digits total
	re := regexp.MustCompile(`^\+?[1-9]\d{7,14}$`)
	return re.MatchString(trimmed)
}

func NormalizePhone(phone string) string {
	// Remove spaces, dashes, parentheses
	normalized := strings.TrimSpace(phone)
	normalized = strings.ReplaceAll(normalized, " ", "")
	normalized = strings.ReplaceAll(normalized, "-", "")
	normalized = strings.ReplaceAll(normalized, "(", "")
	normalized = strings.ReplaceAll(normalized, ")", "")
	return normalized
}

func (otp *OTPCode) IsExpired() bool {
	return timekit.NowUTC().After(otp.ExpiresAt)
}

func (otp *OTPCode) IsValid() bool {
	return !otp.IsUsed && !otp.IsExpired()
}
