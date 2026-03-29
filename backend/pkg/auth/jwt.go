package auth

import (
	"fmt"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/timekit"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type JWTClaims struct {
	ID          uuid.UUID `json:"id"`
	Role        uuid.UUID `json:"role"`
	RoleName    string    `json:"roleName"`
	AppAccess   bool      `json:"app_access"`
	AdminAccess bool      `json:"admin_access"`
	Type        string    `json:"type"`
	jwt.RegisteredClaims
}

type TokenGenerator struct {
	Secret string
	TTL    time.Duration
}

func NewTokenGenerator(secret string, ttlMin int) *TokenGenerator {
	if ttlMin <= 0 {
		ttlMin = 60 // default 60 minutes
	}
	return &TokenGenerator{
		Secret: secret,
		TTL:    time.Duration(ttlMin) * time.Minute,
	}
}

func (tg *TokenGenerator) GenerateToken(userID, roleID uuid.UUID, roleName string) (string, error) {
	claims := &JWTClaims{
		ID:          userID,
		Role:        roleID,
		RoleName:    roleName,
		AppAccess:   true,
		AdminAccess: false,
		Type:        "access",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "directus",
			Subject:   userID.String(),
			ExpiresAt: jwt.NewNumericDate(timekit.NowUTC().Add(tg.TTL)),
			IssuedAt:  jwt.NewNumericDate(timekit.NowUTC()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(tg.Secret))
}

func (tg *TokenGenerator) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(tg.Secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}
