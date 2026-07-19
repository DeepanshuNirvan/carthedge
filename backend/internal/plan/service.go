package plan

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"carthedge/internal/config"
	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
	"carthedge/internal/notify"
	"carthedge/internal/payment"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Service struct {
	pool     *pgxpool.Pool
	rdb      *redis.Client
	cfg      *config.Config
	platform *payment.Client // platform Razorpay account, bills the sellers
	notify   *notify.Notifier
	log      *slog.Logger
}

func NewService(pool *pgxpool.Pool, rdb *redis.Client, cfg *config.Config, platform *payment.Client, n *notify.Notifier, log *slog.Logger) *Service {
	return &Service{pool: pool, rdb: rdb, cfg: cfg, platform: platform, notify: n, log: log}
}

type Plan struct {
	ID           string   `json:"id"`
	Code         string   `json:"code"`
	Name         string   `json:"name"`
	PriceMonthly int      `json:"priceMonthly"`
	OrderQuota   int      `json:"orderQuota"`
	PerOrderFee  int      `json:"perOrderFee"`
	Features     []string `json:"features"`
	IsCustom     bool     `json:"isCustom"`
}

type Subscription struct {
	PlanCode     string `json:"planCode"`
	PlanName     string `json:"planName"`
	Status       string `json:"status"`
	PriceMonthly int    `json:"priceMonthly"`
	OrderQuota   int    `json:"orderQuota"`
	PerOrderFee  int    `json:"perOrderFee"`
	StartsAt     string `json:"startsAt"`
	EndsAt       string `json:"endsAt"`
}

func (s *Service) List(ctx context.Context) ([]Plan, error) {
	rows, err := s.pool.Query(ctx, `select id, code, name, price_monthly, order_quota, per_order_fee, features, is_custom
		from plans where active and not is_custom order by price_monthly`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var plans []Plan
	for rows.Next() {
		var p Plan
		var features []byte
		if err := rows.Scan(&p.ID, &p.Code, &p.Name, &p.PriceMonthly, &p.OrderQuota, &p.PerOrderFee, &features, &p.IsCustom); err != nil {
			return nil, err
		}
		json.Unmarshal(features, &p.Features)
		plans = append(plans, p)
	}
	return plans, rows.Err()
}

func (s *Service) Current(ctx context.Context, bizID string) (*Subscription, error) {
	var sub Subscription
	var startsAt, endsAt time.Time
	var customPrice *int
	err := s.pool.QueryRow(ctx, `select p.code, p.name, s.status, p.price_monthly, s.custom_price, p.order_quota, p.per_order_fee, s.starts_at, s.ends_at
		from subscriptions s join plans p on p.id = s.plan_id where s.business_id = $1`, bizID).Scan(
		&sub.PlanCode, &sub.PlanName, &sub.Status, &sub.PriceMonthly, &customPrice, &sub.OrderQuota, &sub.PerOrderFee, &startsAt, &endsAt)
	if err != nil {
		return nil, err
	}
	if customPrice != nil {
		sub.PriceMonthly = *customPrice
	}
	if sub.Status != "expired" && endsAt.Before(time.Now()) {
		sub.Status = "expired"
	}
	sub.StartsAt = startsAt.Format(time.RFC3339)
	sub.EndsAt = endsAt.Format(time.RFC3339)
	return &sub, nil
}

// Checkout creates a platform Razorpay order for one month of the given plan.
func (s *Service) Checkout(ctx context.Context, bizID, planCode string) (httpx.M, error) {
	var planID string
	var price int
	var isCustom bool
	err := s.pool.QueryRow(ctx, `select id, price_monthly, is_custom from plans where code = $1 and active`, planCode).Scan(&planID, &price, &isCustom)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("plan not found")
	}
	if err != nil {
		return nil, err
	}
	// custom plans may carry a negotiated price on the subscription
	if isCustom {
		var customPrice *int
		s.pool.QueryRow(ctx, `select custom_price from subscriptions where business_id = $1`, bizID).Scan(&customPrice)
		if customPrice != nil {
			price = *customPrice
		}
	}
	rzpOrderID, err := s.platform.CreateOrder(ctx, price, "sub-"+bizID[:8], map[string]string{
		"businessId": bizID, "planCode": planCode, "kind": "subscription",
	})
	if err != nil {
		return nil, err
	}
	notes, _ := json.Marshal(map[string]string{"businessId": bizID, "planCode": planCode})
	if _, err := s.pool.Exec(ctx, `insert into payments (business_id, kind, razorpay_order_id, amount, notes)
		values ($1, 'subscription', $2, $3, $4::jsonb)`, bizID, rzpOrderID, price, string(notes)); err != nil {
		return nil, err
	}
	return httpx.M{"razorpayOrderId": rzpOrderID, "razorpayKeyId": s.platform.KeyID(), "amount": price, "currency": "INR", "planCode": planCode}, nil
}

// VerifyCheckout confirms the Razorpay payment and activates/extends the plan.
func (s *Service) VerifyCheckout(ctx context.Context, bizID, rzpOrderID, rzpPaymentID, signature string) error {
	if !payment.VerifySignature(rzpOrderID, rzpPaymentID, signature, s.cfg.RazorpayKeySecret) {
		return errors.New("payment signature verification failed")
	}
	var planCode string
	err := s.pool.QueryRow(ctx, `select notes->>'planCode' from payments
		where razorpay_order_id = $1 and business_id = $2 and kind = 'subscription'`, rzpOrderID, bizID).Scan(&planCode)
	if err != nil {
		return errors.New("payment record not found")
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `update payments set status='paid', razorpay_payment_id=$2, updated_at=now()
		where razorpay_order_id=$1`, rzpOrderID, rzpPaymentID); err != nil {
		return err
	}
	if err := ActivateSubscription(ctx, tx, bizID, planCode); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	s.invalidate(ctx, bizID)
	return nil
}

// ActivateSubscription switches the plan and extends the period by 30 days
// from now or from the current expiry, whichever is later.
func ActivateSubscription(ctx context.Context, tx pgx.Tx, bizID, planCode string) error {
	ct, err := tx.Exec(ctx, `update subscriptions set
		plan_id = (select id from plans where code = $2),
		status = 'active',
		ends_at = greatest(ends_at, now()) + interval '30 days',
		updated_at = now()
		where business_id = $1`, bizID, planCode)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("subscription not found")
	}
	return nil
}

func (s *Service) Cancel(ctx context.Context, bizID string) error {
	_, err := s.pool.Exec(ctx, `update subscriptions set status='cancelled', updated_at=now() where business_id=$1`, bizID)
	s.invalidate(ctx, bizID)
	return err
}

// CustomRequest emails the platform team a custom-plan enquiry.
func (s *Service) CustomRequest(ctx context.Context, bizID, message string, expectedOrders int) error {
	var name, email string
	if err := s.pool.QueryRow(ctx, `select name, email from businesses where id=$1`, bizID).Scan(&name, &email); err != nil {
		return err
	}
	to := s.cfg.AdminEmail
	if to == "" {
		s.log.Info("custom plan request", "business", name, "email", email, "expectedOrders", expectedOrders, "message", message)
		return nil
	}
	s.notify.Async("customPlan", func() error {
		return s.notify.Email(to, "Custom plan request: "+name,
			fmt.Sprintf("Business: %s (%s)\nExpected orders/month: %d\n\n%s", name, email, expectedOrders, message))
	})
	return nil
}

// IsActive reports whether the business can take orders; cached 2 minutes.
func (s *Service) IsActive(ctx context.Context, bizID string) bool {
	key := "sub:" + bizID
	if v, err := s.rdb.Get(ctx, key).Result(); err == nil {
		return v == "1"
	}
	var active bool
	err := s.pool.QueryRow(ctx, `select exists(select 1 from subscriptions
		where business_id = $1 and status in ('trial','active','cancelled') and ends_at > now())`, bizID).Scan(&active)
	if err != nil {
		return false
	}
	v := "0"
	if active {
		v = "1"
	}
	s.rdb.Set(ctx, key, v, 2*time.Minute)
	return active
}

func (s *Service) invalidate(ctx context.Context, bizID string) {
	s.rdb.Del(ctx, "sub:"+bizID)
}

// RequireActive blocks seller APIs once the trial/subscription lapses.
func (s *Service) RequireActive(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !s.IsActive(r.Context(), middleware.BusinessID(r.Context())) {
			httpx.JSON(w, http.StatusPaymentRequired, httpx.M{"error": "subscription expired", "code": "subscriptionExpired"})
			return
		}
		next.ServeHTTP(w, r)
	})
}
