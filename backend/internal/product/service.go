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
	"slices"
	"strconv"
	"strings"
	"time"

	"carthedge/internal/httpx"
	"carthedge/internal/notify"
	"carthedge/internal/shop"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("product not found")

type Variant struct {
	ID   string `json:"id,omitempty"`
	Name string `json:"name"` // the option values joined: "M / Pink"
	// one value per product option group, in group order
	Options  []string `json:"options"`
	Price    int      `json:"price"` // 0 = inherit product price
	Sku      string   `json:"sku"`
	InStock  *bool    `json:"inStock"`  // omitted = in stock
	StockQty *int     `json:"stockQty"` // omitted = untracked
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
	Options       []Option  `json:"options"`
	Variants      []Variant `json:"variants"`
	Details       []Detail  `json:"details"`   // fabric, fit, care: shown to buyers and the assistant
	SizeChart     string    `json:"sizeChart"` // image URL
	HSN           string    `json:"hsn"`
	GstRate       int       `json:"gstRate"` // percent; -1 = the store default
	Legal
	CreatedAt string `json:"createdAt"`
}

// Legal is what India's e-commerce and packaged-goods rules ask a listing to
// state. Every field is optional: what applies depends on the product.
type Legal struct {
	MRP           int    `json:"mrp"` // paise, inclusive of all taxes; 0 = not stated
	OriginCountry string `json:"originCountry"`
	Manufacturer  string `json:"manufacturer"` // name and address of the maker, packer or importer
}

// ListPrice is the price a discount is measured from: the MRP when the seller
// states one, otherwise their compare-at price.
func (p Product) ListPrice() int {
	if p.MRP > 0 {
		return p.MRP
	}
	return p.ComparePrice
}

// Detail is one labelled fact about a product ("Fabric": "Pure cotton").
type Detail struct {
	Label string `json:"label"`
	Value string `json:"value"`
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
	Options      []Option        `json:"options"`
	Variants     []PublicVariant `json:"variants"`
	Details      []Detail        `json:"details"`
	SizeChart    string          `json:"sizeChart,omitempty"`
	Legal
}

type PublicVariant struct {
	ID      string   `json:"id"`
	Name    string   `json:"name"`
	Options []string `json:"options"`
	Price   int      `json:"price"`
	InStock bool     `json:"inStock"`
}

func ToPublic(products []Product) []Public {
	out := make([]Public, len(products))
	for i, p := range products {
		variants := make([]PublicVariant, len(p.Variants))
		for j, v := range p.Variants {
			variants[j] = PublicVariant{ID: v.ID, Name: v.Name, Options: v.Options, Price: v.Price, InStock: v.Stocked()}
		}
		details := p.Details
		if details == nil {
			details = []Detail{}
		}
		out[i] = Public{ID: p.ID, Name: p.Name, Description: p.Description, Category: p.Category,
			Price: p.Price, ComparePrice: p.ComparePrice, Images: orEmpty(p.Images), InStock: p.InStock,
			Trending: p.Trending, Options: p.Options, Variants: variants, Details: details, SizeChart: p.SizeChart,
			Legal: p.Legal}
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
	Name          string `json:"name"`
	Description   string `json:"description"`
	Category      string `json:"category"`
	Price         int    `json:"price"`
	ResellerPrice int    `json:"resellerPrice"`
	ComparePrice  int    `json:"comparePrice"`
	Sku           string `json:"sku"`
	InStock       *bool  `json:"inStock"`
	StockQty      *int   `json:"stockQty"` // omitted = untracked
	Trending      bool   `json:"trending"`
	// omitted (nil) keeps what is stored: a CSV re-import must not wipe them
	Images        []string  `json:"images"`
	Options       []Option  `json:"options"` // omitted with variants = one group of the variant names
	Variants      []Variant `json:"variants"`
	Details       []Detail  `json:"details"`
	SizeChart     *string   `json:"sizeChart"`
	HSN           *string   `json:"hsn"`
	GstRate       *int      `json:"gstRate"`
	MRP           *int      `json:"mrp"`
	OriginCountry *string   `json:"originCountry"`
	Manufacturer  *string   `json:"manufacturer"`
}

// qty resolves the tracked quantity; an omitted or negative value (the API
// returns -1 for untracked) leaves stock untracked.
func (in *Input) qty() int {
	if in.StockQty == nil || *in.StockQty < 0 {
		return Untracked
	}
	return *in.StockQty
}

// qtyParam is the stock to write on an edit: nil keeps the counted stock.
// The edit form never carries it, and "absent" used to mean "untracked",
// wiping real inventory on every save.
func qtyParam(q *int) any {
	if q == nil {
		return nil
	}
	return max(*q, Untracked)
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
	in.Category = strings.TrimSpace(in.Category)
	if len([]rune(in.Name)) > 200 || len([]rune(in.Category)) > 60 || len([]rune(in.Description)) > 5000 || len(in.Sku) > 64 {
		return errors.New("keep the name under 200 characters, the category under 60, the description under 5,000 and the SKU under 64")
	}
	if len(in.Details) > 20 {
		return errors.New("at most 20 product details")
	}
	kept := []Detail{}
	for _, d := range in.Details {
		d.Label, d.Value = strings.TrimSpace(d.Label), strings.TrimSpace(d.Value)
		if d.Label == "" && d.Value == "" {
			continue
		}
		if d.Label == "" || d.Value == "" || len([]rune(d.Label)) > 40 || len([]rune(d.Value)) > 300 {
			return errors.New("each detail needs a label (up to 40 characters) and a value (up to 300)")
		}
		kept = append(kept, d)
	}
	if in.Details != nil {
		in.Details = kept
	}
	if in.SizeChart != nil {
		v := strings.TrimSpace(*in.SizeChart)
		if v != "" && !strings.HasPrefix(v, "https://") && !strings.HasPrefix(v, "http://") && !strings.HasPrefix(v, "/uploads/") {
			return errors.New("size chart must be an uploaded image")
		}
		in.SizeChart = &v
	}
	if in.HSN != nil {
		v := strings.TrimSpace(*in.HSN)
		if v != "" && !shop.ValidHSN(v) {
			return errors.New("HSN code must be 4, 6 or 8 digits")
		}
		in.HSN = &v
	}
	if in.GstRate != nil && *in.GstRate != -1 && !slices.Contains(shop.Rates, *in.GstRate) {
		return errors.New("GST rate must be one of 0, 3, 5, 12, 18, 28, 40")
	}
	if in.MRP != nil && *in.MRP < 0 {
		return errors.New("MRP must be zero (not stated) or an amount in paise")
	}
	if in.OriginCountry != nil {
		v := strings.Join(strings.Fields(*in.OriginCountry), " ")
		if len([]rune(v)) > 60 {
			return errors.New("keep the country of origin under 60 characters")
		}
		in.OriginCountry = &v
	}
	if in.Manufacturer != nil {
		v := strings.TrimSpace(*in.Manufacturer)
		if len([]rune(v)) > 300 {
			return errors.New("keep the maker's name and address under 300 characters")
		}
		in.Manufacturer = &v
	}
	return in.shapeOptions()
}

// checkMRP refuses a price above the MRP: selling above the printed maximum
// retail price is not allowed. mrp is the value that will be stored.
func (in *Input) checkMRP(mrp int) error {
	if mrp <= 0 {
		return nil
	}
	if in.Price > mrp {
		return fmt.Errorf("the price can't be more than the MRP (%s)", notify.Rupees(mrp))
	}
	for _, v := range in.Variants {
		if v.Price > mrp {
			return fmt.Errorf("%s costs more than the MRP (%s)", v.Name, notify.Rupees(mrp))
		}
	}
	return nil
}

// jsonParam is a JSON column to write: nil keeps the stored value.
func jsonParam[T any](v []T) any {
	if v == nil {
		return nil
	}
	b, _ := json.Marshal(v)
	return string(b)
}

func (s *Service) Create(ctx context.Context, bizID string, in Input) (*Product, error) {
	if err := in.validate(); err != nil {
		return nil, err
	}
	if err := in.checkMRP(deref(in.MRP)); err != nil {
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
		(business_id, name, description, category, price, reseller_price, compare_price, sku, images, in_stock, stock_qty, trending,
		 details, size_chart, hsn, gst_rate, options, mrp, origin_country, manufacturer)
		values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,coalesce($13::jsonb,'[]'),coalesce($14,''),coalesce($15,''),coalesce($16,-1),
		 coalesce($17::jsonb,'[]'),coalesce($18,0),coalesce($19,''),coalesce($20,''))
		returning id`,
		bizID, in.Name, in.Description, in.Category, in.Price, in.ResellerPrice, in.ComparePrice, in.Sku,
		string(images), in.stocked(), in.qty(), in.Trending, jsonParam(in.Details), in.SizeChart, in.HSN, in.GstRate,
		jsonParam(in.Options), in.MRP, in.OriginCountry, in.Manufacturer).Scan(&id)
	if err != nil {
		return nil, err
	}
	if err := writeVariants(ctx, tx, id, in.Variants, false); err != nil {
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

	var wasInStock bool
	var storedMRP int
	if err := s.pool.QueryRow(ctx, `select in_stock, mrp from products where id=$1 and business_id=$2 and active`,
		id, bizID).Scan(&wasInStock, &storedMRP); err != nil {
		return nil, ErrNotFound
	}
	mrp := storedMRP
	if in.MRP != nil {
		mrp = *in.MRP
	}
	if err := in.checkMRP(mrp); err != nil {
		return nil, err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// an explicit toggle wins; a given count decides (0 = out); neither keeps it
	var inStock bool
	err = tx.QueryRow(ctx, `update products set name=$3, description=$4, category=$5, price=$6, reseller_price=$7,
		compare_price=$8, sku=$9, images=coalesce($10::jsonb, images),
		in_stock = coalesce($11, case when $12::int is null then in_stock else $12::int <> 0 end),
		stock_qty = coalesce($12::int, stock_qty),
		trending=$13, details=coalesce($14::jsonb, details), size_chart=coalesce($15, size_chart),
		hsn=coalesce($16, hsn), gst_rate=coalesce($17, gst_rate), options=coalesce($18::jsonb, options),
		mrp=coalesce($19, mrp), origin_country=coalesce($20, origin_country), manufacturer=coalesce($21, manufacturer),
		updated_at=now()
		where id=$1 and business_id=$2 returning in_stock`,
		id, bizID, in.Name, in.Description, in.Category, in.Price, in.ResellerPrice, in.ComparePrice, in.Sku,
		jsonParam(in.Images), in.InStock, qtyParam(in.StockQty), in.Trending,
		jsonParam(in.Details), in.SizeChart, in.HSN, in.GstRate, jsonParam(in.Options),
		in.MRP, in.OriginCountry, in.Manufacturer).Scan(&inStock)
	if err != nil {
		return nil, err
	}
	if in.Variants != nil {
		if err := writeVariants(ctx, tx, id, in.Variants, true); err != nil {
			return nil, err
		}
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
	// switching a sold-out counted product back on without a count means the
	// seller manages it by the toggle now; a count of 0 would refuse every order
	err = s.pool.QueryRow(ctx, `update products set
		stock_qty = case when $4 is true and $3::int is null and stock_qty = 0 then -1 else coalesce($3, stock_qty) end,
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
		p.details, p.size_chart, p.hsn, p.gst_rate, p.options, p.mrp, p.origin_country, p.manufacturer,
		coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'options', v.options, 'price', v.price,
			'sku', v.sku, 'inStock', v.in_stock, 'stockQty', v.stock_qty) order by v.position, v.name)
			filter (where v.id is not null), '[]')
		from products p left join product_variants v on v.product_id = p.id
		where `+where+` group by p.id order by `+order, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Product
	for rows.Next() {
		var p Product
		var images, variants, details, options []byte
		var createdAt time.Time
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Category, &p.Price, &p.ResellerPrice,
			&p.ComparePrice, &p.Sku, &images, &p.InStock, &p.StockQty, &p.Trending, &p.Active, &createdAt,
			&details, &p.SizeChart, &p.HSN, &p.GstRate, &options, &p.MRP, &p.OriginCountry, &p.Manufacturer,
			&variants); err != nil {
			return nil, err
		}
		json.Unmarshal(images, &p.Images)
		json.Unmarshal(details, &p.Details)
		json.Unmarshal(options, &p.Options)
		json.Unmarshal(variants, &p.Variants)
		p.settleOptions()
		p.CreatedAt = createdAt.UTC().Format(time.RFC3339)
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

// outOfStockWords are what sellers type in a stock sheet's inStock column.
var outOfStockWords = map[string]bool{"false": true, "0": true, "no": true, "n": true, "out": true}

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
			inStock := !outOfStockWords[strings.ToLower(strings.TrimSpace(rec[6]))]
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
func (s *Service) ResolveLine(ctx context.Context, q DB, bizID, productID, variantID string, qty int, segment string) (Line, error) {
	if qty < 1 {
		qty = 1
	}
	var l Line
	if !httpx.ValidID(productID) {
		return l, ErrNotFound
	}
	if variantID != "" && !httpx.ValidID(variantID) {
		return l, errors.New("variant not found")
	}
	var price, resellerPrice int
	var inStock bool
	err := q.QueryRow(ctx, `select name, price, reseller_price, in_stock from products
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
	variantPrice := 0
	if variantID != "" {
		var vName string
		var vPrice int
		var vInStock bool
		err := q.QueryRow(ctx, `select name, price, in_stock from product_variants where id=$1 and product_id=$2`,
			variantID, productID).Scan(&vName, &vPrice, &vInStock)
		if err != nil {
			return l, errors.New("variant not found")
		}
		if !vInStock {
			return l, fmt.Errorf("%s (%s) is out of stock", l.Name, vName)
		}
		l.Variant = vName
		variantPrice = vPrice
	}
	l.ProductID = productID
	l.VariantID = variantID
	l.Qty = qty
	l.Price = linePrice(price, resellerPrice, variantPrice, segment)
	return l, nil
}

// linePrice is what a buyer pays for one unit: a reseller pays the reseller
// price when the seller set one; everyone else, and a reseller without one,
// pays the variant's own price when it has one, else the product price.
func linePrice(price, resellerPrice, variantPrice int, segment string) int {
	if segment == "reseller" && resellerPrice > 0 {
		return resellerPrice
	}
	if variantPrice > 0 {
		return variantPrice
	}
	return price
}

// db is satisfied by both *pgxpool.Pool and pgx.Tx, so stock moves can run
// inside the order transaction or on their own.
// DB is a pool or a transaction. Code running inside a transaction must pass
// the transaction: asking the pool for a second connection while holding one
// deadlocks once every connection is held by a request doing the same.
type DB interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// stockTarget picks the row a line draws from: a variant that carries its own
// counted stock, otherwise the product. Keeps one line from decrementing twice.
func stockTarget(ctx context.Context, conn DB, l Line) (table, id string) {
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
func Reserve(ctx context.Context, conn DB, lines []Line) error {
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
func Release(ctx context.Context, conn DB, lines []Line) error {
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

// variantRow is one variant as the write statement reads it.
type variantRow struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	Options  []string `json:"options"`
	Position int      `json:"position"`
	Price    int      `json:"price"`
	Sku      string   `json:"sku"`
	InStock  *bool    `json:"in_stock"`
	Qty      any      `json:"qty"` // nil keeps the counted stock
}

// writeVariants stores a product's variants in two statements, however many
// there are. A row whose id this product already owns is updated in place, so
// ids survive an edit (share links and order lines point at them); any other
// row is inserted with a fresh id, so a client can never reach another
// product's variant by sending its id. prune drops the owned rows the edit
// left out.
func writeVariants(ctx context.Context, tx pgx.Tx, productID string, variants []Variant, prune bool) error {
	rows := make([]variantRow, len(variants))
	for i, v := range variants {
		if strings.TrimSpace(v.Name) == "" {
			return errors.New("variant name is required")
		}
		rows[i] = variantRow{ID: v.ID, Name: v.Name, Options: orEmpty(v.Options), Position: i, Price: v.Price,
			Sku: v.Sku, InStock: v.InStock, Qty: qtyParam(v.StockQty)}
	}
	payload, _ := json.Marshal(rows)
	if prune {
		if _, err := tx.Exec(ctx, `delete from product_variants v where v.product_id = $1 and not exists (
			select 1 from jsonb_to_recordset($2::jsonb) as x(id text) where x.id = v.id::text)`, productID, string(payload)); err != nil {
			return err
		}
	}
	if len(rows) == 0 {
		return nil
	}
	// a new row starts untracked unless a count is given; an existing one keeps
	// its count unless the payload names one (the edit form sends only changes)
	_, err := tx.Exec(ctx, `with x as (
			select * from jsonb_to_recordset($2::jsonb) as x(id text, name text, options jsonb, position int, price int,
				sku text, in_stock boolean, qty int)
		), upd as (
			update product_variants v set name = x.name, options = x.options, position = x.position, price = x.price, sku = x.sku,
				in_stock = coalesce(x.in_stock, case when x.qty is null then v.in_stock else x.qty <> 0 end),
				stock_qty = coalesce(x.qty, v.stock_qty)
			from x where v.product_id = $1 and v.id::text = x.id
			returning v.id::text as id
		)
		insert into product_variants (product_id, name, options, position, price, sku, in_stock, stock_qty)
		select $1, x.name, x.options, x.position, x.price, x.sku, coalesce(x.in_stock, coalesce(x.qty, -1) <> 0), coalesce(x.qty, -1)
		from x where x.id = '' or x.id not in (select id from upd)`, productID, string(payload))
	return err
}

func deref[T any](p *T) T {
	var zero T
	if p == nil {
		return zero
	}
	return *p
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
