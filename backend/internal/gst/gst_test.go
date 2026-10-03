package gst

import (
	"testing"
	"time"
)

func TestValidGSTIN(t *testing.T) {
	for _, ok := range []string{"27AAPFU0939F1ZV", "29AAGCB7383J1Z4"} {
		if !ValidGSTIN(ok) {
			t.Errorf("%s should be valid", ok)
		}
	}
	for _, bad := range []string{"27AAPFU0939F1ZW", "27aapfu0939f1zv", "00AAPFU0939F1ZV", "27AAPFU0939F1Z", ""} {
		if ValidGSTIN(bad) {
			t.Errorf("%s should be invalid", bad)
		}
	}
}

func TestPlaceOfSupply(t *testing.T) {
	cases := map[[2]string]string{
		{"Rajasthan", ""}:         "08",
		{"tamil nadu", ""}:        "33",
		{"MH", ""}:                "27",
		{"Delhi NCR", ""}:         "07",
		{"J&K", ""}:               "01",
		{"", "302001"}:            "08",
		{"somewhere", "403001"}:   "30",
		{"", "834001"}:            "20",
		{"27", ""}:                "27",
		{"Orissa", "751001"}:      "21",
		{"Pondicherry", "605001"}: "34",
	}
	for in, want := range cases {
		if got := PlaceOfSupply(in[0], in[1]); got != want {
			t.Errorf("PlaceOfSupply(%q, %q) = %q, want %q", in[0], in[1], got, want)
		}
	}
}

func TestSplitAndFY(t *testing.T) {
	// ₹1,050 at 5% inclusive = ₹1,000 + ₹50
	if taxable, c, s, i := Split(105000, 5, true); taxable != 100000 || c != 2500 || s != 2500 || i != 0 {
		t.Errorf("intra split wrong: %d %d %d %d", taxable, c, s, i)
	}
	if taxable, _, _, i := Split(11800, 18, false); taxable != 10000 || i != 1800 {
		t.Errorf("inter split wrong: %d %d", taxable, i)
	}
	if taxable, c, s, _ := Split(999, 5, true); taxable+c+s != 999 {
		t.Error("split must add back to the gross")
	}
	if FY(time.Date(2027, 3, 31, 20, 0, 0, 0, time.UTC)) != "2027-28" { // 1 Apr IST already
		t.Error("FY must follow IST")
	}
	if FY(time.Date(2026, 10, 3, 0, 0, 0, 0, time.UTC)) != "2026-27" {
		t.Error("FY wrong")
	}
	if n := Number("RB", "2026-27", 7); n != "RB/2627/0007" {
		t.Errorf("number format: %s", n)
	}
}
