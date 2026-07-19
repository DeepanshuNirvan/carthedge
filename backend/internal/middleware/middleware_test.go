package middleware

import (
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

	if got := status(Auth(secret), seller); got != http.StatusOK {
		t.Errorf("seller token on seller API: got %d, want 200", got)
	}
	if got := status(Auth(secret), adminTok); got != http.StatusUnauthorized {
		t.Errorf("admin token on seller API: got %d, want 401", got)
	}
	if got := status(AdminAuth(secret), adminTok); got != http.StatusOK {
		t.Errorf("admin token on admin API: got %d, want 200", got)
	}
	if got := status(AdminAuth(secret), seller); got != http.StatusUnauthorized {
		t.Errorf("seller token on admin API: got %d, want 401", got)
	}
	if got := status(Auth(secret), "not-a-token"); got != http.StatusUnauthorized {
		t.Errorf("garbage token: got %d, want 401", got)
	}
}
