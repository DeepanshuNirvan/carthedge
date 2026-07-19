package product

import (
	"context"
	"encoding/json"
	"errors"
	"slices"
	"strings"
	"time"
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
}

func (s *Service) CreateOffer(ctx context.Context, bizID string, in Offer) (*Offer, error) {
	in.Code = strings.ToUpper(strings.TrimSpace(in.Code))
	if in.Code == "" {
		return nil, errors.New("code is required")
	}
	if in.Kind != "percent" && in.Kind != "flat" {
		return nil, errors.New("kind must be percent or flat")
	}
	if in.Value <= 0 || (in.Kind == "percent" && in.Value > 100) {
		return nil, errors.New("invalid offer value")
	}
	var productIDs any
	if len(in.ProductIDs) > 0 {
		raw, _ := json.Marshal(in.ProductIDs)
		productIDs = string(raw)
	}
	var expiresAt any
	if in.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, in.ExpiresAt)
		if err != nil {
			return nil, errors.New("expiresAt must be RFC3339")
		}
		expiresAt = t
	}
	err := s.pool.QueryRow(ctx, `insert into offers (business_id, code, kind, value, min_amount, product_ids, active, expires_at)
		values ($1,$2,$3,$4,$5,$6::jsonb,true,$7) returning id`,
		bizID, in.Code, in.Kind, in.Value, in.MinAmount, productIDs, expiresAt).Scan(&in.ID)
	if err != nil {
		if strings.Contains(err.Error(), "offers_business_id_code_key") {
			return nil, errors.New("offer code already exists")
		}
		return nil, err
	}
	in.Active = true
	return &in, nil
}

func (s *Service) ListOffers(ctx context.Context, bizID string) ([]Offer, error) {
	rows, err := s.pool.Query(ctx, `select id, code, kind, value, min_amount, product_ids, active,
		coalesce(to_char(expires_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '')
		from offers where business_id=$1 order by created_at desc`, bizID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Offer
	for rows.Next() {
		var o Offer
		var productIDs []byte
		if err := rows.Scan(&o.ID, &o.Code, &o.Kind, &o.Value, &o.MinAmount, &productIDs, &o.Active, &o.ExpiresAt); err != nil {
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

// ApplyOffer computes the discount (paise) for a cart, validating code state,
// expiry, minimum amount and product scope.
func (s *Service) ApplyOffer(ctx context.Context, bizID, code string, lines []Line) (int, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	var kind string
	var value, minAmount int
	var productIDsRaw []byte
	err := s.pool.QueryRow(ctx, `select kind, value, min_amount, product_ids from offers
		where business_id=$1 and code=$2 and active and (expires_at is null or expires_at > now())`,
		bizID, code).Scan(&kind, &value, &minAmount, &productIDsRaw)
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
	discount := value
	if kind == "percent" {
		discount = eligible * value / 100
	}
	return min(discount, eligible), nil
}
