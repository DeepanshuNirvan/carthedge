package config

import (
	"bufio"
	"encoding/hex"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Env           string
	Port          string
	PublicBaseURL string
	DatabaseURL   string
	RedisURL      string

	JWTSecret     string
	AccessTTL     time.Duration
	RefreshTTL    time.Duration
	EncryptionKey string

	TrialDays     int
	TrialPlanCode string
	CORSOrigins   []string

	StorageDriver string
	UploadDir     string
	S3Bucket      string
	S3Region      string

	AIProvider  string
	OpenAIKey   string
	OpenAIModel string
	GeminiKey   string
	GeminiModel string

	RazorpayKeyID         string
	RazorpayKeySecret     string
	RazorpayWebhookSecret string

	SMTPHost string
	SMTPPort string
	SMTPUser string
	SMTPPass string
	SMTPFrom string

	WhatsAppAPIURL string
	WhatsAppToken  string

	ShiprocketEmail    string
	ShiprocketPassword string

	AdminEmail string
}

func Load() (*Config, error) {
	loadDotEnv(".env")

	c := &Config{
		Env:           env("APP_ENV", "development"),
		Port:          env("HTTP_PORT", "8080"),
		PublicBaseURL: strings.TrimRight(env("PUBLIC_BASE_URL", "http://localhost:8080"), "/"),
		DatabaseURL:   os.Getenv("DATABASE_URL"),
		RedisURL:      env("REDIS_URL", "redis://localhost:6379/0"),

		JWTSecret:     os.Getenv("JWT_SECRET"),
		AccessTTL:     envDur("JWT_ACCESS_TTL", 24*time.Hour),
		RefreshTTL:    envDur("JWT_REFRESH_TTL", 30*24*time.Hour),
		EncryptionKey: os.Getenv("ENCRYPTION_KEY"),

		TrialDays:     envInt("TRIAL_DAYS", 15),
		TrialPlanCode: env("TRIAL_PLAN_CODE", "pro"),
		CORSOrigins:   strings.Split(env("CORS_ORIGINS", "*"), ","),

		StorageDriver: env("STORAGE_DRIVER", "local"),
		UploadDir:     env("UPLOAD_DIR", "uploads"),
		S3Bucket:      os.Getenv("S3_BUCKET"),
		S3Region:      os.Getenv("S3_REGION"),

		AIProvider:  env("AI_PROVIDER", "openai"),
		OpenAIKey:   os.Getenv("OPENAI_API_KEY"),
		OpenAIModel: env("OPENAI_MODEL", "gpt-4o-mini"),
		GeminiKey:   os.Getenv("GEMINI_API_KEY"),
		GeminiModel: env("GEMINI_MODEL", "gemini-2.0-flash"),

		RazorpayKeyID:         os.Getenv("RAZORPAY_KEY_ID"),
		RazorpayKeySecret:     os.Getenv("RAZORPAY_KEY_SECRET"),
		RazorpayWebhookSecret: os.Getenv("RAZORPAY_WEBHOOK_SECRET"),

		SMTPHost: os.Getenv("SMTP_HOST"),
		SMTPPort: env("SMTP_PORT", "587"),
		SMTPUser: os.Getenv("SMTP_USER"),
		SMTPPass: os.Getenv("SMTP_PASS"),
		SMTPFrom: os.Getenv("SMTP_FROM"),

		WhatsAppAPIURL: os.Getenv("WHATSAPP_API_URL"),
		WhatsAppToken:  os.Getenv("WHATSAPP_API_TOKEN"),

		ShiprocketEmail:    os.Getenv("SHIPROCKET_EMAIL"),
		ShiprocketPassword: os.Getenv("SHIPROCKET_PASSWORD"),

		AdminEmail: os.Getenv("ADMIN_EMAIL"),
	}

	if c.DatabaseURL == "" || c.JWTSecret == "" || c.EncryptionKey == "" {
		return nil, fmt.Errorf("DATABASE_URL, JWT_SECRET and ENCRYPTION_KEY are required")
	}
	if key, err := hex.DecodeString(c.EncryptionKey); err != nil || len(key) != 32 {
		return nil, fmt.Errorf("ENCRYPTION_KEY must be 64 hex chars (32 bytes)")
	}
	if c.StorageDriver == "s3" && (c.S3Bucket == "" || c.S3Region == "") {
		return nil, fmt.Errorf("S3_BUCKET and S3_REGION are required when STORAGE_DRIVER=s3")
	}
	return c, nil
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func envDur(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}

// loadDotEnv sets vars from a .env file without overriding real env.
func loadDotEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		k, v, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		k, v = strings.TrimSpace(k), strings.Trim(strings.TrimSpace(v), `"`)
		if os.Getenv(k) == "" {
			os.Setenv(k, v)
		}
	}
}
