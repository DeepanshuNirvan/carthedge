package messaging

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

func sign(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

// Instagram Login webhooks are signed with the Instagram app secret and
// WhatsApp ones with the Meta app secret. Checking only the Meta secret
// rejected every Instagram DM with a 401.
func TestVerifySignatureAcceptsEitherAppSecret(t *testing.T) {
	c := NewClient("", "ig-secret", "meta-secret")
	body := []byte(`{"object":"instagram"}`)
	if !c.VerifySignature(body, sign("ig-secret", body)) {
		t.Error("Instagram-signed webhook rejected")
	}
	if !c.VerifySignature(body, sign("meta-secret", body)) {
		t.Error("WhatsApp-signed webhook rejected")
	}
	if c.VerifySignature(body, sign("someone-else", body)) {
		t.Error("webhook signed with an unknown secret accepted")
	}
	if c.VerifySignature(body, "") || c.VerifySignature(body, "sha1=abc") {
		t.Error("missing or malformed signature accepted")
	}
	if NewClient("", "", "").VerifySignature(body, sign("", body)) {
		t.Error("an unconfigured client must reject everything")
	}
}

func signedRequest(secret string, payload map[string]any) string {
	raw, _ := json.Marshal(payload)
	p := base64.RawURLEncoding.EncodeToString(raw)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(p))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil)) + "." + p
}

func TestParseSignedRequest(t *testing.T) {
	c := NewClient("", "ig-secret")
	got, err := c.ParseSignedRequest(signedRequest("ig-secret", map[string]any{
		"algorithm": "HMAC-SHA256", "user_id": "17841400000000001", "issued_at": 1700000000}))
	if err != nil {
		t.Fatal(err)
	}
	if got["user_id"] != "17841400000000001" {
		t.Errorf("user_id = %v", got["user_id"])
	}
	if _, err := c.ParseSignedRequest(signedRequest("forged", map[string]any{"user_id": "1"})); err == nil {
		t.Error("forged signed_request accepted")
	}
	if _, err := c.ParseSignedRequest("not-a-signed-request"); err == nil {
		t.Error("malformed signed_request accepted")
	}
}

// fakeGraph stands in for api.instagram.com, graph.instagram.com and
// graph.facebook.com, and records every call.
type fakeGraph struct {
	*httptest.Server
	mu     sync.Mutex
	calls  []string
	routes map[string]string // "METHOD /path" → JSON body (status 200)
	fail   map[string]string // "METHOD /path" → error message (status 400)
}

func newFakeGraph(t *testing.T) *fakeGraph {
	f := &fakeGraph{routes: map[string]string{}, fail: map[string]string{}}
	f.Server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		key := r.Method + " " + r.URL.Path
		f.mu.Lock()
		f.calls = append(f.calls, key+"?"+r.Form.Encode())
		f.mu.Unlock()
		if msg, ok := f.fail[key]; ok {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]any{"error": map[string]string{"message": msg}})
			return
		}
		body, ok := f.routes[key]
		if !ok {
			t.Errorf("unexpected Graph call: %s", key)
			w.WriteHeader(http.StatusNotFound)
			return
		}
		w.Write([]byte(body))
	}))
	t.Cleanup(f.Close)
	return f
}

func (f *fakeGraph) called(prefix string) []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []string
	for _, c := range f.calls {
		if strings.HasPrefix(c, prefix) {
			out = append(out, c)
		}
	}
	return out
}

func (f *fakeGraph) client() *Client {
	c := NewClient("v24.0", "ig-secret", "meta-secret")
	c.graphFB, c.graphIG, c.apiIG = f.URL, f.URL, f.URL
	return c
}

var igCfg = OAuthConfig{AppID: "META_APP", AppSecret: "meta-secret", IgAppID: "IG_APP", IgAppSecret: "ig-secret",
	RedirectURL: "https://carthedge.in/oauth/meta/callback", Version: "v24.0"}

func TestExchangeInstagram(t *testing.T) {
	for name, tokenBody := range map[string]string{
		// what the docs show, and what the endpoint has actually served
		"data-wrapped": `{"data":[{"access_token":"SHORT","user_id":"9000000000000001","permissions":"instagram_business_basic"}]}`,
		"flat":         `{"access_token":"SHORT","user_id":9000000000000001,"permissions":["instagram_business_basic"]}`,
	} {
		t.Run(name, func(t *testing.T) {
			f := newFakeGraph(t)
			f.routes["POST /oauth/access_token"] = tokenBody
			f.routes["GET /access_token"] = `{"access_token":"LONG","token_type":"bearer","expires_in":5183944}`
			f.routes["GET /v24.0/me"] = `{"user_id":"17841400000000001","username":"rosekurtis","id":"9000000000000001"}`
			f.routes["POST /v24.0/me/subscribed_apps"] = `{"success":true}`

			conn, err := f.client().ExchangeInstagram(context.Background(), igCfg, "CODE")
			if err != nil {
				t.Fatal(err)
			}
			// the webhook's entry.id is the professional account id (user_id);
			// storing the app-scoped id meant no DM ever matched a seller
			if conn.ExternalID != "17841400000000001" {
				t.Errorf("ExternalID = %q, want the professional account id", conn.ExternalID)
			}
			if conn.AltID != "9000000000000001" {
				t.Errorf("AltID = %q, want the app-scoped id", conn.AltID)
			}
			if conn.Token != "LONG" || conn.DisplayName != "@rosekurtis" {
				t.Errorf("token/name = %q/%q", conn.Token, conn.DisplayName)
			}
			if conn.ExpiresAt == nil || time.Until(*conn.ExpiresAt) < 59*24*time.Hour {
				t.Errorf("expiry %v does not reflect the long-lived token", conn.ExpiresAt)
			}
			subs := f.called("POST /v24.0/me/subscribed_apps")
			if len(subs) != 1 || !strings.Contains(subs[0], "subscribed_fields=messages") || !strings.Contains(subs[0], "access_token=LONG") {
				t.Errorf("webhook subscription not made with the long-lived token: %v", subs)
			}
			ex := f.called("POST /oauth/access_token")
			if len(ex) != 1 || !strings.Contains(ex[0], "client_id=IG_APP") || !strings.Contains(ex[0], "client_secret=ig-secret") {
				t.Errorf("code exchange must use the Instagram app credentials: %v", ex)
			}
		})
	}
}

// A short-lived token lasts an hour and cannot be refreshed. Storing one with
// a 60-day expiry connected the seller and then went silent; fail instead.
func TestExchangeInstagramRefusesShortLivedToken(t *testing.T) {
	f := newFakeGraph(t)
	f.routes["POST /oauth/access_token"] = `{"access_token":"SHORT","user_id":"1"}`
	f.fail["GET /access_token"] = "Invalid OAuth access token"
	if _, err := f.client().ExchangeInstagram(context.Background(), igCfg, "CODE"); err == nil {
		t.Fatal("connected with a token that dies in an hour")
	}
}

func TestExchangeInstagramFailsWithoutWebhookSubscription(t *testing.T) {
	f := newFakeGraph(t)
	f.routes["POST /oauth/access_token"] = `{"access_token":"SHORT","user_id":"1"}`
	f.routes["GET /access_token"] = `{"access_token":"LONG","expires_in":5183944}`
	f.routes["GET /v24.0/me"] = `{"user_id":"178","username":"x","id":"1"}`
	f.fail["POST /v24.0/me/subscribed_apps"] = "(#200) Insufficient permission"
	_, err := f.client().ExchangeInstagram(context.Background(), igCfg, "CODE")
	if err == nil || !strings.Contains(err.Error(), "Insufficient permission") {
		t.Fatalf("want the subscription failure surfaced, got %v", err)
	}
}

func TestAuthorizeURL(t *testing.T) {
	u, err := igCfg.AuthorizeURL("instagram", "STATE")
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"https://www.instagram.com/oauth/authorize?", "client_id=IG_APP", "state=STATE",
		"scope=instagram_business_basic%2Cinstagram_business_manage_messages", "response_type=code"} {
		if !strings.Contains(u, want) {
			t.Errorf("authorize URL %q missing %q", u, want)
		}
	}
	if _, err := igCfg.AuthorizeURL("whatsapp", "STATE"); err == nil {
		t.Error("WhatsApp connects through Embedded Signup, not a redirect")
	}
}

var waCfg = OAuthConfig{AppID: "META_APP", AppSecret: "meta-secret", Version: "v24.0", WAConfigID: "CONFIG"}

func TestExchangeWhatsAppEmbeddedSignup(t *testing.T) {
	setup := func(t *testing.T) *fakeGraph {
		f := newFakeGraph(t)
		f.routes["GET /v24.0/oauth/access_token"] = `{"access_token":"BIZ_TOKEN","token_type":"bearer"}`
		f.routes["GET /v24.0/WABA1/phone_numbers"] = `{"data":[{"id":"PN0","display_phone_number":"+91 90000 00000","verified_name":"Other"},
			{"id":"PN1","display_phone_number":"+91 98110 43210","verified_name":"Rose Kurtis"}]}`
		f.routes["POST /v24.0/WABA1/subscribed_apps"] = `{"success":true}`
		f.routes["POST /v24.0/PN1/register"] = `{"success":true}`
		return f
	}

	t.Run("new number is registered", func(t *testing.T) {
		f := setup(t)
		conn, err := f.client().ExchangeWhatsApp(context.Background(), waCfg,
			EmbeddedSignup{Code: "CODE", WabaID: "WABA1", PhoneNumberID: "PN1"})
		if err != nil {
			t.Fatal(err)
		}
		if conn.ExternalID != "PN1" || conn.Token != "BIZ_TOKEN" || conn.DisplayName != "Rose Kurtis" || conn.ExpiresAt != nil {
			t.Errorf("bad connection: %+v", conn)
		}
		ex := f.called("GET /v24.0/oauth/access_token")
		if len(ex) != 1 || strings.Contains(ex[0], "redirect_uri") {
			t.Errorf("Embedded Signup codes exchange without a redirect_uri: %v", ex)
		}
		reg := f.called("POST /v24.0/PN1/register")
		if len(reg) != 1 || !strings.Contains(reg[0], "messaging_product=whatsapp") || !strings.Contains(reg[0], "pin=") {
			t.Errorf("number not registered on Cloud API: %v", reg)
		}
		if len(f.called("POST /v24.0/WABA1/subscribed_apps")) != 1 {
			t.Error("WABA not subscribed to the webhook")
		}
	})

	t.Run("coexistence number is not re-registered", func(t *testing.T) {
		f := setup(t)
		if _, err := f.client().ExchangeWhatsApp(context.Background(), waCfg,
			EmbeddedSignup{Code: "CODE", WabaID: "WABA1", PhoneNumberID: "PN1", Coexistence: true}); err != nil {
			t.Fatal(err)
		}
		if reg := f.called("POST /v24.0/PN1/register"); len(reg) != 0 {
			t.Errorf("a number still live in the WhatsApp Business app must not be re-registered: %v", reg)
		}
	})

	t.Run("not configured", func(t *testing.T) {
		if _, err := NewClient("").ExchangeWhatsApp(context.Background(), OAuthConfig{}, EmbeddedSignup{Code: "x"}); err == nil {
			t.Error("signup ran without a configuration id")
		}
	})
}

func TestSendReturnsMessageID(t *testing.T) {
	f := newFakeGraph(t)
	f.routes["POST /v24.0/me/messages"] = `{"recipient_id":"BUYER","message_id":"mid.123"}`
	f.routes["POST /v24.0/PN1/messages"] = `{"messaging_product":"whatsapp","messages":[{"id":"wamid.456"}]}`
	c := f.client()
	if id, err := c.Send(context.Background(), "instagram", "IG", "TOKEN", "BUYER", "hi"); err != nil || id != "mid.123" {
		t.Errorf("instagram send = %q, %v", id, err)
	}
	if id, err := c.Send(context.Background(), "whatsapp", "PN1", "TOKEN", "9198", "hi"); err != nil || id != "wamid.456" {
		t.Errorf("whatsapp send = %q, %v", id, err)
	}
}

func TestOutsideWindow(t *testing.T) {
	if !outsideWindow(errString("meta send failed: (#10) This message is sent outside of allowed window.")) {
		t.Error("24-hour window refusal not recognised")
	}
	if outsideWindow(errString("meta send failed: Invalid OAuth access token")) {
		t.Error("token error mistaken for the 24-hour window")
	}
}

type errString string

func (e errString) Error() string { return string(e) }
