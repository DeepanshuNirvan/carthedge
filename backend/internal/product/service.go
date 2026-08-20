package product

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/url"
	"strconv"
	"strings"

	"carthedge/internal/notify"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("product not found")

type Variant struct {
	ID       string `json:"id,omitempty"`
	Name     string `json:"name"`
	Price    int    `json:"price"` // 0 = inherit product price
	Sku      string `json:"sku"`
	InStock  *bool  `json:"inStock"`  // omitted = in stock
	StockQty *int   `json:"stockQty"` // omitted = untracked
}

func (v Variant) Qty() int {
	if v.StockQty == nil {
		return Untracked
	}
	return *v.StockQty
}

// Stocked mirrors the product rule: an explicit toggle wins, otherwise a
// tracked quantity of zero is out of stock on its own.
func (v Variant) Stocked() bool {
	if v.InStock != nil {
		return *v.InStock
	}
	return v.Qty() != 0
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
	StockQty      int       `json:"stockQty"` // -1 = untracked
	Trending      bool      `json:"trending"`
	Active        bool      `json:"active"`
	Variants      []Variant `json:"variants"`
	CreatedAt     string    `json:"createdAt"`
}

// Untracked marks a product or variant that has no counted inventory — the
// seller manages it with the in-stock toggle alone.
const Untracked = -1

// Public is what a buyer is allowed to see: no reseller price, no SKU, no
// counted stock. Every buyer surface (storefront and link checkout) projects
// through ToPublic, so a new field is private until it is added here.
type Public struct {
	ID           string          `json:"id"`
	Name         string          `json:"name"`
	Description  string          `json:"description"`
	Category     string          `json:"category"`
	Price        int             `json:"price"`
	ComparePrice int             `json:"comparePrice"`
	Images       []string        `json:"images"`
	InStock      bool            `json:"inStock"`
	Trending     bool            `json:"trending"`
	Variants     []PublicVariant `json:"variants"`
}

type PublicVariant struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Price   int    `json:"price"`
	InStock bool   `json:"inStock"`
}

func ToPublic(products []Product) []Public {
	out := make([]Public, len(products))
	for i, p := range products {
		variants := make([]PublicVariant, len(p.Variants))
		for j, v := range p.Variants {
			variants[j] = PublicVariant{ID: v.ID, Name: v.Name, Price: v.Price, InStock: v.Stocked()}
		}
		out[i] = Public{ID: p.ID, Name: p.Name, Description: p.Description, Category: p.Category,
			Price: p.Price, ComparePrice: p.ComparePrice, Images: orEmpty(p.Images), InStock: p.InStock,
			Trending: p.Trending, Variants: variants}
	}
	return out
}

// Line is a priced order line resolved from the live catalog. VariantID is
// kept so stock can be put back if the order is cancelled or comes back RTO.
type Line struct {
	ProductID string `json:"productId,omitempty"`
	VariantID string `json:"variantId,omitempty"`
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
	StockQty      *int      `json:"stockQty"` // omitted = untracked
	Trending      bool      `json:"trending"`
	Variants      []Variant `json:"variants"`
}

// qty resolves the tracked quantity; an omitted value leaves stock untracked.
func (in *Input) qty() int {
	if in.StockQty == nil {
		return Untracked
	}
	return max(*in.StockQty, 0)
}

// stocked is the in-stock flag: an explicit toggle wins, otherwise a tracked
// quantity of zero puts the product out of stock on its own.
func (in *Input) stocked() bool {
	if in.InStock != nil {
		return *in.InStock
	}
	return in.qty() != 0
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
	images, _ := json.Marshal(orEmpty(in.Images))

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var id string
	err = tx.QueryRow(ctx, `insert into products
		(business_id, name, description, category, price, reseller_price, compare_price, sku, images, in_stock, stock_qty, trending)
		values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12) returning id`,
		bizID, in.Name, in.Description, in.Category, in.Price, in.ResellerPrice, in.ComparePrice, in.Sku,
		string(images), in.stocked(), in.qty(), in.Trending).Scan(&id)
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
	inStock := in.stocked()
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
		compare_price=$8, sku=$9, images=$10::jsonb, in_stock=$11, stock_qty=$12, trending=$13, updated_at=now()
		where id=$1 and business_id=$2`,
		id, bizID, in.Name, in.Description, in.Category, in.Price, in.ResellerPrice, in.ComparePrice, in.Sku,
		string(images), inStock, in.qty(), in.Trending)
	if err != nil {
		return nil, err
	}
	// Variant ids have to survive an edit: share links and order lines already
	// point at them, so a delete-and-reinsert would dangle every one. Ids the
	// payload claims but this product does not own are treated as new rows.
	owned := map[string]bool{}
	rows, err := tx.Query(ctx, `select id from product_variants where product_id=$1`, id)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var vid string
		if rows.Scan(&vid) == nil {
			owned[vid] = true
		}
	}
	rows.Close()

	variants := make([]Variant, len(in.Variants))
	copy(variants, in.Variants)
	keep := []string{}
	for i := range variants {
		if owned[variants[i].ID] {
			keep = append(keep, variants[i].ID)
		} else {
			variants[i].ID = ""
		}
	}
	if _, err := tx.Exec(ctx, `delete from product_variants where product_id=$1 and id <> all($2::uuid[])`, id, keep); err != nil {
		return nil, err
	}
	if err := insertVariants(ctx, tx, id, variants); err != nil {
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

// SetStock updates the in-stock toggle and, when qty is given, the counted
// quantity. Restocking from zero releases the back-in-stock waitlist.
func (s *Service) SetStock(ctx context.Context, bizID, id string, inStock *bool, qty *int) error {
	var wasInStock bool
	err := s.pool.QueryRow(ctx, `select in_stock from products where id=$1 and business_id=$2 and active`, id, bizID).Scan(&wasInStock)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if qty != nil && *qty < Untracked {
		return errors.New("stockQty must be -1 (untracked) or a count")
	}
	var nowInStock bool
	err = s.pool.QueryRow(ctx, `update products set
		stock_qty = coalesce($3, stock_qty),
		in_stock = coalesce($4, case when coalesce($3, stock_qty) = 0 then false else in_stock end),
		updated_at = now()
		where id=$1 and business_id=$2 returning in_stock`, id, bizID, qty, inStock).Scan(&nowInStock)
	if err != nil {
		return err
	}
	if !wasInStock && nowInStock {
		s.notifyWaitlist(bizID, id)
	}
	return nil
}

// LowStock lists tracked products at or below a threshold, so the seller
// restocks before the storefront sells something they cannot ship.
func (s *Service) LowStock(ctx context.Context, bizID string, threshold int) ([]Product, error) {
	return s.query(ctx, `p.business_id = $1 and p.active and p.stock_qty between 0 and $2`,
		"p.stock_qty asc", bizID, threshold)
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
	products, err := s.query(ctx, `p.id = $2 and p.business_id = $1 and p.active`, sortOrders["newest"], bizID, id)
	if err != nil {
		return nil, err
	}
	if len(products) == 0 {
		return nil, ErrNotFound
	}
	return &products[0], nil
}

// Filter drives both the seller catalog and the public storefront grid.
type Filter struct {
	Search      string
	Category    string
	Trending    bool
	InStockOnly bool
	MinPrice    int // paise
	MaxPrice    int // paise, 0 = no ceiling
	Sort        string
	Limit       int // 0 = no paging
	Offset      int
}

// FilterFrom reads the shared catalog query params (seller list + storefront grid).
// Prices arrive in rupees from the buyer's slider and are stored as paise.
func FilterFrom(q url.Values) Filter {
	rupees := func(key string) int {
		n, _ := strconv.Atoi(q.Get(key))
		return n * 100
	}
	return Filter{
		Search:      q.Get("search"),
		Category:    q.Get("category"),
		Trending:    q.Get("trending") == "true",
		InStockOnly: q.Get("inStock") == "true",
		MinPrice:    rupees("minPrice"),
		MaxPrice:    rupees("maxPrice"),
		Sort:        q.Get("sort"),
	}
}

var sortOrders = map[string]string{
	"priceAsc":  "p.price asc",
	"priceDesc": "p.price desc",
	"name":      "p.name asc",
	"newest":    "p.created_at desc",
}

func (f Filter) where(bizID string) (string, []any) {
	where := "p.business_id = $1 and p.active"
	args := []any{bizID}
	if f.Search != "" {
		args = append(args, "%"+f.Search+"%")
		where += fmt.Sprintf(" and (p.name ilike $%d or p.category ilike $%d or p.description ilike $%d)", len(args), len(args), len(args))
	}
	if f.Category != "" {
		args = append(args, f.Category)
		where += fmt.Sprintf(" and p.category = $%d", len(args))
	}
	if f.MinPrice > 0 {
		args = append(args, f.MinPrice)
		where += fmt.Sprintf(" and p.price >= $%d", len(args))
	}
	if f.MaxPrice > 0 {
		args = append(args, f.MaxPrice)
		where += fmt.Sprintf(" and p.price <= $%d", len(args))
	}
	if f.Trending {
		where += " and p.trending"
	}
	if f.InStockOnly {
		where += " and p.in_stock"
	}
	return where, args
}

func (s *Service) List(ctx context.Context, bizID string, f Filter) ([]Product, error) {
	where, args := f.where(bizID)
	order, ok := sortOrders[f.Sort]
	if !ok {
		order = sortOrders["newest"]
	}
	if f.Limit > 0 {
		args = append(args, f.Limit, f.Offset)
		order += fmt.Sprintf(" limit $%d offset $%d", len(args)-1, len(args))
	}
	return s.query(ctx, where, order, args...)
}

// Count is the total behind a filtered page, for storefront pagination.
func (s *Service) Count(ctx context.Context, bizID string, f Filter) (int, error) {
	where, args := f.where(bizID)
	var n int
	err := s.pool.QueryRow(ctx, `select count(*) from products p where `+where, args...).Scan(&n)
	return n, err
}

func (s *Service) query(ctx context.Context, where, order string, args ...any) ([]Product, error) {
	rows, err := s.pool.Query(ctx, `select p.id, p.name, p.description, p.category, p.price, p.reseller_price,
		p.compare_price, p.sku, p.images, p.in_stock, p.stock_qty, p.trending, p.active, p.created_at,
		coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'price', v.price, 'sku', v.sku,
			'inStock', v.in_stock, 'stockQty', v.stock_qty)) filter (where v.id is not null), '[]')
		from products p left join product_variants v on v.product_id = p.id
		where `+where+` group by p.id order by `+order, args...)
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
			&p.ComparePrice, &p.Sku, &images, &p.InStock, &p.StockQty, &p.Trending, &p.Active, &createdAt, &variants); err != nil {
			return nil, err
		}
		json.Unmarshal(images, &p.Images)
		json.Unmarshal(variants, &p.Variants)
		p.CreatedAt = fmt.Sprint(createdAt)
		out = append(out, p)
	}
	return out, rows.Err()
}

// BulkResult reports what an import did, so re-uploading a stock sheet is
// legible rather than mysterious.
type BulkResult struct {
	Created int `json:"created"`
	Updated int `json:"updated"`
}

// Bulk imports products, matching on SKU: a row whose SKU already exists
// updates that product instead of duplicating it, which makes a re-uploaded
// inventory sheet a stock update rather than a mess.
func (s *Service) Bulk(ctx context.Context, bizID string, inputs []Input) (BulkResult, error) {
	var res BulkResult
	// every row is validated before any row is written: a 200-row sheet with a
	// typo on row 150 must be rejected whole, not half-imported
	for i, in := range inputs {
		if err := in.validate(); err != nil {
			return res, fmt.Errorf("row %d: %w", i+1, err)
		}
		for _, v := range in.Variants {
			if strings.TrimSpace(v.Name) == "" {
				return res, fmt.Errorf("row %d: variant name is required", i+1)
			}
		}
	}
	for i, in := range inputs {
		if in.Sku != "" {
			var id string
			err := s.pool.QueryRow(ctx, `select id from products where business_id=$1 and sku=$2 and active`,
				bizID, in.Sku).Scan(&id)
			if err == nil {
				if _, err := s.Update(ctx, bizID, id, in); err != nil {
					return res, fmt.Errorf("row %d: %w", i+1, err)
				}
				res.Updated++
				continue
			}
			if !errors.Is(err, pgx.ErrNoRows) {
				return res, err
			}
		}
		if _, err := s.Create(ctx, bizID, in); err != nil {
			return res, fmt.Errorf("row %d: %w", i+1, err)
		}
		res.Created++
	}
	return res, nil
}

// csvColumns is the import sheet's layout; name and price are required.
var csvColumns = []string{"name", "description", "category", "price", "resellerPrice", "sku", "inStock", "stockQty"}

// ParseCSV reads an inventory sheet into product inputs. Price columns are in
// rupees (what a seller types); everything downstream is paise.
func ParseCSV(r io.Reader) ([]Input, error) {
	reader := csv.NewReader(r)
	reader.TrimLeadingSpace = true
	reader.FieldsPerRecord = -1
	records, err := reader.ReadAll()
	if err != nil {
		return nil, errors.New("invalid csv file")
	}
	var out []Input
	for i, rec := range records {
		if len(rec) == 0 || strings.TrimSpace(rec[0]) == "" {
			continue
		}
		if i == 0 && strings.EqualFold(strings.TrimSpace(rec[0]), "name") {
			continue // header row
		}
		if len(rec) < 4 {
			return nil, fmt.Errorf("row %d: expected columns %s", i+1, strings.Join(csvColumns, ","))
		}
		price, err := parseRupees(rec[3])
		if err != nil {
			return nil, fmt.Errorf("row %d: invalid price", i+1)
		}
		in := Input{Name: rec[0], Description: rec[1], Category: rec[2], Price: price}
		if len(rec) > 4 && rec[4] != "" {
			if in.ResellerPrice, err = parseRupees(rec[4]); err != nil {
				return nil, fmt.Errorf("row %d: invalid resellerPrice", i+1)
			}
		}
		if len(rec) > 5 {
			in.Sku = strings.TrimSpace(rec[5])
		}
		if len(rec) > 6 && rec[6] != "" {
			inStock := !strings.EqualFold(strings.TrimSpace(rec[6]), "false")
			in.InStock = &inStock
		}
		if len(rec) > 7 && strings.TrimSpace(rec[7]) != "" {
			qty, err := strconv.Atoi(strings.TrimSpace(rec[7]))
			if err != nil || qty < 0 {
				return nil, fmt.Errorf("row %d: invalid stockQty", i+1)
			}
			in.StockQty = &qty
		}
		out = append(out, in)
	}
	return out, nil
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
	l.VariantID = variantID
	l.Qty = qty
	l.Price = price
	return l, nil
}

// db is satisfied by both *pgxpool.Pool and pgx.Tx, so stock moves can run
// inside the order transaction or on their own.
type db interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// stockTarget picks the row a line draws from: a variant that carries its own
// counted stock, otherwise the product. Keeps one line from decrementing twice.
func stockTarget(ctx context.Context, conn db, l Line) (table, id string) {
	if l.VariantID != "" {
		var tracked bool
		if err := conn.QueryRow(ctx, `select stock_qty >= 0 from product_variants where id=$1`,
			l.VariantID).Scan(&tracked); err == nil && tracked {
			return "product_variants", l.VariantID
		}
	}
	return "products", l.ProductID
}

// Reserve draws down counted stock for an order. Untracked rows (-1) pass
// through untouched; a tracked row short of the quantity fails the order rather
// than selling something the seller cannot ship.
func Reserve(ctx context.Context, conn db, lines []Line) error {
	for _, l := range lines {
		if l.ProductID == "" {
			continue // custom line, nothing in the catalog to draw from
		}
		table, id := stockTarget(ctx, conn, l)
		ct, err := conn.Exec(ctx, `update `+table+` set
			stock_qty = case when stock_qty < 0 then stock_qty else stock_qty - $2 end,
			in_stock = case when stock_qty >= 0 and stock_qty - $2 <= 0 then false else in_stock end
			where id = $1 and (stock_qty < 0 or stock_qty >= $2)`, id, l.Qty)
		if err != nil {
			return err
		}
		if ct.RowsAffected() == 0 {
			return fmt.Errorf("%s is out of stock", l.Name)
		}
	}
	return nil
}

// Release puts stock back when an order is cancelled or comes back RTO.
func Release(ctx context.Context, conn db, lines []Line) error {
	for _, l := range lines {
		if l.ProductID == "" {
			continue
		}
		table, id := stockTarget(ctx, conn, l)
		if _, err := conn.Exec(ctx, `update `+table+` set
			stock_qty = case when stock_qty < 0 then stock_qty else stock_qty + $2 end,
			in_stock = case when stock_qty >= 0 then true else in_stock end
			where id = $1`, id, l.Qty); err != nil {
			return err
		}
	}
	return nil
}

// Catalog returns a compact listing used as AI context.
// Catalog renders the live catalog for the AI order parser, in paise — the draft
// JSON the parser returns is in paise, so the two must agree.
func (s *Service) Catalog(ctx context.Context, bizID string) (string, error) {
	return s.catalog(ctx, bizID, func(paise int) string { return fmt.Sprintf("%d paise", paise) })
}

// CatalogForBuyer renders the same catalog in rupees, for prompts whose output is
// read by a buyer. Formatting here instead of asking the model to divide by 100
// is what stops "₹50 (5000 paise)" ending up in a customer's chat.
func (s *Service) CatalogForBuyer(ctx context.Context, bizID string) (string, error) {
	return s.catalog(ctx, bizID, notify.Rupees)
}

func (s *Service) catalog(ctx context.Context, bizID string, money func(int) string) (string, error) {
	products, err := s.List(ctx, bizID, Filter{InStockOnly: true})
	if err != nil {
		return "", err
	}
	var sb strings.Builder
	for _, p := range products {
		names := make([]string, len(p.Variants))
		for i, v := range p.Variants {
			names[i] = v.Name
		}
		fmt.Fprintf(&sb, "%s | %s | %s | price %s | variants: %s\n", p.ID, p.Name, p.Category, money(p.Price), strings.Join(names, ", "))
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
		if _, err := tx.Exec(ctx, `insert into product_variants (id, product_id, name, price, sku, in_stock, stock_qty)
			values (coalesce(nullif($1,'')::uuid, gen_random_uuid()),$2,$3,$4,$5,$6,$7)
			on conflict (id) do update set name=excluded.name, price=excluded.price, sku=excluded.sku,
				in_stock=excluded.in_stock, stock_qty=excluded.stock_qty`,
			v.ID, productID, v.Name, v.Price, v.Sku, v.Stocked(), v.Qty()); err != nil {
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
