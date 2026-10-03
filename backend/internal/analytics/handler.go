package analytics

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"carthedge/internal/events"
	"carthedge/internal/httpx"
	"carthedge/internal/middleware"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Handler struct {
	pool *pgxpool.Pool
	rdb  *redis.Client
}

func NewHandler(pool *pgxpool.Pool, rdb *redis.Client) *Handler {
	return &Handler{pool: pool, rdb: rdb}
}

// Dashboard: today's sales, month revenue, pending orders, COD-at-risk,
// repeat rate, quota usage and the RTO savings meter. Cached 60s.
func (h *Handler) Dashboard(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	bizID := middleware.BusinessID(ctx)
	cacheKey := events.DashboardKey(bizID)
	if cached, err := h.rdb.Get(ctx, cacheKey).Result(); err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(cached))
		return
	}

	out := httpx.M{}
	var todayOrders, monthOrders, pendingOrders, codAtRisk int
	var todayRevenue, monthRevenue int64
	err := h.pool.QueryRow(ctx, `select
		count(*) filter (where (created_at at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date and status <> 'cancelled'),
		coalesce(sum(total) filter (where (created_at at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date and status not in ('cancelled','rto')), 0),
		count(*) filter (where created_at >= (date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') and status <> 'cancelled' and replacement_of is null),
		coalesce(sum(total) filter (where created_at >= (date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') and status not in ('cancelled','rto')), 0),
		count(*) filter (where status in ('new','confirmed')),
		count(*) filter (where payment_method='cod' and status in ('new','confirmed','packed','shipped')
			and (risk_flagged or (cod_confirmed_at is null and payment_status <> 'token_paid')))
		from orders where business_id = $1`, bizID).Scan(
		&todayOrders, &todayRevenue, &monthOrders, &monthRevenue, &pendingOrders, &codAtRisk)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load dashboard")
		return
	}
	out["todayOrders"] = todayOrders
	out["todayRevenue"] = todayRevenue
	out["monthOrders"] = monthOrders
	out["monthRevenue"] = monthRevenue
	out["pendingOrders"] = pendingOrders
	out["codAtRisk"] = codAtRisk

	var totalCustomers, repeatCustomers int
	h.pool.QueryRow(ctx, `select count(*), count(*) filter (where orders_count > 1) from customers where business_id=$1`,
		bizID).Scan(&totalCustomers, &repeatCustomers)
	out["totalCustomers"] = totalCustomers
	repeatRate := 0.0
	if totalCustomers > 0 {
		repeatRate = float64(repeatCustomers) / float64(totalCustomers) * 100
	}
	out["repeatRatePercent"] = int(repeatRate + 0.5)

	rto, err := h.rtoSavings(ctx, bizID)
	if err == nil {
		out["rtoMeter"] = rto
	}
	quota, err := h.quotaUsage(ctx, bizID, monthOrders)
	if err == nil {
		out["quota"] = quota
	}

	raw, _ := json.Marshal(out)
	h.rdb.Set(ctx, cacheKey, raw, time.Minute)
	w.Header().Set("Content-Type", "application/json")
	w.Write(raw)
}

// rtoSavings: baseline RTO% (industry default, seller-tunable) vs the seller's
// actual COD outcome rate this month, priced at their average COD order value.
func (h *Handler) rtoSavings(ctx context.Context, bizID string) (httpx.M, error) {
	var baseline int
	if err := h.pool.QueryRow(ctx, `select baseline_rto_percent from businesses where id=$1`, bizID).Scan(&baseline); err != nil {
		return nil, err
	}
	var delivered, rto int
	var avgValue float64
	err := h.pool.QueryRow(ctx, `select
		count(*) filter (where status='delivered'),
		count(*) filter (where status='rto'),
		coalesce(avg(total), 0)
		from orders where business_id=$1 and payment_method='cod'
		and status in ('delivered','rto') and updated_at >= (date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')`, bizID).Scan(&delivered, &rto, &avgValue)
	if err != nil {
		return nil, err
	}
	outcomes := delivered + rto
	actualPercent := 0
	savedPaise := 0
	if outcomes > 0 {
		actualPercent = rto * 100 / outcomes
		if actualPercent < baseline {
			savedPaise = (baseline - actualPercent) * outcomes * int(avgValue) / 100
		}
	}
	return httpx.M{
		"baselinePercent": baseline,
		"actualPercent":   actualPercent,
		"codOutcomes":     outcomes,
		"savedThisMonth":  savedPaise,
	}, nil
}

// quotaUsage compares month order count with the plan quota and prices the overage.
func (h *Handler) quotaUsage(ctx context.Context, bizID string, monthOrders int) (httpx.M, error) {
	var quota, perOrderFee int
	var planName string
	err := h.pool.QueryRow(ctx, `select p.order_quota, p.per_order_fee, p.name
		from subscriptions s join plans p on p.id = s.plan_id where s.business_id=$1`, bizID).Scan(&quota, &perOrderFee, &planName)
	if err != nil {
		return nil, err
	}
	overage := max(monthOrders-quota, 0)
	return httpx.M{
		"plan": planName, "used": monthOrders, "included": quota,
		"overageOrders": overage, "overageFee": overage * perOrderFee,
	}, nil
}

// Sales returns a daily revenue/orders series for the last N days (default 30).
func (h *Handler) Sales(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	days := 30
	if r.URL.Query().Get("days") == "90" {
		days = 90
	}
	rows, err := h.pool.Query(ctx, `select (created_at at time zone 'Asia/Kolkata')::date, count(*), coalesce(sum(total),0)
		from orders where business_id=$1 and created_at > now() - make_interval(days => $2)
		and status not in ('cancelled','rto')
		group by 1 order by 1`, middleware.BusinessID(ctx), days)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load sales")
		return
	}
	defer rows.Close()
	type point struct {
		Date    string `json:"date"`
		Orders  int    `json:"orders"`
		Revenue int64  `json:"revenue"`
	}
	series := []point{}
	for rows.Next() {
		var p point
		var d time.Time
		if err := rows.Scan(&d, &p.Orders, &p.Revenue); err != nil {
			httpx.Err(w, http.StatusInternalServerError, "could not load sales")
			return
		}
		p.Date = d.Format("2006-01-02")
		series = append(series, p)
	}
	httpx.OK(w, httpx.M{"series": series})
}

// TopProducts aggregates order lines from the item snapshots.
func (h *Handler) TopProducts(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	rows, err := h.pool.Query(ctx, `select coalesce(i->>'productId',''), i->>'name',
		sum((i->>'qty')::int), sum((i->>'qty')::int * (i->>'price')::int)
		from orders o, jsonb_array_elements(o.items) i
		where o.business_id=$1 and o.created_at > now() - interval '90 days'
		and o.status not in ('cancelled','rto')
		group by 1, 2 order by 4 desc limit 10`, middleware.BusinessID(ctx))
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load products report")
		return
	}
	defer rows.Close()
	type row struct {
		ProductID string `json:"productId,omitempty"`
		Name      string `json:"name"`
		Units     int    `json:"units"`
		Revenue   int64  `json:"revenue"`
	}
	top := []row{}
	for rows.Next() {
		var t row
		if err := rows.Scan(&t.ProductID, &t.Name, &t.Units, &t.Revenue); err != nil {
			httpx.Err(w, http.StatusInternalServerError, "could not load products report")
			return
		}
		top = append(top, t)
	}
	httpx.OK(w, httpx.M{"products": top})
}

// Insights is the seller's "what should I do next" panel: best sellers, buyers
// to watch, repeat-rate movement, the hour their buyers actually order in, and
// the RTO trend. All derived from their own data — no model call, no cost.
func (h *Handler) Insights(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	bizID := middleware.BusinessID(ctx)
	out := httpx.M{}

	type seller struct {
		Name    string `json:"name"`
		Units   int    `json:"units"`
		Revenue int64  `json:"revenue"`
	}
	best := []seller{}
	rows, err := h.pool.Query(ctx, `select i->>'name', sum((i->>'qty')::int), sum((i->>'qty')::int * (i->>'price')::int)
		from orders o, jsonb_array_elements(o.items) i
		where o.business_id=$1 and o.created_at >= (date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')
		and o.status not in ('cancelled','rto')
		group by 1 order by 3 desc limit 5`, bizID)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load insights")
		return
	}
	for rows.Next() {
		var s seller
		if rows.Scan(&s.Name, &s.Units, &s.Revenue) == nil {
			best = append(best, s)
		}
	}
	rows.Close()
	out["bestSellers"] = best

	type risky struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Phone       string `json:"phone"`
		CodRefusals int    `json:"codRefusals"`
		OpenCod     int    `json:"openCodOrders"`
	}
	watch := []risky{}
	rows, err = h.pool.Query(ctx, `select c.id, c.name, c.phone, c.cod_refusals,
		count(o.id) filter (where o.payment_method='cod' and o.status in ('new','confirmed','packed'))
		from customers c left join orders o on o.customer_id = c.id
		where c.business_id=$1 and (c.risk_flagged or c.cod_refusals > 0)
		group by c.id order by c.cod_refusals desc, 5 desc limit 5`, bizID)
	if err == nil {
		for rows.Next() {
			var c risky
			if rows.Scan(&c.ID, &c.Name, &c.Phone, &c.CodRefusals, &c.OpenCod) == nil {
				watch = append(watch, c)
			}
		}
		rows.Close()
	}
	out["codRiskBuyers"] = watch

	var thisMonth, lastMonth int
	h.pool.QueryRow(ctx, `select
		count(distinct customer_id) filter (where created_at >= (date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')),
		count(distinct customer_id) filter (where created_at >= (date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') - interval '1 month'
			and created_at < (date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'))
		from orders o where business_id=$1 and status <> 'cancelled'
		and (select orders_count from customers c where c.id = o.customer_id) > 1`, bizID).Scan(&thisMonth, &lastMonth)
	out["repeatBuyers"] = httpx.M{"thisMonth": thisMonth, "lastMonth": lastMonth}

	var hour, hourOrders int
	if h.pool.QueryRow(ctx, `select extract(hour from created_at at time zone 'Asia/Kolkata')::int, count(*) from orders
		where business_id=$1 and created_at > now() - interval '90 days'
		group by 1 order by 2 desc limit 1`, bizID).Scan(&hour, &hourOrders) == nil {
		out["suggestedBroadcastWindow"] = httpx.M{
			"hour": hour, "label": fmt.Sprintf("%02d:00–%02d:00", hour, (hour+1)%24), "orders": hourOrders,
		}
	}

	if rto, err := h.rtoSavings(ctx, bizID); err == nil {
		var prevDelivered, prevRto int
		h.pool.QueryRow(ctx, `select count(*) filter (where status='delivered'), count(*) filter (where status='rto')
			from orders where business_id=$1 and payment_method='cod'
			and updated_at >= (date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') - interval '1 month'
			and updated_at < (date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')`, bizID).Scan(&prevDelivered, &prevRto)
		if prev := prevDelivered + prevRto; prev > 0 {
			rto["lastMonthPercent"] = prevRto * 100 / prev
		}
		out["rtoTrend"] = rto
	}
	httpx.OK(w, out)
}

// MonthlyReport: the accountant-ready summary for ?month=YYYY-MM (default
// current). ?format=csv exports the month's orders as a spreadsheet.
func (h *Handler) MonthlyReport(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	bizID := middleware.BusinessID(ctx)
	month := r.URL.Query().Get("month")
	start, err := time.ParseInLocation("2006-01", month, ist)
	if err != nil {
		now := time.Now().In(ist)
		start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, ist)
	}
	end := start.AddDate(0, 1, 0)

	if r.URL.Query().Get("format") == "csv" {
		h.exportCSV(w, r, bizID, start, end)
		return
	}

	byStatus := map[string]int{}
	rows, err := h.pool.Query(ctx, `select status, count(*) from orders
		where business_id=$1 and created_at >= $2 and created_at < $3 group by status`, bizID, start, end)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load report")
		return
	}
	total := 0
	for rows.Next() {
		var st string
		var n int
		if err := rows.Scan(&st, &n); err != nil {
			rows.Close()
			httpx.Err(w, http.StatusInternalServerError, "could not load report")
			return
		}
		byStatus[st] = n
		total += n
	}
	rows.Close()

	var revenue, codRevenue, prepaidRevenue int64
	h.pool.QueryRow(ctx, `select
		coalesce(sum(total) filter (where status not in ('cancelled','rto')), 0),
		coalesce(sum(total) filter (where payment_method='cod' and status not in ('cancelled','rto')), 0),
		coalesce(sum(total) filter (where payment_method='prepaid' and status not in ('cancelled','rto')), 0)
		from orders where business_id=$1 and created_at >= $2 and created_at < $3`, bizID, start, end).Scan(
		&revenue, &codRevenue, &prepaidRevenue)

	quota, _ := h.quotaUsage(ctx, bizID, total)
	rto, _ := h.rtoSavings(ctx, bizID)

	httpx.OK(w, httpx.M{
		"month": start.Format("2006-01"), "orders": total, "ordersByStatus": byStatus,
		"revenue": revenue, "codRevenue": codRevenue, "prepaidRevenue": prepaidRevenue,
		"quota": quota, "rtoMeter": rto,
	})
}

// exportCSV streams the month's orders for the seller's accountant. Amounts are
// written in rupees — the spreadsheet is read by a human, not the API.
func (h *Handler) exportCSV(w http.ResponseWriter, r *http.Request, bizID string, start, end time.Time) {
	rows, err := h.pool.Query(r.Context(), `select o.order_code, o.created_at, c.name, c.phone,
		coalesce(o.address->>'city', ''), coalesce(o.address->>'pincode', ''),
		o.payment_method, o.payment_status, o.status,
		o.subtotal, o.discount, o.shipping, o.total, coalesce(i.invoice_number, '')
		from orders o join customers c on c.id = o.customer_id
		left join invoices i on i.order_id = o.id
		where o.business_id=$1 and o.created_at >= $2 and o.created_at < $3
		order by o.created_at`, bizID, start, end)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not export report")
		return
	}
	defer rows.Close()

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="carthedge-`+start.Format("2006-01")+`.csv"`)
	cw := csv.NewWriter(w)
	defer cw.Flush()
	cw.Write([]string{"orderCode", "date", "customer", "phone", "city", "pincode", "paymentMethod",
		"paymentStatus", "status", "subtotal", "discount", "shipping", "total", "invoiceNumber"})

	for rows.Next() {
		var code, name, phone, city, pincode, method, payStatus, status, invoice string
		var createdAt time.Time
		var subtotal, discount, shipping, total int
		if err := rows.Scan(&code, &createdAt, &name, &phone, &city, &pincode, &method, &payStatus, &status,
			&subtotal, &discount, &shipping, &total, &invoice); err != nil {
			return // headers are already out; truncate rather than write a broken body
		}
		cw.Write([]string{code, createdAt.In(ist).Format("2006-01-02"), cell(name), phone, cell(city), pincode, method, payStatus, status,
			rupees(subtotal), rupees(discount), rupees(shipping), rupees(total), invoice})
	}
}

func rupees(paise int) string { return strconv.FormatFloat(float64(paise)/100, 'f', 2, 64) }

// ist is the sellers' clock. The database runs on UTC, so every "today",
// "this month" and order hour here is taken in Asia/Kolkata explicitly —
// otherwise orders placed before 05:30 count as yesterday.
var ist = time.FixedZone("IST", 5*3600+1800)

// cell defuses a buyer-typed value a spreadsheet would run as a formula
// (=HYPERLINK(...), +cmd, -2+3, @SUM) when the seller opens the export.
func cell(s string) string {
	if s != "" && strings.ContainsRune("=+-@\t\r", rune(s[0])) {
		return "'" + s
	}
	return s
}
