package payment

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

// A retried refund must find the one Razorpay already holds (by our receipt)
// instead of paying twice, and only a clear decline may count as "no money moved".
func TestRefundRetryIsIdempotent(t *testing.T) {
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/payments/pay_ok/refunds":
			w.Write([]byte(`{"items":[{"id":"rfnd_old","receipt":"other","status":"processed"},
				{"id":"rfnd_bad","receipt":"r1","status":"failed"},
				{"id":"rfnd_mine","receipt":"r1","status":"pending"}]}`))
		case "/payments/pay_gone/refunds":
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte(`{"error":{"description":"The id provided does not exist"}}`))
		default:
			w.WriteHeader(http.StatusBadGateway)
		}
	}))
	defer fake.Close()
	apiBase = fake.URL
	defer func() { apiBase = "https://api.razorpay.com/v1" }()
	c := NewClient("rzp_test_x", "secret")
	ctx := context.Background()

	if id, err := c.RefundByReceipt(ctx, "pay_ok", "r1"); err != nil || id != "rfnd_mine" {
		t.Fatalf("existing refund not found: %q %v", id, err)
	}
	if id, err := c.RefundByReceipt(ctx, "pay_ok", "r2"); err != nil || id != "" {
		t.Fatalf("unknown receipt matched: %q %v", id, err)
	}
	if _, err := c.RefundByReceipt(ctx, "pay_gone", "r1"); !Refused(err) {
		t.Fatalf("a 400 must read as a clear decline, got %v", err)
	}
	if _, err := c.RefundByReceipt(ctx, "pay_5xx", "r1"); err == nil || Refused(err) {
		t.Fatalf("a 5xx leaves the outcome unknown, got %v", err)
	}
	if Refused(errors.New("dial tcp: timeout")) {
		t.Fatal("a network error is not a decline")
	}
}
