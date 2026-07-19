package invoice

import (
	"fmt"
	"net/http"
	"strings"

	"carthedge/internal/httpx"
	"carthedge/internal/middleware"

	"github.com/jackc/pgx/v5/pgxpool"
)

// GST-lite invoicing: numbered records with GST split (inclusive pricing);
// the frontend renders the printable document.
type Handler struct {
	pool *pgxpool.Pool
}

func NewHandler(pool *pgxpool.Pool) *Handler { return &Handler{pool: pool} }

type Invoice struct {
	ID            string `json:"id"`
	InvoiceNumber string `json:"invoiceNumber"`
	OrderID       string `json:"orderId"`
	OrderCode     string `json:"orderCode"`
	CustomerName  string `json:"customerName"`
	Subtotal      int    `json:"subtotal"`
	Discount      int    `json:"discount"`
	Shipping      int    `json:"shipping"`
	GstRate       int    `json:"gstRate"`
	GstAmount     int    `json:"gstAmount"`
	Total         int    `json:"total"`
	CreatedAt     string `json:"createdAt"`
}

var validGstRates = map[int]bool{0: true, 3: true, 5: true, 12: true, 18: true, 28: true}

// Create issues an invoice for an order; gstRate splits the GST out of the
// GST-inclusive total.
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var in struct {
		OrderID string `json:"orderId"`
		GstRate int    `json:"gstRate"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if !validGstRates[in.GstRate] {
		httpx.Err(w, http.StatusBadRequest, "gstRate must be one of 0, 3, 5, 12, 18, 28")
		return
	}
	ctx := r.Context()
	bizID := middleware.BusinessID(ctx)

	var subtotal, discount, shipping, total int
	err := h.pool.QueryRow(ctx, `select subtotal, discount, shipping, total from orders
		where id=$1 and business_id=$2 and status not in ('cancelled')`, in.OrderID, bizID).Scan(&subtotal, &discount, &shipping, &total)
	if err != nil {
		httpx.Err(w, http.StatusNotFound, "order not found")
		return
	}
	gstAmount := 0
	if in.GstRate > 0 {
		gstAmount = total * in.GstRate / (100 + in.GstRate)
	}
	prefix := strings.ToUpper(strings.ReplaceAll(middleware.BusinessCode(ctx), "-", ""))

	var inv Invoice
	// retry once on a rare concurrent number collision
	for attempt := 0; attempt < 2; attempt++ {
		var seq int
		if err := h.pool.QueryRow(ctx, `select count(*) + 1 from invoices where business_id=$1`, bizID).Scan(&seq); err != nil {
			httpx.Err(w, http.StatusInternalServerError, "could not create invoice")
			return
		}
		number := fmt.Sprintf("INV-%s-%05d", prefix, seq)
		err = h.pool.QueryRow(ctx, `insert into invoices (business_id, order_id, invoice_number, subtotal, discount, shipping, gst_rate, gst_amount, total)
			values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
			returning id, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
			bizID, in.OrderID, number, subtotal, discount, shipping, in.GstRate, gstAmount, total).Scan(&inv.ID, &inv.CreatedAt)
		if err == nil {
			inv.InvoiceNumber = number
			break
		}
		if strings.Contains(err.Error(), "invoices_order_id_key") {
			httpx.Err(w, http.StatusConflict, "order already has an invoice")
			return
		}
		if attempt == 1 {
			httpx.Err(w, http.StatusInternalServerError, "could not create invoice")
			return
		}
	}
	inv.OrderID, inv.Subtotal, inv.Discount, inv.Shipping = in.OrderID, subtotal, discount, shipping
	inv.GstRate, inv.GstAmount, inv.Total = in.GstRate, gstAmount, total
	httpx.Created(w, inv)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	limit, offset := httpx.Page(r)
	rows, err := h.pool.Query(r.Context(), `select i.id, i.invoice_number, i.order_id, o.order_code, c.name,
		i.subtotal, i.discount, i.shipping, i.gst_rate, i.gst_amount, i.total,
		to_char(i.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		from invoices i join orders o on o.id = i.order_id join customers c on c.id = o.customer_id
		where i.business_id=$1 order by i.created_at desc limit $2 offset $3`,
		middleware.BusinessID(r.Context()), limit, offset)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load invoices")
		return
	}
	defer rows.Close()
	invoices := []Invoice{}
	for rows.Next() {
		var inv Invoice
		if err := rows.Scan(&inv.ID, &inv.InvoiceNumber, &inv.OrderID, &inv.OrderCode, &inv.CustomerName,
			&inv.Subtotal, &inv.Discount, &inv.Shipping, &inv.GstRate, &inv.GstAmount, &inv.Total, &inv.CreatedAt); err != nil {
			httpx.Err(w, http.StatusInternalServerError, "could not load invoices")
			return
		}
		invoices = append(invoices, inv)
	}
	httpx.OK(w, httpx.M{"invoices": invoices})
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	var inv Invoice
	err := h.pool.QueryRow(r.Context(), `select i.id, i.invoice_number, i.order_id, o.order_code, c.name,
		i.subtotal, i.discount, i.shipping, i.gst_rate, i.gst_amount, i.total,
		to_char(i.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		from invoices i join orders o on o.id = i.order_id join customers c on c.id = o.customer_id
		where i.id=$1 and i.business_id=$2`,
		r.PathValue("id"), middleware.BusinessID(r.Context())).Scan(
		&inv.ID, &inv.InvoiceNumber, &inv.OrderID, &inv.OrderCode, &inv.CustomerName,
		&inv.Subtotal, &inv.Discount, &inv.Shipping, &inv.GstRate, &inv.GstAmount, &inv.Total, &inv.CreatedAt)
	if err != nil {
		httpx.Err(w, http.StatusNotFound, "invoice not found")
		return
	}
	httpx.OK(w, inv)
}
