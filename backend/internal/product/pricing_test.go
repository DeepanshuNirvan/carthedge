package product

import (
	"strings"
	"testing"
)

func TestLinePrice(t *testing.T) {
	cases := []struct {
		name                     string
		price, reseller, variant int
		segment                  string
		want                     int
	}{
		{"retail, base", 100000, 0, 0, "retail", 100000},
		{"retail, pricier variant", 100000, 80000, 120000, "retail", 120000},
		{"reseller price wins", 149900, 99900, 159900, "reseller", 99900},
		// no reseller price set: a reseller pays what the variant costs, not the base
		{"reseller, no reseller price, pricier variant", 100000, 0, 120000, "reseller", 120000},
		{"reseller, no reseller price, plain", 100000, 0, 0, "reseller", 100000},
	}
	for _, c := range cases {
		if got := linePrice(c.price, c.reseller, c.variant, c.segment); got != c.want {
			t.Errorf("%s: got %d, want %d", c.name, got, c.want)
		}
	}
}

// -1 is what the API returns for untracked stock; sending it back on an edit
// must keep the product untracked, not count it at zero.
func TestInputQty(t *testing.T) {
	neg, zero, five := -1, 0, 5
	if q := (&Input{StockQty: &neg}).qty(); q != Untracked {
		t.Errorf("stockQty -1: got %d, want untracked", q)
	}
	if in := (&Input{StockQty: &zero}); in.qty() != 0 || in.stocked() {
		t.Errorf("stockQty 0: qty %d stocked %v, want 0/false", in.qty(), in.stocked())
	}
	if q := (&Input{StockQty: &five}).qty(); q != 5 {
		t.Errorf("stockQty 5: got %d", q)
	}
	if q := (&Input{}).qty(); q != Untracked {
		t.Errorf("omitted: got %d, want untracked", q)
	}
}

func TestParseCSVStockWords(t *testing.T) {
	head := "name,description,category,price,resellerPrice,sku,inStock\n"
	for v, want := range map[string]bool{"false": false, "0": false, "no": false, "N": false, "true": true, "1": true, "yes": true} {
		rows, err := ParseCSV(strings.NewReader(head + "Kurti,,Kurtis,499,,K1," + v + "\n"))
		if err != nil || rows[0].InStock == nil || *rows[0].InStock != want {
			t.Errorf("inStock %q: got %v (err %v), want %v", v, rows[0].InStock, err, want)
		}
	}
}
