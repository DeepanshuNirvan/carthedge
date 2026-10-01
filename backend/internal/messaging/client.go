package messaging

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Client talks to the Meta Graph API — WhatsApp Cloud and Instagram messaging —
// and verifies inbound webhook signatures. Pure REST, no SDK.
type Client struct {
	// secrets that may sign a webhook. Instagram Login webhooks are signed with
	// the Instagram app secret, WhatsApp ones with the Meta app secret — two
	// different values on one app, and checking only one silently rejected
	// every message from the other product.
	secrets []string
	version string
	hc      *http.Client

	// hosts are fields so tests can point the client at a fake Graph API
	graphFB string // graph.facebook.com — WhatsApp, Facebook Login
	graphIG string // graph.instagram.com — Instagram Login tokens and messaging
	apiIG   string // api.instagram.com — Instagram code exchange
}

func NewClient(version string, secrets ...string) *Client {
	if version == "" {
		version = DefaultGraphVersion
	}
	var keep []string
	for _, s := range secrets {
		if s != "" {
			keep = append(keep, s)
		}
	}
	return &Client{secrets: keep, version: version, hc: &http.Client{Timeout: 15 * time.Second},
		graphFB: "https://graph.facebook.com", graphIG: "https://graph.instagram.com", apiIG: "https://api.instagram.com"}
}

// DefaultGraphVersion is used when META_GRAPH_VERSION is unset. Meta retires
// each version about two years after release and silently upgrades callers to
// the oldest live one, so keep this recent.
const DefaultGraphVersion = "v24.0"

// VerifySignature checks the X-Hub-Signature-256 header against the raw body.
func (c *Client) VerifySignature(body []byte, header string) bool {
	got, ok := strings.CutPrefix(header, "sha256=")
	if !ok || len(c.secrets) == 0 {
		return false
	}
	for _, secret := range c.secrets {
		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write(body)
		if hmac.Equal([]byte(hex.EncodeToString(mac.Sum(nil))), []byte(got)) {
			return true
		}
	}
	return false
}

// ParseSignedRequest verifies and decodes the signed_request Meta posts to the
// deauthorize and data-deletion callbacks: base64url(signature).base64url(json),
// HMAC-SHA256 with the app secret.
func (c *Client) ParseSignedRequest(raw string) (map[string]any, error) {
	sigPart, payloadPart, ok := strings.Cut(strings.TrimSpace(raw), ".")
	if !ok || sigPart == "" || payloadPart == "" {
		return nil, errors.New("malformed signed_request")
	}
	decode := func(s string) ([]byte, error) {
		return base64.RawURLEncoding.DecodeString(strings.TrimRight(s, "="))
	}
	sig, err := decode(sigPart)
	if err != nil {
		return nil, errors.New("malformed signature")
	}
	valid := false
	for _, secret := range c.secrets {
		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write([]byte(payloadPart))
		if hmac.Equal(mac.Sum(nil), sig) {
			valid = true
			break
		}
	}
	if !valid {
		return nil, errors.New("bad signature")
	}
	payload, err := decode(payloadPart)
	if err != nil {
		return nil, errors.New("malformed payload")
	}
	// ids exceed 2^53: keep numbers as their literal text, never a float
	dec := json.NewDecoder(bytes.NewReader(payload))
	dec.UseNumber()
	var out map[string]any
	if err := dec.Decode(&out); err != nil {
		return nil, errors.New("malformed payload")
	}
	if alg, _ := out["algorithm"].(string); alg != "" && !strings.EqualFold(alg, "HMAC-SHA256") {
		return nil, errors.New("unexpected algorithm")
	}
	return out, nil
}

// Send delivers a text reply on the given channel using the seller's own token,
// inside the 24-hour service window (free-form, no template). It returns
// Meta's id for the sent message, which is how the echo of it is recognised.
func (c *Client) Send(ctx context.Context, channel, externalID, token, to, text string) (string, error) {
	if token == "" {
		return "", errors.New("channel is not connected")
	}
	var endpoint string
	var payload any
	switch channel {
	case "whatsapp":
		endpoint = fmt.Sprintf("%s/%s/%s/messages", c.graphFB, c.version, externalID)
		payload = map[string]any{"messaging_product": "whatsapp", "recipient_type": "individual", "to": to,
			"type": "text", "text": map[string]any{"body": text, "preview_url": true}}
	case "instagram":
		endpoint = fmt.Sprintf("%s/%s/me/messages", c.graphIG, c.version)
		payload = map[string]any{"recipient": map[string]string{"id": to}, "message": map[string]string{"text": text}}
	default:
		return "", errors.New("unknown channel")
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	var out struct {
		MessageID string `json:"message_id"` // instagram
		Messages  []struct {
			ID string `json:"id"`
		} `json:"messages"` // whatsapp
	}
	if err := c.do(req, &out); err != nil {
		return "", fmt.Errorf("meta send failed: %w", err)
	}
	if out.MessageID == "" && len(out.Messages) > 0 {
		out.MessageID = out.Messages[0].ID
	}
	return out.MessageID, nil
}

// Inbound is one message event normalised across WhatsApp and Instagram.
type Inbound struct {
	Channel    string // whatsapp | instagram
	ExternalID string // routing key: WA phone_number_id / IG account id
	ContactID  string // buyer wa_id / Instagram-scoped id
	Name       string
	MessageID  string
	Text       string
	// Outbound marks an echo: a message the seller's own account sent, either
	// through CartHedge or typed in the Instagram app. CartHedge's own sends
	// are recognised and skipped; the rest are kept as the seller's side of
	// the thread, so the parser sees both halves and auto-reply knows a human
	// has stepped in.
	Outbound bool
}

// parseWebhook normalises a Meta webhook body into inbound buyer messages,
// dropping statuses, echoes and events with nothing to read.
//
// On Instagram a very large share of orders start as a *story reply* or a
// photo — "ye wala chahiye" against a story is a complete order intent to a
// human and was invisible to the parser while only `text` was read. Those now
// arrive as an annotated line the LLM can use.
func parseWebhook(body []byte) []Inbound {
	var wh struct {
		Object string `json:"object"`
		Entry  []struct {
			ID      string `json:"id"`
			Changes []struct {
				Field string `json:"field"`
				Value struct {
					Metadata struct {
						PhoneNumberID string `json:"phone_number_id"`
					} `json:"metadata"`
					Contacts []struct {
						Profile struct {
							Name string `json:"name"`
						} `json:"profile"`
						WaID string `json:"wa_id"`
					} `json:"contacts"`
					Messages []struct {
						From string `json:"from"`
						ID   string `json:"id"`
						Type string `json:"type"`
						Text struct {
							Body string `json:"body"`
						} `json:"text"`
						Image struct {
							Caption string `json:"caption"`
						} `json:"image"`
						Button struct {
							Text string `json:"text"`
						} `json:"button"`
						Interactive struct {
							ButtonReply struct {
								Title string `json:"title"`
							} `json:"button_reply"`
							ListReply struct {
								Title string `json:"title"`
							} `json:"list_reply"`
						} `json:"interactive"`
					} `json:"messages"`
					// Instagram delivers messaging events under `changes` too,
					// depending on which product the app was subscribed through
					Messaging []igMessagingEvent `json:"messaging"`
				} `json:"value"`
			} `json:"changes"`
			Messaging []igMessagingEvent `json:"messaging"`
		} `json:"entry"`
	}
	if json.Unmarshal(body, &wh) != nil {
		return nil
	}
	var out []Inbound
	for _, e := range wh.Entry {
		if wh.Object == "instagram" {
			events := e.Messaging
			for _, ch := range e.Changes {
				events = append(events, ch.Value.Messaging...)
			}
			for _, m := range events {
				if m.Message.IsDeleted || m.Sender.ID == "" {
					continue
				}
				text := igText(m)
				if text == "" {
					continue
				}
				// e.ID is the seller's own account: their outbound echoes land here too,
				// addressed to the buyer
				if m.Message.IsEcho || m.Sender.ID == e.ID {
					if m.Recipient.ID == "" || m.Recipient.ID == e.ID {
						continue
					}
					out = append(out, Inbound{Channel: "instagram", ExternalID: e.ID, ContactID: m.Recipient.ID,
						MessageID: m.Message.MID, Text: text, Outbound: true})
					continue
				}
				out = append(out, Inbound{Channel: "instagram", ExternalID: e.ID, ContactID: m.Sender.ID,
					Name: m.Sender.Username, MessageID: m.Message.MID, Text: text})
			}
			continue
		}
		for _, ch := range e.Changes {
			v := ch.Value
			name := ""
			if len(v.Contacts) > 0 {
				name = v.Contacts[0].Profile.Name
			}
			for _, m := range v.Messages {
				text := firstNonEmpty(m.Text.Body, m.Image.Caption, m.Interactive.ButtonReply.Title,
					m.Interactive.ListReply.Title, m.Button.Text)
				if text == "" {
					continue
				}
				if m.Type == "image" {
					text = "[sent a photo] " + text
				}
				out = append(out, Inbound{Channel: "whatsapp", ExternalID: v.Metadata.PhoneNumberID,
					ContactID: m.From, Name: name, MessageID: m.ID, Text: text})
			}
		}
	}
	return out
}

// igMessagingEvent is one Instagram messaging webhook event.
type igMessagingEvent struct {
	Sender struct {
		ID       string `json:"id"`
		Username string `json:"username"`
	} `json:"sender"`
	Recipient struct {
		ID string `json:"id"`
	} `json:"recipient"`
	Message struct {
		MID         string `json:"mid"`
		Text        string `json:"text"`
		IsEcho      bool   `json:"is_echo"`
		IsDeleted   bool   `json:"is_deleted"`
		Attachments []struct {
			Type    string `json:"type"` // image | video | share | story_mention | ig_reel
			Payload struct {
				Title string `json:"title"`
			} `json:"payload"`
		} `json:"attachments"`
		ReplyTo struct {
			Story struct {
				ID string `json:"id"`
			} `json:"story"`
		} `json:"reply_to"`
	} `json:"message"`
}

// igText renders an Instagram DM as one line of thread context. Attachment and
// story markers are kept in prose so the parse prompt needs no new fields.
func igText(m igMessagingEvent) string {
	var parts []string
	if m.Message.ReplyTo.Story.ID != "" {
		parts = append(parts, "[replying to your story]")
	}
	for _, a := range m.Message.Attachments {
		switch a.Type {
		case "story_mention":
			parts = append(parts, "[mentioned you in a story]")
		case "share", "ig_reel":
			label := "[shared a post]"
			if a.Payload.Title != "" {
				label = "[shared a post: " + a.Payload.Title + "]"
			}
			parts = append(parts, label)
		case "image", "video":
			parts = append(parts, "[sent a "+a.Type+"]")
		}
	}
	if m.Message.Text != "" {
		parts = append(parts, m.Message.Text)
	}
	return strings.TrimSpace(strings.Join(parts, " "))
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

// Profile resolves a buyer's display name on Instagram. Webhooks carry only an
// opaque sender id, so without this every conversation is titled with a number.
func (c *Client) Profile(ctx context.Context, channel, token, contactID string) string {
	if channel != "instagram" || token == "" || contactID == "" {
		return ""
	}
	var out struct {
		Name     string `json:"name"`
		Username string `json:"username"`
	}
	endpoint := fmt.Sprintf("%s/%s/%s?", c.graphIG, c.version, contactID) +
		url.Values{"fields": {"name,username"}, "access_token": {token}}.Encode()
	if err := c.getJSON(ctx, endpoint, &out); err != nil {
		return ""
	}
	if out.Username != "" {
		return "@" + out.Username
	}
	return out.Name
}
