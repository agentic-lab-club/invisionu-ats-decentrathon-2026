package md

import (
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

func ValidateParam[T any](param string) fiber.Handler {
	return func(c fiber.Ctx) error {
		raw := c.Params(param)
		var val any
		var err error

		switch any(*new(T)).(type) {
		case uint64:
			val, err = strconv.ParseUint(raw, 10, 64)
		case int:
			var parsed int64
			parsed, err = strconv.ParseInt(raw, 10, 64)
			val = int(parsed)
		case float64:
			val, err = strconv.ParseFloat(raw, 64)
		case string:
			val = raw
		case uuid.UUID:
			val, err = uuid.Parse(raw)
		default:
			return c.Status(500).JSON(fiber.Map{
				"error": fmt.Sprintf("unsupported type %T", *new(T)),
			})
		}

		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": fmt.Sprintf("parameter '%s' is not a valid %T", param, *new(T)),
			})
		}

		c.Locals(param, val)
		return c.Next()
	}
}
