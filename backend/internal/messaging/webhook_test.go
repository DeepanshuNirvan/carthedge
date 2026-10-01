package messaging

import "testing"

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
	if len(got) != 3 {
		t.Fatalf("got %d messages, want 3 (deleted must be dropped, the echo kept as outbound): %+v", len(got), got)
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
	// the seller's own reply belongs to the buyer's thread, not a thread with themselves
	if echo := got[2]; !echo.Outbound || echo.ContactID != "BUYER1" || echo.Text != "haan hai" {
		t.Errorf("echo not captured as the seller's message to the buyer: %+v", echo)
	}
	for _, m := range got[:2] {
		if m.Outbound {
			t.Errorf("buyer message marked outbound: %+v", m)
		}
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
