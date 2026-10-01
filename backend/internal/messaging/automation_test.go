package messaging

import (
	"testing"

	"carthedge/internal/ai"
	"carthedge/internal/customer"
)

func TestAutoConfirmable(t *testing.T) {
	complete := func() *ai.Draft {
		return &ai.Draft{Confidence: 95, Data: ai.DraftData{
			Items:        []ai.DraftItem{{ProductID: "p1", Name: "Rose Kurti", Variant: "M", Qty: 1}},
			CustomerName: "Priya", Phone: "98110 43210", PaymentMethod: "cod",
			Address: customer.Address{Line: "45 Civil Lines", City: "Delhi", Pincode: "110054"},
		}}
	}
	if !autoConfirmable(complete()) {
		t.Fatal("a complete, catalog-matched, high-confidence draft should auto-confirm")
	}
	for name, spoil := range map[string]func(*ai.Draft){
		"low confidence":     func(d *ai.Draft) { d.Confidence = 85 },
		"custom item":        func(d *ai.Draft) { d.Data.Items[0].ProductID = "" },
		"no items":           func(d *ai.Draft) { d.Data.Items = nil },
		"bad phone":          func(d *ai.Draft) { d.Data.Phone = "12345" },
		"no pincode":         func(d *ai.Draft) { d.Data.Address.Pincode = "" },
		"no address":         func(d *ai.Draft) { d.Data.Address.Line = " " },
		"no name":            func(d *ai.Draft) { d.Data.CustomerName = "" },
		"zero quantity line": func(d *ai.Draft) { d.Data.Items[0].Qty = 0 },
	} {
		d := complete()
		spoil(d)
		if autoConfirmable(d) {
			t.Errorf("%s: auto-confirmed an incomplete draft", name)
		}
	}
}
