package md

import (
	"fmt"

	"github.com/gofiber/fiber/v3"
)

// SecurityHeadersConfig holds security headers configuration
type SecurityHeadersConfig struct {
	// XSSProtection sets the X-XSS-Protection header
	XSSProtection string

	// ContentTypeNosniff sets the X-Content-Type-Options header
	ContentTypeNosniff string

	// XFrameOptions sets the X-Frame-Options header (DENY, SAMEORIGIN)
	XFrameOptions string

	// HSTSMaxAge sets the Strict-Transport-Security max-age (0 = disabled)
	HSTSMaxAge int

	// HSTSIncludeSubdomains includes subdomains in HSTS
	HSTSIncludeSubdomains bool

	// HSTSPreload enables HSTS preload
	HSTSPreload bool

	// ContentSecurityPolicy sets the Content-Security-Policy header
	ContentSecurityPolicy string

	// ReferrerPolicy sets the Referrer-Policy header
	ReferrerPolicy string

	// PermissionsPolicy sets the Permissions-Policy header
	PermissionsPolicy string

	// CrossOriginEmbedderPolicy sets the Cross-Origin-Embedder-Policy header
	CrossOriginEmbedderPolicy string

	// CrossOriginOpenerPolicy sets the Cross-Origin-Opener-Policy header
	CrossOriginOpenerPolicy string

	// CrossOriginResourcePolicy sets the Cross-Origin-Resource-Policy header
	CrossOriginResourcePolicy string
}

// DefaultSecurityHeadersConfig returns default security headers configuration
func DefaultSecurityHeadersConfig() SecurityHeadersConfig {
	return SecurityHeadersConfig{
		XSSProtection:             "1; mode=block",
		ContentTypeNosniff:        "nosniff",
		XFrameOptions:             "DENY",
		HSTSMaxAge:                31536000, // 1 year
		HSTSIncludeSubdomains:     true,
		HSTSPreload:               true,
		ContentSecurityPolicy:     "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'",
		ReferrerPolicy:            "strict-origin-when-cross-origin",
		PermissionsPolicy:         "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
		CrossOriginEmbedderPolicy: "require-corp",
		CrossOriginOpenerPolicy:   "same-origin",
		CrossOriginResourcePolicy: "same-origin",
	}
}

// APISecurityHeadersConfig returns security headers for API endpoints
func APISecurityHeadersConfig() SecurityHeadersConfig {
	return SecurityHeadersConfig{
		XSSProtection:             "1; mode=block",
		ContentTypeNosniff:        "nosniff",
		XFrameOptions:             "DENY",
		HSTSMaxAge:                31536000,
		HSTSIncludeSubdomains:     true,
		ContentSecurityPolicy:     "default-src 'none'",
		ReferrerPolicy:            "no-referrer",
		PermissionsPolicy:         "geolocation=(), microphone=(), camera=()",
		CrossOriginResourcePolicy: "cross-origin",
	}
}

// SecurityHeaders returns a middleware that sets security headers
func SecurityHeaders(cfg ...SecurityHeadersConfig) fiber.Handler {
	config := DefaultSecurityHeadersConfig()
	if len(cfg) > 0 {
		config = cfg[0]
	}

	return func(c fiber.Ctx) error {
		// XSS Protection
		if config.XSSProtection != "" {
			c.Set("X-XSS-Protection", config.XSSProtection)
		}

		// Content Type Options
		if config.ContentTypeNosniff != "" {
			c.Set("X-Content-Type-Options", config.ContentTypeNosniff)
		}

		// Frame Options
		if config.XFrameOptions != "" {
			c.Set("X-Frame-Options", config.XFrameOptions)
		}

		// HSTS
		if config.HSTSMaxAge > 0 {
			hstsValue := fmt.Sprintf("max-age=%d", config.HSTSMaxAge)
			if config.HSTSIncludeSubdomains {
				hstsValue += "; includeSubDomains"
			}
			if config.HSTSPreload {
				hstsValue += "; preload"
			}
			c.Set("Strict-Transport-Security", hstsValue)
		}

		// Content Security Policy
		if config.ContentSecurityPolicy != "" {
			c.Set("Content-Security-Policy", config.ContentSecurityPolicy)
		}

		// Referrer Policy
		if config.ReferrerPolicy != "" {
			c.Set("Referrer-Policy", config.ReferrerPolicy)
		}

		// Permissions Policy
		if config.PermissionsPolicy != "" {
			c.Set("Permissions-Policy", config.PermissionsPolicy)
		}

		// Cross-Origin Policies
		if config.CrossOriginEmbedderPolicy != "" {
			c.Set("Cross-Origin-Embedder-Policy", config.CrossOriginEmbedderPolicy)
		}
		if config.CrossOriginOpenerPolicy != "" {
			c.Set("Cross-Origin-Opener-Policy", config.CrossOriginOpenerPolicy)
		}
		if config.CrossOriginResourcePolicy != "" {
			c.Set("Cross-Origin-Resource-Policy", config.CrossOriginResourcePolicy)
		}

		// Remove server header to hide technology
		c.Set("Server", "")

		// Cache control for API responses
		c.Set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
		c.Set("Pragma", "no-cache")
		c.Set("Expires", "0")

		return c.Next()
	}
}

// SecurityHeadersMiddleware returns the default security headers middleware
func SecurityHeadersMiddleware() fiber.Handler {
	return SecurityHeaders(APISecurityHeadersConfig())
}
