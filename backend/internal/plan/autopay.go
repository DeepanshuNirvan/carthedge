package plan

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"time"

	"carthedge/internal/httpx"
	"carthedge/internal/notify"
	"carthedge/internal/payment"

	"github.com/jackc/pgx/v5"
)

// Autopay renews the plan through a Razorpay subscription (a card or UPI
// AutoPay mandate) instead of a manual checkout every month. Razorpay charges
// on its schedule; each charge arrives as a webhook (or the first one through
// the checkout verify) and extends the plan exactly like a manual payment.

// renewalPrice is what one month of a plan costs this seller: the list
// price, or the negotiated price of a custom plan assigned to them.
func (s *Service) renewalPrice(ctx context.Context, bizID, planCode string) (price int, name string, err error) {
	var planID string
	var isCustom bool
	err = s.pool.QueryRow(ctx, `select id, price_monthly, is_custom, name from plans where code = $1 and active`, planCode).Scan(&planID, &price, &isCustom, &name)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, "", errors.New("plan not found")
	}
	if err != nil {
		return 0, "", s.tryAgain("plan lookup", err)
	}
	// a custom plan is renewable only by the business it was assigned to, at
	// the negotiated price on its subscription
	if isCustom {
		var customPrice *int
		var current string
		err := s.pool.QueryRow(ctx, `select custom_price, plan_id::text from subscriptions where business_id = $1`,
			bizID).Scan(&customPrice, &current)
		if err != nil || current != planID {
			return 0, "", errors.New("custom plans are set up by CartHedge — request one from this page")
		}
		if customPrice != nil {
			price = *customPrice
		}
	}
	return price, name, nil
}

// razorpayPlan finds or makes the Razorpay plan for a price; two instances
// racing both end up on the stored one.
func (s *Service) razorpayPlan(ctx context.Context, planCode, name string, amount int) (string, error) {
	var id string
	if s.pool.QueryRow(ctx, `select razorpay_plan_id from razorpay_plans where plan_code=$1 and amount=$2`, planCode, amount).Scan(&id) == nil {
		return id, nil
	}
	id, err := s.platform.CreatePlan(ctx, "CartHedge "+name, amount)
	if err != nil {
		return "", err
	}
	s.pool.Exec(ctx, `insert into razorpay_plans (plan_code, amount, razorpay_plan_id) values ($1,$2,$3) on conflict do nothing`,
		planCode, amount, id)
	err = s.pool.QueryRow(ctx, `select razorpay_plan_id from razorpay_plans where plan_code=$1 and amount=$2`, planCode, amount).Scan(&id)
	return id, err
}

// StartAutopay creates the mandate. While a paid period is running, the
// first charge waits for it to end; a lapsed plan is charged now.
func (s *Service) StartAutopay(ctx context.Context, bizID, planCode string) (httpx.M, error) {
	if !s.platform.Configured() {
		return nil, errors.New("online payments are not set up yet")
	}
	price, name, err := s.renewalPrice(ctx, bizID, planCode)
	if err != nil {
		return nil, err
	}
	if price <= 0 {
		return nil, errors.New("this plan has nothing to charge")
	}
	var status, autopay, oldSub string
	var endsAt time.Time
	if err := s.pool.QueryRow(ctx, `select status, ends_at, autopay, razorpay_subscription_id from subscriptions where business_id=$1`,
		bizID).Scan(&status, &endsAt, &autopay, &oldSub); err != nil {
		return nil, errors.New("no subscription found")
	}
	if autopay == "active" {
		return nil, errors.New("autopay is already on — turn it off first to switch plans")
	}
	if oldSub != "" && autopay == "pending" {
		s.platform.CancelSubscription(ctx, oldSub, false) // an abandoned earlier attempt
	}
	rzpPlan, err := s.razorpayPlan(ctx, planCode, name, price)
	if err != nil {
		s.log.Error("razorpay plan create failed", "err", err)
		return nil, errors.New("could not start autopay, try again")
	}
	var startAt int64
	if slices.Contains([]string{"trial", "active", "cancelled"}, status) && endsAt.After(time.Now().Add(10*time.Minute)) {
		startAt = endsAt.Unix()
	}
	subID, err := s.platform.CreateSubscription(ctx, rzpPlan, startAt, map[string]string{"businessId": bizID, "planCode": planCode})
	if err != nil {
		s.log.Error("razorpay subscription create failed", "err", err)
		return nil, errors.New("could not start autopay, try again")
	}
	if _, err := s.pool.Exec(ctx, `update subscriptions set razorpay_subscription_id=$2, autopay='pending', autopay_plan=$3,
		updated_at=now() where business_id=$1`, bizID, subID, planCode); err != nil {
		return nil, s.tryAgain("autopay record", err)
	}
	out := httpx.M{"mode": "subscription", "subscriptionId": subID, "razorpayKeyId": s.platform.KeyID(),
		"amount": price, "planCode": planCode, "businessName": "CartHedge", "orderCode": "Autopay", "kind": "subscription"}
	if startAt > 0 {
		out["firstChargeAt"] = endsAt.UTC().Format(time.RFC3339)
	}
	return out, nil
}

// VerifyAutopay confirms the mandate from the checkout callback. When the
// first month was charged right there, it is booked now instead of waiting
// for the webhook (the payment id keeps the two from double-counting).
func (s *Service) VerifyAutopay(ctx context.Context, bizID, paymentID, subID, signature string) error {
	if !payment.VerifySubscriptionSignature(paymentID, subID, signature, s.cfg.RazorpayKeySecret) {
		return errors.New("payment signature verification failed")
	}
	var planCode string
	if err := s.pool.QueryRow(ctx, `update subscriptions set autopay='active', updated_at=now()
		where business_id=$1 and razorpay_subscription_id=$2 returning autopay_plan`, bizID, subID).Scan(&planCode); err != nil {
		return errors.New("autopay not found")
	}
	price, _, err := s.renewalPrice(ctx, bizID, planCode)
	if err != nil {
		return err
	}
	if p, err := s.platform.FetchPayment(ctx, paymentID); err == nil && p.Status == "captured" && p.Amount >= price {
		return s.recordCharge(ctx, bizID, planCode, p.ID, p.OrderID, p.Amount)
	}
	s.invalidate(ctx, bizID)
	return nil
}

// recordCharge books one autopay charge and extends the plan, once per
// Razorpay payment however many times it is reported.
func (s *Service) recordCharge(ctx context.Context, bizID, planCode, rzpPaymentID, rzpOrderID string, amount int) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	notes, _ := json.Marshal(map[string]any{"planCode": planCode, "autopay": true})
	var id string
	err = tx.QueryRow(ctx, `insert into payments (business_id, kind, razorpay_order_id, razorpay_payment_id, amount, status, notes)
		values ($1, 'subscription', $2, $3, $4, 'paid', $5::jsonb)
		on conflict (razorpay_payment_id) where razorpay_payment_id <> '' do nothing returning id`,
		bizID, rzpOrderID, rzpPaymentID, amount, string(notes)).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil // already booked
	}
	if err != nil {
		return err
	}
	if err := payment.ActivateSubscription(ctx, tx, bizID, planCode, id); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `update subscriptions set autopay='active' where business_id=$1`, bizID); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	s.invalidate(ctx, bizID)
	return nil
}

// CancelAutopay stops future charges; the period already paid runs out as
// normal. Safe to call when autopay is off.
func (s *Service) CancelAutopay(ctx context.Context, bizID string) error {
	var subID, autopay string
	if err := s.pool.QueryRow(ctx, `select razorpay_subscription_id, autopay from subscriptions where business_id=$1`,
		bizID).Scan(&subID, &autopay); err != nil || subID == "" || (autopay != "active" && autopay != "pending" && autopay != "halted") {
		return nil
	}
	if err := s.platform.CancelSubscription(ctx, subID, false); err != nil {
		s.log.Error("razorpay subscription cancel failed", "businessId", bizID, "err", err)
		return errors.New("could not turn off autopay just now, try again")
	}
	_, err := s.pool.Exec(ctx, `update subscriptions set autopay='cancelled', updated_at=now() where business_id=$1 and razorpay_subscription_id=$2`,
		bizID, subID)
	return err
}

// HandleRazorpayEvent is the platform webhook for subscription.* events.
// The business comes from our own row for that subscription, never from the
// payload's notes.
func (s *Service) HandleRazorpayEvent(ctx context.Context, event string, body []byte) error {
	var e struct {
		Payload struct {
			Subscription struct {
				Entity struct {
					ID string `json:"id"`
				} `json:"entity"`
			} `json:"subscription"`
			Payment struct {
				Entity payment.Payment `json:"entity"`
			} `json:"payment"`
		} `json:"payload"`
	}
	if err := json.Unmarshal(body, &e); err != nil {
		return nil
	}
	subID := e.Payload.Subscription.Entity.ID
	var bizID, planCode, email, owner string
	err := s.pool.QueryRow(ctx, `select s.business_id, s.autopay_plan, b.email, b.owner_name from subscriptions s
		join businesses b on b.id = s.business_id where s.razorpay_subscription_id=$1 and $1 <> ''`, subID).Scan(&bizID, &planCode, &email, &owner)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil // not ours, or replaced by a newer mandate
	}
	if err != nil {
		return err
	}
	tell := func(subject, line string) {
		s.notify.Async("autopay", func() error {
			return s.notify.Email(email, subject, fmt.Sprintf("Hi %s,\n\n%s\nBilling: %s/app/billing\n\n— CartHedge", owner, line, s.cfg.PublicBaseURL))
		})
	}
	setAutopay := func(state string) error {
		_, err := s.pool.Exec(ctx, `update subscriptions set autopay=$2, updated_at=now() where razorpay_subscription_id=$1`, subID, state)
		s.invalidate(ctx, bizID)
		return err
	}
	switch event {
	case "subscription.charged":
		p := e.Payload.Payment.Entity
		if p.ID == "" || p.Amount <= 0 {
			return nil
		}
		return s.recordCharge(ctx, bizID, planCode, p.ID, p.OrderID, p.Amount)
	case "subscription.authenticated", "subscription.activated", "subscription.resumed":
		return setAutopay("active")
	case "subscription.pending":
		tell("Your CartHedge autopay payment failed", "Razorpay could not charge your plan renewal and will retry. Check your card or UPI mandate.")
	case "subscription.halted":
		tell("CartHedge autopay has stopped", "Renewal charges kept failing, so autopay is paused. Renew from Billing to keep your store running.")
		return setAutopay("halted")
	case "subscription.cancelled", "subscription.completed":
		return setAutopay("cancelled")
	}
	return nil
}

// BillOverage adds orders above the plan quota to an autopay mandate's next
// charge, once per period, the day before it renews — what a manual renewal
// would have charged anyway.
func (s *Service) BillOverage(ctx context.Context) (int, error) {
	rows, err := s.pool.Query(ctx, `update subscriptions set overage_billed_at=now()
		where autopay='active' and ends_at between now() and now() + interval '1 day'
		and (overage_billed_at is null or overage_billed_at < starts_at)
		returning business_id, razorpay_subscription_id`)
	if err != nil {
		return 0, err
	}
	type due struct{ bizID, subID string }
	var list []due
	for rows.Next() {
		var d due
		if rows.Scan(&d.bizID, &d.subID) == nil {
			list = append(list, d)
		}
	}
	rows.Close()
	billed := 0
	for _, d := range list {
		fee, orders, err := s.Overage(ctx, d.bizID)
		if err != nil || fee <= 0 {
			continue
		}
		if err := s.platform.AddAddon(ctx, d.subID, fmt.Sprintf("%d orders above the plan quota", orders), fee); err != nil {
			s.log.Error("overage addon failed", "businessId", d.bizID, "fee", notify.Rupees(fee), "err", err)
			continue
		}
		billed++
	}
	return billed, nil
}
