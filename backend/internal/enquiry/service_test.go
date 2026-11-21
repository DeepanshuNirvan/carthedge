package enquiry

import (
	"strings"
	"testing"
)

func lead() Lead {
	return Lead{Items: []Item{{Name: "Goa Beach Trip", Option: "Deluxe", Qty: 4}, {Name: "Airport Pickup", Qty: 1}},
		Answers: []Answer{{Label: "Travel dates", Value: "12-15 Dec"}}, Name: "Priya", Phone: "9876543210"}
}

func TestHashChangesWithAnyDetail(t *testing.T) {
	a, b := lead(), lead()
	if a.Hash() != b.Hash() {
		t.Fatal("the same enquiry must pin the same")
	}
	b.Answers[0].Value = "20 Dec"
	if a.Hash() == b.Hash() {
		t.Error("a changed detail must change the pin")
	}
}

func TestQuoteMessageCarriesTheOwnersPrice(t *testing.T) {
	msg := QuoteMessage("Wander Co", &Enquiry{Lead: lead(), QuotedAmount: 1800000, QuoteNote: "Stay and breakfast included"})
	for _, want := range []string{"Quote from Wander Co", "Goa Beach Trip (Deluxe) × 4, Airport Pickup", "Price: ₹18,000", "Stay and breakfast included"} {
		if !strings.Contains(msg, want) {
			t.Errorf("missing %q in:\n%s", want, msg)
		}
	}
}

func TestPatchRefusesWhatTheOwnerCannotSet(t *testing.T) {
	s := func(v string) *string { return &v }
	n := func(v int) *int { return &v }
	bad := []Patch{{Status: s("booked")}, {QuotedAmount: n(-1)}, {QuotedAmount: n(maxQuote + 1)},
		{QuoteNote: s(strings.Repeat("a", 501))}, {SellerNotes: s(strings.Repeat("a", 2001))}}
	for i, p := range bad {
		if p.check() == nil {
			t.Errorf("patch %d was accepted", i)
		}
	}
	ok := Patch{Status: s("won"), QuotedAmount: n(0), QuoteNote: s("  all in  ")}
	if err := ok.check(); err != nil || *ok.QuoteNote != "all in" {
		t.Errorf("err=%v note=%q", err, *ok.QuoteNote)
	}
}
