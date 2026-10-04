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

	"carthedge/internal/cache"
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
	impersonatorKey
)

// RevokedKey holds the moment (unix ms) a seller's sessions were ended — a
// password change or "log out other devices". Tokens issued before it stop
// working: refresh tokens in auth, access tokens here.
func RevokedKey(bizID string) string { return "auth:revoked:" + bizID }

// Impersonator is the admin behind a read-only support session, if any.
func Impersonator(ctx context.Context) string {
	v, _ := ctx.Value(impersonatorKey).(string)
	return v
}

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
// rdb may be nil (tests): revocation is then not checked.
func Auth(secret string, rdb *redis.Client) Middleware {
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
			// access tokens always carry the store code; the OAuth state shares
			// the secret and the sub claim, and must not pass for a login
			if bizID == "" || bizCode == "" || role != "" {
				httpx.Err(w, http.StatusUnauthorized, "invalid token claims")
				return
			}
			// iat is whole seconds: a token from the same second as the
			// revocation is let through, so the fresh one issued with it works
			if iat, ok := claims["iat"].(float64); ok && rdb != nil {
				if revoked, err := rdb.Get(r.Context(), RevokedKey(bizID)).Int64(); err == nil && int64(iat)*1000+999 < revoked {
					httpx.Err(w, http.StatusUnauthorized, "this session was signed out — log in again")
					return
				}
			}
			ctx := context.WithValue(r.Context(), bizIDKey, bizID)
			ctx = context.WithValue(ctx, bizCodeKey, bizCode)
			// a support session opened by an admin reads, never writes
			if admin, _ := claims["imp"].(string); admin != "" {
				if r.Method != http.MethodGet && r.Method != http.MethodHead {
					httpx.JSON(w, http.StatusForbidden, httpx.M{"error": "support view is read-only", "code": "readOnly"})
					return
				}
				ctx = context.WithValue(ctx, impersonatorKey, admin)
			}
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
		"script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://cdn.razorpay.com",
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: blob: https:",
		"font-src 'self' data:",
		"connect-src 'self' https://*.razorpay.com",
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
			n, err := cache.Count(r.Context(), rdb, k, window)
			if err == nil {
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

// ClientIP keys rate limits. Render serves through Cloudflare, which overwrites
// CF-Connecting-IP with the address it saw; X-Forwarded-For keeps whatever the
// client sent in front of the proxies' entries, so it is never trusted here.
func ClientIP(r *http.Request) string {
	if ip := strings.TrimSpace(r.Header.Get("CF-Connecting-IP")); ip != "" {
		return ip
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

// Flush and Unwrap keep the SSE stream working through this wrapper:
// http.Flusher and http.ResponseController both look for them.
func (r *statusRecorder) Flush() {
	if f, ok := r.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

func (r *statusRecorder) Unwrap() http.ResponseWriter { return r.ResponseWriter }
