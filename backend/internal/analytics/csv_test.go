package analytics

import "testing"

// A buyer-typed name must not run as a formula in the seller's spreadsheet.
func TestCellDefusesFormulas(t *testing.T) {
	for _, in := range []string{`=HYPERLINK("http://x","refund")`, "+91 cmd", "-2+3", "@SUM(A1)", "\tx"} {
		if got := cell(in); got != "'"+in {
			t.Errorf("cell(%q) = %q, want it prefixed", in, got)
		}
	}
	for _, in := range []string{"Riya Sharma", "", "Jaipur"} {
		if got := cell(in); got != in {
			t.Errorf("cell(%q) = %q, want unchanged", in, got)
		}
	}
}
