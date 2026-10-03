// Package aftersale is what happens once an order exists: the buyer cancelling
// or asking for a return or exchange, the seller approving, receiving and
// resolving it with a replacement order or a refund, and the refund records
// (with credit notes on GST-invoiced orders) behind all of it.
package aftersale

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"slices"
	"strings"
	"time"

	"carthedge/internal/alert"
	"carthedge/internal/customer"
	"carthedge/internal/events"
	"carthedge/internal/notify"
	"carthedge/internal/order"
	"carthedge/internal/product"
	"carthedge/internal/secure"
	"carthedge/internal/shop"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("return not found")

type Service struct {
	pool    *pgxpool.Pool
	orders  *order.Service
	alerts  *alert.Service
	notify  *notify.Notifier
	cipher  *secure.Cipher
	events  *events.Bus
	log     *slog.Logger
	baseURL string
	// creditNote reverses tax on a GST-invoiced order when money goes back;
	// set by the invoice package at boot
	creditNote func(ctx context.Context, q pgx.Tx, bizID, orderID, refundID string, amount int) error
}

func New(pool *pgxpool.Pool, orders *order.Service, alerts *alert.Service, n *notify.Notifier, cipher *secure.Cipher,
	bus *events.Bus, log *slog.Logger, baseURL string) *Service {
	return &Service{pool: pool, orders: orders, alerts: alerts, notify: n, cipher: cipher, events: bus, log: log, baseURL: baseURL}
}

// SetCreditNoteIssuer wires the invoice package in without an import cycle.
func (s *Service) SetCreditNoteIssuer(fn func(ctx context.Context, q pgx.Tx, bizID, orderID, refundID string, amount int) error) {
	s.creditNote = fn
}

// Item is one order line (or part of one) coming back.
type Item struct {
	Index     int    `json:"index"` // position in the order's items
	ProductID string `json:"productId,omitempty"`
	VariantID string `json:"variantId,omitempty"`
	Name      string `json:"name"`
	Variant   string `json:"variant,omitempty"`
	Qty       int    `json:"qty"`
	Price     int    `json:"price"` // per unit, as paid
	// Restock puts it back on the shelf when received; a damaged piece is not
	Restock bool `json:"restock"`
	// what the buyer wants instead (exchange): another option of the product,
	// or their words when it is not a listed option
	ExchangeVariantID string `json:"exchangeVariantId,omitempty"`
	ExchangeLabel     string `json:"exchangeLabel,omitempty"`
}

type Return struct {
	ID              string   `json:"id"`
	Code            string   `json:"code"`
	OrderID         string   `json:"orderId"`
	OrderCode       string   `json:"orderCode"`
	Kind            string   `json:"kind"` // return | exchange
	Reason          string   `json:"reason"`
	Note            string   `json:"note,omitempty"`
	Photos          []string `json:"photos"`
	Items           []Item   `json:"items"`
	Value           int      `json:"value"` // returned items, as paid
	Status          string   `json:"status"`
	Resolution      string   `json:"resolution,omitempty"`
	Source          string   `json:"source"` // buyer | seller
	SellerNote      string   `json:"sellerNote,omitempty"`
	PickupCourier   string   `json:"pickupCourier,omitempty"`
	PickupTracking  string   `json:"pickupTracking,omitempty"`
	ReplacementID   string   `json:"replacementOrderId,omitempty"`
	ReplacementCode string   `json:"replacementOrderCode,omitempty"`
	CustomerName    string   `json:"customerName"`
	CustomerPhone   string   `json:"customerPhone"`
	Refunded        int      `json:"refunded"`
	NextStatuses    []string `json:"nextStatuses"`
	CreatedAt       string   `json:"createdAt"`
	UpdatedAt       string   `json:"updatedAt"`
}

// returnFlow is the request lifecycle. Pickup is optional, and a seller can
// close straight from approved when the buyer keeps a damaged piece.
var returnFlow = map[string][]string{
	"requested": {"approved", "rejected", "cancelled"},
	"approved":  {"picked_up", "received", "completed", "cancelled"},
	"picked_up": {"received", "completed"},
	"received":  {"completed"},
}

var openStatuses = []string{"requested", "approved", "picked_up", "received"}

// Input is a new return or exchange request.
type Input struct {
	Kind   string   `json:"kind"`
	Reason string   `json:"reason"`
	Note   string   `json:"note"`
	Photos []string `json:"photos"`
	Items  []struct {
		Index             int    `json:"index"`
		Qty               int    `json:"qty"`
		ExchangeVariantID string `json:"exchangeVariantId"`
		ExchangeLabel     string `json:"exchangeLabel"`
	} `json:"items"`
}

// deliveredAt is when the order was marked delivered, if it was.
func (s *Service) deliveredAt(ctx context.Context, orderID string) *time.Time {
	var t *time.Time
	s.pool.QueryRow(ctx, `select max(created_at) from order_events where order_id=$1 and status='delivered'`, orderID).Scan(&t)
	return t
}

// returnedQty is how many of each order line are already in a live or
// finished return, so the same piece cannot come back twice.
func (s *Service) returnedQty(ctx context.Context, orderID string) map[int]int {
	out := map[int]int{}
	rows, err := s.pool.Query(ctx, `select items from return_requests
		where order_id=$1 and status not in ('rejected','cancelled')`, orderID)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var raw []byte
		var items []Item
		if rows.Scan(&raw) == nil && json.Unmarshal(raw, &items) == nil {
			for _, it := range items {
				out[it.Index] += it.Qty
			}
		}
	}
	return out
}

// Request opens a return or exchange. A buyer is held to the store policy
// (delivered, inside the window, an accepted kind and reason, photos when
// asked); a seller logging one on the buyer's behalf is not.
func (s *Service) Request(ctx context.Context, bizID, orderID, bizCode, source string, in Input) (*Return, error) {
	if in.Kind != "return" && in.Kind != "exchange" {
		return nil, errors.New("choose return or exchange")
	}
	if !slices.Contains(shop.ReturnReasons, in.Reason) {
		return nil, errors.New("choose a reason")
	}
	in.Note = strings.TrimSpace(in.Note)
	if len([]rune(in.Note)) > 500 {
		return nil, errors.New("keep the note under 500 characters")
	}
	if len(in.Photos) > 5 {
		return nil, errors.New("add up to 5 photos")
	}
	for _, url := range in.Photos {
		// only what our own upload endpoint handed out for this store
		if !strings.HasPrefix(url, "http") || !strings.Contains(url, "/"+bizCode+"/") {
			return nil, errors.New("photos must be uploaded from this page")
		}
	}
	o, err := s.orders.GetByID(ctx, bizID, orderID)
	if err != nil {
		return nil, err
	}
	if o.ReplacementOfID != "" && source == "buyer" {
		// exchanges of exchanges go through the seller
		return nil, errors.New("for an exchange order, message the seller about a return")
	}
	settings, err := shop.Load(ctx, s.pool, bizID)
	if err != nil {
		return nil, err
	}
	policy := settings.Policies.Returns
	switch source {
	case "buyer":
		if o.Status != "delivered" {
			return nil, errors.New("returns open once the order is delivered")
		}
		if !policy.Accepts(in.Kind, in.Reason) {
			return nil, errors.New("this store does not accept that request — check the return policy or message the seller")
		}
		delivered := s.deliveredAt(ctx, orderID)
		if delivered == nil || time.Since(*delivered) > time.Duration(policy.WindowDays)*24*time.Hour {
			return nil, fmt.Errorf("the %d-day return window for this order has closed", policy.WindowDays)
		}
		if policy.NeedsPhoto(in.Reason) && len(in.Photos) == 0 {
			return nil, errors.New("add a photo of the item for this reason")
		}
	default:
		if o.Status != "delivered" && o.Status != "shipped" {
			return nil, errors.New("only shipped or delivered orders can be returned")
		}
	}

	already := s.returnedQty(ctx, orderID)
	var items []Item
	value := 0
	for _, req := range in.Items {
		if req.Index < 0 || req.Index >= len(o.Items) {
			return nil, errors.New("pick items from this order")
		}
		line := o.Items[req.Index]
		left := line.Qty - already[req.Index]
		if req.Qty < 1 || req.Qty > left {
			return nil, fmt.Errorf("%s: you can return up to %d", line.Name, max(left, 0))
		}
		if slices.ContainsFunc(items, func(it Item) bool { return it.Index == req.Index }) {
			return nil, errors.New("each item can be listed once")
		}
		it := Item{Index: req.Index, ProductID: line.ProductID, VariantID: line.VariantID, Name: line.Name,
			Variant: line.Variant, Qty: req.Qty, Price: line.Price,
			// a damaged or wrong piece is checked before it goes back on sale
			Restock:       in.Reason != "damaged" && in.Reason != "quality" && line.ProductID != "",
			ExchangeLabel: strings.TrimSpace(req.ExchangeLabel)}
		if len([]rune(it.ExchangeLabel)) > 80 {
			return nil, errors.New("keep what you want instead short")
		}
		if req.ExchangeVariantID != "" && in.Kind == "exchange" {
			var name string
			if err := s.pool.QueryRow(ctx, `select name from product_variants where id=$1 and product_id=$2`,
				req.ExchangeVariantID, line.ProductID).Scan(&name); err != nil {
				return nil, errors.New("pick an option of the same product to exchange for")
			}
			it.ExchangeVariantID = req.ExchangeVariantID
			if it.ExchangeLabel == "" {
				it.ExchangeLabel = name
			}
		}
		items = append(items, it)
		value += it.Price * it.Qty
	}
	if len(items) == 0 {
		return nil, errors.New("pick at least one item")
	}

	photos, _ := json.Marshal(orEmpty(in.Photos))
	itemsJSON, _ := json.Marshal(items)
	code := "RT-" + strings.ToUpper(secure.Token(6))
	var id string
	err = s.pool.QueryRow(ctx, `insert into return_requests (business_id, order_id, code, kind, reason, note, photos, items, source)
		values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9) returning id`,
		bizID, orderID, code, in.Kind, in.Reason, in.Note, string(photos), string(itemsJSON), source).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "return_requests_open_key") {
			return nil, errors.New("a return for this order is already open")
		}
		return nil, err
	}
	what := "return"
	if in.Kind == "exchange" {
		what = "exchange"
	}
	s.event(ctx, orderID, "return_requested", fmt.Sprintf("%s %s requested (%s) by the %s", code, what, reasonLabel(in.Reason), source))
	if source == "buyer" {
		s.alerts.Seller(bizID, alert.Alert{Kind: "returnRequested",
			Title: fmt.Sprintf("%s request · %s", strings.ToUpper(what[:1])+what[1:], o.Code),
			Body:  fmt.Sprintf("%s asked to %s %s — %s. Review it on the order.", o.CustomerName, what, itemNames(items), reasonLabel(in.Reason)),
			Path:  "/app/orders?order=" + orderID})
	}
	r, err := s.Get(ctx, bizID, id)
	if err == nil {
		s.events.Publish(ctx, bizID, "returnUpdated", r)
	}
	return r, err
}

// StatusInput carries what a status move needs.
type StatusInput struct {
	Status         string `json:"status"`
	Note           string `json:"note"` // shown to the buyer
	PickupCourier  string `json:"pickupCourier"`
	PickupTracking string `json:"pickupTracking"`
	// Restock lists the item indexes going back on sale when received;
	// nil keeps each item's default
	Restock []int `json:"restock"`
}

// SetStatus moves a return along its flow. Receiving it puts the chosen items
// back in stock (in the same transaction as the move, so a double tap cannot
// restock twice) and counts it on the buyer's ledger.
func (s *Service) SetStatus(ctx context.Context, bizID, id string, in StatusInput) (*Return, error) {
	in.Note = strings.TrimSpace(in.Note)
	if len([]rune(in.Note)) > 500 || len(in.PickupCourier) > 80 || len(in.PickupTracking) > 80 {
		return nil, errors.New("keep notes under 500 characters")
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var status, orderID, customerID, orderCode, phone, convID string
	var replacementID, kind string
	var refunded int
	var raw []byte
	err = tx.QueryRow(ctx, `select r.status, r.order_id, o.customer_id, o.order_code, c.phone,
		coalesce(o.conversation_id::text, ''), r.items, coalesce(r.replacement_order_id::text, ''), r.kind,
		(select coalesce(sum(amount), 0) from refunds f where f.return_id = r.id and f.status <> 'failed')
		from return_requests r join orders o on o.id = r.order_id join customers c on c.id = o.customer_id
		where r.id=$1 and r.business_id=$2 for update of r`, id, bizID).Scan(
		&status, &orderID, &customerID, &orderCode, &phone, &convID, &raw, &replacementID, &kind, &refunded)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if !slices.Contains(returnFlow[status], in.Status) {
		return nil, fmt.Errorf("cannot move a %s request to %s", strings.ReplaceAll(status, "_", " "), strings.ReplaceAll(in.Status, "_", " "))
	}
	var items []Item
	json.Unmarshal(raw, &items)

	resolution := ""
	switch in.Status {
	case "received":
		var back []product.Line
		for i := range items {
			if in.Restock != nil {
				items[i].Restock = slices.Contains(in.Restock, items[i].Index) && items[i].ProductID != ""
			}
			if items[i].Restock {
				back = append(back, product.Line{ProductID: items[i].ProductID, VariantID: items[i].VariantID,
					Name: items[i].Name, Qty: items[i].Qty})
			}
		}
		if err := product.Release(ctx, tx, back); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(ctx, `update customers set returns_count = returns_count + 1, updated_at=now() where id=$1`, customerID); err != nil {
			return nil, err
		}
	case "completed":
		switch {
		case replacementID != "" && refunded > 0:
			resolution = "exchange_refund"
		case replacementID != "":
			resolution = "exchange"
		case refunded > 0:
			resolution = "refund"
		default:
			return nil, errors.New("send a replacement or record a refund before closing this request")
		}
	}
	itemsJSON, _ := json.Marshal(items)
	if _, err := tx.Exec(ctx, `update return_requests set status=$3, items=$4::jsonb,
		seller_note = case when $5 <> '' then $5 else seller_note end,
		pickup_courier = case when $6 <> '' then $6 else pickup_courier end,
		pickup_tracking = case when $7 <> '' then $7 else pickup_tracking end,
		resolution = case when $8 <> '' then $8 else resolution end, updated_at=now()
		where id=$1 and business_id=$2`, id, bizID, in.Status, string(itemsJSON), in.Note,
		strings.TrimSpace(in.PickupCourier), strings.TrimSpace(in.PickupTracking), resolution); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	r, err := s.Get(ctx, bizID, id)
	if err != nil {
		return nil, err
	}
	s.event(ctx, orderID, "return_"+in.Status, strings.TrimSpace(r.Code+" "+strings.ReplaceAll(in.Status, "_", " ")+". "+in.Note))
	if msg := s.buyerMessage(ctx, bizID, r, in); msg != "" {
		s.tell(convID, phone, msg)
	}
	s.events.Publish(ctx, bizID, "returnUpdated", r)
	return r, nil
}

// buyerMessage is what the buyer hears at each step, with the store's
// pickup rule spelled out on approval.
func (s *Service) buyerMessage(ctx context.Context, bizID string, r *Return, in StatusInput) string {
	what := "return"
	if r.Kind == "exchange" {
		what = "exchange"
	}
	track := s.baseURL + "/o/" + r.OrderCode
	note := ""
	if in.Note != "" {
		note = "\n" + in.Note
	}
	switch in.Status {
	case "approved":
		how := "We will arrange a pickup and share the details."
		if settings, err := shop.Load(ctx, s.pool, bizID); err == nil && settings.Policies.Returns.Pickup == "self_ship" {
			how = "Please send the item back to the store; reply here if you need the address."
		}
		return fmt.Sprintf("Your %s request %s for order %s is approved. %s%s\nTrack: %s", what, r.Code, r.OrderCode, how, note, track)
	case "rejected":
		return fmt.Sprintf("Sorry, your %s request %s for order %s could not be accepted.%s\nTrack: %s", what, r.Code, r.OrderCode, note, track)
	case "picked_up":
		return fmt.Sprintf("We have picked up your %s for order %s (%s).%s", what, r.OrderCode, r.Code, note)
	case "received":
		return fmt.Sprintf("We received your %s for order %s (%s) and are processing it.%s", what, r.OrderCode, r.Code, note)
	case "completed":
		return fmt.Sprintf("Your %s %s for order %s is complete. Thank you for your patience!%s", what, r.Code, r.OrderCode, note)
	}
	return ""
}

// BuyerWithdraw lets the buyer take back a request before anything ships.
func (s *Service) BuyerWithdraw(ctx context.Context, bizID, orderID, id string) error {
	ct, err := s.pool.Exec(ctx, `update return_requests set status='cancelled', updated_at=now()
		where id=$1 and business_id=$2 and order_id=$3 and status in ('requested','approved')
		and replacement_order_id is null`, id, bizID, orderID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("this request can no longer be withdrawn")
	}
	s.event(ctx, orderID, "return_cancelled", "the buyer withdrew the request")
	if r, err := s.Get(ctx, bizID, id); err == nil {
		s.events.Publish(ctx, bizID, "returnUpdated", r)
	}
	return nil
}

// ReplacementInput is the exchange shipment the seller sends.
type ReplacementInput struct {
	Items         []order.Ref `json:"items"` // empty = what the request asked for
	Shipping      int         `json:"shipping"`
	PaymentMethod string      `json:"paymentMethod"` // for any difference the buyer owes
}

// CreateReplacement ships the exchange: a new order linked to the original,
// with the returned items' value credited. The replacement, its link and the
// timeline entry commit in one transaction that holds the return row, so two
// taps cannot ship two replacements and no connection waits on another.
func (s *Service) CreateReplacement(ctx context.Context, bizID, id string, in ReplacementInput) (*order.Order, error) {
	if in.Shipping < 0 {
		return nil, errors.New("shipping cannot be negative")
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var status, kind, orderID, replacementID, code string
	var raw []byte
	err = tx.QueryRow(ctx, `select status, kind, order_id, coalesce(replacement_order_id::text, ''), items, code
		from return_requests where id=$1 and business_id=$2 for update`, id, bizID).Scan(&status, &kind, &orderID, &replacementID, &raw, &code)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if kind != "exchange" || !slices.Contains([]string{"approved", "picked_up", "received"}, status) {
		return nil, errors.New("approve the exchange request first")
	}
	if replacementID != "" {
		return nil, errors.New("a replacement order already exists for this request")
	}
	var items []Item
	json.Unmarshal(raw, &items)
	credit := 0
	refs := in.Items
	for _, it := range items {
		credit += it.Price * it.Qty
		if len(in.Items) == 0 {
			if it.ProductID == "" {
				return nil, errors.New("pick the items to send for custom lines")
			}
			variant := it.VariantID
			if it.ExchangeVariantID != "" {
				variant = it.ExchangeVariantID
			}
			refs = append(refs, order.Ref{ProductID: it.ProductID, VariantID: variant, Qty: it.Qty})
		}
	}
	var payMethod, origCode, custName, custPhone string
	var addrRaw []byte
	if err := tx.QueryRow(ctx, `select o.payment_method, o.order_code, o.address, c.name, c.phone
		from orders o join customers c on c.id = o.customer_id where o.id=$1 and o.business_id=$2`, orderID, bizID).Scan(
		&payMethod, &origCode, &addrRaw, &custName, &custPhone); err != nil {
		return nil, err
	}
	var addr customer.Address
	json.Unmarshal(addrRaw, &addr)
	method := in.PaymentMethod
	if method != "cod" && method != "prepaid" {
		method = payMethod
	}
	params := order.CreateParams{
		BusinessID: bizID, Source: "exchange", ReplacementOf: orderID, Credit: credit, Shipping: in.Shipping,
		Name: custName, Phone: custPhone, Address: addr, Refs: refs, PaymentMethod: method,
		Notes: "Exchange for " + origCode + " (" + code + ")",
	}
	placed, err := s.orders.CreateIn(ctx, tx, params)
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `update return_requests set replacement_order_id=$2, updated_at=now() where id=$1`, id, placed.OrderID); err != nil {
		return nil, err
	}
	s.eventTx(ctx, tx, orderID, "exchange_created", "replacement order "+placed.Code+" for "+code)
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	repl, err := s.orders.Announce(ctx, params, placed)
	if err != nil {
		return nil, err
	}
	if r, err := s.Get(ctx, bizID, id); err == nil {
		s.events.Publish(ctx, bizID, "returnUpdated", r)
	}
	return repl, nil
}

const returnSelect = `select r.id, r.code, r.order_id, o.order_code, r.kind, r.reason, r.note, r.photos, r.items,
	r.status, r.resolution, r.source, r.seller_note, r.pickup_courier, r.pickup_tracking,
	coalesce(r.replacement_order_id::text, ''), coalesce(ro.order_code, ''), c.name, c.phone,
	(select coalesce(sum(amount), 0) from refunds f where f.return_id = r.id and f.status <> 'failed'),
	to_char(r.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), to_char(r.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
	from return_requests r join orders o on o.id = r.order_id join customers c on c.id = o.customer_id
	left join orders ro on ro.id = r.replacement_order_id`

func (s *Service) scan(rows pgx.Rows) ([]Return, error) {
	defer rows.Close()
	out := []Return{}
	for rows.Next() {
		var r Return
		var photos, items []byte
		if err := rows.Scan(&r.ID, &r.Code, &r.OrderID, &r.OrderCode, &r.Kind, &r.Reason, &r.Note, &photos, &items,
			&r.Status, &r.Resolution, &r.Source, &r.SellerNote, &r.PickupCourier, &r.PickupTracking,
			&r.ReplacementID, &r.ReplacementCode, &r.CustomerName, &r.CustomerPhone, &r.Refunded,
			&r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, err
		}
		json.Unmarshal(photos, &r.Photos)
		json.Unmarshal(items, &r.Items)
		r.Photos = orEmpty(r.Photos)
		for _, it := range r.Items {
			r.Value += it.Price * it.Qty
		}
		r.NextStatuses = orEmpty(returnFlow[r.Status])
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Service) Get(ctx context.Context, bizID, id string) (*Return, error) {
	rows, err := s.pool.Query(ctx, returnSelect+` where r.id=$1 and r.business_id=$2`, id, bizID)
	if err != nil {
		return nil, err
	}
	list, err := s.scan(rows)
	if err != nil {
		return nil, err
	}
	if len(list) == 0 {
		return nil, ErrNotFound
	}
	return &list[0], nil
}

// List is the returns queue: ?status=open for everything still in motion.
func (s *Service) List(ctx context.Context, bizID, status string, limit, offset int) ([]Return, error) {
	where := `r.business_id=$1`
	args := []any{bizID}
	switch {
	case status == "open":
		where += ` and r.status in ('requested','approved','picked_up','received')`
	case status != "":
		args = append(args, status)
		where += ` and r.status = $2`
	}
	args = append(args, limit, offset)
	rows, err := s.pool.Query(ctx, returnSelect+` where `+where+
		fmt.Sprintf(` order by r.created_at desc limit $%d offset $%d`, len(args)-1, len(args)), args...)
	if err != nil {
		return nil, err
	}
	return s.scan(rows)
}

func (s *Service) ForOrder(ctx context.Context, bizID, orderID string) ([]Return, error) {
	rows, err := s.pool.Query(ctx, returnSelect+` where r.order_id=$1 and r.business_id=$2 order by r.created_at desc`, orderID, bizID)
	if err != nil {
		return nil, err
	}
	return s.scan(rows)
}

func (s *Service) event(ctx context.Context, orderID, status, note string) {
	s.pool.Exec(ctx, `insert into order_events (order_id, status, note) values ($1,$2,$3)`, orderID, status, note)
}

// tell reaches the buyer on the order's chat, or WhatsApp.
func (s *Service) tell(convID, phone, text string) {
	s.orders.TellBuyer("aftersale", convID, phone, text)
}

var reasonLabels = map[string]string{
	"size": "size issue", "damaged": "damaged item", "wrong_item": "wrong item received", "quality": "quality issue",
	"not_as_described": "not as described", "changed_mind": "changed mind", "other": "other",
}

func reasonLabel(r string) string { return reasonLabels[r] }

func itemNames(items []Item) string {
	var names []string
	for _, it := range items {
		n := it.Name
		if it.Variant != "" {
			n += " (" + it.Variant + ")"
		}
		names = append(names, fmt.Sprintf("%d × %s", it.Qty, n))
	}
	return strings.Join(names, ", ")
}

func orEmpty[T any](s []T) []T {
	if s == nil {
		return []T{}
	}
	return s
}
