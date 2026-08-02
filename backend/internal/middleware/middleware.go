package middleware

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"slices"
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
	featuresKey
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

// WithFeatures carries the plan's capabilities from the subscription gate to
// the per-feature checks, so no handler repeats the lookup.
func WithFeatures(ctx context.Context, features []string) context.Context {
	return context.WithValue(ctx, featuresKey, features)
}

func HasFeature(ctx context.Context, feature string) bool {
	v, _ := ctx.Value(featuresKey).([]string)
	return slices.Contains(v, feature)
}

// RequireFeature gates a paid feature to the plans that include it.
func RequireFeature(feature string) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !HasFeature(r.Context(), feature) {
				httpx.JSON(w, http.StatusForbidden, httpx.M{
					"error": "your plan does not include this feature", "code": "featureNotInPlan", "feature": feature,
				})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
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
		// EventSource cannot set headers, so the SSE stream passes it as a query param
		if raw = r.URL.Query().Get("accessToken"); raw == "" {
			return nil, errors.New("missing bearer token")
		}
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

// SecurityHeaders sets the baseline browser protections a pen test looks for.
// The CSP is deliberately explicit rather than permissive: the SPA is served
// from this same origin, Razorpay's checkout is the only third-party script,
// and buyer images can come from the seller's own storage.
func SecurityHeaders(production bool) Middleware {
	csp := strings.Join([]string{
		"default-src 'self'",
		// Razorpay's checkout injects its own inline bootstrap
		"script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: blob: https:",
		"font-src 'self' data:",
		"connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com",
		"frame-src https://api.razorpay.com https://checkout.razorpay.com",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"object-src 'none'",
	}, "; ")
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := w.Header()
			h.Set("X-Content-Type-Options", "nosniff")
			h.Set("X-Frame-Options", "DENY")
			h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
			h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()")
			h.Set("Cross-Origin-Opener-Policy", "same-origin")
			h.Set("Content-Security-Policy", csp)
			if production {
				h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
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

// BusinessKey rate-limits per seller instead of per IP; used on the paid-per-call
// AI routes, where one seller must not be able to burn the whole budget.
func BusinessKey(r *http.Request) string { return BusinessID(r.Context()) }

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
