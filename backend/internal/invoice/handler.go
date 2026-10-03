package invoice

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"slices"
	"strings"
	"time"
	"unicode"

	"carthedge/internal/customer"
	"carthedge/internal/gst"
	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
	"carthedge/internal/product"
	"carthedge/internal/shop"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Invoices for buyers. Prices are GST-inclusive, so an invoice takes the tax
// out of what the buyer paid: per line, at the product's rate, split CGST+SGST
// inside the seller's state and IGST across states. The full document is
// snapshotted on the row — editing the profile later never rewrites an
// invoice already issued. The frontend only renders it.
type Handler struct {
	pool *pgxpool.Pool
}

func NewHandler(pool *pgxpool.Pool) *Handler { return &Handler{pool: pool} }

type Party struct {
	Name      string `json:"name"`
	LegalName string `json:"legalName,omitempty"`
	Address   string `json:"address"`
	State     string `json:"state"`
	StateCode string `json:"stateCode"`
	GSTIN     string `json:"gstin,omitempty"`
	Phone     string `json:"phone,omitempty"`
}

type Line struct {
	Description string `json:"description"`
	HSN         string `json:"hsn"`
	Qty         int    `json:"qty"`
	Rate        int    `json:"rate"`  // GST percent
	Gross       int    `json:"gross"` // what the buyer paid for the line, discounts applied
	Taxable     int    `json:"taxable"`
	CGST        int    `json:"cgst"`
	SGST        int    `json:"sgst"`
	IGST        int    `json:"igst"`
}

// Doc is the printable invoice or credit note.
type Doc struct {
	Type          string `json:"type"` // tax_invoice | bill_of_supply | invoice | credit_note
	Seller        Party  `json:"seller"`
	Buyer         Party  `json:"buyer"`
	PlaceOfSupply string `json:"placeOfSupply"` // "08 - Rajasthan"
	Intra         bool   `json:"intra"`
	Lines         []Line `json:"lines"`
	Discount      int    `json:"discount"` // already inside the lines; shown for the record
	Taxable       int    `json:"taxable"`
	CGST          int    `json:"cgst"`
	SGST          int    `json:"sgst"`
	IGST          int    `json:"igst"`
	Total         int    `json:"total"`
	OrderCode     string `json:"orderCode"`
	OrderDate     string `json:"orderDate"`
	PaymentMethod string `json:"paymentMethod"`
	Note          string `json:"note,omitempty"`
	// credit notes point back at the invoice they reduce
	AgainstInvoice string `json:"againstInvoice,omitempty"`
}

type CreditNote struct {
	ID        string `json:"id"`
	Number    string `json:"number"`
	Total     int    `json:"total"`
	Doc       Doc    `json:"doc"`
	CreatedAt string `json:"createdAt"`
}

type Invoice struct {
	ID            string       `json:"id"`
	InvoiceNumber string       `json:"invoiceNumber"`
	OrderID       string       `json:"orderId"`
	OrderCode     string       `json:"orderCode"`
	CustomerName  string       `json:"customerName"`
	Subtotal      int          `json:"subtotal"`
	Discount      int          `json:"discount"`
	Shipping      int          `json:"shipping"`
	GstRate       int          `json:"gstRate"`
	GstAmount     int          `json:"gstAmount"`
	Total         int          `json:"total"`
	DocType       string       `json:"docType"`
	Doc           *Doc         `json:"doc,omitempty"` // detail view; nil on invoices from before GST snapshots
	CreditNotes   []CreditNote `json:"creditNotes,omitempty"`
	CreatedAt     string       `json:"createdAt"`
}

// CreateInput lets the seller adjust one invoice: a rate for every line, the
// buyer's state when the address is unclear, and B2B details.
type CreateInput struct {
	OrderID       string `json:"orderId"`
	GstRate       *int   `json:"gstRate"`
	PlaceOfSupply string `json:"placeOfSupply"`
	BuyerGstin    string `json:"buyerGstin"`
	BuyerName     string `json:"buyerName"`
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var in CreateInput
	if !httpx.Bind(w, r, &in) {
		return
	}
	ctx := r.Context()
	inv, status, err := h.create(ctx, middleware.BusinessID(ctx), middleware.BusinessCode(ctx), in)
	if err != nil {
		httpx.Err(w, status, err.Error())
		return
	}
	httpx.Created(w, inv)
}

func (h *Handler) create(ctx context.Context, bizID, bizCode string, in CreateInput) (*Invoice, int, error) {
	if in.GstRate != nil && !slices.Contains(shop.Rates, *in.GstRate) {
		return nil, http.StatusBadRequest, errors.New("gstRate must be one of 0, 3, 5, 12, 18, 28, 40")
	}
	in.BuyerGstin = strings.ToUpper(strings.TrimSpace(in.BuyerGstin))
	if in.BuyerGstin != "" && !gst.ValidGSTIN(in.BuyerGstin) {
		return nil, http.StatusBadRequest, errors.New("the buyer's GSTIN does not look right")
	}
	if in.PlaceOfSupply != "" {
		if _, ok := gst.States[in.PlaceOfSupply]; !ok {
			return nil, http.StatusBadRequest, errors.New("choose the buyer's state")
		}
	}
	if len([]rune(in.BuyerName)) > 200 {
		return nil, http.StatusBadRequest, errors.New("buyer name is too long")
	}

	var o struct {
		code, method, buyerGstin, buyerCompany, customerName, phone string
		items, addr                                                 []byte
		subtotal, discount, prepaid, shipping, codFee, total        int
		created                                                     time.Time
	}
	err := h.pool.QueryRow(ctx, `select o.order_code, o.payment_method, o.buyer_gstin, o.buyer_company, c.name, c.phone,
		o.items, o.address, o.subtotal, o.discount, o.prepaid_discount, o.shipping, o.cod_fee, o.total, o.created_at
		from orders o join customers c on c.id = o.customer_id
		where o.id=$1 and o.business_id=$2 and o.status <> 'cancelled'`, in.OrderID, bizID).Scan(
		&o.code, &o.method, &o.buyerGstin, &o.buyerCompany, &o.customerName, &o.phone, &o.items, &o.addr,
		&o.subtotal, &o.discount, &o.prepaid, &o.shipping, &o.codFee, &o.total, &o.created)
	if err != nil {
		return nil, http.StatusNotFound, errors.New("order not found")
	}
	var lines []product.Line
	json.Unmarshal(o.items, &lines)
	var addr customer.Address
	json.Unmarshal(o.addr, &addr)

	var seller Party
	var gstin, sellerState, sellerCity, sellerPin string
	if err := h.pool.QueryRow(ctx, `select name, address, city, state, pincode, gstin, phone from businesses where id=$1`, bizID).Scan(
		&seller.Name, &seller.Address, &sellerCity, &sellerState, &sellerPin, &gstin, &seller.Phone); err != nil {
		return nil, http.StatusNotFound, errors.New("business not found")
	}
	settings, err := shop.Load(ctx, h.pool, bizID)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	reg := settings.GST.RegistrationFor(gstin)
	if gstin == "" {
		reg = "unregistered"
	}
	// GST can only be collected under a regular registration
	if in.GstRate != nil && *in.GstRate > 0 && reg != "regular" {
		return nil, http.StatusBadRequest, errors.New("GST can be charged only with a regular GST registration — add your GSTIN in Settings → GST, or issue the invoice without GST")
	}
	docType := map[string]string{"regular": "tax_invoice", "composition": "bill_of_supply", "unregistered": "invoice"}[reg]
	seller.Address = joinAddr(seller.Address, sellerCity, sellerPin)
	seller.State = sellerState
	seller.StateCode = gst.StateCode(sellerState)
	if reg != "unregistered" {
		seller.GSTIN, seller.LegalName = gstin, settings.GST.LegalName
		seller.StateCode = gst.StateOfGSTIN(gstin)
	}
	if name, ok := gst.States[seller.StateCode]; ok {
		seller.State = name
	}

	pos := in.PlaceOfSupply
	if pos == "" {
		pos = gst.PlaceOfSupply(addr.State, addr.Pincode)
	}
	if pos == "" {
		pos = seller.StateCode // unreadable address: treated as local; the seller can override
	}
	buyer := Party{Name: o.customerName, Address: joinAddr(addr.Line, addr.City, addr.Pincode), StateCode: pos,
		State: gst.States[pos], Phone: o.phone, GSTIN: o.buyerGstin}
	if o.buyerCompany != "" {
		buyer.LegalName = o.buyerCompany
	}
	if in.BuyerGstin != "" {
		buyer.GSTIN = in.BuyerGstin
	}
	if n := strings.TrimSpace(in.BuyerName); n != "" {
		buyer.LegalName = n
	}

	// rates and HSN codes per product, then the store default
	rates, hsns := map[string]int{}, map[string]string{}
	var ids []string
	for _, l := range lines {
		if l.ProductID != "" {
			ids = append(ids, l.ProductID)
		}
	}
	if len(ids) > 0 {
		rows, err := h.pool.Query(ctx, `select id::text, gst_rate, hsn from products where id = any($1::uuid[]) and business_id=$2`, ids, bizID)
		if err == nil {
			for rows.Next() {
				var id, hsn string
				var rate int
				if rows.Scan(&id, &rate, &hsn) == nil {
					rates[id], hsns[id] = rate, hsn
				}
			}
			rows.Close()
		}
	}
	rateFor := func(productID string) (int, error) {
		if reg != "regular" {
			return 0, nil // composition and unregistered sellers do not charge GST
		}
		if in.GstRate != nil {
			return *in.GstRate, nil
		}
		if rate, ok := rates[productID]; ok && rate >= 0 {
			return rate, nil
		}
		if settings.GST.DefaultRate != nil {
			return *settings.GST.DefaultRate, nil
		}
		return 0, errors.New("choose a GST rate — or set a default in Settings → GST")
	}

	doc := Doc{Type: docType, Seller: seller, Buyer: buyer, PlaceOfSupply: pos + " - " + gst.States[pos],
		Intra: pos == seller.StateCode, Discount: o.discount + o.prepaid, OrderCode: o.code,
		OrderDate: o.created.UTC().Format(time.RFC3339), PaymentMethod: o.method, Note: settings.GST.Note}
	// order-level discounts come off each line in proportion to its value
	discountLeft := doc.Discount
	maxRate := 0
	for i, l := range lines {
		gross := l.Price * l.Qty
		cut := 0
		if o.subtotal > 0 {
			cut = doc.Discount * gross / o.subtotal
		}
		if i == len(lines)-1 {
			cut = discountLeft
		}
		discountLeft -= cut
		rate, err := rateFor(l.ProductID)
		if err != nil {
			return nil, http.StatusBadRequest, err
		}
		maxRate = max(maxRate, rate)
		name := l.Name
		if l.Variant != "" {
			name += " (" + l.Variant + ")"
		}
		hsn := hsns[l.ProductID]
		if hsn == "" {
			hsn = settings.GST.DefaultHSN
		}
		doc.Lines = append(doc.Lines, Line{Description: name, HSN: hsn, Qty: l.Qty, Rate: rate, Gross: gross - cut})
	}
	// delivery and COD charges follow the goods they come with (composite
	// supply): taxed at the highest rate on the invoice
	if o.shipping > 0 {
		doc.Lines = append(doc.Lines, Line{Description: "Shipping charges", Qty: 1, Rate: maxRate, Gross: o.shipping})
	}
	if o.codFee > 0 {
		doc.Lines = append(doc.Lines, Line{Description: "Cash on delivery charges", Qty: 1, Rate: maxRate, Gross: o.codFee})
	}
	splitLines(&doc)
	if doc.Total != o.total {
		return nil, http.StatusInternalServerError, errors.New("invoice does not add up to the order total")
	}

	tx, err := h.pool.Begin(ctx)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	defer tx.Rollback(ctx)
	fy := gst.FY(time.Now())
	n, err := gst.NextSerial(ctx, tx, "inv:"+bizID+":"+fy)
	if err != nil {
		return nil, http.StatusInternalServerError, errors.New("could not create invoice")
	}
	prefix := settings.GST.Prefix
	if prefix == "" {
		prefix = defaultPrefix(bizCode)
	}
	number := gst.Number(prefix, fy, n)
	data, _ := json.Marshal(doc)
	inv := Invoice{InvoiceNumber: number, OrderID: in.OrderID, OrderCode: o.code, CustomerName: o.customerName,
		Subtotal: o.subtotal, Discount: doc.Discount, Shipping: o.shipping + o.codFee, GstRate: maxRate,
		GstAmount: doc.CGST + doc.SGST + doc.IGST, Total: o.total, DocType: docType, Doc: &doc}
	err = tx.QueryRow(ctx, `insert into invoices (business_id, order_id, invoice_number, subtotal, discount, shipping,
		gst_rate, gst_amount, total, doc_type, data)
		values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
		returning id, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
		bizID, in.OrderID, number, inv.Subtotal, inv.Discount, inv.Shipping, inv.GstRate, inv.GstAmount, inv.Total,
		docType, string(data)).Scan(&inv.ID, &inv.CreatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "invoices_order_id_key") {
			return nil, http.StatusConflict, errors.New("order already has an invoice")
		}
		return nil, http.StatusInternalServerError, errors.New("could not create invoice")
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, http.StatusInternalServerError, errors.New("could not create invoice")
	}
	return &inv, 0, nil
}

// splitLines takes the tax out of every line and totals the document.
func splitLines(doc *Doc) {
	doc.Taxable, doc.CGST, doc.SGST, doc.IGST, doc.Total = 0, 0, 0, 0, 0
	for i := range doc.Lines {
		l := &doc.Lines[i]
		l.Taxable, l.CGST, l.SGST, l.IGST = gst.Split(l.Gross, l.Rate, doc.Intra)
		doc.Taxable += l.Taxable
		doc.CGST += l.CGST
		doc.SGST += l.SGST
		doc.IGST += l.IGST
		doc.Total += l.Gross
	}
}

// IssueCreditNote reverses the tax on a refund for an invoiced order, in the
// refund's transaction. The refund is spread over the invoice lines in
// proportion; no invoice means nothing to do.
func IssueCreditNote(ctx context.Context, tx pgx.Tx, bizID, orderID, refundID string, amount int) error {
	var invID, number string
	var raw []byte
	var total, gstRate, gstAmount int
	err := tx.QueryRow(ctx, `select id, invoice_number, data, total, gst_rate, gst_amount from invoices
		where order_id=$1 and business_id=$2`, orderID, bizID).Scan(&invID, &number, &raw, &total, &gstRate, &gstAmount)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	if total <= 0 {
		return nil
	}
	var inv Doc
	if raw != nil {
		json.Unmarshal(raw, &inv)
	} else {
		// an invoice from before line snapshots: one line at its single rate
		inv = Doc{Type: "tax_invoice", Intra: true, Lines: []Line{{Description: "Goods", Qty: 1, Rate: gstRate, Gross: total}}}
	}
	cn := inv
	cn.Type, cn.AgainstInvoice, cn.Discount, cn.Lines = "credit_note", number, 0, nil
	left := amount
	for i, l := range inv.Lines {
		part := l.Gross * amount / total
		if i == len(inv.Lines)-1 {
			part = left
		}
		left -= part
		if part > 0 {
			cn.Lines = append(cn.Lines, Line{Description: l.Description, HSN: l.HSN, Qty: l.Qty, Rate: l.Rate, Gross: part})
		}
	}
	splitLines(&cn)
	fy := gst.FY(time.Now())
	n, err := gst.NextSerial(ctx, tx, "cn:"+bizID+":"+fy)
	if err != nil {
		return err
	}
	data, _ := json.Marshal(cn)
	_, err = tx.Exec(ctx, `insert into credit_notes (business_id, invoice_id, refund_id, number, data, total)
		values ($1,$2,$3,$4,$5::jsonb,$6)`, bizID, invID, refundID, gst.Number("CN", fy, n), string(data), cn.Total)
	return err
}

// defaultPrefix is up to four letters from the store code: "riya-boutique" → "RB".
func defaultPrefix(code string) string {
	var b strings.Builder
	for _, part := range strings.FieldsFunc(code, func(r rune) bool { return !unicode.IsLetter(r) && !unicode.IsDigit(r) }) {
		if b.Len() < 4 {
			b.WriteRune(unicode.ToUpper([]rune(part)[0]))
		}
	}
	if b.Len() < 2 {
		return "INV"
	}
	return b.String()
}

func joinAddr(parts ...string) string {
	var out []string
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return strings.Join(out, ", ")
}

const listSelect = `select i.id, i.invoice_number, i.order_id, o.order_code, c.name,
	i.subtotal, i.discount, i.shipping, i.gst_rate, i.gst_amount, i.total, i.doc_type,
	to_char(i.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
	from invoices i join orders o on o.id = i.order_id join customers c on c.id = o.customer_id`

func scanInvoice(row pgx.Row, inv *Invoice) error {
	return row.Scan(&inv.ID, &inv.InvoiceNumber, &inv.OrderID, &inv.OrderCode, &inv.CustomerName,
		&inv.Subtotal, &inv.Discount, &inv.Shipping, &inv.GstRate, &inv.GstAmount, &inv.Total, &inv.DocType, &inv.CreatedAt)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	limit, offset := httpx.Page(r)
	rows, err := h.pool.Query(r.Context(), listSelect+` where i.business_id=$1 order by i.created_at desc limit $2 offset $3`,
		middleware.BusinessID(r.Context()), limit, offset)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load invoices")
		return
	}
	defer rows.Close()
	invoices := []Invoice{}
	for rows.Next() {
		var inv Invoice
		if err := scanInvoice(rows, &inv); err != nil {
			httpx.Err(w, http.StatusInternalServerError, "could not load invoices")
			return
		}
		invoices = append(invoices, inv)
	}
	httpx.OK(w, httpx.M{"invoices": invoices})
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	bizID := middleware.BusinessID(ctx)
	var inv Invoice
	if err := scanInvoice(h.pool.QueryRow(ctx, listSelect+` where i.id=$1 and i.business_id=$2`, r.PathValue("id"), bizID), &inv); err != nil {
		httpx.Err(w, http.StatusNotFound, "invoice not found")
		return
	}
	var raw []byte
	h.pool.QueryRow(ctx, `select data from invoices where id=$1`, inv.ID).Scan(&raw)
	if raw != nil {
		inv.Doc = &Doc{}
		json.Unmarshal(raw, inv.Doc)
	}
	rows, err := h.pool.Query(ctx, `select id, number, total, data, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		from credit_notes where invoice_id=$1 order by created_at`, inv.ID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var cn CreditNote
			var data []byte
			if rows.Scan(&cn.ID, &cn.Number, &cn.Total, &data, &cn.CreatedAt) == nil {
				json.Unmarshal(data, &cn.Doc)
				inv.CreditNotes = append(inv.CreditNotes, cn)
			}
		}
	}
	httpx.OK(w, inv)
}
