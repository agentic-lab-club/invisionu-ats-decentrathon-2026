package md

import (
	"github.com/gofiber/fiber/v3"
)

func AddLocals(name string, value any) fiber.Handler {
	return func(c fiber.Ctx) error {
		c.Locals(name, value)
		return c.Next()
	}
}
