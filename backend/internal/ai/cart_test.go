package ai

import (
	"strings"
	"testing"

	"carthedge/internal/customer"
	"carthedge/internal/product"
)

func no() *bool { b := false; return &b }
func qty(n int) *int {
	return &n
}

func testStore() Store {
	return Store{
		ID: "biz", Name: "Rangrez", Code: "rangrez", BaseURL: "https://x.test", City: "Jaipur",
		ShippingFee: 5000, FreeShippingAbove: 200000, CodEnabled: true, OnlinePay: true,
		Products: []product.Product{
			{ID: "kurti", Name: "Rose Chikankari Kurti", Price: 149900, InStock: true, StockQty: product.Untracked,
				Variants: []product.Variant{{ID: "vS", Name: "S"}, {ID: "vM", Name: "M"}, {ID: "vL", Name: "L", InStock: no(), StockQty: qty(0)}}},
			{ID: "jhumka", Name: "Oxidised Jhumkas", Price: 89900, InStock: true, StockQty: 2},
			{ID: "saree", Name: "Blue Silk Saree", Price: 499900, InStock: false, StockQty: 0},
		},
	}
}

func fullCart() Cart {
	return Cart{
		Items: []CartItem{{ProductID: "kurti", Variant: "M", Qty: 1}},
		Name:  "Priya", Phone: "+91 98765 43210",
		Address: customer.Address{Line: "45 Civil Lines", City: "Delhi", Pincode: "110054"},
		Payment: "cod",
	}
}

func TestCheckPricesFromCatalogAndFindsNothingMissing(t *testing.T) {
	c, q, problems, missing := testStore().check(fullCart())
	if len(problems) != 0 || len(missing) != 0 {
		t.Fatalf("problems=%v missing=%v", problems, missing)
	}
	if c.Phone != "9876543210" {
		t.Errorf("phone not normalised: %q", c.Phone)
	}
	if q.Subtotal != 149900 || q.Shipping != 5000 || q.Total != 154900 || q.Lines[0].VariantID != "vM" {
		t.Errorf("bad quote: %+v", q)
	}
}

func TestCheckFreeShippingAboveThreshold(t *testing.T) {
	c := fullCart()
	c.Items[0].Qty = 2 // ₹2,998 ≥ ₹2,000
	_, q, _, _ := testStore().check(c)
	if q.Shipping != 0 || q.Total != 299800 {
		t.Errorf("free delivery not applied: %+v", q)
	}
}

func TestCheckRejectsWhatTheShopCannotSell(t *testing.T) {
	c := fullCart()
	c.Items = []CartItem{
		{ProductID: "saree", Qty: 1},               // out of stock
		{Name: "Gold Necklace", Qty: 1},            // not in catalog
		{ProductID: "kurti", Variant: "L", Qty: 1}, // option out of stock
		{ProductID: "jhumka", Qty: 5},              // only 2 left
	}
	got, q, problems, missing := testStore().check(c)
	if len(problems) != 4 {
		t.Fatalf("want 4 problems, got %v", problems)
	}
	if len(got.Items) != 2 || got.Items[1].Qty != 2 {
		t.Errorf("unsellable items kept or qty not capped: %+v", got.Items)
	}
	if !strings.Contains(strings.Join(missing, "|"), "which option of Rose Chikankari Kurti (S, M)") {
		t.Errorf("must ask for an available option, missing=%v", missing)
	}
	if q.Subtotal != 2*89900 {
		t.Errorf("only priced lines count: %+v", q)
	}
}

func TestCheckNeedsEveryDeliveryDetail(t *testing.T) {
	c := fullCart()
	c.Name, c.Address.Pincode, c.Payment = "", "11005", "upi"
	c.Phone = "12345"
	_, _, problems, missing := testStore().check(c)
	joined := strings.Join(missing, "|")
	for _, want := range []string{"their name", "mobile number", "pincode", "how they want to pay"} {
		if !strings.Contains(joined, want) {
			t.Errorf("missing %q in %v", want, missing)
		}
	}
	if len(problems) != 2 {
		t.Errorf("bad phone and pincode must be explained: %v", problems)
	}
}

func TestCheckOnlyOffersPaymentTheShopTakes(t *testing.T) {
	st := testStore()
	st.CodEnabled = false
	c, _, problems, _ := st.check(fullCart())
	if c.Payment != "" || len(problems) != 1 {
		t.Errorf("COD must be refused when disabled: payment=%q problems=%v", c.Payment, problems)
	}
}

func TestDecide(t *testing.T) {
	cart := fullCart()
	h := cart.hash()
	cases := []struct {
		name     string
		u        Understanding
		stage    string
		hash     string
		complete bool
		want     Action
	}{
		{"handoff wins", Understanding{Intent: "order", Handoff: "refund", Confirmed: true}, "confirming", h, true, ActHandoff},
		{"yes to the summary shown", Understanding{Intent: "confirm", Confirmed: true}, "confirming", h, true, ActPlace},
		{"yes but cart changed since summary", Understanding{Intent: "confirm", Confirmed: true}, "confirming", "other", true, ActSummary},
		{"yes before any summary", Understanding{Intent: "confirm", Confirmed: true}, "open", "", true, ActSummary},
		{"yes to an incomplete order", Understanding{Intent: "confirm", Confirmed: true}, "confirming", h, false, ActReply},
		{"ok after details completes it", Understanding{Intent: "ack", ReplyNeeded: no()}, "open", "", true, ActSummary},
		{"ok with nothing pending", Understanding{Intent: "ack", ReplyNeeded: no()}, "open", "", false, ActSilent},
		{"question while summary shown", Understanding{Intent: "browse"}, "confirming", h, true, ActReply},
		{"later holds the summary back", Understanding{Intent: "later"}, "open", "", true, ActReply},
		{"missing replyNeeded still replies", Understanding{Intent: "browse"}, "open", "", false, ActReply},
		{"spam", Understanding{Intent: "spam", ReplyNeeded: no()}, "open", "", false, ActSilent},
	}
	for _, c := range cases {
		if got := decide(c.u, c.stage, c.hash, cart, c.complete); got != c.want {
			t.Errorf("%s: got %s want %s", c.name, got, c.want)
		}
	}
}

func TestMergeKeepsWhatTheBuyerAlreadySaid(t *testing.T) {
	prev := fullCart()
	next := merge(prev, Cart{Address: customer.Address{Pincode: "110001"}}, "order")
	if next.Name != "Priya" || len(next.Items) != 1 || next.Address.Line != "45 Civil Lines" || next.Address.Pincode != "110001" {
		t.Errorf("merge lost context: %+v", next)
	}
	if got := merge(prev, Cart{}, "decline"); len(got.Items) != 0 {
		t.Errorf("a decline may clear the items: %+v", got)
	}
}

func TestGroundedRefusesInventedAmountsAndLinks(t *testing.T) {
	facts := `{"price":"₹1,499","delivery":"₹50","link":"https://x.test/s/rangrez"}`
	ok, _ := grounded("Ji, kurti ₹1,499 ki hai, delivery ₹50. Dekhiye: https://x.test/s/rangrez", facts)
	if !ok {
		t.Error("grounded reply was refused")
	}
	if ok, _ := grounded("Aapke liye special ₹999 me de denge", facts); ok {
		t.Error("an invented price got through")
	}
	if ok, _ := grounded("Rs. 1,299 only", facts); ok {
		t.Error("an invented Rs amount got through")
	}
	if ok, _ := grounded("Order here https://bit.ly/abc", facts); ok {
		t.Error("an invented link got through")
	}
}

func TestSummaryCarriesExactMoney(t *testing.T) {
	st := testStore()
	c, q, _, _ := st.check(fullCart())
	s := st.summary(c, q)
	for _, want := range []string{"1 × Rose Chikankari Kurti (M) — ₹1,499", "Delivery — ₹50", "Total — ₹1,549", "Cash on delivery", "110054", "9876543210"} {
		if !strings.Contains(s, want) {
			t.Errorf("summary missing %q:\n%s", want, s)
		}
	}
}

func TestInr(t *testing.T) {
	for paise, want := range map[int]string{0: "₹0", 5000: "₹50", 149900: "₹1,499", 14999950: "₹1,49,999.50", 100000000: "₹10,00,000"} {
		if got := inr(paise); got != want {
			t.Errorf("inr(%d)=%q want %q", paise, got, want)
		}
	}
}

func TestWithSummaryPlacesTheCard(t *testing.T) {
	got := withSummary("Ye raha aapka order 👇\n"+summaryToken+"\nConfirm kar dein?", "CARD")
	if got != "Ye raha aapka order 👇\nCARD\nConfirm kar dein?" {
		t.Errorf("got %q", got)
	}
	if got := withSummary("Confirm karein?", "CARD"); got != "Confirm karein?\n\nCARD" {
		t.Errorf("missing token must still show the card: %q", got)
	}
}

func TestTidyMakesItReadLikeADM(t *testing.T) {
	got := tidy("shop: \"**Ji**, size M hai.\n\n\n  Order karein?  \"")
	if got != "Ji, size M hai.\nOrder karein?" {
		t.Errorf("got %q", got)
	}
}

func TestReplyLanguageFollowsTheBuyer(t *testing.T) {
	buyer := func(s ...string) []ChatLine {
		var out []ChatLine
		for _, t := range s {
			out = append(out, ChatLine{Who: "buyer", Text: t}, ChatLine{Who: "shop", Text: "Ji, kurti ₹1,499 ki hai"})
		}
		return out
	}
	cases := map[string]struct {
		lines []ChatLine
		model string
		want  string
	}{
		"devanagari":         {buyer("नमस्ते, कुर्ती का दाम क्या है?"), "Hinglish", "Devanagari"},
		"english":            {buyer("Is the kurti cotton? Do you ship to Bangalore?"), "Hinglish", "English"},
		"hinglish":           {buyer("pink wali kurti chahiye"), "English", "Hinglish"},
		"english with me/do": {buyer("Can you send it to me? Do you have M?"), "", "English"},
		"tanglish":           {buyer("Enna price ah irukku?"), "Tanglish (Tamil in Roman script)", "Tanglish"},
		"emoji only":         {buyer("😂😂"), "Hinglish in Roman script", "Hinglish"},
		"bengali":            {buyer("দাম কত?"), "", "Bengali"},
	}
	for name, c := range cases {
		if got := replyLanguage(c.lines, c.model); !strings.Contains(got, c.want) {
			t.Errorf("%s: got %q want %q", name, got, c.want)
		}
	}
}

func TestReplyLanguageSkipsMessagesWithNoSignal(t *testing.T) {
	lines := []ChatLine{{Who: "buyer", Text: "pink wali kurti"}, {Who: "shop", Text: "M ya S?"},
		{Who: "buyer", Text: "Priya"}, {Who: "buyer", Text: "45 civil lines delhi 110054"}, {Who: "buyer", Text: "9876543210"}}
	if got := replyLanguage(lines, "English"); !strings.Contains(got, "Hinglish") {
		t.Errorf("a name/address/number must not flip a Hinglish chat: %q", got)
	}
}
