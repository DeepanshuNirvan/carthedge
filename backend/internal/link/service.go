package link

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"carthedge/internal/product"
	"carthedge/internal/secure"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("link not found or expired")

// ItemRef is what a link stores: a pointer into the live catalog.
type ItemRef struct {
	ProductID string `json:"productId"`
	VariantID string `json:"variantId,omitempty"`
	Qty       int    `json:"qty"`
}

type Link struct {
	ID          string    `json:"id"`
	Token       string    `json:"token"`
	URL         string    `json:"url"`
	Kind        string    `json:"kind"` // product | cart | custom
	Title       string    `json:"title"`
	Items       []ItemRef `json:"items,omitempty"`
	Amount      int       `json:"amount,omitempty"`
	Active      bool      `json:"active"`
	Clicks      int       `json:"clicks"`
	OrdersCount int       `json:"ordersCount"`
	ExpiresAt   string    `json:"expiresAt,omitempty"`
	CreatedAt   string    `json:"createdAt"`
}

// Resolved is the buyer-facing checkout payload behind a link.
type Resolved struct {
	Business struct {
		ID          string `json:"-"`
		Code        string `json:"code"`
		Name        string `json:"name"`
		LogoURL     string `json:"logoUrl"`
		WhatsApp    string `json:"whatsapp"`
		CodEnabled  bool   `json:"codEnabled"`
		ShippingFee int    `json:"shippingFee"`
		Verified    bool   `json:"verified"` // trust strip
	} `json:"business"`
	LinkID string           `json:"-"`
	Kind   string           `json:"kind"`
	Title  string           `json:"title"`
	Amount int              `json:"amount,omitempty"`
	Items  []product.Public `json:"items,omitempty"`
	Refs   []ItemRef        `json:"-"`
	Paused bool             `json:"paused"`
}

type Service struct {
	pool     *pgxpool.Pool
	products *product.Service
	baseURL  string
}

func NewService(pool *pgxpool.Pool, products *product.Service, baseURL string) *Service {
	return &Service{pool: pool, products: products, baseURL: baseURL}
}

type CreateInput struct {
	Kind      string    `json:"kind"`
	Title     string    `json:"title"`
	Items     []ItemRef `json:"items"`
	Amount    int       `json:"amount"`
	ExpiresAt string    `json:"expiresAt"`
}

func (s *Service) Create(ctx context.Context, bizID, bizCode string, in CreateInput) (*Link, error) {
	switch in.Kind {
	case "product":
		if len(in.Items) != 1 {
			return nil, errors.New("product link needs exactly one item")
		}
	case "cart":
		if len(in.Items) == 0 {
			return nil, errors.New("cart link needs at least one item")
		}
	case "custom":
		if in.Title == "" || in.Amount <= 0 {
			return nil, errors.New("custom link needs title and amount (paise)")
		}
		in.Items = nil
	default:
		return nil, errors.New("kind must be product, cart or custom")
	}
	// validate referenced products belong to this business
	for _, ref := range in.Items {
		if _, err := s.products.Get(ctx, bizID, ref.ProductID); err != nil {
			return nil, fmt.Errorf("product %s not found", ref.ProductID)
		}
	}
	var expiresAt any
	if in.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, in.ExpiresAt)
		if err != nil {
			return nil, errors.New("expiresAt must be RFC3339")
		}
		expiresAt = t
	}
	items, _ := json.Marshal(orEmptyRefs(in.Items))
	token := secure.Token(10)
	var id string
	err := s.pool.QueryRow(ctx, `insert into order_links (business_id, token, kind, title, items, amount, expires_at)
		values ($1,$2,$3,$4,$5::jsonb,$6,$7) returning id`,
		bizID, token, in.Kind, in.Title, string(items), in.Amount, expiresAt).Scan(&id)
	if err != nil {
		return nil, err
	}
	return &Link{ID: id, Token: token, URL: s.URL(bizCode, token), Kind: in.Kind, Title: in.Title,
		Items: in.Items, Amount: in.Amount, Active: true, ExpiresAt: in.ExpiresAt}, nil
}

// URL is the page the buyer opens, not the API that feeds it — /p/... returns
// JSON, so a shared link must point at the checkout route the SPA serves.
func (s *Service) URL(bizCode, token string) string {
	return fmt.Sprintf("%s/l/%s/%s", s.baseURL, bizCode, token)
}

func (s *Service) List(ctx context.Context, bizID, bizCode string, limit, offset int) ([]Link, error) {
	rows, err := s.pool.Query(ctx, `select id, token, kind, title, items, amount, active, clicks, orders_count,
		coalesce(to_char(expires_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
		to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		from order_links where business_id=$1 order by created_at desc limit $2 offset $3`, bizID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Link
	for rows.Next() {
		var l Link
		var items []byte
		if err := rows.Scan(&l.ID, &l.Token, &l.Kind, &l.Title, &items, &l.Amount, &l.Active,
			&l.Clicks, &l.OrdersCount, &l.ExpiresAt, &l.CreatedAt); err != nil {
			return nil, err
		}
		json.Unmarshal(items, &l.Items)
		l.URL = s.URL(bizCode, l.Token)
		out = append(out, l)
	}
	return out, rows.Err()
}

func (s *Service) SetActive(ctx context.Context, bizID, id string, active bool) error {
	ct, err := s.pool.Exec(ctx, `update order_links set active=$3 where id=$1 and business_id=$2`, id, bizID, active)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// Resolve loads the checkout payload for a public link and counts the click.
func (s *Service) Resolve(ctx context.Context, bizCode, token string) (*Resolved, error) {
	var res Resolved
	var linkBizID string
	var items []byte
	err := s.pool.QueryRow(ctx, `select l.id, l.kind, l.title, l.items, l.amount, b.id, b.code, b.name,
		b.logo_url, b.whatsapp, b.cod_enabled, b.shipping_fee
		from order_links l join businesses b on b.id = l.business_id
		where b.code = $1 and l.token = $2 and l.active and b.status = 'active'
		and (l.expires_at is null or l.expires_at > now())`, bizCode, token).Scan(
		&res.LinkID, &res.Kind, &res.Title, &items, &res.Amount, &linkBizID, &res.Business.Code, &res.Business.Name,
		&res.Business.LogoURL, &res.Business.WhatsApp, &res.Business.CodEnabled, &res.Business.ShippingFee)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	res.Business.ID = linkBizID
	res.Business.Verified = true
	json.Unmarshal(items, &res.Refs)

	for _, ref := range res.Refs {
		p, err := s.products.Get(ctx, linkBizID, ref.ProductID)
		if err != nil {
			continue // product deleted since link was made
		}
		res.Items = append(res.Items, product.ToPublic([]product.Product{*p})[0])
	}
	if res.Kind != "custom" && len(res.Items) == 0 {
		return nil, ErrNotFound
	}
	go s.pool.Exec(context.Background(), `update order_links set clicks = clicks + 1 where id=$1`, res.LinkID)
	return &res, nil
}

func orEmptyRefs(refs []ItemRef) []ItemRef {
	if refs == nil {
		return []ItemRef{}
	}
	return refs
}
