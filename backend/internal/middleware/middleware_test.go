package middleware

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const secret = "test-secret"

func sign(t *testing.T, claims jwt.MapClaims) string {
	t.Helper()
	claims["iat"] = time.Now().Unix()
	claims["exp"] = time.Now().Add(time.Hour).Unix()
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}
	return token
}

func status(mw Middleware, token string) int {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	mw(next).ServeHTTP(rec, req)
	return rec.Code
}

// Admin and seller tokens must never cross surfaces.
func TestTokenRoleSeparation(t *testing.T) {
	seller := sign(t, jwt.MapClaims{"sub": "biz-1", "biz": "demo-store"})
	adminTok := sign(t, jwt.MapClaims{"sub": "admin-1", "role": "admin"})

	if got := status(Auth(secret, nil), seller); got != http.StatusOK {
		t.Errorf("seller token on seller API: got %d, want 200", got)
	}
	if got := status(Auth(secret, nil), adminTok); got != http.StatusUnauthorized {
		t.Errorf("admin token on seller API: got %d, want 401", got)
	}
	if got := status(AdminAuth(secret), adminTok); got != http.StatusOK {
		t.Errorf("admin token on admin API: got %d, want 200", got)
	}
	if got := status(AdminAuth(secret), seller); got != http.StatusUnauthorized {
		t.Errorf("seller token on admin API: got %d, want 401", got)
	}
	if got := status(Auth(secret, nil), "not-a-token"); got != http.StatusUnauthorized {
		t.Errorf("garbage token: got %d, want 401", got)
	}
	// the OAuth state is signed with the same secret and names the business,
	// but it travels through Meta's URLs — it must never work as a login
	state := sign(t, jwt.MapClaims{"sub": "biz-1", "channel": "instagram", "jti": "n1"})
	if got := status(Auth(secret, nil), state); got != http.StatusUnauthorized {
		t.Errorf("oauth state token on seller API: got %d, want 401", got)
	}
}

// Behind Render's Cloudflare edge the first X-Forwarded-For entry is whatever
// the client sent; only CF-Connecting-IP is set by the edge itself.
func TestClientIPIgnoresForgeableForwardedFor(t *testing.T) {
	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "10.0.0.7:5555"
	req.Header.Set("X-Forwarded-For", "1.2.3.4, 172.70.1.1")
	if got := ClientIP(req); got != "10.0.0.7" {
		t.Errorf("without CF header: got %q, want the socket address", got)
	}
	req.Header.Set("CF-Connecting-IP", "49.36.10.20")
	if got := ClientIP(req); got != "49.36.10.20" {
		t.Errorf("with CF header: got %q, want 49.36.10.20", got)
	}
}

// The SSE stream needs to flush through the logging wrapper.
func TestLoggingKeepsFlusher(t *testing.T) {
	var flushable bool
	h := Logging(slog.New(slog.NewTextHandler(io.Discard, nil)))(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, flushable = w.(http.Flusher)
		flushable = flushable && http.NewResponseController(w).Flush() == nil
	}))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", "/api/v1/events", nil))
	if !flushable {
		t.Error("handler behind Logging cannot flush — SSE breaks")
	}
}

// An admin's support session can look but not touch.
func TestSupportSessionIsReadOnly(t *testing.T) {
	tok := sign(t, jwt.MapClaims{"sub": "biz-1", "biz": "demo-store", "imp": "admin-1"})
	if got := status(Auth(secret, nil), tok); got != http.StatusOK {
		t.Fatalf("support GET = %d, want 200", got)
	}
	req := httptest.NewRequest("PUT", "/", nil)
	req.Header.Set("Authorization", "Bearer "+tok)
	rec := httptest.NewRecorder()
	Auth(secret, nil)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})).ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("support PUT = %d, want 403", rec.Code)
	}
}
