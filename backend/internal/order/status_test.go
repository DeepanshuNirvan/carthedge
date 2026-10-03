package order

import "testing"

func TestTransitions(t *testing.T) {
	allowed := [][2]string{
		{"new", "confirmed"}, {"new", "cancelled"},
		{"confirmed", "packed"}, {"confirmed", "shipped"}, {"packed", "shipped"},
		{"shipped", "delivered"}, {"shipped", "rto"},
	}
	for _, tr := range allowed {
		if !CanTransition(tr[0], tr[1]) {
			t.Fatalf("%s -> %s should be allowed", tr[0], tr[1])
		}
	}
	blocked := [][2]string{
		{"new", "delivered"}, {"delivered", "rto"}, {"rto", "delivered"},
		{"cancelled", "confirmed"}, {"shipped", "cancelled"}, {"delivered", "new"},
	}
	for _, tr := range blocked {
		if CanTransition(tr[0], tr[1]) {
			t.Fatalf("%s -> %s must be blocked", tr[0], tr[1])
		}
	}
}
