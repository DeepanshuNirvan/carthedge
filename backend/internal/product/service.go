package product

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"strconv"
	"strings"

	"carthedge/internal/notify"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("product not found")

type Variant struct {
	ID      string `json:"id,omitempty"`
	Name    string `json:"name"`
	Price   int    `json:"price"` // 0 = inherit product price
	Sku     string `json:"sku"`
	InStock bool   `json:"inStock"`
}

type Product struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	Category      string    `json:"category"`
	Price         int       `json:"price"`
	ResellerPrice int       `json:"resellerPrice"`
	ComparePrice  int       `json:"comparePrice"`
	Sku           string    `json:"sku"`
	Images        []string  `json:"images"`
	InStock       bool      `json:"inStock"`
	Trending      bool      `json:"trending"`
	Active        bool      `json:"active"`
	Variants      []Variant `json:"variants"`
	CreatedAt     string    `json:"createdAt"`
}

// Line is a priced order line resolved from the live catalog.
type Line struct {
	ProductID string `json:"productId,omitempty"`
	Name      string `json:"name"`
	Variant   string `json:"variant,omitempty"`
	Qty       int    `json:"qty"`
	Price     int    `json:"price"`
}

type Service struct {
	pool   *pgxpool.Pool
	notify *notify.Notifier
	log    *slog.Logger
}

func NewService(pool *pgxpool.Pool, n *notify.Notifier, log *slog.Logger) *Service {
	return &Service{pool: pool, notify: n, log: log}
}

type Input struct {
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	Category      string    `json:"category"`
	Price         int       `json:"price"`
	ResellerPrice int       `json:"resellerPrice"`
	ComparePrice  int       `json:"comparePrice"`
	Sku           string    `json:"sku"`
	Images        []string  `json:"images"`
	InStock       *bool     `json:"inStock"`
	Trending      bool      `json:"trending"`
	Variants      []Variant `json:"variants"`
}

func (in *Input) validate() error {
	if strings.TrimSpace(in.Name) == "" {
		return errors.New("name is required")
	}
	if in.Price <= 0 {
		return errors.New("price must be positive (in paise)")
	}
	return nil
}

func (s *Service) Create(ctx context.Context, bizID string, in Input) (*Product, error) {
	if err := in.validate(); err != nil {
		return nil, err
	}
	inStock := in.InStock == nil || *in.InStock
	images, _ := json.Marshal(orEmpty(in.Images))

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var id string
	err = tx.QueryRow(ctx, `insert into products
		(business_id, name, description, category, price, reseller_price, compare_price, sku, images, in_stock, trending)
		values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11) returning id`,
		bizID, in.Name, in.Description, in.Category, in.Price, in.ResellerPrice, in.ComparePrice, in.Sku, string(images), inStock, in.Trending).Scan(&id)
	if err != nil {
		return nil, err
	}
	if err := insertVariants(ctx, tx, id, in.Variants); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.Get(ctx, bizID, id)
}

func (s *Service) Update(ctx context.Context, bizID, id string, in Input) (*Product, error) {
	if err := in.validate(); err != nil {
		return nil, err
	}
	inStock := in.InStock == nil || *in.InStock
	images, _ := json.Marshal(orEmpty(in.Images))

	var wasInStock bool
	if err := s.pool.QueryRow(ctx, `select in_stock from products where id=$1 and business_id=$2 and active`, id, bizID).Scan(&wasInStock); err != nil {
		return nil, ErrNotFound
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `update products set name=$3, description=$4, category=$5, price=$6, reseller_price=$7,
		compare_price=$8, sku=$9, images=$10::jsonb, in_stock=$11, trending=$12, updated_at=now()
		where id=$1 and business_id=$2`,
		id, bizID, in.Name, in.Description, in.Category, in.Price, in.ResellerPrice, in.ComparePrice, in.Sku, string(images), inStock, in.Trending)
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `delete from product_variants where product_id=$1`, id); err != nil {
		return nil, err
	}
	if err := insertVariants(ctx, tx, id, in.Variants); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	if !wasInStock && inStock {
		s.notifyWaitlist(bizID, id)
	}
	return s.Get(ctx, bizID, id)
}

func (s *Service) SetStock(ctx context.Context, bizID, id string, inStock bool) error {
	var wasInStock bool
	err := s.pool.QueryRow(ctx, `select in_stock from products where id=$1 and business_id=$2 and active`, id, bizID).Scan(&wasInStock)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if _, err := s.pool.Exec(ctx, `update products set in_stock=$3, updated_at=now() where id=$1 and business_id=$2`, id, bizID, inStock); err != nil {
		return err
	}
	if !wasInStock && inStock {
		s.notifyWaitlist(bizID, id)
	}
	return nil
}

func (s *Service) SetTrending(ctx context.Context, bizID, id string, trending bool) error {
	ct, err := s.pool.Exec(ctx, `update products set trending=$3, updated_at=now() where id=$1 and business_id=$2 and active`, id, bizID, trending)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Service) Delete(ctx context.Context, bizID, id string) error {
	ct, err := s.pool.Exec(ctx, `update products set active=false, updated_at=now() where id=$1 and business_id=$2`, id, bizID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Service) Get(ctx context.Context, bizID, id string) (*Product, error) {
	products, err := s.query(ctx, `p.id = $2 and p.business_id = $1 and p.active`, bizID, id)
	if err != nil {
		return nil, err
	}
	if len(products) == 0 {
		return nil, ErrNotFound
	}
	return &products[0], nil
}

func (s *Service) List(ctx context.Context, bizID, search, category string, trendingOnly bool) ([]Product, error) {
	where := "p.business_id = $1 and p.active"
	args := []any{bizID}
	if search != "" {
		args = append(args, "%"+search+"%")
		where += fmt.Sprintf(" and p.name ilike $%d", len(args))
	}
	if category != "" {
		args = append(args, category)
		where += fmt.Sprintf(" and p.category = $%d", len(args))
	}
	if trendingOnly {
		where += " and p.trending"
	}
	return s.query(ctx, where, args...)
}

func (s *Service) query(ctx context.Context, where string, args ...any) ([]Product, error) {
	rows, err := s.pool.Query(ctx, `select p.id, p.name, p.description, p.category, p.price, p.reseller_price,
		p.compare_price, p.sku, p.images, p.in_stock, p.trending, p.active, p.created_at,
		coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'price', v.price, 'sku', v.sku, 'inStock', v.in_stock))
			filter (where v.id is not null), '[]')
		from products p left join product_variants v on v.product_id = p.id
		where `+where+` group by p.id order by p.created_at desc`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Product
	for rows.Next() {
		var p Product
		var images, variants []byte
		var createdAt any
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Category, &p.Price, &p.ResellerPrice,
			&p.ComparePrice, &p.Sku, &images, &p.InStock, &p.Trending, &p.Active, &createdAt, &variants); err != nil {
			return nil, err
		}
		json.Unmarshal(images, &p.Images)
		json.Unmarshal(variants, &p.Variants)
		p.CreatedAt = fmt.Sprint(createdAt)
		out = append(out, p)
	}
	return out, rows.Err()
}

// BulkJSON imports products from a JSON array.
func (s *Service) BulkJSON(ctx context.Context, bizID string, inputs []Input) (int, error) {
	created := 0
	for i, in := range inputs {
		if _, err := s.Create(ctx, bizID, in); err != nil {
			return created, fmt.Errorf("row %d: %w", i+1, err)
		}
		created++
	}
	return created, nil
}

// BulkCSV imports rows: name,description,category,price,resellerPrice,sku,inStock
// (price columns in rupees; converted to paise).
func (s *Service) BulkCSV(ctx context.Context, bizID string, r io.Reader) (int, error) {
	reader := csv.NewReader(r)
	reader.TrimLeadingSpace = true
	records, err := reader.ReadAll()
	if err != nil {
		return 0, errors.New("invalid csv file")
	}
	created := 0
	for i, rec := range records {
		if i == 0 && strings.EqualFold(strings.TrimSpace(rec[0]), "name") {
			continue // header row
		}
		if len(rec) < 4 {
			return created, fmt.Errorf("row %d: expected at least 4 columns", i+1)
		}
		price, err := parseRupees(rec[3])
		if err != nil {
			return created, fmt.Errorf("row %d: invalid price", i+1)
		}
		in := Input{Name: rec[0], Description: rec[1], Category: rec[2], Price: price}
		if len(rec) > 4 && rec[4] != "" {
			if in.ResellerPrice, err = parseRupees(rec[4]); err != nil {
				return created, fmt.Errorf("row %d: invalid resellerPrice", i+1)
			}
		}
		if len(rec) > 5 {
			in.Sku = rec[5]
		}
		if len(rec) > 6 {
			inStock := !strings.EqualFold(strings.TrimSpace(rec[6]), "false")
			in.InStock = &inStock
		}
		if _, err := s.Create(ctx, bizID, in); err != nil {
			return created, fmt.Errorf("row %d: %w", i+1, err)
		}
		created++
	}
	return created, nil
}

// ResolveLine prices an order line from the live catalog; reseller buyers get
// the reseller price when one is set.
func (s *Service) ResolveLine(ctx context.Context, bizID, productID, variantID string, qty int, segment string) (Line, error) {
	if qty < 1 {
		qty = 1
	}
	var l Line
	var price, resellerPrice int
	var inStock bool
	err := s.pool.QueryRow(ctx, `select name, price, reseller_price, in_stock from products
		where id=$1 and business_id=$2 and active`, productID, bizID).Scan(&l.Name, &price, &resellerPrice, &inStock)
	if errors.Is(err, pgx.ErrNoRows) {
		return l, ErrNotFound
	}
	if err != nil {
		return l, err
	}
	if !inStock {
		return l, fmt.Errorf("%s is out of stock", l.Name)
	}
	if segment == "reseller" && resellerPrice > 0 {
		price = resellerPrice
	}
	if variantID != "" {
		var vName string
		var vPrice int
		var vInStock bool
		err := s.pool.QueryRow(ctx, `select name, price, in_stock from product_variants where id=$1 and product_id=$2`,
			variantID, productID).Scan(&vName, &vPrice, &vInStock)
		if err != nil {
			return l, errors.New("variant not found")
		}
		if !vInStock {
			return l, fmt.Errorf("%s (%s) is out of stock", l.Name, vName)
		}
		l.Variant = vName
		if vPrice > 0 && segment != "reseller" {
			price = vPrice
		}
	}
	l.ProductID = productID
	l.Qty = qty
	l.Price = price
	return l, nil
}

// Catalog returns a compact listing used as AI context.
func (s *Service) Catalog(ctx context.Context, bizID string) (string, error) {
	products, err := s.List(ctx, bizID, "", "", false)
	if err != nil {
		return "", err
	}
	var sb strings.Builder
	for _, p := range products {
		if !p.InStock {
			continue
		}
		names := make([]string, len(p.Variants))
		for i, v := range p.Variants {
			names[i] = v.Name
		}
		fmt.Fprintf(&sb, "%s | %s | %s | price %d paise | variants: %s\n", p.ID, p.Name, p.Category, p.Price, strings.Join(names, ", "))
	}
	return sb.String(), nil
}

func (s *Service) AddWaitlist(ctx context.Context, bizID, productID, phone string) error {
	ct, err := s.pool.Exec(ctx, `insert into waitlist (business_id, product_id, phone)
		select $1, id, $3 from products where id=$2 and business_id=$1 and active
		on conflict (product_id, phone) do nothing`, bizID, productID, phone)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		// duplicate signup is fine; missing product is not
		var exists bool
		s.pool.QueryRow(ctx, `select exists(select 1 from products where id=$1 and business_id=$2)`, productID, bizID).Scan(&exists)
		if !exists {
			return ErrNotFound
		}
	}
	return nil
}

func (s *Service) notifyWaitlist(bizID, productID string) {
	s.notify.Async("waitlist", func() error {
		ctx := context.Background()
		var name, bizName string
		if err := s.pool.QueryRow(ctx, `select p.name, b.name from products p join businesses b on b.id = p.business_id
			where p.id=$1`, productID).Scan(&name, &bizName); err != nil {
			return err
		}
		rows, err := s.pool.Query(ctx, `select id, phone from waitlist where product_id=$1 and notified_at is null`, productID)
		if err != nil {
			return err
		}
		defer rows.Close()
		type entry struct{ id, phone string }
		var entries []entry
		for rows.Next() {
			var e entry
			if err := rows.Scan(&e.id, &e.phone); err != nil {
				return err
			}
			entries = append(entries, e)
		}
		msg := fmt.Sprintf("%s is back in stock at %s! Reply to order before it sells out.", name, bizName)
		for _, e := range entries {
			if err := s.notify.WhatsApp(e.phone, msg); err == nil {
				s.pool.Exec(ctx, `update waitlist set notified_at=now() where id=$1`, e.id)
			}
		}
		return nil
	})
}

func insertVariants(ctx context.Context, tx pgx.Tx, productID string, variants []Variant) error {
	for _, v := range variants {
		if strings.TrimSpace(v.Name) == "" {
			return errors.New("variant name is required")
		}
		if _, err := tx.Exec(ctx, `insert into product_variants (product_id, name, price, sku, in_stock)
			values ($1,$2,$3,$4,$5)`, productID, v.Name, v.Price, v.Sku, v.InStock); err != nil {
			return err
		}
	}
	return nil
}

func parseRupees(s string) (int, error) {
	f, err := strconv.ParseFloat(strings.TrimSpace(s), 64)
	if err != nil || f <= 0 {
		return 0, errors.New("invalid amount")
	}
	return int(f*100 + 0.5), nil
}

func orEmpty(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}
