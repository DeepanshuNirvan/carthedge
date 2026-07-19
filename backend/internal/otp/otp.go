package otp

import (
	"context"
	"errors"
	"fmt"
	"time"

	"carthedge/internal/notify"
	"carthedge/internal/secure"

	"github.com/redis/go-redis/v9"
)

var (
	ErrInvalid  = errors.New("invalid or expired otp")
	ErrTooMany  = errors.New("too many otp requests, try later")
	ErrAttempts = errors.New("too many wrong attempts, request a new otp")
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
	sendKey := fmt.Sprintf("otpsend:%s:%s", bizCode, phone)
	sends, err := s.rdb.Incr(ctx, sendKey).Result()
	if err != nil {
		return err
	}
	if sends == 1 {
		s.rdb.Expire(ctx, sendKey, time.Hour)
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

	msg := fmt.Sprintf("Your order verification code is %s. Valid for 5 minutes.", code)
	s.notify.Async("otp", func() error {
		if err := s.notify.WhatsApp(phone, msg); err != nil && email != "" {
			return s.notify.Email(email, "Your verification code", msg)
		}
		return nil
	})
	return nil
}

// Verify checks the code and returns an order token valid for 15 minutes.
func (s *Service) Verify(ctx context.Context, bizCode, phone, code string) (string, error) {
	key := fmt.Sprintf("otp:%s:%s", bizCode, phone)
	tries, err := s.rdb.Incr(ctx, key+":tries").Result()
	if err != nil {
		return "", err
	}
	if tries == 1 {
		s.rdb.Expire(ctx, key+":tries", 5*time.Minute)
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
	tokenKey := fmt.Sprintf("ordertoken:%s:%s:%s", bizCode, phone, token)
	if err := s.rdb.Set(ctx, tokenKey, "1", 15*time.Minute).Err(); err != nil {
		return "", err
	}
	return token, nil
}

// Consume validates and burns an order token.
func (s *Service) Consume(ctx context.Context, bizCode, phone, token string) bool {
	tokenKey := fmt.Sprintf("ordertoken:%s:%s:%s", bizCode, phone, token)
	n, err := s.rdb.Del(ctx, tokenKey).Result()
	return err == nil && n == 1
}

// Peek checks a token without burning it (used for prefill lookups).
func (s *Service) Peek(ctx context.Context, bizCode, phone, token string) bool {
	tokenKey := fmt.Sprintf("ordertoken:%s:%s:%s", bizCode, phone, token)
	n, err := s.rdb.Exists(ctx, tokenKey).Result()
	return err == nil && n == 1
}
