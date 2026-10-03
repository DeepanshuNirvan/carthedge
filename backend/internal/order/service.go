package order

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"slices"
	"strings"
	"time"

	"carthedge/internal/alert"
	"carthedge/internal/courier"
	"carthedge/internal/customer"
	"carthedge/internal/events"
	"carthedge/internal/gst"
	"carthedge/internal/httpx"
	"carthedge/internal/notify"
	"carthedge/internal/product"
	"carthedge/internal/secure"
	"carthedge/internal/shop"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

var ErrNotFound = errors.New("order not found")

// maxLineQty caps one order line: social-commerce orders are a few pieces, and
// an absurd quantity on an untracked product would overflow the money columns.
const maxLineQty = 999

type Event struct {
	Status    string `json:"status"`
	Note      string `json:"note"`
	CreatedAt string `json:"createdAt"`
}

type Order struct {
	ID              string         `json:"id"`
	Code            string         `json:"code"`
	Status          string         `json:"status"`
	PaymentMethod   string         `json:"paymentMethod"`
	PaymentStatus   string         `json:"paymentStatus"`
	PaymentRef      string         `json:"paymentRef,omitempty"` // UTR of a claimed UPI transfer
	Source          string         `json:"source"`
	Items           []product.Line `json:"items"`
	Subtotal        int            `json:"subtotal"`
	Discount        int            `json:"discount"`
	PrepaidDiscount int            `json:"prepaidDiscount"`
	Shipping        int            `json:"shipping"`
	CodFee          int            `json:"codFee"`
	Total           int            `json:"total"`
	TokenAmount     int            `json:"tokenAmount"`
	OfferCode       string         `json:"offerCode,omitempty"`
	Notes           string         `json:"notes,omitempty"`
	BuyerGstin      string         `json:"buyerGstin,omitempty"`
	BuyerCompany    string         `json:"buyerCompany,omitempty"`
	// ReplacementOf is the order an exchange ships against (its code and id)
	ReplacementOf   string           `json:"replacementOf,omitempty"`
	ReplacementOfID string           `json:"replacementOfId,omitempty"`
	InvoiceID       string           `json:"invoiceId,omitempty"` // set once the seller has invoiced it
	CustomerID      string           `json:"customerId"`
	CustomerName    string           `json:"customerName"`
	CustomerPhone   string           `json:"customerPhone"`
	Address         customer.Address `json:"address"`
	CourierName     string           `json:"courierName,omitempty"`
	CourierTracking string           `json:"courierTrackingId,omitempty"`
	RiskFlagged     bool             `json:"riskFlagged"`
	CodConfirmedAt  string           `json:"codConfirmedAt,omitempty"`
	CreatedAt       string           `json:"createdAt"`
	Events          []Event          `json:"events,omitempty"`
	// NextStatuses are the moves the board allows from here, so the UI offers
	// only those instead of keeping its own copy of the rules
	NextStatuses []string `json:"nextStatuses,omitempty"`
}

// Ref points at a catalog product; CustomLine is pre-priced (custom links,
// manual orders, unmatched AI items).
type Ref struct {
	ProductID string `json:"productId"`
	VariantID string `json:"variantId,omitempty"`
	Qty       int    `json:"qty"`
}

type CreateParams struct {
	BusinessID    string
	LinkID        string
	Source        string
	Name          string
	Phone         string
	Email         string
	Address       customer.Address
	Refs          []Ref
	CustomLines   []product.Line
	PaymentMethod string
	OfferCode     string
	Notes         string
	AiDraftID     string
	// ConversationID links an order placed from a DM chat: the buyer is
	// answered on that chat, and the chat starts fresh for the next order.
	ConversationID string
	// optional B2B details for a GST invoice
	BuyerGstin   string
	BuyerCompany string
	// ReplacementOf makes this the exchange shipment for a returned order:
	// Credit (the returned items' value) comes off, Shipping is the re-ship
	// charge the seller chose, and it is not a new order for the plan quota.
	ReplacementOf string
	Credit        int
	Shipping      int
}

type Service struct {
	pool      *pgxpool.Pool
	rdb       *redis.Client
	customers *customer.Service
	products  *product.Service
	notify    *notify.Notifier
	alerts    *alert.Service
	courier   *courier.Shiprocket
	events    *events.Bus
	log       *slog.Logger
	baseURL   string
	// dm sends a message on the buyer's chat; set by messaging at boot (it
	// imports order, so it cannot be a constructor argument)
	dm func(ctx context.Context, conversationID, text string) error
	// onClose runs after an order is cancelled or comes back RTO; after-sales
	// turns money already paid into a refund due (set at boot, same reason)
	onClose func(ctx context.Context, bizID, orderID, status string)
}

// SetCloseHook lets after-sales react to cancelled and RTO orders.
func (s *Service) SetCloseHook(fn func(ctx context.Context, bizID, orderID, status string)) {
	s.onClose = fn
}

// SetDirectMessenger lets orders placed from a chat be answered on that chat.
func (s *Service) SetDirectMessenger(fn func(ctx context.Context, conversationID, text string) error) {
	s.dm = fn
}

// TellBuyer reaches the buyer on the chat the order came from, and falls back
// to WhatsApp when there is no chat or its messaging window has closed.
func (s *Service) TellBuyer(name, convID, phone, text string) {
	s.notify.Async(name, func() error {
		if convID != "" && s.dm != nil {
			err := s.dm(context.Background(), convID, text)
			if err == nil {
				return nil
			}
			s.log.Info("chat message not sent, falling back to WhatsApp", "name", name, "err", err)
		}
		return s.notify.WhatsApp(phone, text)
	})
}

func NewService(pool *pgxpool.Pool, rdb *redis.Client, customers *customer.Service, products *product.Service,
	n *notify.Notifier, alerts *alert.Service, sr *courier.Shiprocket, bus *events.Bus, log *slog.Logger, baseURL string) *Service {
	return &Service{pool: pool, rdb: rdb, customers: customers, products: products, notify: n, alerts: alerts,
		courier: sr, events: bus, log: log, baseURL: baseURL}
}

// resolve prices refs and custom lines from the live catalog for one buyer
// segment; shared by Create (inside its transaction) and Quote (on the pool)
// so both see the same lines.
func (s *Service) resolve(ctx context.Context, q product.DB, bizID string, refs []Ref, custom []product.Line, segment string) ([]product.Line, int, error) {
	lines := make([]product.Line, 0, len(refs)+len(custom))
	for _, ref := range refs {
		line, err := s.products.ResolveLine(ctx, q, bizID, ref.ProductID, ref.VariantID, ref.Qty, segment)
		if err != nil {
			return nil, 0, err
		}
		lines = append(lines, line)
	}
	for _, cl := range custom {
		if cl.Name == "" || cl.Price <= 0 {
			return nil, 0, errors.New("custom items need a name and positive price (paise)")
		}
		if cl.Qty < 1 {
			cl.Qty = 1
		}
		lines = append(lines, cl)
	}
	if len(lines) == 0 {
		return nil, 0, errors.New("order has no items")
	}
	subtotal := 0
	for _, l := range lines {
		if l.Qty > maxLineQty {
			return nil, 0, fmt.Errorf("%s: at most %d per order", l.Name, maxLineQty)
		}
		subtotal += l.Price * l.Qty
	}
	return lines, subtotal, nil
}

// codLimitError is the policy's COD ceiling in the buyer's words.
func codLimitError(limit int) error {
	return fmt.Errorf("cash on delivery is available on orders up to %s — please pay online for this one", notify.Rupees(limit))
}

// QuoteParams is a cart the buyer is about to pay for.
type QuoteParams struct {
	BusinessID string
	Refs       []Ref
	Custom     []product.Line
	OfferCode  string
	Phone      string // verified buyer: reseller prices and per-buyer coupon rules apply
}

// Quote is what checkout shows before the order exists: the same lines,
// coupon and charges Create will bill, for both payment methods.
type Quote struct {
	Lines        []product.Line `json:"lines"`
	OfferCode    string         `json:"offerCode,omitempty"`
	OfferError   string         `json:"offerError,omitempty"`
	Prepaid      shop.Totals    `json:"prepaid"`
	Cod          shop.Totals    `json:"cod"`
	CodLimit     int            `json:"codLimit,omitempty"` // policy ceiling, paise
	CodAvailable bool           `json:"codAvailable"`
}

func (s *Service) Quote(ctx context.Context, p QuoteParams) (*Quote, error) {
	settings, err := shop.Load(ctx, s.pool, p.BusinessID)
	if err != nil {
		return nil, errors.New("business not found")
	}
	segment, customerID := "retail", ""
	if p.Phone != "" {
		if c, err := s.customers.Lookup(ctx, p.BusinessID, p.Phone); err == nil {
			segment, customerID = c.Segment, c.ID
		}
	}
	lines, subtotal, err := s.resolve(ctx, s.pool, p.BusinessID, p.Refs, p.Custom, segment)
	if err != nil {
		return nil, err
	}
	q := &Quote{Lines: lines}
	discount := 0
	if code := strings.ToUpper(strings.TrimSpace(p.OfferCode)); code != "" {
		q.OfferCode = code
		if discount, err = s.products.ApplyOffer(ctx, s.pool, p.BusinessID, code, lines, customerID); err != nil {
			q.OfferError, discount = err.Error(), 0
		}
	}
	q.Prepaid = settings.Checkout.Totals(subtotal, discount, "prepaid")
	q.Cod = settings.Checkout.Totals(subtotal, discount, "cod")
	q.CodLimit = settings.Policies.CodMaxOrder
	q.CodAvailable = q.CodLimit == 0 || q.Cod.Total <= q.CodLimit
	return q, nil
}

// Create builds a priced order from the live catalog, applies offers and the
// seller's checkout charges, runs the COD-risk check and kicks off the buyer
// confirmation flow.
func (s *Service) Create(ctx context.Context, p CreateParams) (*Order, error) {
	if err := p.check(); err != nil {
		return nil, err
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	pl, err := s.place(ctx, tx, &p)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.Announce(ctx, p, pl)
}

// CreateIn places an order inside the caller's transaction — an exchange
// holds its return row while its replacement is made — so it never asks the
// pool for a second connection. The caller commits, then calls Announce.
func (s *Service) CreateIn(ctx context.Context, tx pgx.Tx, p CreateParams) (*Placed, error) {
	if err := p.check(); err != nil {
		return nil, err
	}
	return s.place(ctx, tx, &p)
}

// Placed is an order written in a transaction but not yet announced.
type Placed struct {
	OrderID, Code, BizName string
	Lines                  []product.Line
	Totals                 shop.Totals
	TokenAmount            int
	ChatCodConfirmed       bool
}

// check is what an order is refused for before the database is touched.
func (p *CreateParams) check() error {
	if p.PaymentMethod != "prepaid" && p.PaymentMethod != "cod" {
		return errors.New("paymentMethod must be prepaid or cod")
	}
	if p.Address.Line == "" || p.Address.Pincode == "" {
		return errors.New("address line and pincode are required")
	}
	if p.Name == "" || p.Phone == "" {
		return errors.New("customer name and phone are required")
	}
	p.BuyerGstin = strings.ToUpper(strings.TrimSpace(p.BuyerGstin))
	if p.BuyerGstin != "" && !gst.ValidGSTIN(p.BuyerGstin) {
		return errors.New("that GSTIN does not look right — check it or leave it empty")
	}
	if p.BuyerCompany = strings.TrimSpace(p.BuyerCompany); len([]rune(p.BuyerCompany)) > 200 {
		return errors.New("company name is too long")
	}
	return nil
}

// place writes the order, every read and write through tx.
func (s *Service) place(ctx context.Context, tx pgx.Tx, p *CreateParams) (*Placed, error) {
	replacement := p.ReplacementOf != ""

	var bizName, razorpayKeyID, upiID string
	var codTokenAmount int
	var codEnabled bool
	err := tx.QueryRow(ctx, `select name, cod_enabled, cod_token_amount, razorpay_key_id, upi_id
		from businesses where id=$1 and status='active'`, p.BusinessID).Scan(
		&bizName, &codEnabled, &codTokenAmount, &razorpayKeyID, &upiID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("business not found")
	}
	if err != nil {
		return nil, err
	}
	settings, err := shop.Load(ctx, tx, p.BusinessID)
	if err != nil {
		return nil, err
	}
	if p.PaymentMethod == "cod" && !codEnabled {
		return nil, errors.New("cash on delivery is not available for this seller")
	}
	// a seller with neither a gateway nor a UPI ID cannot be paid online; taking
	// the order anyway strands the buyer on a checkout that can never complete
	if p.PaymentMethod == "prepaid" && razorpayKeyID == "" && upiID == "" && p.Source != "manual" && !replacement {
		return nil, errors.New("this seller is not set up for online payments yet — choose cash on delivery")
	}

	// claim the draft first: a second tap on Confirm waits here and then finds
	// it taken, instead of placing a duplicate order
	if p.AiDraftID != "" {
		ct, err := tx.Exec(ctx, `update ai_drafts set status='confirmed' where id=$1 and business_id=$2 and status='pending'`,
			p.AiDraftID, p.BusinessID)
		if err != nil {
			return nil, err
		}
		if ct.RowsAffected() == 0 {
			return nil, errors.New("this draft was already confirmed or discarded")
		}
	}
	// an exchange ships to a buyer already in the ledger and is not a new order
	var cust *customer.Ref
	if replacement {
		cust, err = s.customers.Ref(ctx, tx, p.BusinessID, p.Phone)
	} else {
		cust, err = s.customers.Upsert(ctx, tx, p.BusinessID, p.Name, p.Phone, p.Email, p.Address)
	}
	if err != nil {
		return nil, err
	}

	lines, subtotal, err := s.resolve(ctx, tx, p.BusinessID, p.Refs, p.CustomLines, cust.Segment)
	if err != nil {
		return nil, err
	}
	var t shop.Totals
	if replacement {
		t = shop.Totals{Subtotal: subtotal, Discount: min(max(p.Credit, 0), subtotal), Shipping: max(p.Shipping, 0)}
		t.Total = t.Subtotal - t.Discount + t.Shipping
	} else {
		discount := 0
		if p.OfferCode != "" {
			if discount, err = s.products.ApplyOffer(ctx, tx, p.BusinessID, p.OfferCode, lines, cust.ID); err != nil {
				return nil, err
			}
		}
		t = settings.Checkout.Totals(subtotal, discount, p.PaymentMethod)
		if limit := settings.Policies.CodMaxOrder; p.PaymentMethod == "cod" && p.Source != "manual" && limit > 0 && t.Total > limit {
			return nil, codLimitError(limit)
		}
	}
	if t.Total > math.MaxInt32 { // the money columns are int4
		return nil, errors.New("order total is too large for one order")
	}

	tokenAmount := 0
	if p.PaymentMethod == "cod" && !replacement {
		tokenAmount = codTokenAmount
	}
	riskFlagged := p.PaymentMethod == "cod" && (cust.RiskFlagged || cust.CodRefusals > 0)

	code := "CH-" + strings.ToUpper(secure.Token(8))
	itemsJSON, _ := json.Marshal(lines)
	addrJSON, _ := json.Marshal(p.Address)
	var linkID, convID, replacementOf any
	if p.LinkID != "" {
		linkID = p.LinkID
	}
	if p.ConversationID != "" {
		convID = p.ConversationID
	}
	// an even exchange owes nothing: it is settled and confirmed from the start
	status, paymentStatus, note := "new", "pending", "order placed"
	if replacement {
		replacementOf, note = p.ReplacementOf, "exchange order"
		if t.Total == 0 {
			status, paymentStatus, note = "confirmed", "paid", "exchange order — nothing to pay"
		}
	}
	// a buyer who said yes to the exact summary in their chat has confirmed the
	// COD order already; a second confirmation link would only add friction.
	// A configured COD token still goes out: that is a payment, not a question.
	chatCodConfirmed := p.ConversationID != "" && p.PaymentMethod == "cod" && tokenAmount == 0

	var orderID string
	err = tx.QueryRow(ctx, `insert into orders (business_id, order_code, link_id, customer_id, items, subtotal,
		discount, shipping, total, offer_code, payment_method, token_amount, address, source, notes, risk_flagged,
		conversation_id, prepaid_discount, cod_fee, buyer_gstin, buyer_company, replacement_of, status, payment_status)
		values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24) returning id`,
		p.BusinessID, code, linkID, cust.ID, string(itemsJSON), t.Subtotal, t.Discount, t.Shipping, t.Total,
		strings.ToUpper(p.OfferCode), p.PaymentMethod, tokenAmount, string(addrJSON), p.Source, p.Notes, riskFlagged,
		convID, t.PrepaidDiscount, t.CodFee, p.BuyerGstin, p.BuyerCompany, replacementOf, status, paymentStatus).Scan(&orderID)
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `insert into order_events (order_id, status, note) values ($1,$2,$3)`, orderID, status, note); err != nil {
		return nil, err
	}
	if chatCodConfirmed {
		if _, err := tx.Exec(ctx, `update orders set status='confirmed', cod_confirmed_at=now() where id=$1`, orderID); err != nil {
			return nil, err
		}
		tx.Exec(ctx, `insert into order_events (order_id, status, note) values ($1,'confirmed','buyer confirmed in chat')`, orderID)
	}
	if p.ConversationID != "" {
		// everything said before this point belongs to this order; the next one
		// starts from a clean cart instead of re-reading these items
		if _, err := tx.Exec(ctx, `update conversations set cutoff_at=now(), stage='open', cart='{}'::jsonb, summary_hash=''
			where id=$1 and business_id=$2`, p.ConversationID, p.BusinessID); err != nil {
			return nil, err
		}
	}
	// draw down counted inventory in the same transaction — overselling and the
	// order that caused it must fail together
	if err := product.Reserve(ctx, tx, lines); err != nil {
		return nil, err
	}
	if p.LinkID != "" {
		tx.Exec(ctx, `update order_links set orders_count = orders_count + 1 where id=$1`, p.LinkID)
	}
	if p.AiDraftID != "" {
		tx.Exec(ctx, `update ai_drafts set order_id=$2 where id=$1`, p.AiDraftID, orderID)
	}
	return &Placed{OrderID: orderID, Code: code, BizName: bizName, Lines: lines, Totals: t,
		TokenAmount: tokenAmount, ChatCodConfirmed: chatCodConfirmed}, nil
}

// Announce tells the buyer and the seller about a committed order and returns it.
func (s *Service) Announce(ctx context.Context, p CreateParams, pl *Placed) (*Order, error) {
	replacement := p.ReplacementOf != ""
	t, code, lines, orderID := pl.Totals, pl.Code, pl.Lines, pl.OrderID
	bizName, tokenAmount, chatCodConfirmed := pl.BizName, pl.TokenAmount, pl.ChatCodConfirmed
	// they ordered: no "you left something in your cart" reminder
	s.pool.Exec(ctx, `delete from checkout_sessions where business_id=$1 and phone=$2`, p.BusinessID, p.Phone)

	switch {
	case replacement && t.Total == 0:
		s.TellBuyer("exchangePlaced", p.ConversationID, p.Phone, fmt.Sprintf(
			"Your exchange is confirmed: order %s (%s). We will ship it soon.\nTrack it: %s (enter %s on the page)",
			code, itemSummary(lines), s.trackURL(code), p.Phone))
	case chatCodConfirmed:
		s.TellBuyer("orderPlaced", p.ConversationID, p.Phone, fmt.Sprintf(
			"✅ Order confirmed: %s\nTotal %s, pay cash on delivery.\nTrack it anytime: %s (enter %s on the page)",
			code, notify.Rupees(t.Total), s.trackURL(code), p.Phone))
	case p.PaymentMethod == "cod":
		s.startCodFlow(code, p.Phone, bizName, t.Total, tokenAmount, p.ConversationID)
	default:
		s.TellBuyer("orderPlaced", p.ConversationID, p.Phone, fmt.Sprintf(
			"Order %s placed at %s for %s. Complete payment here to confirm it: %s (enter %s on the page)",
			code, bizName, notify.Rupees(t.Total), s.trackURL(code), p.Phone))
	}
	// the seller hears about orders they did not type in themselves
	if p.Source != "manual" && !replacement {
		method := "online payment"
		if p.PaymentMethod == "cod" {
			method = "cash on delivery"
		}
		s.alerts.Seller(p.BusinessID, alert.Alert{Kind: "newOrder",
			Title: fmt.Sprintf("New order %s · %s", code, notify.Rupees(t.Total)),
			Body:  fmt.Sprintf("%s ordered %s (%s, via %s).", p.Name, itemSummary(lines), method, sourceLabel(p.Source)),
			Path:  "/app/orders?order=" + orderID})
	}

	o, err := s.GetByID(ctx, p.BusinessID, orderID)
	if err == nil {
		s.events.Publish(ctx, p.BusinessID, "orderCreated", o)
	}
	return o, err
}

// itemSummary names an order's items the way a person would: "2 × Kurti (M),
// Jhumka +1 more".
func itemSummary(lines []product.Line) string {
	var parts []string
	for i, l := range lines {
		if i == 2 {
			parts = append(parts, fmt.Sprintf("+%d more", len(lines)-2))
			break
		}
		n := l.Name
		if l.Variant != "" {
			n += " (" + l.Variant + ")"
		}
		if l.Qty > 1 {
			n = fmt.Sprintf("%d × %s", l.Qty, n)
		}
		parts = append(parts, n)
	}
	return strings.Join(parts, ", ")
}

func sourceLabel(source string) string {
	switch source {
	case "store":
		return "your storefront"
	case "link":
		return "a share link"
	case "ai":
		return "a DM chat"
	}
	return source
}

// startCodFlow sends the RTO-cutting confirmation sequence: summary + address
// confirm link (+ token payment ask when the seller has one configured).
func (s *Service) startCodFlow(code, phone, bizName string, total, tokenAmount int, convID string) {
	confirmToken := secure.Hex(16)
	s.rdb.Set(context.Background(), "codconfirm:"+code, confirmToken, 72*time.Hour)
	msg := fmt.Sprintf("Order %s at %s — total %s (Cash on Delivery).\nPlease confirm your order and address here: %s/o/%s/confirm?token=%s",
		code, bizName, notify.Rupees(total), s.baseURL, code, confirmToken)
	if tokenAmount > 0 {
		msg += fmt.Sprintf("\nPay a %s token now to guarantee your order (adjusted in the COD amount).", notify.Rupees(tokenAmount))
	}
	s.TellBuyer("codConfirm", convID, phone, msg)
}

// ConfirmCod is hit from the buyer's WhatsApp confirmation link.
func (s *Service) ConfirmCod(ctx context.Context, code, token string) error {
	stored, err := s.rdb.Get(ctx, "codconfirm:"+code).Result()
	if err != nil || stored != token {
		return errors.New("invalid or expired confirmation link")
	}
	var orderID, bizID string
	err = s.pool.QueryRow(ctx, `update orders set cod_confirmed_at = now(),
		status = case when status='new' then 'confirmed' else status end, updated_at = now()
		where order_code=$1 and payment_method='cod' returning id, business_id`, code).Scan(&orderID, &bizID)
	if err != nil {
		return ErrNotFound
	}
	s.rdb.Del(ctx, "codconfirm:"+code)
	s.pool.Exec(ctx, `insert into order_events (order_id, status, note) values ($1,'confirmed','buyer confirmed COD order')`, orderID)
	s.publishOrder(ctx, bizID, orderID, "codConfirmed")
	return nil
}

// ResendCodConfirmation re-sends the confirmation link — the seller's manual
// nudge from the order card, and what the background job calls in bulk.
func (s *Service) ResendCodConfirmation(ctx context.Context, bizID, orderID string) error {
	var code, phone, bizName, convID string
	var total, tokenAmount int
	err := s.pool.QueryRow(ctx, `select o.order_code, c.phone, b.name, o.total, o.token_amount, coalesce(o.conversation_id::text, '')
		from orders o join customers c on c.id = o.customer_id join businesses b on b.id = o.business_id
		where o.id=$1 and o.business_id=$2 and o.payment_method='cod'
		and o.cod_confirmed_at is null and o.status in ('new','confirmed')`,
		orderID, bizID).Scan(&code, &phone, &bizName, &total, &tokenAmount, &convID)
	if errors.Is(err, pgx.ErrNoRows) {
		return errors.New("no unconfirmed COD order to confirm")
	}
	if err != nil {
		return err
	}
	s.startCodFlow(code, phone, bizName, total, tokenAmount, convID)
	s.pool.Exec(ctx, `update orders set cod_reminder_at=now() where id=$1`, orderID)
	return nil
}

// NudgePendingCod re-asks buyers who never confirmed their COD order. Runs on a
// schedule, once per order — the cheapest RTO prevention there is.
func (s *Service) NudgePendingCod(ctx context.Context, after time.Duration) (int, error) {
	rows, err := s.pool.Query(ctx, `update orders o set cod_reminder_at = now()
		from customers c, businesses b
		where c.id = o.customer_id and b.id = o.business_id
		and o.payment_method='cod' and o.cod_confirmed_at is null and o.cod_reminder_at is null
		and o.payment_status <> 'token_paid' and o.status = 'new'
		and o.created_at < now() - make_interval(mins => $1) and b.status = 'active'
		returning o.order_code, c.phone, b.name, o.total, o.token_amount, coalesce(o.conversation_id::text, '')`, int(after.Minutes()))
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	sent := 0
	for rows.Next() {
		var code, phone, bizName, convID string
		var total, tokenAmount int
		if err := rows.Scan(&code, &phone, &bizName, &total, &tokenAmount, &convID); err != nil {
			return sent, err
		}
		s.startCodFlow(code, phone, bizName, total, tokenAmount, convID)
		sent++
	}
	return sent, rows.Err()
}

// restock returns a cancelled or returned order's items to inventory.
func (s *Service) restock(ctx context.Context, orderID string) {
	var raw []byte
	if err := s.pool.QueryRow(ctx, `select items from orders where id=$1`, orderID).Scan(&raw); err != nil {
		s.log.Error("restock: order items unreadable", "orderId", orderID, "err", err)
		return
	}
	var lines []product.Line
	if err := json.Unmarshal(raw, &lines); err != nil {
		return
	}
	if err := product.Release(ctx, s.pool, lines); err != nil {
		s.log.Error("restock failed", "orderId", orderID, "err", err)
	}
}

func (s *Service) publishOrder(ctx context.Context, bizID, orderID, kind string) {
	if o, err := s.GetByID(ctx, bizID, orderID); err == nil {
		s.events.Publish(ctx, bizID, kind, o)
	}
}

// MarkPaid records a captured payment; kind is "order" (full) or "token" (COD token).
func (s *Service) MarkPaid(ctx context.Context, orderID, kind string) error {
	var q string
	if kind == "token" {
		q = `update orders set payment_status='token_paid', cod_confirmed_at=now(),
			status = case when status='new' then 'confirmed' else status end, updated_at=now()
			where id=$1 returning order_code, business_id, (select phone from customers where id = orders.customer_id), coalesce(conversation_id::text, '')`
	} else {
		q = `update orders set payment_status='paid',
			status = case when status='new' then 'confirmed' else status end, updated_at=now()
			where id=$1 returning order_code, business_id, (select phone from customers where id = orders.customer_id), coalesce(conversation_id::text, '')`
	}
	var code, bizID, phone, convID string
	if err := s.pool.QueryRow(ctx, q, orderID).Scan(&code, &bizID, &phone, &convID); err != nil {
		return ErrNotFound
	}
	note := "payment received"
	if kind == "token" {
		note = "COD token payment received"
	}
	s.pool.Exec(ctx, `insert into order_events (order_id, status, note) values ($1,'confirmed',$2)`, orderID, note)
	s.TellBuyer("paid", convID, phone, fmt.Sprintf("Payment received for order %s. We are packing it! Track: %s", code, s.trackURL(code)))
	s.publishOrder(ctx, bizID, orderID, "orderPaid")
	return nil
}

// NotifyUpiClaim tells the seller a buyer says they have transferred to the
// seller's UPI ID. It is a prompt to check their bank alert, not a payment.
func (s *Service) NotifyUpiClaim(ctx context.Context, bizID, orderID, ref string) error {
	var code string
	var total int
	if err := s.pool.QueryRow(ctx, `select order_code, total from orders where id=$1 and business_id=$2`,
		orderID, bizID).Scan(&code, &total); err != nil {
		return ErrNotFound
	}
	s.alerts.Seller(bizID, alert.Alert{Kind: "upiClaim",
		Title: fmt.Sprintf("Verify a UPI payment · %s", code),
		Body:  fmt.Sprintf("The buyer reported paying %s for order %s by UPI (reference %s). Check your bank alert, then confirm or reject it on the order.", notify.Rupees(total), code, ref),
		Path:  "/app/orders?order=" + orderID})
	s.publishOrder(ctx, bizID, orderID, "paymentClaimed")
	return nil
}

var buyerStatusMessage = map[string]string{
	"confirmed": "Your order %s is confirmed!",
	"packed":    "Your order %s is packed and ready to ship.",
	"shipped":   "Your order %s is on the way!",
	"delivered": "Your order %s was delivered. Thank you for shopping!",
	"cancelled": "Your order %s has been cancelled.",
}

// SetStatus moves an order across the board and runs the side effects
// (ledger updates on delivered/rto, buyer WhatsApp updates).
func (s *Service) SetStatus(ctx context.Context, bizID, orderID, newStatus, note string) (*Order, error) {
	var status, code, phone, courierName, courierTracking, convID string
	var customerID string
	var total int
	err := s.pool.QueryRow(ctx, `select o.status, o.order_code, o.customer_id, o.total, o.courier_name, o.courier_tracking_id,
		c.phone, coalesce(o.conversation_id::text, '') from orders o join customers c on c.id = o.customer_id
		where o.id=$1 and o.business_id=$2`, orderID, bizID).Scan(&status, &code, &customerID, &total, &courierName, &courierTracking, &phone, &convID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if !CanTransition(status, newStatus) {
		return nil, fmt.Errorf("cannot move order from %s to %s", status, newStatus)
	}

	// guarded on the status just read: two clicks (or two tabs) racing to
	// cancel must not both restock
	ct, err := s.pool.Exec(ctx, `update orders set status=$2, updated_at=now() where id=$1 and status=$3`, orderID, newStatus, status)
	if err != nil {
		return nil, err
	}
	if ct.RowsAffected() == 0 {
		return nil, errors.New("this order was just updated — refresh and try again")
	}
	s.pool.Exec(ctx, `insert into order_events (order_id, status, note) values ($1,$2,$3)`, orderID, newStatus, note)

	switch newStatus {
	case "delivered":
		s.customers.RecordDelivered(ctx, customerID, total)
	case "rto":
		s.customers.RecordRto(ctx, customerID)
		s.restock(ctx, orderID)
	case "cancelled":
		s.restock(ctx, orderID)
	}
	if s.onClose != nil && (newStatus == "cancelled" || newStatus == "rto") {
		s.onClose(ctx, bizID, orderID, newStatus)
	}
	if msg, ok := buyerStatusMessage[newStatus]; ok {
		text := fmt.Sprintf(msg, code)
		if newStatus == "shipped" && courierName != "" {
			text += fmt.Sprintf(" Courier: %s, tracking id %s.", courierName, courierTracking)
		}
		text += " Track: " + s.trackURL(code)
		s.TellBuyer("statusUpdate", convID, phone, text)
	}

	o, err := s.GetByID(ctx, bizID, orderID)
	if err == nil {
		s.events.Publish(ctx, bizID, "orderStatusChanged", o)
	}
	return o, err
}

// ChangeAddress moves where an order goes, up to the moment it ships. by is
// who asked ("buyer" or "seller"); the other side hears about it.
func (s *Service) ChangeAddress(ctx context.Context, bizID, orderID string, addr customer.Address, by string) (*Order, error) {
	addr = customer.Address{Line: strings.TrimSpace(addr.Line), City: strings.TrimSpace(addr.City),
		State: strings.TrimSpace(addr.State), Pincode: strings.TrimSpace(addr.Pincode)}
	if addr.Line == "" || !httpx.ValidPincode(addr.Pincode) {
		return nil, errors.New("enter the full address with a valid 6-digit pincode")
	}
	if len([]rune(addr.Line)) > 300 || len([]rune(addr.City))+len([]rune(addr.State)) > 120 {
		return nil, errors.New("that address is too long")
	}
	addrJSON, _ := json.Marshal(addr)
	var customerID, code, phone, convID string
	err := s.pool.QueryRow(ctx, `update orders o set address=$3::jsonb, updated_at=now()
		from customers c where c.id = o.customer_id and o.id=$1 and o.business_id=$2
		and o.status in ('new','confirmed','packed')
		returning o.customer_id, o.order_code, c.phone, coalesce(o.conversation_id::text, '')`,
		orderID, bizID, string(addrJSON)).Scan(&customerID, &code, &phone, &convID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("the address can only be changed before the order ships")
	}
	if err != nil {
		return nil, err
	}
	s.pool.Exec(ctx, `update customers set last_address=$2::jsonb, updated_at=now() where id=$1`, customerID, string(addrJSON))
	where := strings.Join(slices.DeleteFunc([]string{addr.Line, addr.City, addr.State, addr.Pincode},
		func(v string) bool { return v == "" }), ", ")
	s.pool.Exec(ctx, `insert into order_events (order_id, status, note) values ($1,'address_changed',$2)`,
		orderID, "new delivery address from the "+by+": "+where)
	if by == "buyer" {
		s.alerts.Seller(bizID, alert.Alert{Kind: "addressChanged", Title: "Address changed · " + code,
			Body: "The buyer changed the delivery address to: " + where + ". Check it before you pack.",
			Path: "/app/orders?order=" + orderID})
	} else {
		s.TellBuyer("addressChanged", convID, phone, fmt.Sprintf("The delivery address for order %s is now: %s. Track: %s",
			code, where, s.trackURL(code)))
	}
	o, err := s.GetByID(ctx, bizID, orderID)
	if err == nil {
		s.events.Publish(ctx, bizID, "orderUpdated", o)
	}
	return o, err
}

// Ship assigns courier details (manual or via Shiprocket) and marks shipped.
func (s *Service) Ship(ctx context.Context, bizID, orderID, courierName, trackingID string) (*Order, error) {
	o, err := s.GetByID(ctx, bizID, orderID)
	if err != nil {
		return nil, err
	}
	if !CanTransition(o.Status, "shipped") {
		return nil, fmt.Errorf("cannot ship an order that is %s", o.Status)
	}
	if courierName == "" {
		if !s.courier.Enabled() {
			return nil, courier.ErrNotConfigured
		}
		items := make([]courier.ShipmentItem, len(o.Items))
		for i, l := range o.Items {
			items[i] = courier.ShipmentItem{Name: l.Name, Qty: l.Qty, Price: l.Price}
		}
		res, err := s.courier.CreateShipment(ctx, courier.ShipmentInput{
			OrderCode: o.Code, CustomerName: o.CustomerName, Phone: o.CustomerPhone,
			AddressLine: o.Address.Line, City: o.Address.City, State: o.Address.State, Pincode: o.Address.Pincode,
			Cod: o.PaymentMethod == "cod", Total: o.Total, Items: items,
		})
		if err != nil {
			return nil, err
		}
		courierName, trackingID = "Shiprocket", res.ShipmentID
	}
	if _, err := s.pool.Exec(ctx, `update orders set courier_name=$2, courier_tracking_id=$3, updated_at=now()
		where id=$1 and business_id=$4`, orderID, courierName, trackingID, bizID); err != nil {
		return nil, err
	}
	return s.SetStatus(ctx, bizID, orderID, "shipped", "handed to "+courierName)
}

func (s *Service) GetByID(ctx context.Context, bizID, orderID string) (*Order, error) {
	return s.getOne(ctx, `o.id=$2 and o.business_id=$1`, bizID, orderID)
}

func (s *Service) GetByCode(ctx context.Context, bizID, code string) (*Order, error) {
	return s.getOne(ctx, `o.order_code=$2 and o.business_id=$1`, bizID, code)
}

// TrackedStore is the seller behind a tracked order.
type TrackedStore struct{ ID, Name, Code string }

// TrackByCode powers the public tracking page; phone must match the buyer.
func (s *Service) TrackByCode(ctx context.Context, code, phone string) (*Order, TrackedStore, error) {
	var st TrackedStore
	err := s.pool.QueryRow(ctx, `select o.business_id, b.name, b.code from orders o
		join businesses b on b.id = o.business_id
		join customers c on c.id = o.customer_id
		where o.order_code=$1 and c.phone=$2`, code, phone).Scan(&st.ID, &st.Name, &st.Code)
	if err != nil {
		return nil, st, ErrNotFound
	}
	o, err := s.getOne(ctx, `o.order_code=$2 and o.business_id=$1`, st.ID, code)
	return o, st, err
}

func (s *Service) getOne(ctx context.Context, where string, args ...any) (*Order, error) {
	orders, err := s.query(ctx, where+` order by o.created_at desc limit 1`, args...)
	if err != nil {
		return nil, err
	}
	if len(orders) == 0 {
		return nil, ErrNotFound
	}
	o := &orders[0]
	o.NextStatuses = transitions[o.Status]
	rows, err := s.pool.Query(ctx, `select status, note, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		from order_events where order_id=$1 order by created_at`, o.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var e Event
		if err := rows.Scan(&e.Status, &e.Note, &e.CreatedAt); err != nil {
			return nil, err
		}
		o.Events = append(o.Events, e)
	}
	return o, rows.Err()
}

type ListFilter struct {
	Status   string
	Search   string
	Payment  string
	Source   string // link | store | manual | ai
	RiskOnly bool
	From     string // YYYY-MM-DD, inclusive
	To       string // YYYY-MM-DD, inclusive
	Limit    int
	Offset   int
}

func (s *Service) List(ctx context.Context, bizID string, f ListFilter) ([]Order, error) {
	where, args := f.sql(bizID)
	args = append(args, f.Limit, f.Offset)
	return s.query(ctx, where+fmt.Sprintf(" order by o.created_at desc limit $%d offset $%d", len(args)-1, len(args)), args...)
}

func (f ListFilter) sql(bizID string) (string, []any) {
	where := "o.business_id = $1"
	args := []any{bizID}
	add := func(clause string, value any) {
		args = append(args, value)
		where += fmt.Sprintf(" and "+clause, len(args))
	}
	if f.Status != "" {
		add("o.status = $%d", f.Status)
	}
	if f.Payment != "" {
		add("o.payment_method = $%d", f.Payment)
	}
	if f.Source != "" {
		add("o.source = $%d", f.Source)
	}
	if f.RiskOnly {
		where += " and (o.risk_flagged or (o.payment_method='cod' and o.cod_confirmed_at is null and o.payment_status <> 'token_paid'))"
	}
	// the seller picks dates on an Indian calendar; the column is UTC
	if f.From != "" {
		add("o.created_at >= ($%d::date)::timestamp at time zone 'Asia/Kolkata'", f.From)
	}
	if f.To != "" {
		add("o.created_at < ($%d::date + 1)::timestamp at time zone 'Asia/Kolkata'", f.To)
	}
	if f.Search != "" {
		args = append(args, "%"+f.Search+"%")
		where += fmt.Sprintf(" and (o.order_code ilike $%d or c.name ilike $%d or c.phone like $%d)", len(args), len(args), len(args))
	}
	return where, args
}

// Board returns the kanban: counts per status plus recent orders per column.
func (s *Service) Board(ctx context.Context, bizID string) (map[string]any, error) {
	counts := map[string]int{}
	rows, err := s.pool.Query(ctx, `select status, count(*) from orders where business_id=$1 group by status`, bizID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var status string
		var n int
		if err := rows.Scan(&status, &n); err != nil {
			rows.Close()
			return nil, err
		}
		counts[status] = n
	}
	rows.Close()

	orders, err := s.query(ctx, `o.business_id=$1 and o.created_at > now() - interval '60 days'
		order by o.created_at desc limit 300`, bizID)
	if err != nil {
		return nil, err
	}
	columns := map[string][]Order{}
	for _, st := range Statuses {
		columns[st] = []Order{}
	}
	for _, o := range orders {
		columns[o.Status] = append(columns[o.Status], o)
	}
	return map[string]any{"counts": counts, "columns": columns}, nil
}

func (s *Service) query(ctx context.Context, whereOrder string, args ...any) ([]Order, error) {
	rows, err := s.pool.Query(ctx, `select o.id, o.order_code, o.status, o.payment_method, o.payment_status,
		o.payment_ref, o.source,
		o.items, o.subtotal, o.discount, o.prepaid_discount, o.shipping, o.cod_fee, o.total, o.token_amount,
		o.offer_code, o.notes, o.buyer_gstin, o.buyer_company,
		coalesce(ro.order_code, ''), coalesce(o.replacement_of::text, ''), coalesce(inv.id::text, ''),
		o.customer_id, c.name, c.phone, o.address, o.courier_name, o.courier_tracking_id, o.risk_flagged,
		coalesce(to_char(o.cod_confirmed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
		to_char(o.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		from orders o join customers c on c.id = o.customer_id
		left join orders ro on ro.id = o.replacement_of
		left join invoices inv on inv.order_id = o.id where `+whereOrder, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Order
	for rows.Next() {
		var o Order
		var items, addr []byte
		if err := rows.Scan(&o.ID, &o.Code, &o.Status, &o.PaymentMethod, &o.PaymentStatus, &o.PaymentRef, &o.Source,
			&items, &o.Subtotal, &o.Discount, &o.PrepaidDiscount, &o.Shipping, &o.CodFee, &o.Total, &o.TokenAmount,
			&o.OfferCode, &o.Notes, &o.BuyerGstin, &o.BuyerCompany, &o.ReplacementOf, &o.ReplacementOfID, &o.InvoiceID,
			&o.CustomerID, &o.CustomerName, &o.CustomerPhone, &addr, &o.CourierName, &o.CourierTracking,
			&o.RiskFlagged, &o.CodConfirmedAt, &o.CreatedAt); err != nil {
			return nil, err
		}
		json.Unmarshal(items, &o.Items)
		json.Unmarshal(addr, &o.Address)
		out = append(out, o)
	}
	return out, rows.Err()
}

func (s *Service) trackURL(code string) string {
	return s.baseURL + "/o/" + code
}

// RemindAbandoned sends one WhatsApp reminder to buyers who verified their
// number at checkout but did not order: an hour after, within a day, at most
// once a week per buyer, for sellers whose plan includes recovery (can) and
// who keep it on. Claimed by stamping reminded_at, so instances never double up.
func (s *Service) RemindAbandoned(ctx context.Context, can func(ctx context.Context, bizID, feature string) bool) (int, error) {
	// keep a dropped checkout only as long as it is useful: the weekly
	// reminder cap looks back 7 days, the seller's list shows this week
	if _, err := s.pool.Exec(ctx, `delete from checkout_sessions where verified_at < now() - interval '30 days'`); err != nil {
		return 0, err
	}
	rows, err := s.pool.Query(ctx, `update checkout_sessions cs set reminded_at=now()
		from businesses b
		where b.id = cs.business_id and b.status='active'
		and cs.verified_at between now() - interval '24 hours' and now() - interval '1 hour'
		and (cs.reminded_at is null or cs.reminded_at < now() - interval '7 days')
		and coalesce((b.checkout_rules->>'recovery')::boolean, true)
		and not exists (select 1 from orders o join customers c on c.id = o.customer_id
			where o.business_id = cs.business_id and c.phone = cs.phone and o.created_at > cs.verified_at)
		returning cs.business_id, cs.phone, cs.items, cs.link_token, b.code, b.name`)
	if err != nil {
		return 0, err
	}
	type due struct {
		bizID, phone, token, code, name string
		items                           []Ref
	}
	var list []due
	for rows.Next() {
		var d due
		var raw []byte
		if rows.Scan(&d.bizID, &d.phone, &raw, &d.token, &d.code, &d.name) == nil {
			json.Unmarshal(raw, &d.items)
			list = append(list, d)
		}
	}
	rows.Close()
	sent := 0
	for _, d := range list {
		if !can(ctx, d.bizID, "recovery") {
			continue
		}
		link := s.baseURL + "/s/" + d.code
		if d.token != "" {
			link = s.baseURL + "/l/" + d.code + "/" + d.token
		}
		what := "your cart"
		if names := s.cartNames(ctx, d.bizID, d.items); names != "" {
			what = names
		}
		msg := fmt.Sprintf("Hi! You were checking out %s at %s. It is still waiting for you — finish your order here: %s", what, d.name, link)
		if err := s.notify.WhatsApp(d.phone, msg); err != nil {
			s.log.Warn("abandoned checkout reminder failed", "businessId", d.bizID, "err", err)
			continue
		}
		sent++
	}
	return sent, nil
}

// cartNames names up to two products of a saved cart.
func (s *Service) cartNames(ctx context.Context, bizID string, refs []Ref) string {
	var ids []string
	for _, r := range refs {
		if httpx.ValidID(r.ProductID) {
			ids = append(ids, r.ProductID)
		}
	}
	if len(ids) == 0 {
		return ""
	}
	rows, err := s.pool.Query(ctx, `select name from products where business_id=$1 and id = any($2::uuid[]) limit 3`, bizID, ids)
	if err != nil {
		return ""
	}
	defer rows.Close()
	var names []string
	for rows.Next() {
		var n string
		if rows.Scan(&n) == nil {
			names = append(names, n)
		}
	}
	if len(names) > 2 {
		return names[0] + ", " + names[1] + " and more"
	}
	return strings.Join(names, " and ")
}

// Abandoned is a buyer who verified their number but has not ordered yet.
type Abandoned struct {
	Phone      string `json:"phone"`
	Name       string `json:"name,omitempty"` // when they ordered before
	Items      string `json:"items"`
	VerifiedAt string `json:"verifiedAt"`
	RemindedAt string `json:"remindedAt,omitempty"`
}

// AbandonedCheckouts lists the last week's dropped checkouts for the seller
// to follow up; ordering removes a buyer from it.
func (s *Service) AbandonedCheckouts(ctx context.Context, bizID string) ([]Abandoned, error) {
	rows, err := s.pool.Query(ctx, `select cs.phone, coalesce(c.name, ''), cs.items,
		to_char(cs.verified_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		coalesce(to_char(cs.reminded_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '')
		from checkout_sessions cs left join customers c on c.business_id = cs.business_id and c.phone = cs.phone
		where cs.business_id=$1 and cs.verified_at > now() - interval '7 days'
		order by cs.verified_at desc limit 100`, bizID)
	if err != nil {
		return nil, err
	}
	type row struct {
		a    Abandoned
		refs []Ref
	}
	var list []row
	for rows.Next() {
		var r row
		var raw []byte
		if rows.Scan(&r.a.Phone, &r.a.Name, &raw, &r.a.VerifiedAt, &r.a.RemindedAt) == nil {
			json.Unmarshal(raw, &r.refs)
			list = append(list, r)
		}
	}
	rows.Close()
	out := make([]Abandoned, 0, len(list))
	for _, r := range list {
		r.a.Items = s.cartNames(ctx, bizID, r.refs)
		out = append(out, r.a)
	}
	return out, nil
}
