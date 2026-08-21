package plan

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"slices"
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
	Capabilities []string `json:"capabilities"`
	IsCustom     bool     `json:"isCustom"`
}

type Subscription struct {
	PlanCode     string   `json:"planCode"`
	PlanName     string   `json:"planName"`
	Status       string   `json:"status"`
	PriceMonthly int      `json:"priceMonthly"`
	OrderQuota   int      `json:"orderQuota"`
	PerOrderFee  int      `json:"perOrderFee"`
	StartsAt     string   `json:"startsAt"`
	EndsAt       string   `json:"endsAt"`
	Capabilities []string `json:"capabilities"` // what the UI may show unlocked
	OrdersUsed   int      `json:"ordersUsed"`
}

func (s *Service) List(ctx context.Context) ([]Plan, error) {
	rows, err := s.pool.Query(ctx, `select id, code, name, price_monthly, order_quota, per_order_fee,
		features, capabilities, is_custom
		from plans where active and not is_custom order by price_monthly`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var plans []Plan
	for rows.Next() {
		var p Plan
		var features, caps []byte
		if err := rows.Scan(&p.ID, &p.Code, &p.Name, &p.PriceMonthly, &p.OrderQuota, &p.PerOrderFee,
			&features, &caps, &p.IsCustom); err != nil {
			return nil, err
		}
		json.Unmarshal(features, &p.Features)
		json.Unmarshal(caps, &p.Capabilities)
		plans = append(plans, p)
	}
	return plans, rows.Err()
}

func (s *Service) Current(ctx context.Context, bizID string) (*Subscription, error) {
	var sub Subscription
	var startsAt, endsAt time.Time
	var customPrice *int
	var caps []byte
	err := s.pool.QueryRow(ctx, `select p.code, p.name, s.status, p.price_monthly, s.custom_price, p.order_quota, p.per_order_fee, s.starts_at, s.ends_at,
		p.capabilities,
		(select count(*) from orders o where o.business_id = s.business_id
			and o.created_at >= s.starts_at and o.status <> 'cancelled')
		from subscriptions s join plans p on p.id = s.plan_id where s.business_id = $1`, bizID).Scan(
		&sub.PlanCode, &sub.PlanName, &sub.Status, &sub.PriceMonthly, &customPrice, &sub.OrderQuota, &sub.PerOrderFee, &startsAt, &endsAt,
		&caps, &sub.OrdersUsed)
	if err != nil {
		return nil, err
	}
	json.Unmarshal(caps, &sub.Capabilities)
	if sub.Capabilities == nil {
		sub.Capabilities = []string{}
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

// Checkout creates a platform Razorpay order for one month of the given plan
// plus any per-order fees the seller ran up above their current quota.
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
	overage, overageOrders, err := s.Overage(ctx, bizID)
	if err != nil {
		return nil, err
	}
	total := price + overage

	rzpOrderID, err := s.platform.CreateOrder(ctx, total, "sub-"+bizID[:8], map[string]string{
		"businessId": bizID, "planCode": planCode, "kind": "subscription",
	})
	if err != nil {
		return nil, err
	}
	notes, _ := json.Marshal(map[string]string{"businessId": bizID, "planCode": planCode})
	if _, err := s.pool.Exec(ctx, `insert into payments (business_id, kind, razorpay_order_id, amount, notes)
		values ($1, 'subscription', $2, $3, $4::jsonb)`, bizID, rzpOrderID, total, string(notes)); err != nil {
		return nil, err
	}
	// same shape the buyer checkout returns, so one Razorpay hook drives both
	return httpx.M{"mode": "gateway", "razorpayOrderId": rzpOrderID, "razorpayKeyId": s.platform.KeyID(),
		"amount": total, "planAmount": price, "overageAmount": overage, "overageOrders": overageOrders,
		"currency": "INR", "planCode": planCode, "businessName": "CartHedge", "orderCode": "Subscription",
		"kind": "subscription"}, nil
}

// Overage prices the orders taken above the plan quota in the current period.
// Billed at renewal, so seller cost scales with seller success.
func (s *Service) Overage(ctx context.Context, bizID string) (fee, orders int, err error) {
	var quota, perOrderFee, used int
	err = s.pool.QueryRow(ctx, `select p.order_quota, p.per_order_fee,
		(select count(*) from orders o where o.business_id = s.business_id
			and o.created_at >= s.starts_at and o.status <> 'cancelled')
		from subscriptions s join plans p on p.id = s.plan_id where s.business_id = $1`,
		bizID).Scan(&quota, &perOrderFee, &used)
	if err != nil {
		return 0, 0, err
	}
	orders = max(used-quota, 0)
	return orders * perOrderFee, orders, nil
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

// CustomRequest records a custom-plan enquiry for the admin panel and
// notifies the platform team by email when configured.
func (s *Service) CustomRequest(ctx context.Context, bizID, message string, expectedOrders int) error {
	var name, email string
	if err := s.pool.QueryRow(ctx, `select name, email from businesses where id=$1`, bizID).Scan(&name, &email); err != nil {
		return err
	}
	if _, err := s.pool.Exec(ctx, `insert into plan_requests (business_id, message, expected_orders)
		values ($1, $2, $3)`, bizID, message, expectedOrders); err != nil {
		return err
	}
	if to := s.cfg.AdminEmail; to != "" {
		s.notify.Async("customPlan", func() error {
			return s.notify.Email(to, "Custom plan request: "+name,
				fmt.Sprintf("Business: %s (%s)\nExpected orders/month: %d\n\n%s", name, email, expectedOrders, message))
		})
	}
	return nil
}

// Access is what every seller request needs to know about the plan: whether it
// still runs, and which paid features it may reach.
type Access struct {
	Active       bool     `json:"active"`
	Capabilities []string `json:"capabilities"`
}

// access loads the subscription gate and plan entitlements in one round trip;
// cached 2 minutes and dropped wherever the subscription changes.
// It returns an error rather than a zero Access when the lookup itself fails.
// Collapsing "the database did not answer" into Active:false told a paying
// seller their subscription had expired during a brief outage, and told their
// buyers the shop was closed — a billing accusation caused by our own downtime.
// Callers decide: the gate answers 503, the boolean helpers stay conservative.
func (s *Service) access(ctx context.Context, bizID string) (Access, error) {
	key := "sub:" + bizID
	var a Access
	if raw, err := s.rdb.Get(ctx, key).Bytes(); err == nil && json.Unmarshal(raw, &a) == nil {
		return a, nil
	}
	var caps []byte
	err := s.pool.QueryRow(ctx, `select
		b.status = 'active' and s.status in ('trial','active','cancelled') and s.ends_at > now(),
		p.capabilities
		from subscriptions s join businesses b on b.id = s.business_id
		join plans p on p.id = s.plan_id where s.business_id = $1`, bizID).Scan(&a.Active, &caps)
	if errors.Is(err, pgx.ErrNoRows) {
		// genuinely no subscription row — that IS inactive, not a fault
		return Access{}, nil
	}
	if err != nil {
		return Access{}, err
	}
	json.Unmarshal(caps, &a.Capabilities)
	if raw, err := json.Marshal(a); err == nil {
		s.rdb.Set(ctx, key, raw, 2*time.Minute)
	}
	return a, nil
}

// IsActive reports whether the business can take orders. A lookup failure is
// reported as not-active because these callers have no way to say "unknown" —
// but it is logged, so an outage shows up as our fault and not as a wave of
// mysteriously paused storefronts.
func (s *Service) IsActive(ctx context.Context, bizID string) bool {
	a, err := s.access(ctx, bizID)
	if err != nil {
		slog.Error("subscription lookup failed; treating store as paused", "businessId", bizID, "err", err)
		return false
	}
	return a.Active
}

// HasFeature reports whether the plan includes a capability; used on buyer
// routes, which carry no seller context to read it from.
func (s *Service) HasFeature(ctx context.Context, bizID, feature string) bool {
	a, err := s.access(ctx, bizID)
	if err != nil {
		slog.Error("capability lookup failed", "businessId", bizID, "feature", feature, "err", err)
		return false
	}
	return a.Active && slices.Contains(a.Capabilities, feature)
}

func (s *Service) invalidate(ctx context.Context, bizID string) {
	s.rdb.Del(ctx, "sub:"+bizID)
}

// RequireActive blocks seller APIs once the trial/subscription lapses, and
// carries the plan's capabilities forward for the per-feature gates.
func (s *Service) RequireActive(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		bizID := middleware.BusinessID(ctx)
		a, err := s.access(ctx, bizID)
		if err != nil {
			// Our fault, not a billing problem. Saying "subscription expired"
			// here accuses a paying seller of not paying and sends them to the
			// billing page during what is actually our outage.
			slog.Error("subscription gate lookup failed", "businessId", bizID, "err", err)
			httpx.JSON(w, http.StatusServiceUnavailable, httpx.M{
				"error": "we could not check your plan just now, try again in a moment",
				"code":  "planCheckUnavailable",
			})
			return
		}
		if !a.Active {
			httpx.JSON(w, http.StatusPaymentRequired, httpx.M{"error": "subscription expired", "code": "subscriptionExpired"})
			return
		}
		next.ServeHTTP(w, r.WithContext(middleware.WithFeatures(ctx, a.Capabilities)))
	})
}
