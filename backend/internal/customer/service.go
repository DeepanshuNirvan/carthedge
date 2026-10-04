package customer

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("customer not found")

type Address struct {
	Line    string `json:"line"`
	City    string `json:"city"`
	State   string `json:"state"`
	Pincode string `json:"pincode"`
}

type Customer struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Phone       string  `json:"phone"`
	Email       string  `json:"email"`
	Segment     string  `json:"segment"`
	LastAddress Address `json:"lastAddress"`
	OrdersCount int     `json:"ordersCount"`
	TotalSpent  int64   `json:"totalSpent"`
	CodRefusals int     `json:"codRefusals"`
	Returns     int     `json:"returnsCount"`
	RiskFlagged bool    `json:"riskFlagged"`
	LastOrderAt string  `json:"lastOrderAt,omitempty"`
	CreatedAt   string  `json:"createdAt"`
	// WhatsApp offers: only a buyer's own yes turns this on (see consent.go)
	MarketingOptIn     bool   `json:"marketingOptIn"`
	MarketingUpdatedAt string `json:"marketingUpdatedAt,omitempty"`
}

// Ref is the slice of customer state order creation needs.
type Ref struct {
	ID          string
	Segment     string
	RiskFlagged bool
	CodRefusals int
}

type Service struct {
	pool *pgxpool.Pool
	// signs the stop link in broadcasts; derived, so it is not the JWT key itself
	linkKey []byte
}

func NewService(pool *pgxpool.Pool, secret string) *Service {
	key := sha256.Sum256([]byte("marketing-link|" + secret))
	return &Service{pool: pool, linkKey: key[:]}
}

// Upsert creates or refreshes the ledger entry for a buyer and bumps order
// counters. It runs in the order's transaction, so an order that is refused
// (stock, offer, payment rules) leaves the ledger untouched.
func (s *Service) Upsert(ctx context.Context, tx pgx.Tx, bizID, name, phone, email string, addr Address) (*Ref, error) {
	addrJSON, _ := json.Marshal(addr)
	var ref Ref
	err := tx.QueryRow(ctx, `insert into customers (business_id, name, phone, email, last_address, orders_count, last_order_at)
		values ($1,$2,$3,$4,$5::jsonb,1,now())
		on conflict (business_id, phone) do update set
			name = excluded.name,
			email = case when excluded.email <> '' then excluded.email else customers.email end,
			last_address = excluded.last_address,
			orders_count = customers.orders_count + 1,
			last_order_at = now(),
			updated_at = now()
		returning id, segment, risk_flagged, cod_refusals`,
		bizID, name, phone, email, string(addrJSON)).Scan(&ref.ID, &ref.Segment, &ref.RiskFlagged, &ref.CodRefusals)
	if err != nil {
		return nil, err
	}
	return &ref, nil
}

// Ref reads a buyer's ledger entry without counting a new order — an
// exchange shipment is not a new purchase.
func (s *Service) Ref(ctx context.Context, tx pgx.Tx, bizID, phone string) (*Ref, error) {
	var ref Ref
	err := tx.QueryRow(ctx, `select id, segment, risk_flagged, cod_refusals from customers
		where business_id=$1 and phone=$2`, bizID, phone).Scan(&ref.ID, &ref.Segment, &ref.RiskFlagged, &ref.CodRefusals)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &ref, err
}

// Erase removes one buyer's personal data on their request (DPDP Act). Orders
// keep items and money for the seller's books; name, phone, email, addresses,
// notes and their WhatsApp chats go. Issued invoices are kept as the law
// requires.
func (s *Service) Erase(ctx context.Context, bizID, id string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var phone string
	err = tx.QueryRow(ctx, `select phone from customers where business_id=$1 and id=$2 for update`, bizID, id).Scan(&phone)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	steps := []struct {
		sql  string
		args []any
	}{
		{`delete from marketing_consents where business_id=$1 and phone=$2`, []any{bizID, phone}},
		{`update customers set name='Erased customer', phone='erased-'||id::text, email='', last_address='{}'::jsonb,
			marketing_opt_in=false, marketing_updated_at=now(), updated_at=now() where id=$1`, []any{id}},
		{`update orders set address='{"line":"","city":"","state":"","pincode":""}'::jsonb, notes='', payment_ref=''
			where customer_id=$1`, []any{id}},
		// WhatsApp names a chat by the number with its country code
		{`delete from conversations where business_id=$1 and channel='whatsapp' and contact_id in ($2, '91'||$2)`, []any{bizID, phone}},
		{`delete from checkout_sessions where business_id=$1 and phone=$2`, []any{bizID, phone}},
		{`delete from waitlist where business_id=$1 and phone=$2`, []any{bizID, phone}},
	}
	for _, st := range steps {
		if _, err := tx.Exec(ctx, st.sql, st.args...); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// Lookup powers repeat-buyer autofill on the checkout page.
func (s *Service) Lookup(ctx context.Context, bizID, phone string) (*Customer, error) {
	c, err := s.scanOne(s.pool.QueryRow(ctx, baseSelect+` where business_id=$1 and phone=$2`, bizID, phone))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return c, err
}

func (s *Service) Get(ctx context.Context, bizID, id string) (*Customer, error) {
	c, err := s.scanOne(s.pool.QueryRow(ctx, baseSelect+` where business_id=$1 and id=$2`, bizID, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return c, err
}

func (s *Service) List(ctx context.Context, bizID, search, segment string, riskOnly bool, limit, offset int) ([]Customer, error) {
	where := "business_id = $1"
	args := []any{bizID}
	if search != "" {
		args = append(args, "%"+search+"%")
		where += fmt.Sprintf(" and (name ilike $%d or phone like $%d)", len(args), len(args))
	}
	if segment != "" {
		args = append(args, segment)
		where += fmt.Sprintf(" and segment = $%d", len(args))
	}
	if riskOnly {
		where += " and risk_flagged"
	}
	args = append(args, limit, offset)
	rows, err := s.pool.Query(ctx, baseSelect+` where `+where+
		fmt.Sprintf(` order by last_order_at desc nulls last limit $%d offset $%d`, len(args)-1, len(args)), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Customer
	for rows.Next() {
		c, err := s.scanOne(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}

// Patch updates seller-managed fields: segment and manual risk flag.
func (s *Service) Patch(ctx context.Context, bizID, id, segment string, riskFlagged *bool) error {
	if segment != "" && segment != "retail" && segment != "reseller" {
		return errors.New("segment must be retail or reseller")
	}
	var seg any
	if segment != "" {
		seg = segment
	}
	ct, err := s.pool.Exec(ctx, `update customers set
		segment = coalesce($3, segment),
		risk_flagged = coalesce($4, risk_flagged),
		updated_at = now()
		where business_id=$1 and id=$2`, bizID, id, seg, riskFlagged)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// RecordDelivered adds delivered order value to lifetime spend.
func (s *Service) RecordDelivered(ctx context.Context, customerID string, amount int) error {
	_, err := s.pool.Exec(ctx, `update customers set total_spent = total_spent + $2, updated_at=now() where id=$1`, customerID, amount)
	return err
}

// RecordRto bumps the refusal count; two refusals flags the buyer as COD risk.
func (s *Service) RecordRto(ctx context.Context, customerID string) error {
	_, err := s.pool.Exec(ctx, `update customers set
		cod_refusals = cod_refusals + 1,
		risk_flagged = (cod_refusals + 1 >= 2) or risk_flagged,
		updated_at = now()
		where id=$1`, customerID)
	return err
}

const baseSelect = `select id, name, phone, email, segment, last_address, orders_count, total_spent,
	cod_refusals, returns_count, risk_flagged, coalesce(to_char(last_order_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
	to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), marketing_opt_in,
	coalesce(to_char(marketing_updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '') from customers`

type scannable interface {
	Scan(dest ...any) error
}

func (s *Service) scanOne(row scannable) (*Customer, error) {
	var c Customer
	var addr []byte
	if err := row.Scan(&c.ID, &c.Name, &c.Phone, &c.Email, &c.Segment, &addr, &c.OrdersCount,
		&c.TotalSpent, &c.CodRefusals, &c.Returns, &c.RiskFlagged, &c.LastOrderAt, &c.CreatedAt,
		&c.MarketingOptIn, &c.MarketingUpdatedAt); err != nil {
		return nil, err
	}
	json.Unmarshal(addr, &c.LastAddress)
	return &c, nil
}
