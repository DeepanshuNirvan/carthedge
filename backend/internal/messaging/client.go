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
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Client talks to the Meta Graph API — WhatsApp Cloud and Instagram messaging —
// and verifies inbound webhook signatures. Pure REST, no SDK.
type Client struct {
	secrets []string
	version string
	hc      *http.Client
}

// NewClient takes every app secret Meta may sign a webhook with: WhatsApp
// events are signed with the Meta app secret, Instagram Login events with the
// Instagram app secret. Checking only one silently 401s the other channel.
func NewClient(version string, secrets ...string) *Client {
	if version == "" {
		version = "v25.0"
	}
	var keep []string
	for _, s := range secrets {
		if s != "" {
			keep = append(keep, s)
		}
	}
	return &Client{secrets: keep, version: version, hc: &http.Client{Timeout: 10 * time.Second}}
}

// VerifySignature checks the X-Hub-Signature-256 header against the raw body.
func (c *Client) VerifySignature(body []byte, header string) bool {
	if !strings.HasPrefix(header, "sha256=") {
		return false
	}
	for _, secret := range c.secrets {
		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write(body)
		if hmac.Equal([]byte("sha256="+hex.EncodeToString(mac.Sum(nil))), []byte(header)) {
			return true
		}
	}
	return false
}

// SignedUser verifies a Meta signed_request ("sig.payload", both base64url,
// sig = HMAC-SHA256 of the encoded payload) and returns the user it names.
func (c *Client) SignedUser(raw string) (string, bool) {
	sig, payload, ok := strings.Cut(raw, ".")
	if !ok {
		return "", false
	}
	got, err := base64.RawURLEncoding.DecodeString(strings.TrimRight(sig, "="))
	if err != nil {
		return "", false
	}
	for _, secret := range c.secrets {
		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write([]byte(payload))
		if !hmac.Equal(mac.Sum(nil), got) {
			continue
		}
		body, err := base64.RawURLEncoding.DecodeString(strings.TrimRight(payload, "="))
		if err != nil {
			return "", false
		}
		var claims struct {
			UserID json.Number `json:"user_id"`
		}
		if json.Unmarshal(body, &claims) != nil || claims.UserID == "" {
			return "", false
		}
		return claims.UserID.String(), true
	}
	return "", false
}

// Owns checks that a token speaks for the account id a seller typed in. The
// id is the webhook routing key: without this, a seller could enter another
// shop's number or Instagram id and receive that shop's buyer DMs.
func (c *Client) Owns(ctx context.Context, channel, externalID, token string) error {
	switch channel {
	case "instagram":
		var me igMe
		if err := c.getJSON(ctx, "https://graph.instagram.com/"+c.version+"/me?"+url.Values{
			"fields": {"user_id"}, "access_token": {token},
		}.Encode(), &me); err != nil {
			return err
		}
		if id, _ := me.account(); id != externalID {
			return errors.New("the token belongs to another Instagram account")
		}
	case "whatsapp":
		var number struct {
			ID string `json:"id"`
		}
		if err := c.getJSON(ctx, "https://graph.facebook.com/"+c.version+"/"+url.PathEscape(externalID)+"?"+url.Values{
			"fields": {"id"}, "access_token": {token},
		}.Encode(), &number); err != nil {
			return err
		}
		if number.ID != externalID {
			return errors.New("the token cannot reach this WhatsApp number")
		}
	default:
		return errors.New("channel must be whatsapp or instagram")
	}
	return nil
}

// SubscribeInstagram turns on webhook delivery for one connected account.
// Configuring the callback on the app is not enough under Instagram Login:
// each account must subscribe, or its DMs never reach /webhooks/meta.
func (c *Client) SubscribeInstagram(ctx context.Context, token string) error {
	return c.postForm(ctx, "https://graph.instagram.com/"+c.version+"/me/subscribed_apps", url.Values{
		"subscribed_fields": {"messages"}, "access_token": {token},
	})
}

// Send delivers a text reply on the given channel using the seller's own token,
// inside the 24-hour service window (free-form, no template). It returns
// Meta's id for the last message sent, which is how our own messages are told
// apart from the seller's when Instagram echoes them back.
func (c *Client) Send(ctx context.Context, channel, externalID, token, to, text string) (string, error) {
	if token == "" {
		return "", errors.New("channel is not connected")
	}
	limit := 4096
	if channel == "instagram" {
		limit = 1000 // Instagram rejects longer text messages
	}
	var id string
	for _, part := range chunks(text, limit) {
		var err error
		if id, err = c.sendOne(ctx, channel, externalID, token, to, part); err != nil {
			return "", err
		}
	}
	return id, nil
}

func (c *Client) sendOne(ctx context.Context, channel, externalID, token, to, text string) (string, error) {
	var endpoint string
	var payload any
	switch channel {
	case "whatsapp":
		endpoint = fmt.Sprintf("https://graph.facebook.com/%s/%s/messages", c.version, externalID)
		payload = map[string]any{"messaging_product": "whatsapp", "to": to, "type": "text", "text": map[string]string{"body": text}}
	case "instagram":
		endpoint = fmt.Sprintf("https://graph.instagram.com/%s/me/messages", c.version)
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
	res, err := c.hc.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(res.Body, 1<<14))
	if res.StatusCode >= 300 {
		return "", fmt.Errorf("meta send failed (%d): %s", res.StatusCode, string(raw))
	}
	var out struct {
		MessageID string `json:"message_id"` // instagram
		Messages  []struct {
			ID string `json:"id"`
		} `json:"messages"` // whatsapp
	}
	json.Unmarshal(raw, &out)
	if out.MessageID == "" && len(out.Messages) > 0 {
		out.MessageID = out.Messages[0].ID
	}
	return out.MessageID, nil
}

// SenderAction shows typing_on / typing_off / mark_seen to the buyer.
// Instagram only; WhatsApp ties its indicators to a specific message id.
func (c *Client) SenderAction(ctx context.Context, channel, token, to, action string) error {
	if channel != "instagram" || token == "" {
		return nil
	}
	body, _ := json.Marshal(map[string]any{"recipient": map[string]string{"id": to}, "sender_action": action})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		fmt.Sprintf("https://graph.instagram.com/%s/me/messages", c.version), bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	var ignored map[string]any
	return c.do(req, &ignored)
}

// chunks splits a long message at paragraph, then line, then rune boundaries.
func chunks(text string, limit int) []string {
	var out []string
	for len([]rune(text)) > limit {
		r := []rune(text)
		cut := limit
		head := string(r[:limit])
		if i := strings.LastIndex(head, "\n\n"); i > 0 {
			cut = len([]rune(head[:i]))
		} else if i := strings.LastIndex(head, "\n"); i > 0 {
			cut = len([]rune(head[:i]))
		}
		out = append(out, strings.TrimSpace(string(r[:cut])))
		text = strings.TrimSpace(string(r[cut:]))
	}
	if text != "" {
		out = append(out, text)
	}
	return out
}

// Inbound is one buyer message normalised across WhatsApp and Instagram.
type Inbound struct {
	Channel    string // whatsapp | instagram
	ExternalID string // routing key: WA phone_number_id / IG account id
	ContactID  string // buyer wa_id / Instagram-scoped id
	Name       string
	MessageID  string
	Text       string
	// Echo marks a message the business account itself sent. ContactID is
	// then the buyer it went to. Our own sends come back this way too; the
	// rest are the seller replying from the Instagram app.
	Echo bool
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
					// depending on which product the app was subscribed through:
					// as a list, or (field "messages") as one bare event
					Messaging []igMessagingEvent `json:"messaging"`
					igMessagingEvent
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
				if ch.Field == "messages" && ch.Value.Sender.ID != "" {
					events = append(events, ch.Value.igMessagingEvent)
				}
			}
			for _, m := range events {
				if m.Message.IsDeleted || m.Sender.ID == "" {
					continue
				}
				text := igText(m)
				if text == "" {
					continue
				}
				// e.ID is the seller's own account: their outbound messages echo back
				if m.Message.IsEcho || m.Sender.ID == e.ID {
					if m.Recipient.ID != "" && m.Recipient.ID != e.ID {
						out = append(out, Inbound{Channel: "instagram", ExternalID: e.ID, ContactID: m.Recipient.ID,
							MessageID: m.Message.MID, Text: text, Echo: true})
					}
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
	url := fmt.Sprintf("https://graph.instagram.com/%s/%s?fields=name,username&access_token=%s",
		c.version, contactID, token)
	if err := c.getJSON(ctx, url, &out); err != nil {
		return ""
	}
	if out.Username != "" {
		return "@" + out.Username
	}
	return out.Name
}
