package payment

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"carthedge/internal/config"
	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
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

// CheckoutInfo tells the buyer's page how to pay. Two rails, both settling into
// the seller's own account: a Razorpay checkout when the seller has a gateway,
// or a plain UPI collect request when all they have is a VPA — which is the
// common case for a small Instagram seller.
type CheckoutInfo struct {
	Mode            string `json:"mode"` // gateway | upi
	RazorpayOrderID string `json:"razorpayOrderId,omitempty"`
	RazorpayKeyID   string `json:"razorpayKeyId,omitempty"`
	Amount          int    `json:"amount"`
	Currency        string `json:"currency"`
	OrderCode       string `json:"orderCode"`
	BusinessName    string `json:"businessName"`
	Kind            string `json:"kind"`
	UpiID           string `json:"upiId,omitempty"`
	// UpiIntent opens GPay/PhonePe/Paytm with the amount and reference filled in;
	// the same string renders as the QR for anyone paying from another device.
	UpiIntent string `json:"upiIntent,omitempty"`
}

// UpiIntent builds the standard NPCI deep link every Indian UPI app accepts.
// Amount is in rupees with two decimals — the one place paise are formatted.
func UpiIntent(vpa, payeeName, orderCode string, paise int) string {
	q := url.Values{
		"pa": {vpa},
		"pn": {payeeName},
		"am": {strconv.FormatFloat(float64(paise)/100, 'f', 2, 64)},
		"cu": {"INR"},
		"tn": {"Order " + orderCode},
		"tr": {orderCode},
	}
	return "upi://pay?" + q.Encode()
}

// BuyerCheckout starts a payment for either the full amount or the COD token.
func (s *Service) BuyerCheckout(ctx context.Context, orderCode, kind string) (*CheckoutInfo, error) {
	if kind != "order" && kind != "token" {
		return nil, errors.New("kind must be order or token")
	}
	var orderID, bizID, bizName, keyID, secretEnc, upiID, paymentMethod, paymentStatus string
	var total, tokenAmount int
	err := s.pool.QueryRow(ctx, `select o.id, o.business_id, b.name, b.razorpay_key_id, b.razorpay_key_secret,
		b.upi_id, o.payment_method, o.payment_status, o.total, o.token_amount
		from orders o join businesses b on b.id = o.business_id where o.order_code = $1`, orderCode).Scan(
		&orderID, &bizID, &bizName, &keyID, &secretEnc, &upiID, &paymentMethod, &paymentStatus, &total, &tokenAmount)
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

	secret, decErr := s.cipher.Decrypt(secretEnc)
	if decErr != nil || keyID == "" || secret == "" {
		if upiID == "" {
			return nil, errors.New("seller has not enabled online payments")
		}
		return &CheckoutInfo{Mode: "upi", Amount: amount, Currency: "INR", OrderCode: orderCode,
			BusinessName: bizName, Kind: kind, UpiID: upiID,
			UpiIntent: UpiIntent(upiID, bizName, orderCode, amount)}, nil
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
	return &CheckoutInfo{Mode: "gateway", RazorpayOrderID: rzpOrderID, RazorpayKeyID: keyID, Amount: amount,
		Currency: "INR", OrderCode: orderCode, BusinessName: bizName, Kind: kind}, nil
}

// ClaimUpiPayment records the reference (UTR) a buyer got from their UPI app.
// Nothing is marked paid here — a claim is a buyer assertion, and the seller
// confirms it against their own bank alert from the order card.
func (s *Service) ClaimUpiPayment(ctx context.Context, orderCode, ref string) error {
	ref = strings.ToUpper(strings.TrimSpace(ref))
	if len(ref) < 6 || len(ref) > 40 {
		return errors.New("enter the UPI reference / UTR number from your payment app")
	}
	var orderID, bizID string
	err := s.pool.QueryRow(ctx, `update orders set payment_ref=$2, payment_status='claimed', updated_at=now()
		where order_code=$1 and payment_status in ('pending','failed','claimed')
		returning id, business_id`, orderCode, ref).Scan(&orderID, &bizID)
	if err != nil {
		return errors.New("order not found, or it is already paid")
	}
	s.pool.Exec(ctx, `insert into order_events (order_id, status, note) values ($1,'new',$2)`,
		orderID, "buyer reported a UPI payment, ref "+ref)
	return s.orders.NotifyUpiClaim(ctx, bizID, orderID, ref)
}

// ConfirmUpiPayment is the seller's verdict on a claimed UPI transfer. Only a
// claim can be settled this way — a gateway payment proves itself with a
// signature, and nothing else may be talked into "paid" from the order card.
func (s *Service) ConfirmUpiPayment(ctx context.Context, bizID, orderID string, approved bool) error {
	var status, method string
	if err := s.pool.QueryRow(ctx, `select payment_status, payment_method from orders where id=$1 and business_id=$2`,
		orderID, bizID).Scan(&status, &method); err != nil {
		return errors.New("order not found")
	}
	if status == "paid" || status == "token_paid" {
		return nil // already settled, by this route or the gateway
	}
	if status != "claimed" {
		return errors.New("no reported payment to verify on this order")
	}
	if !approved {
		_, err := s.pool.Exec(ctx, `update orders set payment_status='pending', payment_ref='', updated_at=now()
			where id=$1 and business_id=$2 and payment_status='claimed'`, orderID, bizID)
		if err == nil {
			s.pool.Exec(ctx, `insert into order_events (order_id, status, note)
				values ($1,'new','seller could not find this UPI payment')`, orderID)
		}
		return err
	}
	// a COD order paying by UPI can only ever be paying its confirmation token
	kind := "order"
	if method == "cod" {
		kind = "token"
	}
	return s.orders.MarkPaid(ctx, orderID, kind)
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

// ConfirmUpi is the seller's authed verdict on a buyer-claimed UPI transfer.
func (s *Service) ConfirmUpi(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Approved bool `json:"approved"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := s.ConfirmUpiPayment(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"), in.Approved); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
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
