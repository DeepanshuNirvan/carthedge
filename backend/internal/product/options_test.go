package product

import (
	"strings"
	"testing"
)

func kurti() Product {
	no := false
	p := Product{
		Images: []string{"/u/a.jpg", "/u/pink.jpg", "/u/blue.jpg"},
		Options: []Option{
			{Name: "Size", Values: []OptionValue{{Name: "S"}, {Name: "M"}, {Name: "L"}}},
			{Name: "Colour", Values: []OptionValue{{Name: "Pink", Images: []string{"/u/pink.jpg", "/u/gone.jpg"}}, {Name: "Rose Gold"}, {Name: "Gold"}}},
		},
	}
	for _, s := range []string{"S", "M", "L"} {
		for _, c := range []string{"Pink", "Rose Gold", "Gold"} {
			if s == "L" && c == "Gold" {
				continue // not made
			}
			v := Variant{ID: s + c, Name: s + " / " + c, Options: []string{s, c}}
			if s == "S" && c == "Pink" {
				v.InStock = &no
			}
			p.Variants = append(p.Variants, v)
		}
	}
	return p
}

func TestShapeOptionsNamesVariantsFromValues(t *testing.T) {
	in := Input{
		Images: []string{"/u/pink.jpg"},
		Options: []Option{
			{Name: " Size ", Values: []OptionValue{{Name: "M"}, {Name: "L"}}},
			{Name: "Colour", Values: []OptionValue{{Name: "Pink", Images: []string{"/u/pink.jpg", "/u/elsewhere.jpg", "/u/pink.jpg"}}}},
		},
		Variants: []Variant{{Options: []string{"m", " pink "}}, {Options: []string{"L", "Pink"}}},
	}
	if err := in.shapeOptions(); err != nil {
		t.Fatal(err)
	}
	if in.Options[0].Name != "Size" || in.Variants[0].Name != "M / Pink" || in.Variants[0].Options[1] != "Pink" {
		t.Fatalf("not canonical: %+v %+v", in.Options, in.Variants)
	}
	if imgs := in.Options[1].Values[0].Images; len(imgs) != 1 || imgs[0] != "/u/pink.jpg" {
		t.Fatalf("option photos must be the product's own, once each: %v", imgs)
	}
}

func TestShapeOptionsRefusesBadShapes(t *testing.T) {
	size := Option{Name: "Size", Values: []OptionValue{{Name: "M"}, {Name: "L"}}}
	cases := map[string]Input{
		"value not in group":   {Options: []Option{size}, Variants: []Variant{{Options: []string{"XL"}}}},
		"missing a group":      {Options: []Option{size, {Name: "Colour", Values: []OptionValue{{Name: "Red"}}}}, Variants: []Variant{{Options: []string{"M"}}}},
		"same combo twice":     {Options: []Option{size}, Variants: []Variant{{Options: []string{"M"}}, {Options: []string{"m"}}}},
		"same group twice":     {Options: []Option{size, {Name: "size", Values: []OptionValue{{Name: "X"}}}}, Variants: []Variant{{Options: []string{"M", "X"}}}},
		"same value twice":     {Options: []Option{{Name: "Size", Values: []OptionValue{{Name: "M"}, {Name: "m"}}}}, Variants: []Variant{{Options: []string{"M"}}}},
		"groups but no combos": {Options: []Option{size}, Variants: []Variant{}},
		"four groups": {Options: []Option{size, {Name: "A", Values: []OptionValue{{Name: "1"}}},
			{Name: "B", Values: []OptionValue{{Name: "1"}}}, {Name: "C", Values: []OptionValue{{Name: "1"}}}},
			Variants: []Variant{{Options: []string{"M", "1", "1", "1"}}}},
		"duplicate plain names":    {Variants: []Variant{{Name: "M"}, {Name: " m "}}},
		"options without variants": {Options: []Option{size}},
	}
	for name, in := range cases {
		if err := in.shapeOptions(); err == nil {
			t.Errorf("%s: accepted", name)
		}
	}
}

func TestPlainVariantsBecomeOneGroup(t *testing.T) {
	in := Input{Variants: []Variant{{Name: "M"}, {Name: "L"}}}
	if err := in.shapeOptions(); err != nil {
		t.Fatal(err)
	}
	if len(in.Options) != 1 || in.Options[0].Name != legacyOption || len(in.Options[0].Values) != 2 {
		t.Fatalf("want one group of the names: %+v", in.Options)
	}
	if in.Variants[1].Options[0] != "L" {
		t.Fatalf("variant values not set: %+v", in.Variants)
	}
	omitted := Input{}
	if err := omitted.shapeOptions(); err != nil || omitted.Options != nil {
		t.Fatalf("omitted variants must keep what is stored: %v %+v", err, omitted.Options)
	}
}

func TestSettleOptionsFallsBackForOldRows(t *testing.T) {
	p := Product{Variants: []Variant{{Name: "M"}, {Name: "L / Red"}}}
	p.settleOptions()
	if len(p.Options) != 1 || p.Options[0].Values[1].Name != "L / Red" || p.Variants[1].Options[0] != "L / Red" {
		t.Fatalf("old rows must read as one group: %+v", p.Options)
	}
	k := kurti()
	k.Variants[0].Options = []string{"XXL", "Pink"} // written by an older build
	k.settleOptions()
	if k.Options[0].Name != legacyOption {
		t.Fatalf("groups that do not fit every variant must fall back: %+v", k.Options)
	}
	k = kurti()
	k.settleOptions()
	if imgs := k.Options[1].Values[0].Images; len(imgs) != 1 {
		t.Fatalf("photos no longer in the gallery must drop: %v", imgs)
	}
}

func TestChooseReadsWhatTheBuyerSaid(t *testing.T) {
	p := kurti()
	for said, want := range map[string]string{
		"M / Pink":            "M / Pink",
		"pink m":              "M / Pink",
		"medium, pink wala":   "M / Pink",
		"rose gold L":         "L / Rose Gold", // the longer value wins over "Gold"
		"Size M colour Gold!": "M / Gold",
	} {
		ch := p.Choose(said)
		if !ch.Found || ch.Variant.Name != want {
			t.Errorf("%q: got %+v, want %s", said, ch, want)
		}
	}
	ch := p.Choose("pink")
	if ch.Found || len(ch.Open) != 1 || ch.Open[0].Name != "Size" || len(ch.Open[0].Values) != 3 {
		t.Fatalf("partly chosen must ask only for size: %+v", ch)
	}
	ch = p.Choose("gold")
	if len(ch.Open) != 1 || len(ch.Open[0].Values) != 2 {
		t.Fatalf("L is not made in Gold, so only S and M remain: %+v", ch.Open)
	}
	if ch := p.Choose("L gold"); ch.Found || ch.Open != nil {
		t.Fatalf("a combination that does not exist must say so: %+v", ch)
	}
	if ch := p.Choose("red"); ch.Found || len(ch.Open) != 2 {
		t.Fatalf("words that match nothing leave every group open: %+v", ch)
	}
	if ch := p.Choose("pink gold M"); ch.Found {
		t.Fatalf("two colours named is ambiguous, not a pick: %+v", ch)
	}
}

func TestChoiceText(t *testing.T) {
	p := kurti()
	if got := p.ChoiceText(nil); got != "Size: S, M, L; Colour: Pink, Rose Gold, Gold" {
		t.Fatalf("got %q", got)
	}
	plain := Product{Variants: []Variant{{Name: "M"}, {Name: "L"}}}
	plain.settleOptions()
	if got := plain.ChoiceText(nil); got != "M, L" {
		t.Fatalf("a plain list keeps its old wording: %q", got)
	}
	if !p.Grouped() || plain.Grouped() {
		t.Fatal("Grouped is for named groups only")
	}
	if !strings.Contains(p.Choose("").Open[0].Values[0].Name, "S") {
		t.Fatal("nothing said leaves every value open")
	}
}

func TestCheckMRP(t *testing.T) {
	in := Input{Price: 150000, Variants: []Variant{{Name: "XL", Price: 210000}}}
	if err := in.checkMRP(200000); err == nil {
		t.Fatal("a variant above the MRP must be refused")
	}
	in.Variants[0].Price = 0
	if err := in.checkMRP(200000); err != nil {
		t.Fatal(err)
	}
	if err := in.checkMRP(100000); err == nil {
		t.Fatal("a price above the MRP must be refused")
	}
	if err := in.checkMRP(0); err != nil {
		t.Fatal("no MRP stated means no ceiling")
	}
}

func TestVariantsByNameJoinTheirGroups(t *testing.T) {
	// a client that read the product back and adds "XL" by name only
	in := Input{
		Options:  []Option{{Name: legacyOption, Values: []OptionValue{{Name: "S"}, {Name: "M"}}}},
		Variants: []Variant{{Name: "S", Options: []string{"S"}}, {Name: "M"}, {Name: "XL"}},
	}
	if err := in.shapeOptions(); err != nil {
		t.Fatal(err)
	}
	if len(in.Options[0].Values) != 3 || in.Variants[2].Options[0] != "XL" {
		t.Fatalf("XL must join the group: %+v %+v", in.Options, in.Variants)
	}
	two := Input{
		Options:  []Option{{Name: "Size", Values: []OptionValue{{Name: "M"}}}, {Name: "Colour", Values: []OptionValue{{Name: "Pink"}}}},
		Variants: []Variant{{Name: "M / Pink"}, {Name: "XL/pink"}},
	}
	if err := two.shapeOptions(); err != nil {
		t.Fatal(err)
	}
	if two.Variants[1].Name != "XL / Pink" || len(two.Options[0].Values) != 2 || len(two.Options[1].Values) != 1 {
		t.Fatalf("names split into the groups: %+v %+v", two.Options, two.Variants)
	}
	bad := Input{Options: two.Options, Variants: []Variant{{Name: "XL"}}}
	if err := bad.shapeOptions(); err == nil {
		t.Fatal("a name that does not cover every group must be refused")
	}
}

func TestWaitlistNoteForTheSeller(t *testing.T) {
	if got := waitlistNote("Kurti", []string{"9876543210"}); got != "1 buyer asked to hear when Kurti is back: 9876543210. Message them on WhatsApp." {
		t.Fatalf("one buyer: %q", got)
	}
	var phones []string
	for i := 0; i < 12; i++ {
		phones = append(phones, "98765432"+string(rune('a'+i)))
	}
	got := waitlistNote("Kurti", phones)
	if !strings.HasPrefix(got, "12 buyers") || !strings.Contains(got, "and 2 more") || strings.Contains(got, phones[10]) {
		t.Fatalf("many buyers: %q", got)
	}
}
