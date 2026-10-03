package shop

import (
	"testing"
	"time"
)

func TestTotals(t *testing.T) {
	c := Checkout{ShippingFee: 5000, FreeShippingAbove: 100000, Pricing: Pricing{
		CodFee:          Fee{Kind: "flat", Value: 4900, FreeAbove: 200000},
		PrepaidDiscount: Discount{Kind: "percent", Value: 5, Max: 10000, MinOrder: 50000},
	}}
	cases := []struct {
		name               string
		subtotal, discount int
		method             string
		want               Totals
	}{
		{"cod pays fee and shipping", 60000, 0, "cod", Totals{60000, 0, 0, 5000, 4900, 69900}},
		{"prepaid 5% rounded to rupees", 60000, 0, "prepaid", Totals{60000, 0, 3000, 5000, 0, 62000}},
		{"coupon decides free shipping", 110000, 20000, "prepaid", Totals{110000, 20000, 4500, 5000, 0, 90500}},
		{"prepaid cap", 400000, 0, "prepaid", Totals{400000, 0, 10000, 0, 0, 390000}},
		{"cod free above", 250000, 0, "cod", Totals{250000, 0, 0, 0, 0, 250000}},
		{"below prepaid minimum", 40000, 0, "prepaid", Totals{40000, 0, 0, 5000, 0, 45000}},
		{"discount never exceeds subtotal", 1000, 5000, "cod", Totals{1000, 1000, 0, 5000, 4900, 9900}},
	}
	for _, tc := range cases {
		if got := c.Totals(tc.subtotal, tc.discount, tc.method); got != tc.want {
			t.Errorf("%s: got %+v want %+v", tc.name, got, tc.want)
		}
	}
	// no levers set = the old maths exactly
	plain := Checkout{ShippingFee: 5000}
	if got := plain.Totals(10000, 0, "cod"); got.Total != 15000 || got.CodFee != 0 {
		t.Errorf("plain checkout changed: %+v", got)
	}
}

func TestPolicyRules(t *testing.T) {
	var p Policies
	if !p.BuyerCanCancel("packed") || p.BuyerCanCancel("shipped") {
		t.Error("default should allow cancelling until dispatch")
	}
	p.CancelBefore = "confirmed"
	if p.BuyerCanCancel("confirmed") || !p.BuyerCanCancel("new") {
		t.Error("cancelBefore=confirmed should allow only new orders")
	}
	r := ReturnPolicy{WindowDays: 7, Exchange: true, Reasons: []string{"size", "damaged"}, PhotoRequired: true}
	if !r.Accepts("exchange", "size") || r.Accepts("return", "size") || r.Accepts("exchange", "changed_mind") {
		t.Error("return policy accepts the wrong requests")
	}
	if !r.NeedsPhoto("damaged") || r.NeedsPhoto("size") {
		t.Error("photo rule wrong")
	}
	if (ReturnPolicy{}).Accepts("exchange", "size") {
		t.Error("no window must mean no self-service returns")
	}
}

func TestHours(t *testing.T) {
	var h Hours
	h.Enabled = true
	for i := 1; i <= 6; i++ {
		h.Days[i] = Day{Open: true, From: "10:00", To: "19:00"}
	}
	sat9pm := time.Date(2026, 10, 3, 21, 0, 0, 0, IST) // Saturday
	if h.OpenAt(sat9pm) {
		t.Error("closed after hours")
	}
	next, ok := h.NextOpen(sat9pm)
	if !ok || next.Weekday() != time.Monday || next.Hour() != 10 {
		t.Errorf("next open after Saturday night should be Monday 10:00, got %v", next)
	}
	if !h.OpenAt(time.Date(2026, 10, 5, 10, 30, 0, 0, IST)) {
		t.Error("open Monday morning")
	}
	if (Hours{}).OpenAt(sat9pm) != true {
		t.Error("no hours set means always open")
	}
	p := AIProfile{Hours: Hours{Enabled: true}}
	if p.Validate() == nil {
		t.Error("hours with no open day must be rejected")
	}
}
