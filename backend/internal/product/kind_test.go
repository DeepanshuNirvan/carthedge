package product

import (
	"strings"
	"testing"
)

func str(s string) *string { return &s }
func num(n int) *int       { return &n }

func TestNewItemIsAFixedPriceProduct(t *testing.T) {
	in := Input{Name: "Kurti", Price: 149900, PriceUnit: str("per piece"), Ask: []Question{{Label: "Size"}}}
	if err := in.validate(); err != nil {
		t.Fatal(err)
	}
	if in.Kind != KindProduct || in.PriceKind != PriceFixed || *in.PriceUnit != "" || len(in.Ask) != 0 {
		t.Errorf("a product carries no service fields: %+v", in)
	}
	if err := (&Input{Name: "Kurti"}).validate(); err == nil {
		t.Error("a product without a price was accepted")
	}
	if err := (&Input{Name: "Kurti", Price: 100, PriceKind: PriceQuote}).validate(); err == nil {
		t.Error("only a service may be priced on request")
	}
}

func TestServiceShape(t *testing.T) {
	in := Input{Name: "Goa Trip", Kind: KindService, PriceKind: PriceFrom, Price: 250000, PriceUnit: str("  per \n person "),
		StockQty: num(5), ResellerPrice: 100, MRP: num(999),
		Ask: []Question{{Label: " Travel\tdates ", Required: true}, {Label: ""}, {Label: "Number of people"}}}
	if err := in.validate(); err != nil {
		t.Fatal(err)
	}
	if in.StockQty != nil || in.ResellerPrice != 0 || *in.MRP != 0 {
		t.Errorf("a service has no stock, reseller price or MRP: %+v", in)
	}
	if *in.PriceUnit != "per person" || len(in.Ask) != 2 || in.Ask[0].Label != "Travel dates" {
		t.Errorf("labels must be one clean line: unit=%q ask=%+v", *in.PriceUnit, in.Ask)
	}

	quote := Input{Name: "Wedding Decor", Kind: KindService, PriceKind: PriceQuote, Price: 5000,
		Variants: []Variant{{Name: "Basic", Price: 900}}}
	if err := quote.validate(); err != nil {
		t.Fatal(err)
	}
	if quote.Price != 0 || quote.Variants[0].Price != 0 {
		t.Errorf("a quote-only service stores no price anyone could quote: %+v", quote)
	}

	bad := map[string]Input{
		"priced service without a price": {Name: "x", Kind: KindService, PriceKind: PriceFrom},
		"unknown kind":                   {Name: "x", Kind: "rental", Price: 100},
		"unknown price kind":             {Name: "x", Kind: KindService, PriceKind: "free", Price: 100},
		"duplicate question":             {Name: "x", Kind: KindService, PriceKind: PriceQuote, Ask: []Question{{Label: "Date"}, {Label: "date"}}},
		"too many questions":             {Name: "x", Kind: KindService, PriceKind: PriceQuote, Ask: make([]Question, 0)},
		"essay as a question":            {Name: "x", Kind: KindService, PriceKind: PriceQuote, Ask: []Question{{Label: strings.Repeat("a", 61)}}},
		"essay as a unit":                {Name: "x", Kind: KindService, PriceKind: PriceQuote, PriceUnit: str(strings.Repeat("a", 31))},
	}
	many := bad["too many questions"]
	for i := 0; i < maxQuestions+1; i++ {
		many.Ask = append(many.Ask, Question{Label: "Question " + string(rune('A'+i))})
	}
	bad["too many questions"] = many
	for name, in := range bad {
		if err := in.validate(); err == nil {
			t.Errorf("%s was accepted", name)
		}
	}
}

func TestPriceLabel(t *testing.T) {
	cases := map[string]Product{
		"₹1,499":                 {Price: 149900},
		"₹1,499 per day":         {Price: 149900, Kind: KindService, PriceKind: PriceFixed, PriceUnit: "per day"},
		"from ₹2,500 per person": {Price: 250000, Kind: KindService, PriceKind: PriceFrom, PriceUnit: "per person"},
		"price on request":       {Kind: KindService, PriceKind: PriceQuote, PriceUnit: "per event"},
	}
	for want, p := range cases {
		if got := p.PriceLabel(); got != want {
			t.Errorf("got %q want %q", got, want)
		}
	}
}

func TestPublicCarriesHowAServiceIsPricedButNotItsQuestions(t *testing.T) {
	pub := ToPublic([]Product{{ID: "1", Kind: KindService, PriceKind: PriceFrom, PriceUnit: "per person",
		Ask: []Question{{Label: "Budget"}}}})[0]
	if pub.Kind != KindService || pub.PriceKind != PriceFrom || pub.PriceUnit != "per person" {
		t.Errorf("%+v", pub)
	}
}
