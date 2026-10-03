package aftersale

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"

	"carthedge/internal/alert"
	"carthedge/internal/notify"
	"carthedge/internal/order"
	"carthedge/internal/payment"
	"carthedge/internal/shop"

	"github.com/jackc/pgx/v5"
)

type Refund struct {
	ID          string `json:"id"`
	OrderID     string `json:"orderId"`
	OrderCode   string `json:"orderCode"`
	ReturnID    string `json:"returnId,omitempty"`
	Amount      int    `json:"amount"`
	Method      string `json:"method"` // razorpay | upi | bank | cash | other; empty while pending
	Status      string `json:"status"` // pending | processed | failed | cancelled
	Reference   string `json:"reference,omitempty"`
	Reason      string `json:"reason,omitempty"`
	CreatedAt   string `json:"createdAt"`
	ProcessedAt string `json:"processedAt,omitempty"`
}

var refundMethods = []string{"razorpay", "upi", "bank", "cash", "other"}

// paidSQL is what the buyer has actually paid on order o: the total once paid
// online or delivered on COD (cash collected), the token on a COD order that
// never arrived, otherwise nothing. Refunds can never exceed it.
const paidSQL = `case
	when o.payment_status in ('paid','refunded') then o.total
	when o.payment_method = 'cod' and o.status = 'delivered' then o.total
	when o.payment_status = 'token_paid' then o.token_amount
	else 0 end`

// liveRefunds sums the refunds that count against what was paid.
const liveRefunds = `(select coalesce(sum(f.amount), 0) from refunds f where f.order_id = o.id and f.status in ('pending','processed'))`

type RefundInput struct {
	Amount    int    `json:"amount"`
	Method    string `json:"method"`
	Reference string `json:"reference"`
	Reason    string `json:"reason"`
	ReturnID  string `json:"returnId"`
	// Pending records money owed now, paid later (marked processed then)
	Pending bool `json:"pending"`
}

// CreateRefund records money going back to a buyer. The order row is locked
// while the cap is checked, so two refunds at once cannot together exceed
// what was paid. A Razorpay refund is sent through the seller's own keys.
func (s *Service) CreateRefund(ctx context.Context, bizID, orderID string, in RefundInput) (*Refund, error) {
	in.Reference, in.Reason = strings.TrimSpace(in.Reference), strings.TrimSpace(in.Reason)
	if in.Amount <= 0 {
		return nil, errors.New("enter the amount to refund")
	}
	if !in.Pending && !slices.Contains(refundMethods, in.Method) {
		return nil, errors.New("choose how the money went back")
	}
	if len(in.Reference) > 80 || len([]rune(in.Reason)) > 200 {
		return nil, errors.New("keep the reference and reason short")
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	// Lock the order first, then sum its refunds in a second statement: under
	// READ COMMITTED a statement that waited for the lock still reads other
	// tables from the snapshot it started with, so a racing refund that just
	// committed would be invisible to a combined lock-and-sum query.
	var locked bool
	err = tx.QueryRow(ctx, `select true from orders where id=$1 and business_id=$2 for update`, orderID, bizID).Scan(&locked)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, order.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	var paid, refunded int
	if err := tx.QueryRow(ctx, `select `+paidSQL+`, `+liveRefunds+` from orders o where o.id=$1`, orderID).Scan(&paid, &refunded); err != nil {
		return nil, err
	}
	left := paid - refunded
	if left <= 0 {
		return nil, errors.New("nothing left to refund on this order")
	}
	if in.Amount > left {
		return nil, fmt.Errorf("you can refund up to %s on this order", notify.Rupees(left))
	}
	var returnID any
	if in.ReturnID != "" {
		var ok bool
		tx.QueryRow(ctx, `select exists(select 1 from return_requests where id=$1 and order_id=$2)`, in.ReturnID, orderID).Scan(&ok)
		if !ok {
			return nil, ErrNotFound
		}
		returnID = in.ReturnID
	}
	if in.Method == "razorpay" {
		if _, err := s.gatewayPayment(ctx, tx, bizID, orderID, in.Amount, ""); err != nil {
			return nil, err
		}
	}
	status := "processed"
	if in.Pending || in.Method == "razorpay" {
		status = "pending" // Razorpay flips it once the call succeeds
	}
	var id string
	if err := tx.QueryRow(ctx, `insert into refunds (business_id, order_id, return_id, amount, method, status, reference, reason, processed_at)
		values ($1,$2,$3,$4,$5,$6,$7,$8, case when $6 = 'processed' then now() end) returning id`,
		bizID, orderID, returnID, in.Amount, in.Method, status, in.Reference, in.Reason).Scan(&id); err != nil {
		return nil, err
	}
	if status == "processed" {
		if err := s.settle(ctx, tx, bizID, orderID, id); err != nil {
			return nil, err
		}
	} else {
		s.eventTx(ctx, tx, orderID, "refund_due", fmt.Sprintf("refund of %s due", notify.Rupees(in.Amount)))
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	if in.Method == "razorpay" {
		return s.razorpayRefund(ctx, bizID, id, false)
	}
	if status == "processed" {
		s.tellRefund(ctx, bizID, id)
	}
	return s.getRefund(ctx, bizID, id)
}

// ProcessRefund settles a pending refund: paid by hand (method + reference)
// or sent through Razorpay now.
func (s *Service) ProcessRefund(ctx context.Context, bizID, id, method, reference string) (*Refund, error) {
	reference = strings.TrimSpace(reference)
	if !slices.Contains(refundMethods, method) || len(reference) > 80 {
		return nil, errors.New("choose how the money went back")
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var orderID, current string
	var amount int
	err = tx.QueryRow(ctx, `select order_id, amount, method from refunds where id=$1 and business_id=$2 and status='pending'
		for update`, id, bizID).Scan(&orderID, &amount, &current)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("this refund is not waiting to be paid")
	}
	if err != nil {
		return nil, err
	}
	if current == "razorpay" {
		// an earlier call went unanswered: retry through Razorpay, which is
		// asked first whether it already holds this refund
		if method != "razorpay" {
			return nil, errors.New("this refund was sent to Razorpay — retry it through Razorpay; CartHedge checks first, so it is never paid twice")
		}
		tx.Rollback(ctx) // the Razorpay path takes the row lock itself
		return s.razorpayRefund(ctx, bizID, id, false)
	}
	if method == "razorpay" {
		if _, err := s.gatewayPayment(ctx, tx, bizID, orderID, amount, id); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(ctx, `update refunds set method='razorpay' where id=$1`, id); err != nil {
			return nil, err
		}
		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}
		return s.razorpayRefund(ctx, bizID, id, false)
	}
	if _, err := tx.Exec(ctx, `update refunds set status='processed', method=$2, reference=$3, processed_at=now() where id=$1`,
		id, method, reference); err != nil {
		return nil, err
	}
	if err := s.settle(ctx, tx, bizID, orderID, id); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	s.tellRefund(ctx, bizID, id)
	return s.getRefund(ctx, bizID, id)
}

// ErrAlreadyRefunded is a void that found the money already sent through
// Razorpay; the refund is booked as processed instead.
var ErrAlreadyRefunded = errors.New("Razorpay had already sent this refund — it is now marked as refunded")

// CancelRefund voids a pending refund the seller will not pay (a forfeited
// COD token, a goodwill refund recorded by mistake). A refund sent to Razorpay
// is voided only once Razorpay confirms it never went out.
func (s *Service) CancelRefund(ctx context.Context, bizID, id string) error {
	var orderID string
	err := s.pool.QueryRow(ctx, `update refunds set status='cancelled' where id=$1 and business_id=$2 and status='pending'
		and method <> 'razorpay' returning order_id`, id, bizID).Scan(&orderID)
	if errors.Is(err, pgx.ErrNoRows) {
		var viaRazorpay bool
		s.pool.QueryRow(ctx, `select exists(select 1 from refunds where id=$1 and business_id=$2 and status='pending'
			and method='razorpay')`, id, bizID).Scan(&viaRazorpay)
		if !viaRazorpay {
			return errors.New("only a pending refund can be voided")
		}
		f, err := s.razorpayRefund(ctx, bizID, id, true)
		if err == nil && f.Status == "processed" {
			return ErrAlreadyRefunded
		}
		return err
	}
	if err == nil {
		s.event(ctx, orderID, "refund_voided", "pending refund voided by the seller")
	}
	return err
}

// gatewayPayment finds the Razorpay payment a refund can go back on and
// checks the amount fits what is left on it.
func (s *Service) gatewayPayment(ctx context.Context, q shop.Querier, bizID, orderID string, amount int, excluding string) (string, error) {
	var paymentID string
	var paidOnIt, already int
	err := q.QueryRow(ctx, `select p.razorpay_payment_id, p.amount,
		(select coalesce(sum(f.amount), 0) from refunds f where f.order_id = p.order_id and f.method = 'razorpay'
			and f.status in ('pending','processed') and f.id::text <> $3)
		from payments p where p.order_id=$1 and p.business_id=$2 and p.status='paid' and p.kind in ('order','token')
		and p.razorpay_payment_id <> '' order by p.created_at desc limit 1`, orderID, bizID, excluding).Scan(&paymentID, &paidOnIt, &already)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", errors.New("this order was not paid through Razorpay — send the money back by UPI or bank and record the reference")
	}
	if err != nil {
		return "", err
	}
	if amount > paidOnIt-already {
		return "", fmt.Errorf("Razorpay can refund up to %s on this payment", notify.Rupees(max(paidOnIt-already, 0)))
	}
	return paymentID, nil
}

// razorpayRefund settles a pending Razorpay refund. The refund row stays
// locked for the whole call, so two clicks cannot send it twice, and Razorpay
// is asked first whether it already holds a refund with this record's receipt
// — a retry after an unanswered call books that refund instead of paying
// again. void cancels the record when Razorpay holds nothing. A clear refusal
// fails the record (no money moved); no answer leaves it pending.
// ponytail: holds one DB connection during the Razorpay call; refunds are rare.
func (s *Service) razorpayRefund(ctx context.Context, bizID, id string, void bool) (*Refund, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var orderID, orderCode, keyID, secretEnc string
	var amount int
	err = tx.QueryRow(ctx, `select f.order_id, o.order_code, f.amount, b.razorpay_key_id, b.razorpay_key_secret
		from refunds f join orders o on o.id = f.order_id join businesses b on b.id = f.business_id
		where f.id=$1 and f.business_id=$2 and f.status='pending' and f.method='razorpay' for update of f`, id, bizID).Scan(
		&orderID, &orderCode, &amount, &keyID, &secretEnc)
	if errors.Is(err, pgx.ErrNoRows) {
		tx.Rollback(ctx)                   // release before reading on the pool
		return s.getRefund(ctx, bizID, id) // settled by a parallel attempt
	}
	if err != nil {
		return nil, err
	}
	finish := func(status, reference string) error {
		if _, err := tx.Exec(ctx, `update refunds set status=$2, reference=$3,
			processed_at=case when $2 = 'processed' then now() end where id=$1`, id, status, clip(reference, 80)); err != nil {
			return err
		}
		if status == "processed" {
			if err := s.settle(ctx, tx, bizID, orderID, id); err != nil {
				return err
			}
		}
		return tx.Commit(ctx)
	}
	secret, err := s.cipher.Decrypt(secretEnc)
	if err != nil || keyID == "" || secret == "" {
		if void {
			return s.voided(ctx, bizID, id, orderID, finish("cancelled", ""))
		}
		finish("failed", "Razorpay keys missing")
		return nil, errors.New("connect your Razorpay keys in Settings to refund through Razorpay")
	}
	paymentID, err := s.gatewayPayment(ctx, tx, bizID, orderID, amount, id)
	if err != nil {
		finish("failed", err.Error())
		return nil, err
	}
	client := payment.NewClient(keyID, secret)
	rfnd, err := client.RefundByReceipt(ctx, paymentID, id)
	if err == nil && rfnd == "" {
		if void {
			return s.voided(ctx, bizID, id, orderID, finish("cancelled", ""))
		}
		rfnd, err = client.Refund(ctx, paymentID, amount, id, map[string]string{"orderCode": orderCode, "refundId": id})
	}
	if err != nil {
		if payment.Refused(err) {
			finish("failed", err.Error())
			return nil, err
		}
		s.log.Error("razorpay refund outcome unknown", "refundId", id, "err", err)
		return nil, errors.New("Razorpay did not answer — the refund is still pending; retry it and CartHedge checks with Razorpay first, so it is never paid twice")
	}
	if err := finish("processed", rfnd); err != nil {
		return nil, err
	}
	s.tellRefund(ctx, bizID, id)
	return s.getRefund(ctx, bizID, id)
}

func (s *Service) voided(ctx context.Context, bizID, id, orderID string, err error) (*Refund, error) {
	if err != nil {
		return nil, err
	}
	s.event(ctx, orderID, "refund_voided", "pending refund voided by the seller")
	return s.getRefund(ctx, bizID, id)
}

// settle books a processed refund: timeline, payment status once fully
// refunded, the buyer's net spend, and a credit note on an invoiced order.
func (s *Service) settle(ctx context.Context, tx pgx.Tx, bizID, orderID, refundID string) error {
	var amount int
	var method, reference string
	if err := tx.QueryRow(ctx, `select amount, method, reference from refunds where id=$1`, refundID).Scan(&amount, &method, &reference); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `update orders o set payment_status='refunded', updated_at=now()
		where o.id=$1 and `+paidSQL+` > 0 and `+paidSQL+` <= (select coalesce(sum(f.amount), 0) from refunds f
			where f.order_id = o.id and f.status='processed')`, orderID); err != nil {
		return err
	}
	// lifetime spend counts delivered value, so a refund on it comes off
	if _, err := tx.Exec(ctx, `update customers c set total_spent = greatest(total_spent - $2, 0), updated_at=now()
		from orders o where o.id=$1 and c.id = o.customer_id and o.status='delivered'`, orderID, amount); err != nil {
		return err
	}
	if s.creditNote != nil {
		if err := s.creditNote(ctx, tx, bizID, orderID, refundID, amount); err != nil {
			return err
		}
	}
	note := fmt.Sprintf("%s refunded via %s", notify.Rupees(amount), method)
	if reference != "" {
		note += " (ref " + reference + ")"
	}
	s.eventTx(ctx, tx, orderID, "refund", note)
	return nil
}

func (s *Service) tellRefund(ctx context.Context, bizID, id string) {
	var code, phone, convID, method, reference string
	var amount int
	if err := s.pool.QueryRow(ctx, `select o.order_code, c.phone, coalesce(o.conversation_id::text, ''), f.method, f.reference, f.amount
		from refunds f join orders o on o.id = f.order_id join customers c on c.id = o.customer_id
		where f.id=$1 and f.business_id=$2`, id, bizID).Scan(&code, &phone, &convID, &method, &reference, &amount); err != nil {
		return
	}
	how := map[string]string{"razorpay": "to your original payment method (5–7 working days)", "upi": "by UPI",
		"bank": "by bank transfer", "cash": "in cash", "other": ""}[method]
	msg := fmt.Sprintf("Refund of %s for order %s has been processed %s.", notify.Rupees(amount), code, how)
	if reference != "" && method != "cash" {
		msg += " Reference: " + reference
	}
	s.tell(convID, phone, strings.Replace(msg, " .", ".", 1))
}

// OnOrderClosed runs when an order is cancelled or comes back RTO: money the
// buyer paid becomes a pending refund for the seller to pay. A COD token is
// kept on RTO — covering a refused parcel is what the token is for.
func (s *Service) OnOrderClosed(ctx context.Context, bizID, orderID, status string) {
	var due int
	var method string
	if err := s.pool.QueryRow(ctx, `select `+paidSQL+` - `+liveRefunds+`, o.payment_method from orders o
		where o.id=$1 and o.business_id=$2`, orderID, bizID).Scan(&due, &method); err != nil || due <= 0 {
		return
	}
	if status == "rto" && method != "prepaid" {
		return
	}
	reason := "order cancelled"
	if status == "rto" {
		reason = "parcel returned to origin"
	}
	if _, err := s.CreateRefund(ctx, bizID, orderID, RefundInput{Amount: due, Pending: true, Reason: reason}); err != nil {
		s.log.Error("could not record the refund due", "orderId", orderID, "err", err)
	}
}

// BuyerCancel is the buyer cancelling within the store's policy. The order
// moves through the same guarded transition as the seller's cancel (stock
// goes back once), and anything paid becomes a refund due.
func (s *Service) BuyerCancel(ctx context.Context, bizID, orderID, reason string) (*order.Order, error) {
	reason = strings.TrimSpace(reason)
	if len([]rune(reason)) > 200 {
		return nil, errors.New("keep the reason short")
	}
	settings, err := shop.Load(ctx, s.pool, bizID)
	if err != nil {
		return nil, err
	}
	o, err := s.orders.GetByID(ctx, bizID, orderID)
	if err != nil {
		return nil, err
	}
	if !settings.Policies.BuyerCanCancel(o.Status) {
		return nil, errors.New("this order can no longer be cancelled here — message the seller")
	}
	note := "cancelled by the buyer"
	if reason != "" {
		note += ": " + reason
	}
	o, err = s.orders.SetStatus(ctx, bizID, orderID, "cancelled", note)
	if err != nil {
		return nil, err
	}
	var due int
	s.pool.QueryRow(ctx, `select coalesce(sum(amount), 0) from refunds where order_id=$1 and status='pending'`, orderID).Scan(&due)
	body := fmt.Sprintf("%s cancelled order %s (%s).", o.CustomerName, o.Code, notify.Rupees(o.Total))
	if due > 0 {
		body += fmt.Sprintf(" A refund of %s is due — record it on the order once paid.", notify.Rupees(due))
	}
	s.alerts.Seller(bizID, alert.Alert{Kind: "orderCancelled", Title: "Order cancelled by the buyer · " + o.Code,
		Body: body, Path: "/app/orders?order=" + orderID})
	return o, nil
}

const refundSelect = `select f.id, f.order_id, o.order_code, coalesce(f.return_id::text, ''), f.amount, f.method, f.status,
	f.reference, f.reason, to_char(f.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
	coalesce(to_char(f.processed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '')
	from refunds f join orders o on o.id = f.order_id`

func (s *Service) refunds(ctx context.Context, where string, args ...any) ([]Refund, error) {
	rows, err := s.pool.Query(ctx, refundSelect+` where `+where, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Refund{}
	for rows.Next() {
		var f Refund
		if err := rows.Scan(&f.ID, &f.OrderID, &f.OrderCode, &f.ReturnID, &f.Amount, &f.Method, &f.Status,
			&f.Reference, &f.Reason, &f.CreatedAt, &f.ProcessedAt); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

func (s *Service) getRefund(ctx context.Context, bizID, id string) (*Refund, error) {
	list, err := s.refunds(ctx, `f.id=$1 and f.business_id=$2`, id, bizID)
	if err != nil {
		return nil, err
	}
	if len(list) == 0 {
		return nil, errors.New("refund not found")
	}
	return &list[0], nil
}

// PendingRefunds is the "money owed" list.
func (s *Service) PendingRefunds(ctx context.Context, bizID string) ([]Refund, error) {
	return s.refunds(ctx, `f.business_id=$1 and f.status='pending' order by f.created_at`, bizID)
}

// OrderView is everything after-sales the order drawer shows.
type OrderView struct {
	Returns    []Return `json:"returns"`
	Refunds    []Refund `json:"refunds"`
	Paid       int      `json:"paid"`
	Refundable int      `json:"refundable"`
	// Razorpay is whether a gateway payment exists to refund through
	Razorpay bool `json:"razorpay"`
}

func (s *Service) ForOrderView(ctx context.Context, bizID, orderID string) (*OrderView, error) {
	v := &OrderView{}
	var err error
	if err = s.pool.QueryRow(ctx, `select `+paidSQL+`, `+liveRefunds+`,
		exists(select 1 from payments p where p.order_id = o.id and p.status='paid' and p.kind in ('order','token') and p.razorpay_payment_id <> '')
		from orders o where o.id=$1 and o.business_id=$2`, orderID, bizID).Scan(&v.Paid, &v.Refundable, &v.Razorpay); err != nil {
		return nil, order.ErrNotFound
	}
	v.Refundable = max(v.Paid-v.Refundable, 0)
	if v.Returns, err = s.ForOrder(ctx, bizID, orderID); err != nil {
		return nil, err
	}
	if v.Refunds, err = s.refunds(ctx, `f.order_id=$1 and f.business_id=$2 order by f.created_at`, orderID, bizID); err != nil {
		return nil, err
	}
	return v, nil
}

func (s *Service) eventTx(ctx context.Context, tx pgx.Tx, orderID, status, note string) {
	tx.Exec(ctx, `insert into order_events (order_id, status, note) values ($1,$2,$3)`, orderID, status, note)
}

func clip(s string, n int) string {
	if r := []rune(s); len(r) > n {
		return string(r[:n])
	}
	return s
}
