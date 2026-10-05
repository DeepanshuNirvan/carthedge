package notify

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"carthedge/internal/httpx"
)

// The templates CartHedge's own number sends, created once in WhatsApp
// Manager in English (docs/WHATSAPP-INSTAGRAM-GO-LIVE.md, "Phase 1"). Meta
// delivers only approved templates to people who have not written to the
// number first, so names and the order of the {{n}} placeholders must match
// what was approved.
const (
	tplCode        = "carthedge_code" // authentication: {{1}} is the code, copy-code button
	tplOrderUpdate = "order_update"   // utility: Order update from {{1}}: {{2}}
	tplSellerAlert = "seller_alert"   // utility: CartHedge alert: {{1}} / {{2}} / Open it here: {{3}}
	templateLang   = "en"
	// Meta caps a template body at 1,024 characters, placeholders filled in
	maxParam = 500
)

var (
	// ErrWhatsAppOff: production has no WhatsApp number configured, so nothing
	// can be sent (and codes are never written to the logs there).
	ErrWhatsAppOff = errors.New("WhatsApp messages are not set up yet")
	// ErrOffersOff: marketing waits for the seller's own WhatsApp number.
	ErrOffersOff = errors.New("WhatsApp offers start once you can connect your own WhatsApp number to CartHedge. Until then you can save drafts, and buyers' yes or no to offers is still recorded")
)

// Message is one WhatsApp template from CartHedge's number. Text is the same
// message in words, for the dev log and the email fallback.
type Message struct {
	template string
	params   []string
	code     string // authentication: the code behind the copy button
	Text     string
}

// Code is a one-time verification code.
func Code(code string) Message {
	return Message{template: tplCode, params: []string{code}, code: code,
		Text: fmt.Sprintf("Your verification code is %s. Valid for 5 minutes.", code)}
}

// OrderUpdate is anything a buyer hears about their order from a shop.
func OrderUpdate(store, text string) Message {
	return Message{template: tplOrderUpdate, params: []string{store, text}, Text: text}
}

// SellerAlert tells a seller something needs them, and where to act on it.
func SellerAlert(title, body, link string) Message {
	return Message{template: tplSellerAlert, params: []string{title, body, link}, Text: title + "\n" + body + "\n" + link}
}

// WhatsAppOn says whether a WhatsApp message can go anywhere: a number is
// configured, or this is not production and it is logged instead.
func (n *Notifier) WhatsAppOn() bool {
	return n.cfg.WhatsAppPhoneID != "" || n.cfg.Env != "production"
}

// WhatsApp sends m from CartHedge's number to an Indian mobile.
func (n *Notifier) WhatsApp(phone string, m Message) error {
	local, ok := httpx.NormalizePhone(phone)
	if !ok {
		return errors.New("whatsapp: not an Indian mobile number")
	}
	if n.cfg.WhatsAppPhoneID == "" {
		if n.cfg.Env == "production" {
			return ErrWhatsAppOff
		}
		n.log.Info("whatsapp (dev log)", "to", local, "template", m.template, "message", m.Text)
		return nil
	}
	body, err := json.Marshal(templatePayload("91"+local, m))
	if err != nil {
		return err
	}
	req, err := http.NewRequest(http.MethodPost,
		n.graph+"/"+n.cfg.MetaGraphVersion+"/"+n.cfg.WhatsAppPhoneID+"/messages", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+n.cfg.WhatsAppToken)
	resp, err := n.hc.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 300 {
		return nil
	}
	var fail struct {
		Error struct {
			Message string `json:"message"`
			Code    int    `json:"code"`
		} `json:"error"`
	}
	json.NewDecoder(io.LimitReader(resp.Body, 8<<10)).Decode(&fail)
	return fmt.Errorf("whatsapp %s: %d %s (code %d)", m.template, resp.StatusCode, fail.Error.Message, fail.Error.Code)
}

type tplParam struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type tplComponent struct {
	Type       string     `json:"type"`
	SubType    string     `json:"sub_type,omitempty"`
	Index      string     `json:"index,omitempty"`
	Parameters []tplParam `json:"parameters"`
}

// templatePayload is the Cloud API body for one template message.
func templatePayload(to string, m Message) map[string]any {
	body := tplComponent{Type: "body"}
	for _, p := range m.params {
		body.Parameters = append(body.Parameters, tplParam{Type: "text", Text: paramText(p)})
	}
	components := []tplComponent{body}
	if m.code != "" {
		// an authentication template's copy-code button carries the code again
		components = append(components, tplComponent{Type: "button", SubType: "url", Index: "0",
			Parameters: []tplParam{{Type: "text", Text: m.code}}})
	}
	return map[string]any{
		"messaging_product": "whatsapp",
		"to":                to,
		"type":              "template",
		"template": map[string]any{
			"name":       m.template,
			"language":   map[string]string{"code": templateLang},
			"components": components,
		},
	}
}

// paramText fits text into a template placeholder: Meta refuses new lines,
// tabs, runs of spaces and empty values there.
func paramText(s string) string {
	lines := strings.FieldsFunc(s, func(r rune) bool { return r == '\n' || r == '\r' })
	for i, l := range lines {
		l = strings.Join(strings.Fields(l), " ")
		// a line that ended without punctuation still reads as its own sentence
		if i < len(lines)-1 && l != "" && !strings.ContainsAny(l[len(l)-1:], ".!?:,;") {
			l += "."
		}
		lines[i] = l
	}
	s = strings.Join(strings.Fields(strings.Join(lines, " ")), " ")
	if r := []rune(s); len(r) > maxParam {
		s = string(r[:maxParam-1]) + "…"
	}
	if s == "" {
		return "-"
	}
	return s
}

// OfferFunc sends one marketing message (an offer, a cart reminder, a
// back-in-stock note) from the seller's own WhatsApp number.
type OfferFunc func(ctx context.Context, bizID, phone, text string) error

// SetOffers wires marketing to sellers' own WhatsApp numbers. Meta classes
// offers, cart reminders and back-in-stock notes as marketing, and CartHedge's
// number never sends marketing for a shop, so until sellers can connect
// WhatsApp (docs/WHATSAPP-INSTAGRAM-GO-LIVE.md §6) nothing is wired and those
// features wait. Call once at boot, before serving.
func (n *Notifier) SetOffers(fn OfferFunc) { n.offers = fn }

// OffersOn says whether marketing can reach buyers at all.
func (n *Notifier) OffersOn() bool { return n.offers != nil }

// Offer sends one marketing message from the seller's own WhatsApp.
func (n *Notifier) Offer(ctx context.Context, bizID, phone, text string) error {
	if n.offers == nil {
		return ErrOffersOff
	}
	return n.offers(ctx, bizID, phone, text)
}
