package analytics

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

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
	cacheKey := "dash:" + bizID
	if cached, err := h.rdb.Get(ctx, cacheKey).Result(); err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(cached))
		return
	}

	out := httpx.M{}
	var todayOrders, monthOrders, pendingOrders, codAtRisk int
	var todayRevenue, monthRevenue int64
	err := h.pool.QueryRow(ctx, `select
		count(*) filter (where created_at::date = current_date and status <> 'cancelled'),
		coalesce(sum(total) filter (where created_at::date = current_date and status not in ('cancelled','rto')), 0),
		count(*) filter (where created_at >= date_trunc('month', now()) and status <> 'cancelled'),
		coalesce(sum(total) filter (where created_at >= date_trunc('month', now()) and status not in ('cancelled','rto')), 0),
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
		and status in ('delivered','rto') and updated_at >= date_trunc('month', now())`, bizID).Scan(&delivered, &rto, &avgValue)
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
	rows, err := h.pool.Query(ctx, `select created_at::date, count(*), coalesce(sum(total),0)
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

// MonthlyReport: the accountant-ready summary for ?month=YYYY-MM (default current).
func (h *Handler) MonthlyReport(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	bizID := middleware.BusinessID(ctx)
	month := r.URL.Query().Get("month")
	start, err := time.Parse("2006-01", month)
	if err != nil {
		now := time.Now()
		start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	}
	end := start.AddDate(0, 1, 0)

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
