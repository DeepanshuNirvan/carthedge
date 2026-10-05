package notify

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"unicode/utf8"

	"carthedge/internal/config"
)

func quiet() *slog.Logger { return slog.New(slog.NewTextHandler(io.Discard, nil)) }

func TestParamTextFitsMetaRules(t *testing.T) {
	got := paramText("✅ Order confirmed: AB12\nTotal ₹499, pay cash on delivery\n\tTrack it   here")
	want := "✅ Order confirmed: AB12. Total ₹499, pay cash on delivery. Track it here"
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
	if paramText(" \n ") != "-" {
		t.Fatal("an empty placeholder is refused by Meta")
	}
	long := paramText(strings.Repeat("a", 2000))
	if utf8.RuneCountInString(long) != maxParam || !strings.HasSuffix(long, "…") {
		t.Fatalf("long text not cut to %d runes: %d", maxParam, utf8.RuneCountInString(long))
	}
}

func TestCodeCarriesCopyButton(t *testing.T) {
	p := templatePayload("919876543210", Code("123456"))
	raw, _ := json.Marshal(p)
	s := string(raw)
	for _, want := range []string{`"name":"carthedge_code"`, `"code":"en"`, `"to":"919876543210"`,
		`"sub_type":"url"`, `"index":"0"`, `"text":"123456"`} {
		if !strings.Contains(s, want) {
			t.Errorf("payload missing %s: %s", want, s)
		}
	}
	if raw, _ := json.Marshal(templatePayload("91", OrderUpdate("Rangrez", "x"))); strings.Contains(string(raw), "button") {
		t.Error("only authentication templates have a code button")
	}
}

func TestWhatsAppSendsTemplateToCloudAPI(t *testing.T) {
	var got struct {
		path, auth string
		body       map[string]any
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got.path, got.auth = r.URL.Path, r.Header.Get("Authorization")
		json.NewDecoder(r.Body).Decode(&got.body)
		w.Write([]byte(`{"messages":[{"id":"wamid.x"}]}`))
	}))
	defer srv.Close()
	n := New(&config.Config{Env: "production", WhatsAppPhoneID: "555", WhatsAppToken: "tok", MetaGraphVersion: "v25.0"}, quiet())
	n.graph = srv.URL

	if err := n.WhatsApp("+91 98765-43210", OrderUpdate("Rangrez", "Your order AB12 is on the way!")); err != nil {
		t.Fatal(err)
	}
	if got.path != "/v25.0/555/messages" || got.auth != "Bearer tok" {
		t.Fatalf("wrong endpoint or auth: %s %s", got.path, got.auth)
	}
	if got.body["to"] != "919876543210" || got.body["type"] != "template" {
		t.Fatalf("wrong recipient or type: %v", got.body)
	}
}

func TestWhatsAppReportsGraphError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":{"message":"Template name does not exist in the translation","code":132001}}`))
	}))
	defer srv.Close()
	n := New(&config.Config{WhatsAppPhoneID: "555", WhatsAppToken: "tok", MetaGraphVersion: "v25.0"}, quiet())
	n.graph = srv.URL
	err := n.WhatsApp("9876543210", Code("123456"))
	if err == nil || !strings.Contains(err.Error(), "132001") || strings.Contains(err.Error(), "tok") {
		t.Fatalf("want Meta's error code and never the token, got %v", err)
	}
}

func TestWhatsAppWithoutNumber(t *testing.T) {
	dev := New(&config.Config{Env: "development"}, quiet())
	if !dev.WhatsAppOn() || dev.WhatsApp("9876543210", Code("1")) != nil {
		t.Fatal("dev logs the message instead of sending")
	}
	prod := New(&config.Config{Env: "production"}, quiet())
	if prod.WhatsAppOn() || !errors.Is(prod.WhatsApp("9876543210", Code("1")), ErrWhatsAppOff) {
		t.Fatal("production without a number must fail, not pretend it sent (or log the code)")
	}
	if dev.WhatsApp("12345", Code("1")) == nil {
		t.Fatal("not a mobile number")
	}
}

func TestOffersWaitForSellerChannel(t *testing.T) {
	n := New(&config.Config{}, quiet())
	if n.OffersOn() || !errors.Is(n.Offer(context.Background(), "b", "9876543210", "hi"), ErrOffersOff) {
		t.Fatal("nothing is wired: offers are off")
	}
	var sent string
	n.SetOffers(func(_ context.Context, bizID, phone, text string) error { sent = bizID + phone + text; return nil })
	if !n.OffersOn() || n.Offer(context.Background(), "b", "9", "hi") != nil || sent != "b9hi" {
		t.Fatal("a wired sender carries the offer")
	}
}
