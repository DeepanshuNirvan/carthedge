package product

import (
	"net/url"
	"testing"
)

func TestFilterFrom(t *testing.T) {
	q, _ := url.ParseQuery("search=kurti&category=Kurtis&minPrice=500&maxPrice=1500&inStock=true&sort=priceAsc")
	f := FilterFrom(q)
	if f.Search != "kurti" || f.Category != "Kurtis" || !f.InStockOnly || f.Sort != "priceAsc" {
		t.Fatalf("filter = %+v", f)
	}
	// buyer sliders send rupees, the catalog stores paise
	if f.MinPrice != 50000 || f.MaxPrice != 150000 {
		t.Fatalf("prices = %d..%d, want 50000..150000", f.MinPrice, f.MaxPrice)
	}
	if got := FilterFrom(url.Values{}); got.MinPrice != 0 || got.MaxPrice != 0 || got.Sort != "" {
		t.Fatalf("empty query = %+v", got)
	}
	// an unknown sort must fall back, never reach the query
	if _, ok := sortOrders["; drop table products"]; ok {
		t.Fatal("sort whitelist is not a whitelist")
	}
}

func TestVariantStockDefaultsIn(t *testing.T) {
	no := false
	if !(Variant{}).Stocked() {
		t.Fatal("a variant with no inStock field must default to in stock")
	}
	if (Variant{InStock: &no}).Stocked() {
		t.Fatal("explicit false must stay out of stock")
	}
}
