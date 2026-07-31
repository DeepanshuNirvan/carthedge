package messaging

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Client talks to the Meta Graph API — WhatsApp Cloud and Instagram messaging —
// and verifies inbound webhook signatures. Pure REST, no SDK.
type Client struct {
	appSecret string
	version   string
	hc        *http.Client
}

func NewClient(appSecret, version string) *Client {
	if version == "" {
		version = "v21.0"
	}
	return &Client{appSecret: appSecret, version: version, hc: &http.Client{Timeout: 10 * time.Second}}
}

// VerifySignature checks the X-Hub-Signature-256 header against the raw body.
func (c *Client) VerifySignature(body []byte, header string) bool {
	if c.appSecret == "" || !strings.HasPrefix(header, "sha256=") {
		return false
	}
	mac := hmac.New(sha256.New, []byte(c.appSecret))
	mac.Write(body)
	want := "sha256=" + hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(want), []byte(header))
}

// Send delivers a text reply on the given channel using the seller's own token,
// inside the 24-hour service window (free-form, no template).
func (c *Client) Send(ctx context.Context, channel, externalID, token, to, text string) error {
	if token == "" {
		return errors.New("channel is not connected")
	}
	var url string
	var payload any
	switch channel {
	case "whatsapp":
		url = fmt.Sprintf("https://graph.facebook.com/%s/%s/messages", c.version, externalID)
		payload = map[string]any{"messaging_product": "whatsapp", "to": to, "type": "text", "text": map[string]string{"body": text}}
	case "instagram":
		url = fmt.Sprintf("https://graph.instagram.com/%s/me/messages", c.version)
		payload = map[string]any{"recipient": map[string]string{"id": to}, "message": map[string]string{"text": text}}
	default:
		return errors.New("unknown channel")
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := c.hc.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(res.Body, 1<<12))
		return fmt.Errorf("meta send failed (%d): %s", res.StatusCode, string(b))
	}
	return nil
}

// Inbound is one buyer message normalised across WhatsApp and Instagram.
type Inbound struct {
	Channel    string // whatsapp | instagram
	ExternalID string // routing key: WA phone_number_id / IG account id
	ContactID  string // buyer wa_id / Instagram-scoped id
	Name       string
	MessageID  string
	Text       string
}

// parseWebhook normalises a Meta webhook body into inbound text messages,
// dropping statuses, echoes and non-text events.
func parseWebhook(body []byte) []Inbound {
	var wh struct {
		Object string `json:"object"`
		Entry  []struct {
			ID      string `json:"id"`
			Changes []struct {
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
					} `json:"messages"`
				} `json:"value"`
			} `json:"changes"`
			Messaging []struct {
				Sender struct {
					ID string `json:"id"`
				} `json:"sender"`
				Recipient struct {
					ID string `json:"id"`
				} `json:"recipient"`
				Message struct {
					MID    string `json:"mid"`
					Text   string `json:"text"`
					IsEcho bool   `json:"is_echo"`
				} `json:"message"`
			} `json:"messaging"`
		} `json:"entry"`
	}
	if json.Unmarshal(body, &wh) != nil {
		return nil
	}
	var out []Inbound
	for _, e := range wh.Entry {
		if wh.Object == "instagram" {
			for _, m := range e.Messaging {
				if m.Message.Text == "" || m.Message.IsEcho || m.Sender.ID == e.ID {
					continue
				}
				out = append(out, Inbound{Channel: "instagram", ExternalID: e.ID, ContactID: m.Sender.ID,
					MessageID: m.Message.MID, Text: m.Message.Text})
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
				if m.Type != "text" || m.Text.Body == "" {
					continue
				}
				out = append(out, Inbound{Channel: "whatsapp", ExternalID: v.Metadata.PhoneNumberID,
					ContactID: m.From, Name: name, MessageID: m.ID, Text: m.Text.Body})
			}
		}
	}
	return out
}
