package customer

import (
	"strings"
	"testing"
)

func TestKeyword(t *testing.T) {
	for text, want := range map[string]bool{"STOP": false, " stop. ": false, "Stop promotions": false,
		"Unsubscribe!": false, "START": true, "subscribe": true} {
		got, ok := Keyword(text)
		if !ok || got != want {
			t.Errorf("%q: got (%v, %v), want (%v, true)", text, got, ok, want)
		}
	}
	for _, text := range []string{"stop sending me the wrong size", "don't stop", "start my order", "", "ok"} {
		if _, ok := Keyword(text); ok {
			t.Errorf("%q is a conversation, not a request", text)
		}
	}
}

func TestUnsubscribeTokenRoundTrip(t *testing.T) {
	s := NewService(nil, "secret")
	id := "3f2b8c1e-9a4d-4e7f-8b21-0c5d6e7f8a9b"
	token := s.UnsubscribeToken(id)
	if len(token) > 40 || strings.ContainsAny(token, "+/=") {
		t.Fatalf("token must be short and URL-safe: %q", token)
	}
	if got, ok := s.tokenCustomer(token); !ok || got != id {
		t.Fatalf("round trip: got %q %v", got, ok)
	}
	if _, ok := NewService(nil, "other").tokenCustomer(token); ok {
		t.Fatal("a token signed with another key must fail")
	}
	b := []byte(token)
	b[3] ^= 1
	if _, ok := s.tokenCustomer(string(b)); ok {
		t.Fatal("a tampered token must fail")
	}
	if s.UnsubscribeToken("not-a-uuid") != "" {
		t.Fatal("no token for a malformed id")
	}
}

func TestOptInWordingNamesShopAndChannel(t *testing.T) {
	w := OptInWording("Rangrez")
	if !strings.Contains(w, "Rangrez") || !strings.Contains(w, "WhatsApp") {
		t.Fatalf("opt-in must name the business and the channel: %q", w)
	}
}
