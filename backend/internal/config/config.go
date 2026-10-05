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
	// S3Endpoint points the S3 driver at a compatible store such as Cloudflare
	// R2 (https://<account>.r2.cloudflarestorage.com); S3PublicURL is the
	// bucket's public base (r2.dev or a custom domain). Blank = AWS.
	S3Endpoint  string
	S3PublicURL string

	// FrontendDir serves the built SPA from the API origin so shared links get
	// server-rendered meta tags. Empty in dev, where Vite serves it.
	FrontendDir string

	AIProvider  string
	OpenAIKey   string
	OpenAIModel string
	OpenAIBase  string
	GeminiKey   string
	GeminiModel string
	// GeminiFallbackModel is tried when GeminiModel is overloaded or rate
	// limited, before failing over to OpenAI. Blank = none.
	GeminiFallbackModel string

	RazorpayKeyID         string
	RazorpayKeySecret     string
	RazorpayWebhookSecret string

	SMTPHost string
	SMTPPort string
	SMTPUser string
	SMTPPass string
	SMTPFrom string

	// CartHedge's own WhatsApp number on the Cloud API (one-time codes, order
	// updates, seller alerts). Blank = logged outside production.
	WhatsAppPhoneID string
	WhatsAppToken   string
	// WhatsAppSellers lets sellers connect their own WhatsApp (needs Tech
	// Provider review and a partner; docs/WHATSAPP-INSTAGRAM-GO-LIVE.md §4A).
	// Off = WhatsApp is assisted: sellers reply from their own app.
	WhatsAppSellers bool

	MetaAppID        string
	MetaAppSecret    string
	MetaVerifyToken  string
	MetaGraphVersion string
	// MetaGraphURL is where CartHedge's own WhatsApp messages are posted;
	// end-to-end tests point it at a fake Graph API
	MetaGraphURL      string
	MetaIgAppID       string
	MetaIgAppSecret   string
	MetaOAuthRedirect string

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
		S3Endpoint:    os.Getenv("S3_ENDPOINT"),
		S3PublicURL:   os.Getenv("S3_PUBLIC_URL"),
		FrontendDir:   os.Getenv("FRONTEND_DIR"),

		// "auto" (default) uses whichever keys are set, OpenAI first; naming one
		// promotes it to lead and leaves the other as failover
		AIProvider:          env("AI_PROVIDER", "auto"),
		OpenAIKey:           os.Getenv("OPENAI_API_KEY"),
		OpenAIModel:         env("OPENAI_MODEL", "gpt-4o-mini"),
		OpenAIBase:          strings.TrimSuffix(env("OPENAI_BASE_URL", "https://api.openai.com/v1"), "/"),
		GeminiKey:           os.Getenv("GEMINI_API_KEY"),
		GeminiModel:         env("GEMINI_MODEL", "gemini-3.6-flash"),
		GeminiFallbackModel: os.Getenv("GEMINI_FALLBACK_MODEL"),

		RazorpayKeyID:         os.Getenv("RAZORPAY_KEY_ID"),
		RazorpayKeySecret:     os.Getenv("RAZORPAY_KEY_SECRET"),
		RazorpayWebhookSecret: os.Getenv("RAZORPAY_WEBHOOK_SECRET"),

		SMTPHost: os.Getenv("SMTP_HOST"),
		SMTPPort: env("SMTP_PORT", "587"),
		SMTPUser: os.Getenv("SMTP_USER"),
		SMTPPass: os.Getenv("SMTP_PASS"),
		SMTPFrom: os.Getenv("SMTP_FROM"),

		WhatsAppPhoneID: os.Getenv("WHATSAPP_PHONE_NUMBER_ID"),
		WhatsAppToken:   os.Getenv("WHATSAPP_TOKEN"),
		WhatsAppSellers: envBool("WHATSAPP_SELLER_CHANNEL"),

		MetaAppID:        os.Getenv("META_APP_ID"),
		MetaAppSecret:    os.Getenv("META_APP_SECRET"),
		MetaVerifyToken:  os.Getenv("META_VERIFY_TOKEN"),
		MetaGraphVersion: env("META_GRAPH_VERSION", "v25.0"),
		MetaGraphURL:     strings.TrimRight(env("META_GRAPH_URL", "https://graph.facebook.com"), "/"),
		MetaIgAppID:      os.Getenv("META_IG_APP_ID"),
		MetaIgAppSecret:  os.Getenv("META_IG_APP_SECRET"),
		// must match the redirect registered on the Meta app
		MetaOAuthRedirect: env("META_OAUTH_REDIRECT_URL", ""),

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
	if (c.WhatsAppPhoneID == "") != (c.WhatsAppToken == "") {
		return nil, fmt.Errorf("WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_TOKEN go together")
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

// envBool is true for 1/true/on/yes, anything else is false.
func envBool(key string) bool {
	switch strings.ToLower(strings.TrimSpace(os.Getenv(key))) {
	case "1", "true", "on", "yes":
		return true
	}
	return false
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
