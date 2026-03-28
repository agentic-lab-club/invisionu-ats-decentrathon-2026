package respond

import (
	"github.com/gofiber/fiber/v3"
)

func OK[T any](c fiber.Ctx, data T, err error) error {
	return Respond(c, data, err)
}

func Created[T any](c fiber.Ctx, data T, err error) error {
	return Respond(c, data, err, Config[T]{Status: fiber.StatusCreated})
}

func Accepted[T any](c fiber.Ctx, data T, err error) error {
	return Respond(c, data, err, Config[T]{Status: fiber.StatusAccepted})
}

func NoContent(c fiber.Ctx, err error) error {
	return Respond(c, nil, err, Config[any]{
		Status:      fiber.StatusNoContent,
		SuppressNil: true,
	})
}

func EmptyOK(c fiber.Ctx, err error) error {
	return Respond(c, nil, err, Config[any]{
		Status:      fiber.StatusOK,
		SuppressNil: true,
	})
}

func EmptyCreated(c fiber.Ctx, err error) error {
	return Respond(c, nil, err, Config[any]{
		Status:      fiber.StatusCreated,
		SuppressNil: true,
	})
}

func WithFormatter[T any](c fiber.Ctx, data T, err error, f Formatter[T]) error {
	return Respond(c, data, err, Config[T]{Formatter: f})
}

func WithStatus[T any](c fiber.Ctx, data T, err error, status int) error {
	return Respond(c, data, err, Config[T]{Status: status})
}

func ErrorStatus(c fiber.Ctx, err error, status int) error {
	return Respond(c, nil, err, Config[any]{Status: status})
}
