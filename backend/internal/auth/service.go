package auth

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"carthedge/internal/config"
	"carthedge/internal/httpx"
	"carthedge/internal/notify"
	"carthedge/internal/otp"
	"carthedge/internal/secure"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrEmailTaken = errors.New("email already registered")
	ErrBadLogin   = errors.New("invalid email or password")
	ErrBadRefresh = errors.New("invalid refresh token")
	ErrBadReset   = errors.New("invalid or expired reset token")
	ErrTaken      = errors.New("already registered") // wrapped with the field name
	ErrUnverified = errors.New("verify your mobile number first")
	ErrTrialLimit = errors.New("too many trials started from this network today — contact sales")
)

// signupScope namespaces the seller signup OTP away from the per-store buyer
// OTPs, which are keyed by business code.
const signupScope = "signup"

// trialsPerIPPerDay bounds trial farming from one machine. Generous enough for
// a shared office or a café, tight enough that scripting it is pointless.
const trialsPerIPPerDay = 3

type Service struct {
	pool   *pgxpool.Pool
	rdb    *redis.Client
	cfg    *config.Config
	notify *notify.Notifier
	otp    *otp.Service
	log    *slog.Logger
}

func NewService(pool *pgxpool.Pool, rdb *redis.Client, cfg *config.Config, n *notify.Notifier, otpSvc *otp.Service, log *slog.Logger) *Service {
	return &Service{pool: pool, rdb: rdb, cfg: cfg, notify: n, otp: otpSvc, log: log}
}

type RegisterInput struct {
	BusinessName string `json:"businessName"`
	OwnerName    string `json:"ownerName"`
	Email        string `json:"email"`
	Phone        string `json:"phone"`
	Password     string `json:"password"`
	WhatsApp     string `json:"whatsapp"`
	Instagram    string `json:"instagram"`
	Address      string `json:"address"`
	City         string `json:"city"`
	State        string `json:"state"`
	Pincode      string `json:"pincode"`
	Gstin        string `json:"gstin"`
	UpiID        string `json:"upiId"`
	// StoreCode is the seller's chosen public URL segment (/s/<storeCode>).
	// Empty falls back to a slug of the business name — but only if that is free.
	StoreCode string `json:"storeCode"`
	// PhoneToken is issued by VerifySignupOtp and proves the mobile is reachable
	// by whoever is claiming the trial.
	PhoneToken string `json:"phoneToken"`
}

type Tokens struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

type Session struct {
	Tokens
	BusinessID   string `json:"businessId"`
	BusinessCode string `json:"businessCode"`
	BusinessName string `json:"businessName"`
	TrialEndsAt  string `json:"trialEndsAt,omitempty"`
}

// SendSignupOtp starts mobile verification for a new seller. Numbers already on
// a business are rejected here so the SMS is never spent and the seller is told
// to log in instead.
func (s *Service) SendSignupOtp(ctx context.Context, phone string) error {
	var exists bool
	if err := s.pool.QueryRow(ctx, `select exists(select 1 from businesses where phone = $1)`, phone).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("this mobile number %w — log in instead", ErrTaken)
	}
	return s.otp.Send(ctx, signupScope, phone, "")
}

// VerifySignupOtp exchanges the code for a token that Register consumes.
func (s *Service) VerifySignupOtp(ctx context.Context, phone, code string) (string, error) {
	return s.otp.Verify(ctx, signupScope, phone, code)
}

// Register onboards a business, generates its unique code and starts the trial.
// Identity is proven (verified mobile) and unique (email/phone/WhatsApp/Instagram)
// before a trial is issued — see 0012_identity_and_upi.sql.
func (s *Service) Register(ctx context.Context, in RegisterInput, clientIP string) (*Session, error) {
	// checked here, burned only once the business exists — a duplicate email
	// must not cost the seller their verification and force a second SMS
	if !s.otp.Valid(ctx, signupScope, in.Phone, in.PhoneToken) {
		return nil, ErrUnverified
	}
	if !s.trialSlotAvailable(ctx, clientIP) {
		return nil, ErrTrialLimit
	}
	// the seller's public URL — settled before anything is written, and never
	// silently altered to dodge a collision
	code, err := s.resolveStoreCode(ctx, in.StoreCode, in.BusinessName)
	if err != nil {
		return nil, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var bizID string
	err = tx.QueryRow(ctx, `insert into businesses
		(code, name, owner_name, email, email_normalized, phone, phone_verified_at, password_hash,
		 whatsapp, instagram, address, city, state, pincode, gstin, upi_id)
		values ($1,$2,$3,$4,$5,$6,now(),$7,$8,$9,$10,$11,$12,$13,$14,$15) returning id`,
		code, in.BusinessName, in.OwnerName, strings.ToLower(in.Email), httpx.NormalizeEmail(in.Email),
		in.Phone, string(hash), in.WhatsApp, in.Instagram, in.Address, in.City, in.State,
		in.Pincode, in.Gstin, in.UpiID).Scan(&bizID)
	if err != nil {
		// someone claimed the same code between the check and the insert
		if strings.Contains(err.Error(), "businesses_code_key") {
			return nil, ErrCodeTaken
		}
		if field, dup := httpx.DuplicateField(err); dup {
			if field == "email" {
				return nil, ErrEmailTaken
			}
			return nil, fmt.Errorf("this %s is %w to another business", field, ErrTaken)
		}
		return nil, err
	}

	trialEnds := time.Now().AddDate(0, 0, s.cfg.TrialDays)
	if _, err := tx.Exec(ctx, `insert into subscriptions (business_id, plan_id, status, ends_at)
		select $1, id, 'trial', $2 from plans where code = $3`,
		bizID, trialEnds, s.cfg.TrialPlanCode); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	s.otp.Consume(ctx, signupScope, in.Phone, in.PhoneToken)
	s.recordTrial(ctx, clientIP)

	s.notify.Async("welcome", func() error {
		return s.notify.Email(in.Email, "Welcome to CartHedge",
			fmt.Sprintf("Hi %s,\n\nYour store %s is live. Your %d-day free trial has started.\nBusiness code: %s\n\n— CartHedge", in.OwnerName, in.BusinessName, s.cfg.TrialDays, code))
	})

	tokens, err := s.issueTokens(ctx, bizID, code)
	if err != nil {
		return nil, err
	}
	return &Session{Tokens: *tokens, BusinessID: bizID, BusinessCode: code, BusinessName: in.BusinessName, TrialEndsAt: trialEnds.Format(time.RFC3339)}, nil
}

func (s *Service) Login(ctx context.Context, email, password string) (*Session, error) {
	var bizID, code, name, hash, status string
	err := s.pool.QueryRow(ctx, `select id, code, name, password_hash, status from businesses where email = $1`,
		strings.ToLower(email)).Scan(&bizID, &code, &name, &hash, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrBadLogin
	}
	if err != nil {
		return nil, err
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return nil, ErrBadLogin
	}
	if status != "active" {
		return nil, errors.New("account suspended, contact support")
	}
	tokens, err := s.issueTokens(ctx, bizID, code)
	if err != nil {
		return nil, err
	}
	return &Session{Tokens: *tokens, BusinessID: bizID, BusinessCode: code, BusinessName: name}, nil
}

// Refresh rotates the refresh token and issues a new access token.
func (s *Service) Refresh(ctx context.Context, refreshToken string) (*Tokens, error) {
	key := "auth:refresh:" + refreshToken
	val, err := s.rdb.Get(ctx, key).Result()
	if err != nil {
		return nil, ErrBadRefresh
	}
	s.rdb.Del(ctx, key)
	bizID, code, _ := strings.Cut(val, "|")
	return s.issueTokens(ctx, bizID, code)
}

func (s *Service) Logout(ctx context.Context, refreshToken string) {
	s.rdb.Del(ctx, "auth:refresh:"+refreshToken)
}

func (s *Service) ForgotPassword(ctx context.Context, email string) error {
	var ownerName string
	err := s.pool.QueryRow(ctx, `select owner_name from businesses where email = $1`, strings.ToLower(email)).Scan(&ownerName)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil // don't reveal whether the email exists
	}
	if err != nil {
		return err
	}
	token := secure.Hex(24)
	if err := s.rdb.Set(ctx, "auth:reset:"+token, strings.ToLower(email), 30*time.Minute).Err(); err != nil {
		return err
	}
	link := s.cfg.PublicBaseURL + "/reset-password?token=" + token
	s.notify.Async("passwordReset", func() error {
		return s.notify.Email(email, "Reset your CartHedge password",
			fmt.Sprintf("Hi %s,\n\nReset your password here (valid 30 minutes):\n%s\n\n— CartHedge", ownerName, link))
	})
	return nil
}

func (s *Service) ResetPassword(ctx context.Context, token, password string) error {
	email, err := s.rdb.Get(ctx, "auth:reset:"+token).Result()
	if err != nil {
		return ErrBadReset
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	ct, err := s.pool.Exec(ctx, `update businesses set password_hash = $1, updated_at = now() where email = $2`, string(hash), email)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrBadReset
	}
	s.rdb.Del(ctx, "auth:reset:"+token)
	return nil
}

func (s *Service) issueTokens(ctx context.Context, bizID, code string) (*Tokens, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub": bizID,
		"biz": code,
		"iat": now.Unix(),
		"exp": now.Add(s.cfg.AccessTTL).Unix(),
	}
	access, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return nil, err
	}
	refresh := secure.Hex(32)
	if err := s.rdb.Set(ctx, "auth:refresh:"+refresh, bizID+"|"+code, s.cfg.RefreshTTL).Err(); err != nil {
		return nil, err
	}
	return &Tokens{AccessToken: access, RefreshToken: refresh}, nil
}

// trialSlotAvailable / recordTrial cap how many free trials one network can open
// in a day. The unique-identity indexes stop the same person reusing a phone or
// handle; this stops them cycling through fresh ones from the same machine.
// Checked before the write and counted after it, so failed attempts (a duplicate
// email, say) never consume a real seller's allowance.
func (s *Service) trialSlotAvailable(ctx context.Context, clientIP string) bool {
	if clientIP == "" {
		return true
	}
	n, err := s.rdb.Get(ctx, trialIPKey(clientIP)).Int()
	if err != nil {
		return true // no key yet, or Redis blinked — never fail a real signup
	}
	return n < trialsPerIPPerDay
}

func (s *Service) recordTrial(ctx context.Context, clientIP string) {
	if clientIP == "" {
		return
	}
	key := trialIPKey(clientIP)
	if n, err := s.rdb.Incr(ctx, key).Result(); err == nil && n == 1 {
		s.rdb.Expire(ctx, key, 24*time.Hour)
	}
}

func trialIPKey(clientIP string) string { return "trial:ip:" + clientIP }
