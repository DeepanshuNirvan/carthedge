package httpx

import "testing"

func TestUPIShape(t *testing.T) {
	for _, ok := range []string{"name@okaxis", "qa.seller@okhdfcbank", "9876543210@ybl", "first.last-1@paytm"} {
		if !ValidUPI(ok) {
			t.Errorf("%q should be a valid UPI ID", ok)
		}
	}
	for _, bad := range []string{"not a vpa", "@okaxis", "name@", "name@@okaxis", "na me@okaxis", "name@1bank"} {
		if ValidUPI(bad) {
			t.Errorf("%q should be rejected", bad)
		}
	}
}
