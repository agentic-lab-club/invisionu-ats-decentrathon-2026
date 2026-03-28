package respond

import (
	"reflect"

	"github.com/gofiber/fiber/v3"
)

type Formatter[T any] func(T) any

type Config[T any] struct {
	Status      int
	Formatter   Formatter[T]
	SuppressNil bool
}

func defaultConfig[T any]() Config[T] {
	return Config[T]{Status: fiber.StatusOK}
}

func Respond[T any](c fiber.Ctx, data T, err error, cfg ...Config[T]) error {
	conf := defaultConfig[T]()
	if len(cfg) > 0 {
		conf = cfg[0]
	}

	if err != nil {
		status := conf.Status
		if status >= 200 && status < 300 {
			status = fiber.StatusInternalServerError
		}
		return c.Status(status).JSON(fiber.Map{"error": err.Error()})
	}

	// 204 No Content — тело слать нельзя
	if conf.Status == fiber.StatusNoContent {
		return c.SendStatus(fiber.StatusNoContent)
	}

	// Пустое тело по запросу SuppressNil
	if isZeroValue(data) {
		if conf.SuppressNil {
			return c.Status(conf.Status).Send(nil)
		}
		// По умолчанию — вернуть пустой массив для консистентности со списками
		return c.Status(conf.Status).JSON([]any{})
	}

	// Форматирование (DTO / обёртка)
	out := any(data)
	if conf.Formatter != nil {
		out = conf.Formatter(data)
	}

	return c.Status(conf.Status).JSON(out)
}

func isZeroValue[T any](v T) bool {
	val := reflect.ValueOf(v)
	if !val.IsValid() {
		return true
	}
	// Универсальная проверка нулевого значения (работает для struct, time.Time, ptr, slice, map и т.д.)
	return val.IsZero()
}
