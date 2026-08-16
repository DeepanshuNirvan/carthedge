package payment

import (
	"net/url"
	"strings"
	"testing"
)

// The intent string is what opens GPay/PhonePe/Paytm with the right amount.
// Paise are integers everywhere else, so this is the one conversion that can
// silently overcharge a buyer.
func TestUpiIntent(t *testing.T) {
	raw := UpiIntent("ritika@okhdfcbank", "Ritika's Closet", "CH-ABC12345", 94900)
	if !strings.HasPrefix(raw, "upi://pay?") {
		t.Fatalf("not a UPI intent: %q", raw)
	}
	q, err := url.ParseQuery(strings.TrimPrefix(raw, "upi://pay?"))
	if err != nil {
		t.Fatalf("unparseable query: %v", err)
	}
	want := map[string]string{
		"pa": "ritika@okhdfcbank",
		"pn": "Ritika's Closet",
		"am": "949.00", // 94900 paise, two decimals, never 94900 or 949
		"cu": "INR",
		"tr": "CH-ABC12345",
	}
	for k, v := range want {
		if q.Get(k) != v {
			t.Errorf("%s = %q, want %q", k, q.Get(k), v)
		}
	}
}
