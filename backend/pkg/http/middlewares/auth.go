package md

import (
	"strings"

	pkgAuth "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/auth"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

const (
	RoleUser  = "user"
	RoleAdmin = "admin"
)

func AuthRole(accessManager *pkgAuth.TokenManager, roles ...string) fiber.Handler {
	allowed := make(map[string]struct{}, len(roles))
	for _, role := range roles {
		allowed[strings.ToLower(strings.TrimSpace(role))] = struct{}{}
	}

	return func(c fiber.Ctx) error {
		header := strings.TrimSpace(c.Get(fiber.HeaderAuthorization))
		if header == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing bearer token"})
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid authorization header"})
		}

		claims, err := accessManager.Parse(parts[1], pkgAuth.TokenTypeAccess)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid access token"})
		}

		role := strings.ToLower(strings.TrimSpace(claims.Role))
		if len(allowed) > 0 {
			if _, ok := allowed[role]; !ok {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
			}
		}

		c.Locals("auth_id", claims.UserID)
		c.Locals("auth_role", role)
		return c.Next()
	}
}

func AuthID(c fiber.Ctx) (uuid.UUID, bool) {
	value := c.Locals("auth_id")
	id, ok := value.(uuid.UUID)
	return id, ok
}

func AuthRoleValue(c fiber.Ctx) (string, bool) {
	value := c.Locals("auth_role")
	role, ok := value.(string)
	return role, ok
}
