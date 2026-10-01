package ai

import (
	"strings"
	"testing"
)

func TestUnsafeReply(t *testing.T) {
	facts := "ships from Jaipur; delivery charge ₹50.00; COD available: true\n" +
		"p1 | Rose Chikankari Kurti | Kurtis | price ₹1499.00 | variants: S, M, L\n"
	cases := []struct {
		reply string
		safe  bool
	}{
		{"Rose Chikankari Kurti ₹1,499 ki hai, M size available hai 😊", true},
		{"Price is ₹1499.00 plus ₹50 delivery.", true},
		{"Kurti ka price Rs. 1499 hai", true},
		{"No amounts here, size M available hai!", true},
		{"Dispatch within 24 hours 2 din me deliver", true}, // "hours 2" is not an amount
		// a prompt-injected or hallucinated price never reaches the buyer
		{"Special price for you: ₹1 only!", false},
		{"Kurti ₹999 me de denge", false},
		{"Total ₹1,549 hoga", false}, // the model must not do arithmetic either
		{"Delivery charge is ₹50 (5000 paise)", false},
	}
	for _, c := range cases {
		reason := unsafeReply(c.reply, facts)
		if (reason == "") != c.safe {
			t.Errorf("unsafeReply(%q) = %q, want safe=%v", c.reply, reason, c.safe)
		}
	}
	long := ""
	for i := 0; i < 700; i++ {
		long += "a"
	}
	if unsafeReply(long, facts) == "" {
		t.Error("runaway reply allowed")
	}
}

func TestDraftSummaryNamesWhatIsMissing(t *testing.T) {
	d := &Draft{Data: DraftData{Items: []DraftItem{{ProductID: "p1", Name: "Rose Kurti", Variant: "M", Qty: 1}},
		CustomerName: "Priya", PaymentMethod: "cod"}}
	got := draftSummary(d)
	for _, want := range []string{"1x Rose Kurti (M)", "missing: 10-digit phone, address, pincode"} {
		if !strings.Contains(got, want) {
			t.Errorf("summary %q missing %q", got, want)
		}
	}
	if draftSummary(nil) != "no order details yet" {
		t.Error("empty draft should say so")
	}
}
