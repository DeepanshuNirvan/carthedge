package payment

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"

	"carthedge/internal/config"
	"carthedge/internal/httpx"
	"carthedge/internal/order"
	"carthedge/internal/secure"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// Service moves buyer money straight to the seller's own Razorpay account.
// Platform (subscription) payments use the platform keys from env.
type Service struct {
	pool   *pgxpool.Pool
	rdb    *redis.Client
	orders *order.Service
	cipher *secure.Cipher
	cfg    *config.Config
	log    *slog.Logger
}

func NewService(pool *pgxpool.Pool, rdb *redis.Client, orders *order.Service, cipher *secure.Cipher, cfg *config.Config, log *slog.Logger) *Service {
	return &Service{pool: pool, rdb: rdb, orders: orders, cipher: cipher, cfg: cfg, log: log}
}

type CheckoutInfo struct {
	RazorpayOrderID string `json:"razorpayOrderId"`
	RazorpayKeyID   string `json:"razorpayKeyId"`
	Amount          int    `json:"amount"`
	Currency        string `json:"currency"`
	OrderCode       string `json:"orderCode"`
	BusinessName    string `json:"businessName"`
	Kind            string `json:"kind"`
}

// BuyerCheckout creates a Razorpay order on the seller's account for either
// the full amount or the COD token.
func (s *Service) BuyerCheckout(ctx context.Context, orderCode, kind string) (*CheckoutInfo, error) {
	if kind != "order" && kind != "token" {
		return nil, errors.New("kind must be order or token")
	}
	var orderID, bizID, bizName, keyID, secretEnc, paymentMethod, paymentStatus string
	var total, tokenAmount int
	err := s.pool.QueryRow(ctx, `select o.id, o.business_id, b.name, b.razorpay_key_id, b.razorpay_key_secret,
		o.payment_method, o.payment_status, o.total, o.token_amount
		from orders o join businesses b on b.id = o.business_id where o.order_code = $1`, orderCode).Scan(
		&orderID, &bizID, &bizName, &keyID, &secretEnc, &paymentMethod, &paymentStatus, &total, &tokenAmount)
	if err != nil {
		return nil, errors.New("order not found")
	}
	if paymentStatus == "paid" || paymentStatus == "token_paid" {
		return nil, errors.New("order is already paid")
	}
	amount := total
	if kind == "token" {
		if paymentMethod != "cod" || tokenAmount <= 0 {
			return nil, errors.New("token payment is not applicable to this order")
		}
		amount = tokenAmount
	}
	secret, err := s.cipher.Decrypt(secretEnc)
	if err != nil || keyID == "" || secret == "" {
		return nil, errors.New("seller has not enabled online payments")
	}
	client := NewClient(keyID, secret)
	rzpOrderID, err := client.CreateOrder(ctx, amount, orderCode, map[string]string{"orderCode": orderCode, "kind": kind})
	if err != nil {
		s.log.Error("razorpay create failed", "orderCode", orderCode, "err", err)
		return nil, errors.New("could not start payment, try again")
	}
	notes, _ := json.Marshal(map[string]string{"orderCode": orderCode})
	if _, err := s.pool.Exec(ctx, `insert into payments (business_id, order_id, kind, razorpay_order_id, amount, notes)
		values ($1,$2,$3,$4,$5,$6::jsonb)`, bizID, orderID, kind, rzpOrderID, amount, string(notes)); err != nil {
		return nil, err
	}
	return &CheckoutInfo{RazorpayOrderID: rzpOrderID, RazorpayKeyID: keyID, Amount: amount, Currency: "INR",
		OrderCode: orderCode, BusinessName: bizName, Kind: kind}, nil
}

// VerifyBuyer validates the checkout signature against the seller's secret
// and marks the order paid.
func (s *Service) VerifyBuyer(ctx context.Context, rzpOrderID, rzpPaymentID, signature string) error {
	var paymentID, orderID, kind, status, secretEnc string
	err := s.pool.QueryRow(ctx, `select p.id, p.order_id, p.kind, p.status, b.razorpay_key_secret
		from payments p join businesses b on b.id = p.business_id
		where p.razorpay_order_id = $1 and p.kind in ('order','token')`, rzpOrderID).Scan(
		&paymentID, &orderID, &kind, &status, &secretEnc)
	if err != nil {
		return errors.New("payment not found")
	}
	if status == "paid" {
		return nil
	}
	secret, err := s.cipher.Decrypt(secretEnc)
	if err != nil {
		return errors.New("payment verification unavailable")
	}
	if !VerifySignature(rzpOrderID, rzpPaymentID, signature, secret) {
		s.pool.Exec(ctx, `update payments set status='failed', updated_at=now() where id=$1 and status<>'paid'`, paymentID)
		return errors.New("payment signature verification failed")
	}
	// Flip pending→paid atomically: if a racing webhook already settled it,
	// RowsAffected is 0 and we skip MarkPaid so the buyer is not messaged twice.
	ct, err := s.pool.Exec(ctx, `update payments set status='paid', razorpay_payment_id=$2, updated_at=now()
		where id=$1 and status<>'paid'`, paymentID, rzpPaymentID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return nil
	}
	return s.orders.MarkPaid(ctx, orderID, kind)
}

// Webhook handles Razorpay events on the platform account and acts as a
// safety net for missed client-side verifications. Idempotent per event id.
func (s *Service) Webhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, "unreadable body")
		return
	}
	if s.cfg.RazorpayWebhookSecret == "" ||
		!VerifyWebhook(body, r.Header.Get("X-Razorpay-Signature"), s.cfg.RazorpayWebhookSecret) {
		httpx.Err(w, http.StatusUnauthorized, "bad signature")
		return
	}
	var event struct {
		Event   string `json:"event"`
		Payload struct {
			Payment struct {
				Entity struct {
					ID      string `json:"id"`
					OrderID string `json:"order_id"`
				} `json:"entity"`
			} `json:"payment"`
		} `json:"payload"`
	}
	if err := json.Unmarshal(body, &event); err != nil || event.Event != "payment.captured" {
		httpx.OK(w, httpx.M{"ok": true})
		return
	}
	ctx := r.Context()
	entity := event.Payload.Payment.Entity
	ok, _ := s.rdb.SetNX(ctx, "webhook:"+entity.ID, "1", 0).Result()
	if !ok {
		httpx.OK(w, httpx.M{"ok": true})
		return
	}

	var paymentID, kind, status, bizID string
	var orderID *string
	var notes []byte
	err = s.pool.QueryRow(ctx, `select id, kind, status, business_id, order_id, notes from payments
		where razorpay_order_id = $1`, entity.OrderID).Scan(&paymentID, &kind, &status, &bizID, &orderID, &notes)
	if err != nil || status == "paid" {
		httpx.OK(w, httpx.M{"ok": true})
		return
	}
	ct, _ := s.pool.Exec(ctx, `update payments set status='paid', razorpay_payment_id=$2, updated_at=now()
		where id=$1 and status<>'paid'`, paymentID, entity.ID)
	if ct.RowsAffected() == 0 { // client-side verify beat us here; side-effects already ran
		httpx.OK(w, httpx.M{"ok": true})
		return
	}

	switch kind {
	case "order", "token":
		if orderID != nil {
			if err := s.orders.MarkPaid(ctx, *orderID, kind); err != nil {
				s.log.Error("webhook markPaid failed", "orderId", *orderID, "err", err)
			}
		}
	case "subscription":
		var meta struct {
			PlanCode string `json:"planCode"`
		}
		json.Unmarshal(notes, &meta)
		// same activation as plan.VerifyCheckout; webhook is the safety net
		_, err := s.pool.Exec(ctx, `update subscriptions set
			plan_id = (select id from plans where code = $2),
			status = 'active',
			ends_at = greatest(ends_at, now()) + interval '30 days',
			updated_at = now()
			where business_id = $1`, bizID, meta.PlanCode)
		if err != nil {
			s.log.Error("webhook subscription activate failed", "businessId", bizID, "err", err)
		} else {
			s.rdb.Del(ctx, "sub:"+bizID)
		}
	}
	httpx.OK(w, httpx.M{"ok": true})
}
