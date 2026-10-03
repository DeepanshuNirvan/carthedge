package aftersale

import (
	"context"
	"errors"
	"slices"
	"sync"
	"time"

	"carthedge/internal/order"
	"carthedge/internal/shop"
)

// Option is another size or colour a buyer can exchange into.
type Option struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	InStock bool   `json:"inStock"`
}

// BuyerView is what the tracking page may offer the buyer for one order.
type BuyerView struct {
	CanCancel        bool              `json:"canCancel"`
	CanChangeAddress bool              `json:"canChangeAddress"`
	CanReturn        bool              `json:"canReturn"`
	ReturnBy         string            `json:"returnBy,omitempty"` // when the window closes
	ReturnPolicy     shop.ReturnPolicy `json:"returnPolicy"`
	Returns          []Return          `json:"returns"`
	Refunds          []Refund          `json:"refunds"`
	// Options[i] are the exchange choices for order line i
	Options map[int][]Option `json:"options"`
	// Returnable[i] is how many of line i can still come back
	Returnable map[int]int `json:"returnable"`
}

func (s *Service) BuyerView(ctx context.Context, bizID string, o *order.Order) (*BuyerView, error) {
	// the reads are independent: one round trip of latency instead of five
	var (
		wg                          sync.WaitGroup
		settings                    *shop.Settings
		returns                     []Return
		refunds                     []Refund
		delivered                   *time.Time
		already                     map[int]int
		errSettings, errRet, errRef error
	)
	run := func(f func()) {
		wg.Add(1)
		go func() { defer wg.Done(); f() }()
	}
	run(func() { settings, errSettings = shop.Load(ctx, s.pool, bizID) })
	run(func() { returns, errRet = s.ForOrder(ctx, bizID, o.ID) })
	run(func() {
		refunds, errRef = s.refunds(ctx, `f.order_id=$1 and f.business_id=$2 and f.status in ('pending','processed') order by f.created_at`, o.ID, bizID)
	})
	returnable := o.Status == "delivered" && o.ReplacementOfID == ""
	if returnable {
		run(func() { delivered = s.deliveredAt(ctx, o.ID) })
		run(func() { already = s.returnedQty(ctx, o.ID) })
	}
	wg.Wait()
	if err := errors.Join(errSettings, errRet, errRef); err != nil {
		return nil, err
	}
	v := &BuyerView{
		CanCancel:        settings.Policies.BuyerCanCancel(o.Status),
		CanChangeAddress: slices.Contains([]string{"new", "confirmed", "packed"}, o.Status),
		ReturnPolicy:     settings.Policies.Returns,
		Returns:          returns,
		Refunds:          refunds,
		Options:          map[int][]Option{},
		Returnable:       map[int]int{},
	}
	policy := settings.Policies.Returns
	if !returnable || policy.WindowDays <= 0 || delivered == nil {
		return v, nil
	}
	ends := delivered.Add(time.Duration(policy.WindowDays) * 24 * time.Hour)
	v.ReturnBy = ends.UTC().Format(time.RFC3339)
	open := slices.ContainsFunc(v.Returns, func(r Return) bool { return slices.Contains(openStatuses, r.Status) })
	for i, l := range o.Items {
		if left := l.Qty - already[i]; left > 0 {
			v.Returnable[i] = left
		}
	}
	v.CanReturn = time.Now().Before(ends) && !open && len(v.Returnable) > 0 && (policy.Exchange || policy.Refund)
	if !v.CanReturn || !policy.Exchange {
		return v, nil
	}
	var ids []string
	for _, l := range o.Items {
		if l.ProductID != "" {
			ids = append(ids, l.ProductID)
		}
	}
	rows, err := s.pool.Query(ctx, `select product_id::text, id, name, in_stock from product_variants
		where product_id = any($1::uuid[]) order by name`, ids)
	if err != nil {
		return v, nil
	}
	defer rows.Close()
	byProduct := map[string][]Option{}
	for rows.Next() {
		var pid string
		var opt Option
		if rows.Scan(&pid, &opt.ID, &opt.Name, &opt.InStock) == nil {
			byProduct[pid] = append(byProduct[pid], opt)
		}
	}
	for i, l := range o.Items {
		if opts := byProduct[l.ProductID]; len(opts) > 0 {
			v.Options[i] = opts
		}
	}
	return v, nil
}
