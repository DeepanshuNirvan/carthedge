package admin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"carthedge/internal/httpx"
	"carthedge/internal/middleware"

	"github.com/golang-jwt/jwt/v5"
)

// audit records what an admin did to a business; failures are logged by the
// database layer's caller only, never blocking the action itself.
func (s *Service) audit(ctx context.Context, r *http.Request, bizID, action string, detail map[string]any) {
	raw, _ := json.Marshal(detail)
	var biz any
	if bizID != "" {
		biz = bizID
	}
	s.pool.Exec(ctx, `insert into admin_audit (admin_id, business_id, action, detail, ip) values ($1,$2,$3,$4::jsonb,$5)`,
		middleware.AdminID(ctx), biz, action, string(raw), middleware.ClientIP(r))
}

// supportTTL bounds a view-as-seller session; there is no refresh.
const supportTTL = 30 * time.Minute

// Impersonate opens a read-only seller session for support: the token carries
// the admin in "imp", which the seller auth middleware turns into read-only.
func (s *Service) Impersonate(ctx context.Context, bizID string) (httpx.M, error) {
	var code, name, status string
	if err := s.pool.QueryRow(ctx, `select code, name, status from businesses where id=$1`, bizID).Scan(&code, &name, &status); err != nil {
		return nil, errors.New("business not found")
	}
	if status == "purged" {
		return nil, errors.New("this account has been deleted")
	}
	now := time.Now()
	exp := now.Add(supportTTL)
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": bizID, "biz": code, "imp": middleware.AdminID(ctx), "iat": now.Unix(), "exp": exp.Unix(),
	}).SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return nil, err
	}
	return httpx.M{"accessToken": token, "businessId": bizID, "businessCode": code, "businessName": name,
		"expiresAt": exp.UTC().Format(time.RFC3339)}, nil
}

// modelPrices are list prices in USD per million tokens (input, output),
// matched by model-name prefix; the admin can override them and the exchange
// rate in site_settings "aiPricing". ponytail: list prices, not invoices.
var modelPrices = []struct {
	prefix  string
	in, out float64
}{
	{"gpt-4o-mini", 0.15, 0.60},
	{"gpt-4o", 2.50, 10.00},
	{"gpt-4.1-nano", 0.10, 0.40},
	{"gpt-4.1-mini", 0.40, 1.60},
	{"gpt-4.1", 2.00, 8.00},
	{"gpt-5-nano", 0.05, 0.40},
	{"gpt-5-mini", 0.25, 2.00},
	{"gpt-5", 1.25, 10.00},
	{"gemini", 0.30, 2.50}, // flash-class default; pro models below override
}

type aiPricing struct {
	UsdInr float64               `json:"usdInr"`
	Models map[string][2]float64 `json:"models"`
}

func (s *Service) pricing(ctx context.Context) aiPricing {
	p := aiPricing{UsdInr: 85}
	var raw []byte
	if s.pool.QueryRow(ctx, `select value from site_settings where key='aiPricing'`).Scan(&raw) == nil {
		json.Unmarshal(raw, &p)
	}
	if p.UsdInr <= 0 {
		p.UsdInr = 85
	}
	return p
}

// costPaise prices a model's tokens in paise.
func (p aiPricing) costPaise(model string, in, out int64) int64 {
	inPrice, outPrice := 0.50, 1.50 // unknown model: a cautious middle
	if v, ok := p.Models[model]; ok {
		inPrice, outPrice = v[0], v[1]
	} else {
		for _, m := range modelPrices {
			if strings.HasPrefix(model, m.prefix) {
				inPrice, outPrice = m.in, m.out
				break
			}
		}
		if strings.HasPrefix(model, "gemini") && strings.Contains(model, "pro") {
			inPrice, outPrice = 1.25, 10.00
		}
	}
	usd := float64(in)/1e6*inPrice + float64(out)/1e6*outPrice
	return int64(usd*p.UsdInr*100 + 0.5)
}

type usageTotals struct {
	Calls        int64 `json:"calls"`
	InputTokens  int64 `json:"inputTokens"`
	OutputTokens int64 `json:"outputTokens"`
	Cost         int64 `json:"cost"` // paise
}

func (t *usageTotals) add(calls, in, out, cost int64) {
	t.Calls += calls
	t.InputTokens += in
	t.OutputTokens += out
	t.Cost += cost
}

// AIUsage is model spend over the last `days` days (IST), per seller and per
// day; bizID narrows it to one seller.
func (s *Service) AIUsage(ctx context.Context, days int, bizID string) (httpx.M, error) {
	p := s.pricing(ctx)
	where := `u.day > (now() at time zone 'Asia/Kolkata')::date - $1::int`
	args := []any{days}
	if bizID != "" {
		where += ` and u.business_id = $2`
		args = append(args, bizID)
	}
	rows, err := s.pool.Query(ctx, `select u.business_id, b.name, b.code, to_char(u.day, 'YYYY-MM-DD'), u.model,
		u.calls, u.input_tokens, u.output_tokens
		from ai_usage u join businesses b on b.id = u.business_id where `+where, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	type seller struct {
		ID   string `json:"id"`
		Name string `json:"name"`
		Code string `json:"code"`
		usageTotals
	}
	var total usageTotals
	sellers := map[string]*seller{}
	daily := map[string]*usageTotals{}
	for rows.Next() {
		var id, name, code, day, model string
		var calls, in, out int64
		if err := rows.Scan(&id, &name, &code, &day, &model, &calls, &in, &out); err != nil {
			return nil, err
		}
		cost := p.costPaise(model, in, out)
		total.add(calls, in, out, cost)
		if sellers[id] == nil {
			sellers[id] = &seller{ID: id, Name: name, Code: code}
		}
		sellers[id].add(calls, in, out, cost)
		if daily[day] == nil {
			daily[day] = &usageTotals{}
		}
		daily[day].add(calls, in, out, cost)
	}
	list := make([]*seller, 0, len(sellers))
	for _, v := range sellers {
		list = append(list, v)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].Cost > list[j].Cost })
	type dayRow struct {
		Day string `json:"day"`
		usageTotals
	}
	days2 := make([]dayRow, 0, len(daily))
	for d, v := range daily {
		days2 = append(days2, dayRow{Day: d, usageTotals: *v})
	}
	sort.Slice(days2, func(i, j int) bool { return days2[i].Day < days2[j].Day })
	return httpx.M{"days": days, "totals": total, "businesses": list, "daily": days2, "usdInr": p.UsdInr}, nil
}

// Audit lists recent admin actions on one business.
func (s *Service) Audit(ctx context.Context, bizID string, limit int) ([]httpx.M, error) {
	rows, err := s.pool.Query(ctx, `select a.action, a.detail, a.ip, coalesce(ad.email, ''),
		to_char(a.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		from admin_audit a left join admins ad on ad.id = a.admin_id
		where a.business_id=$1 order by a.created_at desc limit $2`, bizID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []httpx.M{}
	for rows.Next() {
		var action, ip, email, at string
		var detail json.RawMessage
		if rows.Scan(&action, &detail, &ip, &email, &at) == nil {
			out = append(out, httpx.M{"action": action, "detail": detail, "ip": ip, "adminEmail": email, "createdAt": at})
		}
	}
	return out, rows.Err()
}

func (h *Handler) Impersonate(w http.ResponseWriter, r *http.Request) {
	out, err := h.svc.Impersonate(r.Context(), r.PathValue("id"))
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	h.svc.audit(r.Context(), r, r.PathValue("id"), "viewAsSeller", map[string]any{"expiresAt": out["expiresAt"]})
	httpx.OK(w, out)
}

func (h *Handler) AIUsage(w http.ResponseWriter, r *http.Request) {
	days := 30
	if n, err := strconv.Atoi(r.URL.Query().Get("days")); err == nil && n > 0 && n <= 90 {
		days = n
	}
	out, err := h.svc.AIUsage(r.Context(), days, "")
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load AI usage")
		return
	}
	httpx.OK(w, out)
}
