package messaging

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"testing"
)

// Instagram orders usually start as a story reply or a shared post, not a plain
// text DM. Those events used to be dropped, so the AI desk never saw them.
func TestParseWebhookInstagram(t *testing.T) {
	body := []byte(`{"object":"instagram","entry":[{"id":"SELLER_IG","messaging":[
		{"sender":{"id":"BUYER1","username":"priya"},"recipient":{"id":"SELLER_IG"},
		 "message":{"mid":"m1","text":"ye wala M size me hai?","reply_to":{"story":{"id":"s1"}}}},
		{"sender":{"id":"BUYER2"},"recipient":{"id":"SELLER_IG"},
		 "message":{"mid":"m2","attachments":[{"type":"share","payload":{"title":"Pink Kurti"}}]}},
		{"sender":{"id":"SELLER_IG"},"recipient":{"id":"BUYER1"},
		 "message":{"mid":"m3","text":"haan hai","is_echo":true}},
		{"sender":{"id":"BUYER3"},"recipient":{"id":"SELLER_IG"},
		 "message":{"mid":"m4","text":"oops","is_deleted":true}}]}]}`)

	got := parseWebhook(body)
	if len(got) != 2 {
		t.Fatalf("got %d inbound messages, want 2 (echo and deleted must be dropped): %+v", len(got), got)
	}
	if got[0].Text != "[replying to your story] ye wala M size me hai?" {
		t.Errorf("story reply lost its context: %q", got[0].Text)
	}
	if got[0].Name != "priya" || got[0].ExternalID != "SELLER_IG" || got[0].ContactID != "BUYER1" {
		t.Errorf("bad routing fields: %+v", got[0])
	}
	if got[1].Text != "[shared a post: Pink Kurti]" {
		t.Errorf("shared post lost its context: %q", got[1].Text)
	}
}

// WhatsApp image captions carry the order as often as a text body does.
func TestParseWebhookWhatsApp(t *testing.T) {
	body := []byte(`{"object":"whatsapp_business_account","entry":[{"id":"WABA","changes":[{"field":"messages","value":{
		"metadata":{"phone_number_id":"PN1"},
		"contacts":[{"profile":{"name":"Anita"},"wa_id":"919812345670"}],
		"messages":[
			{"from":"919812345670","id":"w1","type":"text","text":{"body":"kurti bhejo COD"}},
			{"from":"919812345670","id":"w2","type":"image","image":{"caption":"ye wala"}},
			{"from":"919812345670","id":"w3","type":"audio"}]}}]}]}`)

	got := parseWebhook(body)
	if len(got) != 2 {
		t.Fatalf("got %d inbound messages, want 2 (audio has nothing to read): %+v", len(got), got)
	}
	if got[0].Name != "Anita" || got[0].ExternalID != "PN1" {
		t.Errorf("bad routing fields: %+v", got[0])
	}
	if got[1].Text != "[sent a photo] ye wala" {
		t.Errorf("image caption lost: %q", got[1].Text)
	}
}

func TestPreviewKeepsValidUTF8(t *testing.T) {
	long := ""
	for i := 0; i < 200; i++ {
		long += "क"
	}
	got := preview(long)
	for _, r := range got {
		if r == '�' {
			t.Fatal("preview sliced through a multi-byte rune")
		}
	}
	if len([]rune(got)) != 121 { // 120 runes + the ellipsis
		t.Errorf("got %d runes, want 121", len([]rune(got)))
	}
}

func sign(secret, body string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(body))
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

// WhatsApp signs with the Meta app secret, Instagram Login with the Instagram
// app secret. Both must pass; anything else must not.
func TestVerifySignatureEitherSecret(t *testing.T) {
	c := NewClient("", "metaSecret", "", "igSecret")
	body := `{"object":"instagram"}`
	if !c.VerifySignature([]byte(body), sign("metaSecret", body)) || !c.VerifySignature([]byte(body), sign("igSecret", body)) {
		t.Fatal("a webhook signed by one of our secrets was rejected")
	}
	if c.VerifySignature([]byte(body), sign("other", body)) || c.VerifySignature([]byte(body), "") {
		t.Fatal("a forged webhook was accepted")
	}
}

func TestSignedUser(t *testing.T) {
	c := NewClient("", "igSecret")
	payload := base64.RawURLEncoding.EncodeToString([]byte(`{"algorithm":"HMAC-SHA256","user_id":17841400000000001}`))
	mac := hmac.New(sha256.New, []byte("igSecret"))
	mac.Write([]byte(payload))
	good := base64.RawURLEncoding.EncodeToString(mac.Sum(nil)) + "." + payload
	if id, ok := c.SignedUser(good); !ok || id != "17841400000000001" {
		t.Fatalf("got %q %v", id, ok)
	}
	if _, ok := c.SignedUser("AAAA." + payload); ok {
		t.Fatal("unsigned request accepted")
	}
}

// Webhooks route on user_id; id is app-scoped and matches nothing.
func TestIgMeUsesProfessionalID(t *testing.T) {
	for _, raw := range []string{
		`{"user_id":"1784","username":"shop","id":"999"}`,
		`{"user_id":1784,"username":"shop"}`,
		`{"data":[{"user_id":"1784","username":"shop"}]}`,
	} {
		var m igMe
		if err := json.Unmarshal([]byte(raw), &m); err != nil {
			t.Fatalf("%s: %v", raw, err)
		}
		if id, name := m.account(); id != "1784" || name != "shop" {
			t.Errorf("%s: got %q %q", raw, id, name)
		}
	}
}

// Meta's dashboard "Test" (and some subscriptions) send a DM as one bare event
// under changes[].value instead of entry[].messaging[].
func TestParseWebhookInstagramChangesShape(t *testing.T) {
	body := []byte(`{"object":"instagram","entry":[{"id":"SELLER_IG","changes":[{"field":"messages","value":{
		"sender":{"id":"BUYER1"},"recipient":{"id":"SELLER_IG"},"timestamp":"1527459824",
		"message":{"mid":"m9","text":"pink kurti M size COD"}}}]}]}`)
	got := parseWebhook(body)
	if len(got) != 1 || got[0].Text != "pink kurti M size COD" || got[0].ContactID != "BUYER1" || got[0].ExternalID != "SELLER_IG" {
		t.Fatalf("changes-shaped DM lost: %+v", got)
	}
}
