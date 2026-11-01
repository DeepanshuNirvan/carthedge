package config

import (
	"strings"
	"testing"
)

// Production refuses settings that would be quietly unsafe there.
func TestProductionGuards(t *testing.T) {
	base := func(t *testing.T) {
		t.Setenv("APP_ENV", "production")
		t.Setenv("DATABASE_URL", "postgres://x")
		t.Setenv("ENCRYPTION_KEY", strings.Repeat("ab", 32))
		t.Setenv("JWT_SECRET", strings.Repeat("s", 32))
		t.Setenv("PUBLIC_BASE_URL", "https://carthedge.in")
		t.Setenv("CORS_ORIGINS", "*")
	}

	base(t)
	c, err := Load()
	if err != nil {
		t.Fatalf("valid production config refused: %v", err)
	}
	if len(c.CORSOrigins) != 1 || c.CORSOrigins[0] != "https://carthedge.in" {
		t.Errorf("wildcard CORS in production = %v, want only the site's own origin", c.CORSOrigins)
	}

	t.Run("short JWT secret", func(t *testing.T) {
		base(t)
		t.Setenv("JWT_SECRET", "short")
		if _, err := Load(); err == nil {
			t.Error("a short JWT_SECRET booted in production")
		}
	})
	t.Run("razorpay without webhook secret", func(t *testing.T) {
		base(t)
		t.Setenv("RAZORPAY_KEY_ID", "rzp_live_x")
		t.Setenv("RAZORPAY_WEBHOOK_SECRET", "")
		if _, err := Load(); err == nil {
			t.Error("Razorpay keys without a webhook secret booted in production")
		}
	})
	t.Run("development keeps the wildcard", func(t *testing.T) {
		base(t)
		t.Setenv("APP_ENV", "development")
		t.Setenv("JWT_SECRET", "short")
		c, err := Load()
		if err != nil || c.CORSOrigins[0] != "*" {
			t.Errorf("development config = %v, %v", c, err)
		}
	})
}
