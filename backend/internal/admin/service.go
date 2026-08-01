package admin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"carthedge/internal/config"
	"carthedge/internal/httpx"
	"carthedge/internal/notify"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

var ErrBadLogin = errors.New("invalid email or password")

type Service struct {
	pool   *pgxpool.Pool
	rdb    *redis.Client
	cfg    *config.Config
	notify *notify.Notifier
}

func NewService(pool *pgxpool.Pool, rdb *redis.Client, cfg *config.Config, n *notify.Notifier) *Service {
	return &Service{pool: pool, rdb: rdb, cfg: cfg, notify: n}
}

type Session struct {
	AccessToken string `json:"accessToken"`
	Name        string `json:"name"`
	Email       string `json:"email"`
}

func (s *Service) Login(ctx context.Context, email, password string) (*Session, error) {
	var id, name, hash string
	err := s.pool.QueryRow(ctx, `select id, name, password_hash from admins where email=$1`, email).Scan(&id, &name, &hash)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return nil, ErrBadLogin
	}
	now := time.Now()
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": id, "role": "admin", "iat": now.Unix(), "exp": now.Add(s.cfg.AccessTTL).Unix(),
	}).SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return nil, err
	}
	return &Session{AccessToken: token, Name: name, Email: email}, nil
}

func (s *Service) ChangePassword(ctx context.Context, adminID, current, next string) error {
	var hash string
	if err := s.pool.QueryRow(ctx, `select password_hash from admins where id=$1`, adminID).Scan(&hash); err != nil {
		return errors.New("admin not found")
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(current)) != nil {
		return errors.New("current password is incorrect")
	}
	if len(next) < 8 {
		return errors.New("new password must be at least 8 characters")
	}
	newHash, err := bcrypt.GenerateFromPassword([]byte(next), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `update admins set password_hash=$2 where id=$1`, adminID, string(newHash))
	return err
}

// Overview aggregates the platform health numbers for the admin dashboard.
func (s *Service) Overview(ctx context.Context) (httpx.M, error) {
	out := httpx.M{}
	err := s.pool.QueryRow(ctx, `select
		count(*),
		count(*) filter (where status = 'suspended'),
		count(*) filter (where created_at > now() - interval '30 days')
		from businesses`).Scan(ptr(out, "totalBusinesses"), ptr(out, "suspended"), ptr(out, "newLast30Days"))
	if err != nil {
		return nil, err
	}
	err = s.pool.QueryRow(ctx, `select
		count(*) filter (where status = 'trial' and ends_at > now()),
		count(*) filter (where status in ('active','cancelled') and ends_at > now()),
		count(*) filter (where ends_at <= now()),
		coalesce(sum(coalesce(custom_price, p.price_monthly)) filter (where s.status = 'active' and ends_at > now()), 0)
		from subscriptions s join plans p on p.id = s.plan_id`).Scan(
		ptr(out, "trials"), ptr(out, "paying"), ptr(out, "expired"), ptr(out, "mrr"))
	if err != nil {
		return nil, err
	}
	err = s.pool.QueryRow(ctx, `select count(*), coalesce(sum(total), 0),
		count(*) filter (where created_at > now() - interval '30 days'),
		coalesce(sum(total) filter (where created_at > now() - interval '30 days'), 0)
		from orders where status not in ('cancelled')`).Scan(
		ptr(out, "totalOrders"), ptr(out, "gmv"), ptr(out, "ordersLast30Days"), ptr(out, "gmvLast30Days"))
	if err != nil {
		return nil, err
	}
	err = s.pool.QueryRow(ctx, `select coalesce(sum(amount), 0),
		coalesce(sum(amount) filter (where created_at > date_trunc('month', now())), 0)
		from payments where kind = 'subscription' and status = 'paid'`).Scan(
		ptr(out, "revenueTotal"), ptr(out, "revenueThisMonth"))
	if err != nil {
		return nil, err
	}
	var open int
	if err := s.pool.QueryRow(ctx, `select count(*) from plan_requests where status = 'open'`).Scan(&open); err != nil {
		return nil, err
	}
	out["openPlanRequests"] = open
	var enquiries int
	if err := s.pool.QueryRow(ctx, `select count(*) from contact_messages where status = 'open'`).Scan(&enquiries); err != nil {
		return nil, err
	}
	out["openEnquiries"] = enquiries
	return out, nil
}

// ptr scans a query column straight into a map entry.
func ptr(m httpx.M, key string) *int64 {
	v := new(int64)
	m[key] = v
	return v
}

type BusinessRow struct {
	ID        string `json:"id"`
	Code      string `json:"code"`
	Name      string `json:"name"`
	OwnerName string `json:"ownerName"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	City      string `json:"city"`
	Status    string `json:"status"`
	PlanCode  string `json:"planCode"`
	SubStatus string `json:"subscriptionStatus"`
	EndsAt    string `json:"subscriptionEndsAt"`
	Orders    int    `json:"ordersCount"`
	CreatedAt string `json:"createdAt"`
}

func (s *Service) Businesses(ctx context.Context, search, status string, limit, offset int) ([]BusinessRow, int, error) {
	where := "true"
	args := []any{}
	if search != "" {
		args = append(args, "%"+search+"%")
		where += fmt.Sprintf(" and (b.name ilike $%d or b.email ilike $%d or b.code ilike $%d)", len(args), len(args), len(args))
	}
	if status != "" {
		args = append(args, status)
		where += fmt.Sprintf(" and b.status = $%d", len(args))
	}
	var total int
	if err := s.pool.QueryRow(ctx, `select count(*) from businesses b where `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	args = append(args, limit, offset)
	rows, err := s.pool.Query(ctx, fmt.Sprintf(`select b.id, b.code, b.name, b.owner_name, b.email, b.phone, b.city, b.status,
		coalesce(p.code, ''), coalesce(s.status, ''), coalesce(to_char(s.ends_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
		(select count(*) from orders o where o.business_id = b.id), b.created_at
		from businesses b
		left join subscriptions s on s.business_id = b.id
		left join plans p on p.id = s.plan_id
		where `+where+` order by b.created_at desc limit $%d offset $%d`, len(args)-1, len(args)), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []BusinessRow
	for rows.Next() {
		var b BusinessRow
		var createdAt time.Time
		if err := rows.Scan(&b.ID, &b.Code, &b.Name, &b.OwnerName, &b.Email, &b.Phone, &b.City, &b.Status,
			&b.PlanCode, &b.SubStatus, &b.EndsAt, &b.Orders, &createdAt); err != nil {
			return nil, 0, err
		}
		b.CreatedAt = createdAt.Format(time.RFC3339)
		out = append(out, b)
	}
	return out, total, rows.Err()
}

func (s *Service) BusinessDetail(ctx context.Context, id string) (httpx.M, error) {
	out := httpx.M{}
	var name, code, owner, email, phone, whatsapp, instagram, city, state, status, gstin string
	var createdAt time.Time
	err := s.pool.QueryRow(ctx, `select name, code, owner_name, email, phone, whatsapp, instagram, city, state, status, gstin, created_at
		from businesses where id=$1`, id).Scan(&name, &code, &owner, &email, &phone, &whatsapp, &instagram, &city, &state, &status, &gstin, &createdAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("business not found")
	}
	if err != nil {
		return nil, err
	}
	out["business"] = httpx.M{"id": id, "name": name, "code": code, "ownerName": owner, "email": email,
		"phone": phone, "whatsapp": whatsapp, "instagram": instagram, "city": city, "state": state,
		"status": status, "gstin": gstin, "createdAt": createdAt.Format(time.RFC3339)}

	var planCode, planName, subStatus string
	var customPrice *int
	var endsAt time.Time
	err = s.pool.QueryRow(ctx, `select p.code, p.name, s.status, s.custom_price, s.ends_at
		from subscriptions s join plans p on p.id = s.plan_id where s.business_id=$1`, id).Scan(
		&planCode, &planName, &subStatus, &customPrice, &endsAt)
	if err == nil {
		sub := httpx.M{"planCode": planCode, "planName": planName, "status": subStatus, "endsAt": endsAt.Format(time.RFC3339)}
		if customPrice != nil {
			sub["customPrice"] = *customPrice
		}
		out["subscription"] = sub
	}

	usage := httpx.M{}
	err = s.pool.QueryRow(ctx, `select
		(select count(*) from orders where business_id=$1),
		(select coalesce(sum(total),0) from orders where business_id=$1 and status not in ('cancelled')),
		(select count(*) from orders where business_id=$1 and created_at > now() - interval '30 days'),
		(select count(*) from products where business_id=$1 and active),
		(select count(*) from customers where business_id=$1)`, id).Scan(
		ptr(usage, "ordersTotal"), ptr(usage, "gmv"), ptr(usage, "ordersLast30Days"), ptr(usage, "products"), ptr(usage, "customers"))
	if err != nil {
		return nil, err
	}
	out["usage"] = usage
	return out, nil
}

func (s *Service) SetBusinessStatus(ctx context.Context, id, status string) error {
	if status != "active" && status != "suspended" {
		return errors.New("status must be active or suspended")
	}
	ct, err := s.pool.Exec(ctx, `update businesses set status=$2, updated_at=now() where id=$1`, id, status)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("business not found")
	}
	s.rdb.Del(ctx, "sub:"+id) // suspension takes effect immediately, not after cache TTL
	return nil
}

// AssignPlan lets the admin move a business to any plan, set a negotiated
// price and optionally extend the subscription (customPrice nil clears it).
func (s *Service) AssignPlan(ctx context.Context, bizID, planCode string, customPrice *int, extendDays int) error {
	if extendDays < 0 || extendDays > 730 {
		return errors.New("extendDays must be between 0 and 730")
	}
	ct, err := s.pool.Exec(ctx, `update subscriptions set
		plan_id = (select id from plans where code=$2 and active),
		custom_price = $3,
		status = 'active',
		ends_at = greatest(ends_at, now()) + make_interval(days => $4),
		updated_at = now()
		where business_id = $1`, bizID, planCode, customPrice, extendDays)
	if err != nil {
		return errors.New("plan not found")
	}
	if ct.RowsAffected() == 0 {
		return errors.New("subscription not found")
	}
	s.rdb.Del(ctx, "sub:"+bizID)
	return nil
}

// Capabilities are the entitlements a plan can grant. The admin picks from this
// list; the API gates every paid route against it.
var Capabilities = []string{"ai", "aiReply", "broadcasts", "offers", "invoices", "courier", "waitlist"}

type PlanInput struct {
	Code         string   `json:"code"`
	Name         string   `json:"name"`
	PriceMonthly int      `json:"priceMonthly"`
	OrderQuota   int      `json:"orderQuota"`
	PerOrderFee  int      `json:"perOrderFee"`
	Features     []string `json:"features"`     // marketing bullets for the pricing page
	Capabilities []string `json:"capabilities"` // enforced entitlements
	IsCustom     bool     `json:"isCustom"`
	Active       *bool    `json:"active"`
}

func (in *PlanInput) validate() error {
	if in.Code == "" || in.Name == "" {
		return errors.New("code and name are required")
	}
	if in.PriceMonthly < 0 || in.OrderQuota < 0 || in.PerOrderFee < 0 {
		return errors.New("amounts cannot be negative")
	}
	for _, c := range in.Capabilities {
		if !slices.Contains(Capabilities, c) {
			return fmt.Errorf("unknown capability %q", c)
		}
	}
	return nil
}

func (s *Service) Plans(ctx context.Context) ([]httpx.M, error) {
	rows, err := s.pool.Query(ctx, `select p.id, p.code, p.name, p.price_monthly, p.order_quota, p.per_order_fee,
		p.features, p.capabilities, p.is_custom, p.active,
		(select count(*) from subscriptions s where s.plan_id = p.id and s.ends_at > now())
		from plans p order by p.is_custom, p.price_monthly`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []httpx.M
	for rows.Next() {
		var id, code, name string
		var price, quota, fee, subs int
		var features, capabilities []byte
		var isCustom, active bool
		if err := rows.Scan(&id, &code, &name, &price, &quota, &fee, &features, &capabilities, &isCustom, &active, &subs); err != nil {
			return nil, err
		}
		var feats, caps []string
		json.Unmarshal(features, &feats)
		json.Unmarshal(capabilities, &caps)
		out = append(out, httpx.M{"id": id, "code": code, "name": name, "priceMonthly": price,
			"orderQuota": quota, "perOrderFee": fee, "features": feats, "capabilities": caps,
			"isCustom": isCustom, "active": active, "activeSubscriptions": subs})
	}
	return out, rows.Err()
}

func (s *Service) CreatePlan(ctx context.Context, in PlanInput) error {
	if err := in.validate(); err != nil {
		return err
	}
	features, _ := json.Marshal(orEmpty(in.Features))
	caps, _ := json.Marshal(orEmpty(in.Capabilities))
	_, err := s.pool.Exec(ctx, `insert into plans (code, name, price_monthly, order_quota, per_order_fee, features, capabilities, is_custom)
		values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8)`, in.Code, in.Name, in.PriceMonthly, in.OrderQuota,
		in.PerOrderFee, string(features), string(caps), in.IsCustom)
	if err != nil {
		return errors.New("plan code already exists")
	}
	return nil
}

func (s *Service) UpdatePlan(ctx context.Context, id string, in PlanInput) error {
	if err := in.validate(); err != nil {
		return err
	}
	features, _ := json.Marshal(orEmpty(in.Features))
	caps, _ := json.Marshal(orEmpty(in.Capabilities))
	active := in.Active == nil || *in.Active
	ct, err := s.pool.Exec(ctx, `update plans set code=$2, name=$3, price_monthly=$4, order_quota=$5,
		per_order_fee=$6, features=$7::jsonb, capabilities=$8::jsonb, is_custom=$9, active=$10 where id=$1`,
		id, in.Code, in.Name, in.PriceMonthly, in.OrderQuota, in.PerOrderFee, string(features), string(caps), in.IsCustom, active)
	if err != nil {
		return errors.New("plan code already exists")
	}
	if ct.RowsAffected() == 0 {
		return errors.New("plan not found")
	}
	// price, quota and entitlements are cached per business — drop them all
	s.dropAccessCache(ctx, id)
	return nil
}

// dropAccessCache clears the cached plan gate for everyone on a plan, so an
// admin edit takes effect now instead of after the TTL.
func (s *Service) dropAccessCache(ctx context.Context, planID string) {
	rows, err := s.pool.Query(ctx, `select business_id from subscriptions where plan_id = $1`, planID)
	if err != nil {
		return
	}
	defer rows.Close()
	for rows.Next() {
		var bizID string
		if rows.Scan(&bizID) == nil {
			s.rdb.Del(ctx, "sub:"+bizID)
		}
	}
}

func (s *Service) PlanRequests(ctx context.Context, status string, limit, offset int) ([]httpx.M, error) {
	where := "true"
	args := []any{}
	if status != "" {
		args = append(args, status)
		where = "r.status = $1"
	}
	args = append(args, limit, offset)
	rows, err := s.pool.Query(ctx, fmt.Sprintf(`select r.id, r.business_id, b.name, b.email, b.phone,
		r.message, r.expected_orders, r.status, r.admin_note, r.created_at
		from plan_requests r join businesses b on b.id = r.business_id
		where `+where+` order by r.created_at desc limit $%d offset $%d`, len(args)-1, len(args)), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []httpx.M
	for rows.Next() {
		var id, bizID, name, email, phone, message, reqStatus, note string
		var expected int
		var createdAt time.Time
		if err := rows.Scan(&id, &bizID, &name, &email, &phone, &message, &expected, &reqStatus, &note, &createdAt); err != nil {
			return nil, err
		}
		out = append(out, httpx.M{"id": id, "businessId": bizID, "businessName": name, "email": email,
			"phone": phone, "message": message, "expectedOrders": expected, "status": reqStatus,
			"adminNote": note, "createdAt": createdAt.Format(time.RFC3339)})
	}
	return out, rows.Err()
}

func (s *Service) UpdatePlanRequest(ctx context.Context, id, status, note string) error {
	if status != "open" && status != "contacted" && status != "closed" {
		return errors.New("status must be open, contacted or closed")
	}
	ct, err := s.pool.Exec(ctx, `update plan_requests set status=$2, admin_note=$3, updated_at=now() where id=$1`, id, status, note)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("request not found")
	}
	return nil
}

func (s *Service) Payments(ctx context.Context, limit, offset int) ([]httpx.M, error) {
	rows, err := s.pool.Query(ctx, `select p.id, b.name, b.code, p.amount, p.status, p.razorpay_order_id,
		coalesce(p.notes->>'planCode', ''), p.created_at
		from payments p join businesses b on b.id = p.business_id
		where p.kind = 'subscription' order by p.created_at desc limit $1 offset $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []httpx.M{}
	for rows.Next() {
		var id, name, code, status, rzpID, planCode string
		var amount int
		var createdAt time.Time
		if err := rows.Scan(&id, &name, &code, &amount, &status, &rzpID, &planCode, &createdAt); err != nil {
			return nil, err
		}
		out = append(out, httpx.M{"id": id, "businessName": name, "businessCode": code, "amount": amount,
			"status": status, "razorpayOrderId": rzpID, "planCode": planCode, "createdAt": createdAt.Format(time.RFC3339)})
	}
	return out, rows.Err()
}

// ContactInput is a marketing-site enquiry: a sales lead, so it is stored and
// mailed rather than handed to the visitor's mail client.
type ContactInput struct {
	Name     string `json:"name"`
	Business string `json:"business"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Message  string `json:"message"`
}

func (s *Service) CreateContactMessage(ctx context.Context, in ContactInput) error {
	in.Name, in.Message = strings.TrimSpace(in.Name), strings.TrimSpace(in.Message)
	if len(in.Name) < 2 || len(in.Message) < 10 {
		return errors.New("name and a short message are required")
	}
	if !httpx.ValidEmail(in.Email) {
		return errors.New("a valid email is required")
	}
	if in.Phone != "" {
		phone, ok := httpx.NormalizePhone(in.Phone)
		if !ok {
			return errors.New("phone number is not valid")
		}
		in.Phone = phone
	}
	if _, err := s.pool.Exec(ctx, `insert into contact_messages (name, business, email, phone, message)
		values ($1,$2,$3,$4,$5)`, in.Name, strings.TrimSpace(in.Business), in.Email, in.Phone, in.Message); err != nil {
		return err
	}
	// a lead is worth an inbox ping, but the row is the source of truth
	if to := s.cfg.AdminEmail; to != "" {
		s.notify.Async("contactMessage", func() error {
			return s.notify.Email(to, "New CartHedge enquiry: "+in.Name,
				fmt.Sprintf("Name: %s\nBusiness: %s\nEmail: %s\nPhone: %s\n\n%s",
					in.Name, in.Business, in.Email, in.Phone, in.Message))
		})
	}
	return nil
}

func (s *Service) ContactMessages(ctx context.Context, status string, limit, offset int) ([]httpx.M, error) {
	where := "true"
	args := []any{}
	if status != "" {
		args = append(args, status)
		where = "status = $1"
	}
	args = append(args, limit, offset)
	rows, err := s.pool.Query(ctx, fmt.Sprintf(`select id, name, business, email, phone, message, status, admin_note, created_at
		from contact_messages where `+where+` order by created_at desc limit $%d offset $%d`, len(args)-1, len(args)), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []httpx.M{}
	for rows.Next() {
		var id, name, business, email, phone, message, msgStatus, note string
		var createdAt time.Time
		if err := rows.Scan(&id, &name, &business, &email, &phone, &message, &msgStatus, &note, &createdAt); err != nil {
			return nil, err
		}
		out = append(out, httpx.M{"id": id, "name": name, "business": business, "email": email, "phone": phone,
			"message": message, "status": msgStatus, "adminNote": note, "createdAt": createdAt.Format(time.RFC3339)})
	}
	return out, rows.Err()
}

func (s *Service) UpdateContactMessage(ctx context.Context, id, status, note string) error {
	if status != "open" && status != "contacted" && status != "closed" {
		return errors.New("status must be open, contacted or closed")
	}
	ct, err := s.pool.Exec(ctx, `update contact_messages set status=$2, admin_note=$3, updated_at=now() where id=$1`,
		id, status, note)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("message not found")
	}
	return nil
}

// Settings returns all site_settings rows as {key: value}.
func (s *Service) Settings(ctx context.Context) (httpx.M, error) {
	rows, err := s.pool.Query(ctx, `select key, value from site_settings`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := httpx.M{}
	for rows.Next() {
		var key string
		var value json.RawMessage
		if err := rows.Scan(&key, &value); err != nil {
			return nil, err
		}
		out[key] = value
	}
	return out, rows.Err()
}

func (s *Service) UpdateSettings(ctx context.Context, settings map[string]json.RawMessage) error {
	for key, value := range settings {
		if !json.Valid(value) {
			return fmt.Errorf("invalid value for %q", key)
		}
		if _, err := s.pool.Exec(ctx, `insert into site_settings (key, value) values ($1, $2::jsonb)
			on conflict (key) do update set value = $2::jsonb, updated_at = now()`, key, string(value)); err != nil {
			return err
		}
	}
	return nil
}

func orEmpty(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}
