package product

import (
	"context"
	"encoding/json"
	"errors"
	"slices"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type Offer struct {
	ID         string   `json:"id"`
	Code       string   `json:"code"`
	Kind       string   `json:"kind"` // percent | flat
	Value      int      `json:"value"`
	MinAmount  int      `json:"minAmount"`
	ProductIDs []string `json:"productIds,omitempty"` // empty = all products
	Active     bool     `json:"active"`
	ExpiresAt  string   `json:"expiresAt,omitempty"`
	// limits: 0 / false = none
	MaxDiscount    int  `json:"maxDiscount"`    // paise cap on a percent offer
	MaxUses        int  `json:"maxUses"`        // orders in total
	MaxPerCustomer int  `json:"maxPerCustomer"` // orders per buyer
	FirstOrderOnly bool `json:"firstOrderOnly"`
	Uses           int  `json:"uses"` // orders that used it, cancelled ones excluded
}

func (in *Offer) validate() (productIDs, expiresAt any, err error) {
	in.Code = strings.ToUpper(strings.TrimSpace(in.Code))
	if in.Code == "" || len(in.Code) > 30 {
		return nil, nil, errors.New("code is required (up to 30 characters)")
	}
	if in.Kind != "percent" && in.Kind != "flat" {
		return nil, nil, errors.New("kind must be percent or flat")
	}
	if in.Value <= 0 || (in.Kind == "percent" && in.Value > 100) {
		return nil, nil, errors.New("invalid offer value")
	}
	if in.MinAmount < 0 || in.MaxDiscount < 0 || in.MaxUses < 0 || in.MaxPerCustomer < 0 {
		return nil, nil, errors.New("limits cannot be negative")
	}
	if len(in.ProductIDs) > 0 {
		raw, _ := json.Marshal(in.ProductIDs)
		productIDs = string(raw)
	}
	if in.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, in.ExpiresAt)
		if err != nil {
			return nil, nil, errors.New("expiresAt must be RFC3339")
		}
		expiresAt = t
	}
	return productIDs, expiresAt, nil
}

func (s *Service) CreateOffer(ctx context.Context, bizID string, in Offer) (*Offer, error) {
	productIDs, expiresAt, err := in.validate()
	if err != nil {
		return nil, err
	}
	err = s.pool.QueryRow(ctx, `insert into offers (business_id, code, kind, value, min_amount, product_ids, active, expires_at,
		max_discount, max_uses, max_per_customer, first_order_only)
		values ($1,$2,$3,$4,$5,$6::jsonb,true,$7,$8,$9,$10,$11) returning id`,
		bizID, in.Code, in.Kind, in.Value, in.MinAmount, productIDs, expiresAt,
		in.MaxDiscount, in.MaxUses, in.MaxPerCustomer, in.FirstOrderOnly).Scan(&in.ID)
	if err != nil {
		if strings.Contains(err.Error(), "offers_business_id_code_key") {
			return nil, errors.New("offer code already exists")
		}
		return nil, err
	}
	in.Active = true
	return &in, nil
}

// UpdateOffer edits an offer in place. The code can change too; orders keep
// the code they were placed with.
func (s *Service) UpdateOffer(ctx context.Context, bizID, id string, in Offer) error {
	productIDs, expiresAt, err := in.validate()
	if err != nil {
		return err
	}
	ct, err := s.pool.Exec(ctx, `update offers set code=$3, kind=$4, value=$5, min_amount=$6, product_ids=$7::jsonb,
		expires_at=$8, max_discount=$9, max_uses=$10, max_per_customer=$11, first_order_only=$12, active=$13
		where id=$1 and business_id=$2`, id, bizID, in.Code, in.Kind, in.Value, in.MinAmount, productIDs, expiresAt,
		in.MaxDiscount, in.MaxUses, in.MaxPerCustomer, in.FirstOrderOnly, in.Active)
	if err != nil {
		if strings.Contains(err.Error(), "offers_business_id_code_key") {
			return errors.New("offer code already exists")
		}
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("offer not found")
	}
	return nil
}

func (s *Service) DeleteOffer(ctx context.Context, bizID, id string) error {
	ct, err := s.pool.Exec(ctx, `delete from offers where id=$1 and business_id=$2`, id, bizID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("offer not found")
	}
	return nil
}

func (s *Service) ListOffers(ctx context.Context, bizID string) ([]Offer, error) {
	rows, err := s.pool.Query(ctx, `select f.id, f.code, f.kind, f.value, f.min_amount, f.product_ids, f.active,
		coalesce(to_char(f.expires_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
		f.max_discount, f.max_uses, f.max_per_customer, f.first_order_only,
		(select count(*) from orders o where o.business_id = f.business_id and o.offer_code = f.code and o.status <> 'cancelled')
		from offers f where f.business_id=$1 order by f.created_at desc`, bizID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Offer
	for rows.Next() {
		var o Offer
		var productIDs []byte
		if err := rows.Scan(&o.ID, &o.Code, &o.Kind, &o.Value, &o.MinAmount, &productIDs, &o.Active, &o.ExpiresAt,
			&o.MaxDiscount, &o.MaxUses, &o.MaxPerCustomer, &o.FirstOrderOnly, &o.Uses); err != nil {
			return nil, err
		}
		if productIDs != nil {
			json.Unmarshal(productIDs, &o.ProductIDs)
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (s *Service) SetOfferActive(ctx context.Context, bizID, id string, active bool) error {
	ct, err := s.pool.Exec(ctx, `update offers set active=$3 where id=$1 and business_id=$2`, id, bizID, active)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("offer not found")
	}
	return nil
}

// ApplyOffer computes the discount (paise) for a cart and buyer, validating
// code state, expiry, minimum amount, product scope and usage limits. Inside
// the order transaction an advisory lock per offer serialises redemptions, so
// a "first 50 orders" code cannot be used 51 times by two buyers at once.
// Uses are counted from orders (cancelled ones excluded), so a cancelled order
// hands its use back.
func (s *Service) ApplyOffer(ctx context.Context, q DB, bizID, code string, lines []Line, customerID string) (int, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	var offerID, kind string
	var value, minAmount, maxDiscount, maxUses, maxPerCustomer int
	var firstOrderOnly bool
	var productIDsRaw []byte
	err := q.QueryRow(ctx, `select id, kind, value, min_amount, product_ids, max_discount, max_uses, max_per_customer,
		first_order_only from offers
		where business_id=$1 and code=$2 and active and (expires_at is null or expires_at > now())`,
		bizID, code).Scan(&offerID, &kind, &value, &minAmount, &productIDsRaw, &maxDiscount, &maxUses, &maxPerCustomer, &firstOrderOnly)
	if err != nil {
		return 0, errors.New("invalid or expired offer code")
	}

	eligible := 0
	subtotal := 0
	var scope []string
	if productIDsRaw != nil {
		json.Unmarshal(productIDsRaw, &scope)
	}
	for _, l := range lines {
		subtotal += l.Price * l.Qty
		if len(scope) == 0 || slices.Contains(scope, l.ProductID) {
			eligible += l.Price * l.Qty
		}
	}
	if subtotal < minAmount {
		return 0, errors.New("cart does not meet the offer minimum amount")
	}
	if eligible == 0 {
		return 0, errors.New("offer does not apply to these products")
	}

	if maxUses > 0 || maxPerCustomer > 0 || firstOrderOnly {
		if _, err := q.Exec(ctx, `select pg_advisory_xact_lock(hashtext('offer:' || $1))`, offerID); err != nil {
			return 0, err
		}
		var total, mine, previous int
		if err := q.QueryRow(ctx, `select
			count(*) filter (where offer_code = $2),
			count(*) filter (where offer_code = $2 and customer_id = nullif($3, '')::uuid),
			count(*) filter (where customer_id = nullif($3, '')::uuid)
			from orders where business_id=$1 and status <> 'cancelled'
			and (offer_code = $2 or customer_id = nullif($3, '')::uuid)`, bizID, code, customerID).Scan(&total, &mine, &previous); err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return 0, err
		}
		switch {
		case maxUses > 0 && total >= maxUses:
			return 0, errors.New("this offer has been fully redeemed")
		case maxPerCustomer > 0 && mine >= maxPerCustomer:
			return 0, errors.New("you have already used this offer")
		case firstOrderOnly && previous > 0:
			return 0, errors.New("this offer is for first orders only")
		}
	}

	discount := value
	if kind == "percent" {
		discount = eligible * value / 100
		if maxDiscount > 0 {
			discount = min(discount, maxDiscount)
		}
	}
	return min(discount, eligible), nil
}
