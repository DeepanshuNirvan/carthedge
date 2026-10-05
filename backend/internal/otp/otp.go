package otp

import (
	"context"
	"errors"
	"fmt"
	"time"

	"carthedge/internal/cache"
	"carthedge/internal/notify"
	"carthedge/internal/secure"

	"github.com/redis/go-redis/v9"
)

var (
	ErrInvalid  = errors.New("invalid or expired otp")
	ErrTooMany  = errors.New("too many otp requests, try later")
	ErrAttempts = errors.New("too many wrong attempts, request a new otp")
	// ErrUnavailable: no way to deliver a code (WhatsApp not set up, no email)
	ErrUnavailable = errors.New("verification codes cannot be sent right now, please try again later")
)

// Service verifies buyer phone numbers before order placement. A verified
// phone yields a short-lived order token consumed at order creation.
type Service struct {
	rdb    *redis.Client
	notify *notify.Notifier
}

func New(rdb *redis.Client, n *notify.Notifier) *Service {
	return &Service{rdb: rdb, notify: n}
}

func (s *Service) Send(ctx context.Context, bizCode, phone, email string) error {
	// say so now rather than send the buyer to wait for a code that cannot come
	if !s.notify.WhatsAppOn() && email == "" {
		return ErrUnavailable
	}
	sendKey := fmt.Sprintf("otpsend:%s:%s", bizCode, phone)
	sends, err := cache.Count(ctx, s.rdb, sendKey, time.Hour)
	if err != nil {
		return err
	}
	if sends > 5 {
		return ErrTooMany
	}

	code := secure.Digits(6)
	key := fmt.Sprintf("otp:%s:%s", bizCode, phone)
	if err := s.rdb.Set(ctx, key, code, 5*time.Minute).Err(); err != nil {
		return err
	}
	s.rdb.Del(ctx, key+":tries")

	msg := notify.Code(code)
	s.notify.Async("otp", func() error {
		err := s.notify.WhatsApp(phone, msg)
		if err != nil && email != "" {
			return s.notify.Email(email, "Your verification code", msg.Text)
		}
		return err
	})
	return nil
}

// Verify checks the code and returns an order token valid for 15 minutes.
func (s *Service) Verify(ctx context.Context, bizCode, phone, code string) (string, error) {
	key := fmt.Sprintf("otp:%s:%s", bizCode, phone)
	tries, err := cache.Count(ctx, s.rdb, key+":tries", 5*time.Minute)
	if err != nil {
		return "", err
	}
	if tries > 5 {
		return "", ErrAttempts
	}
	stored, err := s.rdb.Get(ctx, key).Result()
	if err != nil || stored != code {
		return "", ErrInvalid
	}
	s.rdb.Del(ctx, key, key+":tries")

	token := secure.Hex(24)
	if err := s.rdb.Set(ctx, tokenKey(bizCode, phone, token), "1", 15*time.Minute).Err(); err != nil {
		return "", err
	}
	return token, nil
}

// Valid reports whether a token is still live without burning it — for callers
// that must check up front but can only commit at the end.
func (s *Service) Valid(ctx context.Context, bizCode, phone, token string) bool {
	if token == "" {
		return false
	}
	n, err := s.rdb.Exists(ctx, tokenKey(bizCode, phone, token)).Result()
	return err == nil && n == 1
}

// Restore hands back a token whose order was refused (a typo'd offer code,
// stock, a paused store): fixing the cart must not cost the buyer a new OTP.
func (s *Service) Restore(ctx context.Context, bizCode, phone, token string) {
	s.rdb.Set(ctx, tokenKey(bizCode, phone, token), "1", 15*time.Minute)
}

// Consume validates and burns an order token.
func (s *Service) Consume(ctx context.Context, bizCode, phone, token string) bool {
	n, err := s.rdb.Del(ctx, tokenKey(bizCode, phone, token)).Result()
	return err == nil && n == 1
}

func tokenKey(bizCode, phone, token string) string {
	return fmt.Sprintf("ordertoken:%s:%s:%s", bizCode, phone, token)
}
