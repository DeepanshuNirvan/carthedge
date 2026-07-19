package middleware

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	"carthedge/internal/httpx"

	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
)

type ctxKey int

const (
	bizIDKey ctxKey = iota
	bizCodeKey
	adminIDKey
)

func BusinessID(ctx context.Context) string {
	v, _ := ctx.Value(bizIDKey).(string)
	return v
}

func BusinessCode(ctx context.Context) string {
	v, _ := ctx.Value(bizCodeKey).(string)
	return v
}

func AdminID(ctx context.Context) string {
	v, _ := ctx.Value(adminIDKey).(string)
	return v
}

type Middleware func(http.Handler) http.Handler

func Chain(h http.Handler, mws ...Middleware) http.Handler {
	for i := len(mws) - 1; i >= 0; i-- {
		h = mws[i](h)
	}
	return h
}

func parseToken(r *http.Request, secret string) (jwt.MapClaims, error) {
	raw, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	if !ok {
		return nil, errors.New("missing bearer token")
	}
	claims := jwt.MapClaims{}
	_, err := jwt.ParseWithClaims(raw, claims, func(*jwt.Token) (any, error) {
		return []byte(secret), nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil {
		return nil, errors.New("invalid or expired token")
	}
	return claims, nil
}

// Auth validates a seller Bearer JWT and puts business id/code on the context.
func Auth(secret string) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, err := parseToken(r, secret)
			if err != nil {
				httpx.Err(w, http.StatusUnauthorized, err.Error())
				return
			}
			bizID, _ := claims["sub"].(string)
			bizCode, _ := claims["biz"].(string)
			role, _ := claims["role"].(string)
			if bizID == "" || role != "" {
				httpx.Err(w, http.StatusUnauthorized, "invalid token claims")
				return
			}
			ctx := context.WithValue(r.Context(), bizIDKey, bizID)
			ctx = context.WithValue(ctx, bizCodeKey, bizCode)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// AdminAuth validates a platform-admin Bearer JWT (role=admin claim).
func AdminAuth(secret string) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, err := parseToken(r, secret)
			if err != nil {
				httpx.Err(w, http.StatusUnauthorized, err.Error())
				return
			}
			adminID, _ := claims["sub"].(string)
			role, _ := claims["role"].(string)
			if adminID == "" || role != "admin" {
				httpx.Err(w, http.StatusUnauthorized, "admin access required")
				return
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), adminIDKey, adminID)))
		})
	}
}

func Logging(log *slog.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rec, r)
			log.Info("http", "method", r.Method, "path", r.URL.Path, "status", rec.status, "durMs", time.Since(start).Milliseconds())
		})
	}
}

func Recover(log *slog.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					log.Error("panic", "err", rec, "path", r.URL.Path)
					httpx.Err(w, http.StatusInternalServerError, "internal error")
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

func CORS(origins []string) Middleware {
	allowAll := len(origins) == 1 && origins[0] == "*"
	allowed := map[string]bool{}
	for _, o := range origins {
		allowed[strings.TrimSpace(o)] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" && (allowAll || allowed[origin]) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RateLimit is a fixed-window Redis counter keyed per client.
func RateLimit(rdb *redis.Client, name string, limit int, window time.Duration, key func(*http.Request) string) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			k := "rl:" + name + ":" + key(r)
			n, err := rdb.Incr(r.Context(), k).Result()
			if err == nil {
				if n == 1 {
					rdb.Expire(r.Context(), k, window)
				}
				if n > int64(limit) {
					httpx.Err(w, http.StatusTooManyRequests, "too many requests, try again later")
					return
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

func ClientIP(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		return strings.TrimSpace(strings.Split(fwd, ",")[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}
