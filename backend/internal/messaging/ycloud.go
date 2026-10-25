package messaging

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// YCloud is CartHedge's WhatsApp Solution Partner for sellers on "CartHedge
// pays": their WhatsApp account carries YCloud's credit line, and the joint
// solution lets only the partner send, so those sellers' replies go out here.
// Buyer messages still arrive on /webhooks/meta in Meta's own format, because
// CartHedge's app subscribes to the account at signup. Everything
// partner-specific lives in this file, so a partner switch touches only it.
const ycloudAPI = "https://api.ycloud.com/v2"

// errPartner marks a refusal from YCloud; its detail is logged, never shown.
var errPartner = errors.New("ycloud request failed")

// bindPartner tells YCloud about an account that just finished signup, which is
// what attaches its credit line. A number still on the WhatsApp Business app
// (coexistence) binds as smb; a fresh number binds as tp and is then registered.
func (c *Client) bindPartner(ctx context.Context, wabaID, phoneID string, onBizApp bool) error {
	if !onBizApp {
		var out struct {
			PaymentMethodAttached bool `json:"paymentMethodAttached"`
		}
		if err := c.ycloud(ctx, "/whatsapp/businessAccounts/"+wabaID+"/tp/bind", nil, &out); err != nil {
			return err
		}
		if !out.PaymentMethodAttached {
			return errors.New("the WhatsApp account has no billing attached — pick \"Create a new WhatsApp Business account\" in Meta's popup and try again")
		}
		return c.ycloud(ctx, "/whatsapp/phoneNumbers/"+wabaID+"/"+phoneID+"/register", nil, nil)
	}
	return c.ycloud(ctx, "/whatsapp/businessAccounts/"+wabaID+"/smb/bind", nil, nil)
}

// sendPartner delivers a text reply through YCloud. It addresses both sides by
// number in E.164 and returns Meta's message id, which the echo check matches.
func (c *Client) sendPartner(ctx context.Context, from, to, text string) (string, error) {
	var id string
	for _, part := range chunks(text, 4096) {
		var out struct {
			Wamid string `json:"wamid"`
		}
		err := c.ycloud(ctx, "/whatsapp/messages/sendDirectly", map[string]any{
			"from": e164(from), "to": e164(to), "type": "text", "text": map[string]string{"body": part},
		}, &out)
		if err != nil {
			return "", err
		}
		id = out.Wamid
	}
	return id, nil
}

func (c *Client) ycloud(ctx context.Context, path string, body, dst any) error {
	if c.YCloudKey == "" {
		return errors.New("CartHedge-paid WhatsApp is not set up on this server")
	}
	var raw []byte // the bind and register calls take no body
	if body != nil {
		raw, _ = json.Marshal(body)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, ycloudAPI+path, bytes.NewReader(raw))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", c.YCloudKey)
	res, err := c.hc.Do(req)
	if err != nil {
		return fmt.Errorf("%w: %v", errPartner, err)
	}
	defer res.Body.Close()
	out, _ := io.ReadAll(io.LimitReader(res.Body, 1<<16))
	if res.StatusCode >= 300 {
		return fmt.Errorf("%w: %s returned %d: %s", errPartner, path, res.StatusCode, out)
	}
	if dst == nil {
		return nil
	}
	return json.Unmarshal(out, dst)
}

// e164 turns "+91 98765 43210" or a WhatsApp id "919876543210" into "+919876543210".
func e164(number string) string {
	var b strings.Builder
	b.WriteByte('+')
	for _, r := range number {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}
