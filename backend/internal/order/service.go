package order

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"carthedge/internal/courier"
	"carthedge/internal/customer"
	"carthedge/internal/notify"
	"carthedge/internal/product"
	"carthedge/internal/secure"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

var ErrNotFound = errors.New("order not found")

type Event struct {
	Status    string `json:"status"`
	Note      string `json:"note"`
	CreatedAt string `json:"createdAt"`
}

type Order struct {
	ID              string           `json:"id"`
	Code            string           `json:"code"`
	Status          string           `json:"status"`
	PaymentMethod   string           `json:"paymentMethod"`
	PaymentStatus   string           `json:"paymentStatus"`
	Source          string           `json:"source"`
	Items           []product.Line   `json:"items"`
	Subtotal        int              `json:"subtotal"`
	Discount        int              `json:"discount"`
	Shipping        int              `json:"shipping"`
	Total           int              `json:"total"`
	TokenAmount     int              `json:"tokenAmount"`
	OfferCode       string           `json:"offerCode,omitempty"`
	Notes           string           `json:"notes,omitempty"`
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
}

type Service struct {
	pool      *pgxpool.Pool
	rdb       *redis.Client
	customers *customer.Service
	products  *product.Service
	notify    *notify.Notifier
	courier   *courier.Shiprocket
	log       *slog.Logger
	baseURL   string
}

func NewService(pool *pgxpool.Pool, rdb *redis.Client, customers *customer.Service, products *product.Service,
	n *notify.Notifier, sr *courier.Shiprocket, log *slog.Logger, baseURL string) *Service {
	return &Service{pool: pool, rdb: rdb, customers: customers, products: products, notify: n, courier: sr, log: log, baseURL: baseURL}
}

// Create builds a priced order from the live catalog, applies offers, runs the
// COD-risk check and kicks off the buyer confirmation flow.
func (s *Service) Create(ctx context.Context, p CreateParams) (*Order, error) {
	if p.PaymentMethod != "prepaid" && p.PaymentMethod != "cod" {
		return nil, errors.New("paymentMethod must be prepaid or cod")
	}
	if p.Address.Line == "" || p.Address.Pincode == "" {
		return nil, errors.New("address line and pincode are required")
	}
	if p.Name == "" || p.Phone == "" {
		return nil, errors.New("customer name and phone are required")
	}

	var bizName, bizWhatsApp string
	var shippingFee, codTokenAmount int
	var codEnabled bool
	err := s.pool.QueryRow(ctx, `select name, whatsapp, shipping_fee, cod_enabled, cod_token_amount
		from businesses where id=$1 and status='active'`, p.BusinessID).Scan(&bizName, &bizWhatsApp, &shippingFee, &codEnabled, &codTokenAmount)
	if err != nil {
		return nil, errors.New("business not found")
	}
	if p.PaymentMethod == "cod" && !codEnabled {
		return nil, errors.New("cash on delivery is not available for this seller")
	}

	cust, err := s.customers.Upsert(ctx, p.BusinessID, p.Name, p.Phone, p.Email, p.Address)
	if err != nil {
		return nil, err
	}

	lines := make([]product.Line, 0, len(p.Refs)+len(p.CustomLines))
	for _, ref := range p.Refs {
		line, err := s.products.ResolveLine(ctx, p.BusinessID, ref.ProductID, ref.VariantID, ref.Qty, cust.Segment)
		if err != nil {
			return nil, err
		}
		lines = append(lines, line)
	}
	for _, cl := range p.CustomLines {
		if cl.Name == "" || cl.Price <= 0 {
			return nil, errors.New("custom items need a name and positive price (paise)")
		}
		if cl.Qty < 1 {
			cl.Qty = 1
		}
		lines = append(lines, cl)
	}
	if len(lines) == 0 {
		return nil, errors.New("order has no items")
	}

	subtotal := 0
	for _, l := range lines {
		subtotal += l.Price * l.Qty
	}
	discount := 0
	if p.OfferCode != "" {
		if discount, err = s.products.ApplyOffer(ctx, p.BusinessID, p.OfferCode, lines); err != nil {
			return nil, err
		}
	}
	total := subtotal - discount + shippingFee

	tokenAmount := 0
	if p.PaymentMethod == "cod" {
		tokenAmount = codTokenAmount
	}
	riskFlagged := p.PaymentMethod == "cod" && (cust.RiskFlagged || cust.CodRefusals > 0)

	code := "CH-" + strings.ToUpper(secure.Token(8))
	itemsJSON, _ := json.Marshal(lines)
	addrJSON, _ := json.Marshal(p.Address)
	var linkID any
	if p.LinkID != "" {
		linkID = p.LinkID
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var orderID string
	err = tx.QueryRow(ctx, `insert into orders (business_id, order_code, link_id, customer_id, items, subtotal,
		discount, shipping, total, offer_code, payment_method, token_amount, address, source, notes, risk_flagged)
		values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16) returning id`,
		p.BusinessID, code, linkID, cust.ID, string(itemsJSON), subtotal, discount, shippingFee, total,
		strings.ToUpper(p.OfferCode), p.PaymentMethod, tokenAmount, string(addrJSON), p.Source, p.Notes, riskFlagged).Scan(&orderID)
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `insert into order_events (order_id, status, note) values ($1,'new','order placed')`, orderID); err != nil {
		return nil, err
	}
	if p.LinkID != "" {
		tx.Exec(ctx, `update order_links set orders_count = orders_count + 1 where id=$1`, p.LinkID)
	}
	if p.AiDraftID != "" {
		tx.Exec(ctx, `update ai_drafts set status='confirmed', order_id=$2 where id=$1 and business_id=$3`, p.AiDraftID, orderID, p.BusinessID)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	if p.PaymentMethod == "cod" {
		s.startCodFlow(code, p.Phone, bizName, total, tokenAmount)
	} else {
		s.notify.Async("orderPlaced", func() error {
			return s.notify.WhatsApp(p.Phone, fmt.Sprintf("Order %s placed at %s for %s. Complete payment to confirm. Track: %s",
				code, bizName, notify.Rupees(total), s.trackURL(code)))
		})
	}
	return s.GetByID(ctx, p.BusinessID, orderID)
}

// startCodFlow sends the RTO-cutting confirmation sequence: summary + address
// confirm link (+ token payment ask when the seller has one configured).
func (s *Service) startCodFlow(code, phone, bizName string, total, tokenAmount int) {
	confirmToken := secure.Hex(16)
	s.rdb.Set(context.Background(), "codconfirm:"+code, confirmToken, 72*time.Hour)
	msg := fmt.Sprintf("Order %s at %s — total %s (Cash on Delivery).\nPlease confirm your order and address here: %s/p/orders/%s/confirm?token=%s",
		code, bizName, notify.Rupees(total), s.baseURL, code, confirmToken)
	if tokenAmount > 0 {
		msg += fmt.Sprintf("\nPay a %s token now to guarantee your order (adjusted in the COD amount).", notify.Rupees(tokenAmount))
	}
	s.notify.Async("codConfirm", func() error { return s.notify.WhatsApp(phone, msg) })
}

// ConfirmCod is hit from the buyer's WhatsApp confirmation link.
func (s *Service) ConfirmCod(ctx context.Context, code, token string) error {
	stored, err := s.rdb.Get(ctx, "codconfirm:"+code).Result()
	if err != nil || stored != token {
		return errors.New("invalid or expired confirmation link")
	}
	var orderID string
	err = s.pool.QueryRow(ctx, `update orders set cod_confirmed_at = now(),
		status = case when status='new' then 'confirmed' else status end, updated_at = now()
		where order_code=$1 and payment_method='cod' returning id`, code).Scan(&orderID)
	if err != nil {
		return ErrNotFound
	}
	s.rdb.Del(ctx, "codconfirm:"+code)
	s.pool.Exec(ctx, `insert into order_events (order_id, status, note) values ($1,'confirmed','buyer confirmed COD order')`, orderID)
	return nil
}

// MarkPaid records a captured payment; kind is "order" (full) or "token" (COD token).
func (s *Service) MarkPaid(ctx context.Context, orderID, kind string) error {
	var q string
	if kind == "token" {
		q = `update orders set payment_status='token_paid', cod_confirmed_at=now(),
			status = case when status='new' then 'confirmed' else status end, updated_at=now()
			where id=$1 returning order_code, business_id, (select phone from customers where id = orders.customer_id)`
	} else {
		q = `update orders set payment_status='paid',
			status = case when status='new' then 'confirmed' else status end, updated_at=now()
			where id=$1 returning order_code, business_id, (select phone from customers where id = orders.customer_id)`
	}
	var code, bizID, phone string
	if err := s.pool.QueryRow(ctx, q, orderID).Scan(&code, &bizID, &phone); err != nil {
		return ErrNotFound
	}
	note := "payment received"
	if kind == "token" {
		note = "COD token payment received"
	}
	s.pool.Exec(ctx, `insert into order_events (order_id, status, note) values ($1,'confirmed',$2)`, orderID, note)
	s.notify.Async("paid", func() error {
		return s.notify.WhatsApp(phone, fmt.Sprintf("Payment received for order %s. We are packing it! Track: %s", code, s.trackURL(code)))
	})
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
	var status, code, phone, courierName, courierTracking string
	var customerID string
	var total int
	err := s.pool.QueryRow(ctx, `select o.status, o.order_code, o.customer_id, o.total, o.courier_name, o.courier_tracking_id,
		c.phone from orders o join customers c on c.id = o.customer_id
		where o.id=$1 and o.business_id=$2`, orderID, bizID).Scan(&status, &code, &customerID, &total, &courierName, &courierTracking, &phone)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if !CanTransition(status, newStatus) {
		return nil, fmt.Errorf("cannot move order from %s to %s", status, newStatus)
	}

	if _, err := s.pool.Exec(ctx, `update orders set status=$2, updated_at=now() where id=$1`, orderID, newStatus); err != nil {
		return nil, err
	}
	s.pool.Exec(ctx, `insert into order_events (order_id, status, note) values ($1,$2,$3)`, orderID, newStatus, note)

	switch newStatus {
	case "delivered":
		s.customers.RecordDelivered(ctx, customerID, total)
	case "rto":
		s.customers.RecordRto(ctx, customerID)
	}
	if msg, ok := buyerStatusMessage[newStatus]; ok {
		text := fmt.Sprintf(msg, code)
		if newStatus == "shipped" && courierName != "" {
			text += fmt.Sprintf(" Courier: %s, tracking id %s.", courierName, courierTracking)
		}
		text += " Track: " + s.trackURL(code)
		s.notify.Async("statusUpdate", func() error { return s.notify.WhatsApp(phone, text) })
	}
	return s.GetByID(ctx, bizID, orderID)
}

// Ship assigns courier details (manual or via Shiprocket) and marks shipped.
func (s *Service) Ship(ctx context.Context, bizID, orderID, courierName, trackingID string) (*Order, error) {
	o, err := s.GetByID(ctx, bizID, orderID)
	if err != nil {
		return nil, err
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

// TrackByCode powers the public tracking page; phone must match the buyer.
func (s *Service) TrackByCode(ctx context.Context, code, phone string) (*Order, string, error) {
	var bizID, bizName string
	err := s.pool.QueryRow(ctx, `select o.business_id, b.name from orders o
		join businesses b on b.id = o.business_id
		join customers c on c.id = o.customer_id
		where o.order_code=$1 and c.phone=$2`, code, phone).Scan(&bizID, &bizName)
	if err != nil {
		return nil, "", ErrNotFound
	}
	o, err := s.getOne(ctx, `o.order_code=$2 and o.business_id=$1`, bizID, code)
	return o, bizName, err
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
	Status  string
	Search  string
	Payment string
	Limit   int
	Offset  int
}

func (s *Service) List(ctx context.Context, bizID string, f ListFilter) ([]Order, error) {
	where := "o.business_id = $1"
	args := []any{bizID}
	if f.Status != "" {
		args = append(args, f.Status)
		where += fmt.Sprintf(" and o.status = $%d", len(args))
	}
	if f.Payment != "" {
		args = append(args, f.Payment)
		where += fmt.Sprintf(" and o.payment_method = $%d", len(args))
	}
	if f.Search != "" {
		args = append(args, "%"+f.Search+"%")
		where += fmt.Sprintf(" and (o.order_code ilike $%d or c.name ilike $%d or c.phone like $%d)", len(args), len(args), len(args))
	}
	args = append(args, f.Limit, f.Offset)
	return s.query(ctx, where+fmt.Sprintf(" order by o.created_at desc limit $%d offset $%d", len(args)-1, len(args)), args...)
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
	rows, err := s.pool.Query(ctx, `select o.id, o.order_code, o.status, o.payment_method, o.payment_status, o.source,
		o.items, o.subtotal, o.discount, o.shipping, o.total, o.token_amount, o.offer_code, o.notes,
		o.customer_id, c.name, c.phone, o.address, o.courier_name, o.courier_tracking_id, o.risk_flagged,
		coalesce(to_char(o.cod_confirmed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
		to_char(o.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		from orders o join customers c on c.id = o.customer_id where `+whereOrder, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Order
	for rows.Next() {
		var o Order
		var items, addr []byte
		if err := rows.Scan(&o.ID, &o.Code, &o.Status, &o.PaymentMethod, &o.PaymentStatus, &o.Source,
			&items, &o.Subtotal, &o.Discount, &o.Shipping, &o.Total, &o.TokenAmount, &o.OfferCode, &o.Notes,
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
	return s.baseURL + "/p/orders/" + code
}
