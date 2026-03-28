package md

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v3"
	"github.com/rs/zerolog"
)

var validate = validator.New()

type ValidationErrorDetail struct {
	Field     string      `json:"field"`      // Имя поля (JSON tag)
	Tag       string      `json:"tag"`        // Тег валидации (required, min, max и т.д.)
	Value     interface{} `json:"value"`      // Значение, которое не прошло валидацию
	Message   string      `json:"message"`    // Человекочитаемое сообщение об ошибке
	Param     string      `json:"param"`      // Параметр валидации (например, min=5 -> "5")
	FieldPath string      `json:"field_path"` // Полный путь к полю (для вложенных структур)
}

func BindAndValidate[T any]() fiber.Handler {
	return func(c fiber.Ctx) error {
		var body T
		var l *zerolog.Logger
		if logVal := c.Locals("log"); logVal != nil {
			if logger, ok := logVal.(*zerolog.Logger); ok {
				l = logger
			}
		}

		if err := c.Bind().Body(&body); err != nil {
			if l != nil {
				l.Warn().
					Err(err).
					Str("event", "bind_validation_failed").
					Str("method", c.Method()).
					Str("path", c.Path()).
					Str("path_raw", c.OriginalURL()).
					Int("http_status", fiber.StatusBadRequest).
					Msg("Failed to bind request body")
			}

			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "invalid JSON",
				"message": "Request body is not valid JSON",
				"details": map[string]string{
					"error": err.Error(),
				},
			})
		}

		if err := validate.Struct(body); err != nil {
			validationErrors := err.(validator.ValidationErrors)
			errorDetails := make([]ValidationErrorDetail, 0, len(validationErrors))
			errorMap := make(map[string]ValidationErrorDetail)

			for _, e := range validationErrors {
				fieldName := getJSONFieldName(body, e.Field())
				if fieldName == "" {
					fieldName = e.Field()
				}

				// Формируем человекочитаемое сообщение
				message := getValidationMessage(e, fieldName)

				detail := ValidationErrorDetail{
					Field:     fieldName,
					Tag:       e.Tag(),
					Value:     e.Value(),
					Message:   message,
					Param:     e.Param(),
					FieldPath: e.Namespace(),
				}

				errorDetails = append(errorDetails, detail)
				errorMap[fieldName] = detail
			}

			// Логирование ошибок валидации
			if l != nil {
				l.Warn().
					Str("event", "struct_validation_failed").
					Str("method", c.Method()).
					Str("path", c.Path()).
					Str("path_raw", c.OriginalURL()).
					Int("errors_count", len(errorDetails)).
					Interface("validation_errors", errorDetails).
					Int("http_status", fiber.StatusBadRequest).
					Msg("Request validation failed")
			}

			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "validation failed",
				"message": fmt.Sprintf("Validation failed for %d field(s)", len(errorDetails)),
				"details": errorMap,
				"errors":  errorDetails, // Массив для удобства фронтенда
			})
		}

		c.Locals("body", body)
		return c.Next()
	}
}

// getJSONFieldName получает JSON tag для поля структуры используя рефлексию
func getJSONFieldName[T any](v T, structFieldName string) string {
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Ptr {
		rv = rv.Elem()
	}

	if rv.Kind() != reflect.Struct {
		return ""
	}

	rt := rv.Type()
	for i := 0; i < rt.NumField(); i++ {
		field := rt.Field(i)
		if field.Name == structFieldName {
			jsonTag := field.Tag.Get("json")
			if jsonTag != "" && jsonTag != "-" {
				// Убираем опции из JSON tag (например, "field,omitempty" -> "field")
				parts := strings.Split(jsonTag, ",")
				return parts[0]
			}
			// Если JSON tag нет, возвращаем имя поля в camelCase
			return strings.ToLower(structFieldName[:1]) + structFieldName[1:]
		}
	}
	return ""
}

// getValidationMessage формирует человекочитаемое сообщение об ошибке валидации
func getValidationMessage(e validator.FieldError, fieldName string) string {

	switch e.Tag() {
	case "required":
		return fmt.Sprintf("Field '%s' is required", fieldName)
	case "min":
		return fmt.Sprintf("Field '%s' must be at least %s characters long", fieldName, e.Param())
	case "max":
		return fmt.Sprintf("Field '%s' must be at most %s characters long", fieldName, e.Param())
	case "email":
		return fmt.Sprintf("Field '%s' must be a valid email address", fieldName)
	case "url":
		return fmt.Sprintf("Field '%s' must be a valid URL", fieldName)
	case "uuid":
		return fmt.Sprintf("Field '%s' must be a valid UUID", fieldName)
	case "numeric":
		return fmt.Sprintf("Field '%s' must be numeric", fieldName)
	case "alpha":
		return fmt.Sprintf("Field '%s' must contain only letters", fieldName)
	case "alphanum":
		return fmt.Sprintf("Field '%s' must contain only letters and numbers", fieldName)
	case "gte":
		return fmt.Sprintf("Field '%s' must be greater than or equal to %s", fieldName, e.Param())
	case "lte":
		return fmt.Sprintf("Field '%s' must be less than or equal to %s", fieldName, e.Param())
	case "gt":
		return fmt.Sprintf("Field '%s' must be greater than %s", fieldName, e.Param())
	case "lt":
		return fmt.Sprintf("Field '%s' must be less than %s", fieldName, e.Param())
	case "oneof":
		return fmt.Sprintf("Field '%s' must be one of: %s", fieldName, e.Param())
	case "len":
		return fmt.Sprintf("Field '%s' must be exactly %s characters long", fieldName, e.Param())
	default:
		return fmt.Sprintf("Field '%s' failed validation rule '%s'", fieldName, e.Tag())
	}
}
