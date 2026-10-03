// Package shop holds the seller-configured settings several surfaces read:
// store policies (buyer pages, returns, the DM assistant), the assistant's
// profile, checkout pricing, GST details and owner-alert preferences. Each is
// validated JSON on businesses (0015): one row read, additive to evolve.
package shop

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"slices"
	"strings"
	"time"

	"carthedge/internal/httpx"

	"github.com/jackc/pgx/v5"
)

// Return reasons a buyer can pick; Policies.Returns.Reasons narrows them.
var ReturnReasons = []string{"size", "damaged", "wrong_item", "quality", "not_as_described", "changed_mind", "other"}

// photoReasons are the claims a seller can ask photo proof for.
var photoReasons = []string{"damaged", "wrong_item", "quality", "not_as_described"}

// NeedsPhoto reports whether a reason needs photos under this policy.
func (r ReturnPolicy) NeedsPhoto(reason string) bool {
	return r.PhotoRequired && slices.Contains(photoReasons, reason)
}

// Accepts reports whether a buyer may raise this kind for this reason.
func (r ReturnPolicy) Accepts(kind, reason string) bool {
	if r.WindowDays <= 0 || !slices.Contains(ReturnReasons, reason) {
		return false
	}
	if (kind == "exchange" && !r.Exchange) || (kind == "return" && !r.Refund) {
		return false
	}
	return len(r.Reasons) == 0 || slices.Contains(r.Reasons, reason)
}

type ReturnPolicy struct {
	WindowDays    int      `json:"windowDays"` // days after delivery; 0 = no self-service returns
	Exchange      bool     `json:"exchange"`
	Refund        bool     `json:"refund"`
	Reasons       []string `json:"reasons"` // accepted reasons; empty = all
	PhotoRequired bool     `json:"photoRequired"`
	Pickup        string   `json:"pickup"` // pickup (we collect) | self_ship (buyer sends it back)
	Conditions    string   `json:"conditions"`
}

type Delivery struct {
	DispatchDays int    `json:"dispatchDays"`
	Metro        string `json:"metro"` // e.g. "2-4 days"
	Rest         string `json:"rest"`
	Note         string `json:"note"`
}

type FAQ struct {
	Q string `json:"q"`
	A string `json:"a"`
}

// Policies is what the store promises buyers. Go enforces the parts it can
// (return window, kinds, reasons, photos, cancellation, COD ceiling); the rest
// is shown on the policy page and quoted by the assistant.
type Policies struct {
	Returns ReturnPolicy `json:"returns"`
	// CancelBefore is the status after which a buyer can no longer cancel:
	// confirmed | packed | shipped | never. Empty means shipped.
	CancelBefore string   `json:"cancelBefore"`
	Delivery     Delivery `json:"delivery"`
	CodMaxOrder  int      `json:"codMaxOrder"` // paise; 0 = no ceiling
	Warranty     string   `json:"warranty"`
	Terms        string   `json:"terms"`
	SupportEmail string   `json:"supportEmail"`
	SupportPhone string   `json:"supportPhone"`
	FAQs         []FAQ    `json:"faqs"`
}

// cancellable lists the order statuses a buyer may still cancel from.
var cancellable = map[string][]string{
	"confirmed": {"new"},
	"packed":    {"new", "confirmed"},
	"shipped":   {"new", "confirmed", "packed"},
	"never":     nil,
}

// BuyerCanCancel reports whether the policy lets a buyer cancel at this status.
func (p Policies) BuyerCanCancel(status string) bool {
	before := p.CancelBefore
	if before == "" {
		before = "shipped"
	}
	return slices.Contains(cancellable[before], status)
}

func (p *Policies) Validate() error {
	r := &p.Returns
	if r.WindowDays < 0 || r.WindowDays > 90 {
		return errors.New("return window must be 0 to 90 days")
	}
	for _, reason := range r.Reasons {
		if !slices.Contains(ReturnReasons, reason) {
			return fmt.Errorf("unknown return reason %q", reason)
		}
	}
	if r.Pickup != "" && r.Pickup != "pickup" && r.Pickup != "self_ship" {
		return errors.New("pickup must be pickup or self_ship")
	}
	if _, ok := cancellable[p.CancelBefore]; !ok && p.CancelBefore != "" {
		return errors.New("cancellation must be confirmed, packed, shipped or never")
	}
	if p.Delivery.DispatchDays < 0 || p.Delivery.DispatchDays > 30 {
		return errors.New("dispatch time must be 0 to 30 days")
	}
	if p.CodMaxOrder < 0 {
		return errors.New("COD limit cannot be negative")
	}
	p.SupportEmail = strings.TrimSpace(p.SupportEmail)
	if p.SupportEmail != "" && !httpx.ValidEmail(p.SupportEmail) {
		return errors.New("support email is not valid")
	}
	if p.SupportPhone = strings.TrimSpace(p.SupportPhone); p.SupportPhone != "" {
		phone, ok := httpx.NormalizePhone(p.SupportPhone)
		if !ok {
			return errors.New("support phone is not a valid mobile number")
		}
		p.SupportPhone = phone
	}
	if len(p.FAQs) > 20 {
		return errors.New("at most 20 FAQs")
	}
	faqs := p.FAQs[:0]
	for _, f := range p.FAQs {
		f.Q, f.A = strings.TrimSpace(f.Q), strings.TrimSpace(f.A)
		if f.Q == "" && f.A == "" {
			continue
		}
		if f.Q == "" || f.A == "" {
			return errors.New("every FAQ needs a question and an answer")
		}
		if err := maxLen(map[string]string{"FAQ question": f.Q}, 200); err != nil {
			return err
		}
		if err := maxLen(map[string]string{"FAQ answer": f.A}, 600); err != nil {
			return err
		}
		faqs = append(faqs, f)
	}
	p.FAQs = faqs
	if err := maxLen(map[string]string{"return conditions": r.Conditions, "warranty": p.Warranty,
		"delivery note": p.Delivery.Note}, 500); err != nil {
		return err
	}
	if err := maxLen(map[string]string{"metro delivery time": p.Delivery.Metro, "delivery time": p.Delivery.Rest}, 40); err != nil {
		return err
	}
	return maxLen(map[string]string{"terms": p.Terms}, 4000)
}

// AIProfile is how the DM assistant behaves for this seller. Zero values are
// the behaviour before it existed, so an empty profile changes nothing.
type AIProfile struct {
	Tone      string  `json:"tone"`      // warm (default) | formal | fun
	Language  string  `json:"language"`  // auto (mirror the buyer, default) | english | hinglish | hindi
	Emoji     string  `json:"emoji"`     // light (default) | none | lots
	Address   string  `json:"address"`   // aap (default) | tum
	Hours     Hours   `json:"hours"`     // business hours, IST
	Away      string  `json:"away"`      // sent once when closed and the assistant is not replying
	ReplyWhen string  `json:"replyWhen"` // always (default) | closed — the seller answers while open
	Handles   Handles `json:"handles"`
	// HandoffAbove sends orders above this total (paise) to the seller instead
	// of the summary; 0 = never.
	HandoffAbove int `json:"handoffAbove"`
}

// Handles are topics the assistant answers itself instead of handing the chat
// to the seller. All off = hand off, which is the default.
type Handles struct {
	Bargain bool `json:"bargain"` // holds the price politely
	Returns bool `json:"returns"` // explains the return policy and the self-service link
	Cancel  bool `json:"cancel"`  // explains cancellation / address change and the link
	Bulk    bool `json:"bulk"`    // treats bulk enquiries as normal questions
	Offers  bool `json:"offers"`  // may mention active coupon codes
}

type Hours struct {
	Enabled bool   `json:"enabled"`
	Days    [7]Day `json:"days"` // index = time.Weekday, Sunday first
}

type Day struct {
	Open bool   `json:"open"`
	From string `json:"from"` // "10:00"
	To   string `json:"to"`   // "19:00", same day
}

var hhmm = regexp.MustCompile(`^([01][0-9]|2[0-3]):[0-5][0-9]$`)

// IST is where every seller's clock runs.
var IST = time.FixedZone("IST", 5*3600+1800)

// OpenAt reports whether the shop is open at t. Without hours set it is
// always open — nothing changes for sellers who never configured them.
func (h Hours) OpenAt(t time.Time) bool {
	if !h.Enabled {
		return true
	}
	t = t.In(IST)
	d := h.Days[t.Weekday()]
	now := t.Format("15:04")
	return d.Open && now >= d.From && now < d.To
}

// NextOpen is when the shop opens next after t, for "we'll reply at 10am".
func (h Hours) NextOpen(t time.Time) (time.Time, bool) {
	if !h.Enabled {
		return time.Time{}, false
	}
	t = t.In(IST)
	for i := 0; i < 8; i++ {
		day := t.AddDate(0, 0, i)
		d := h.Days[day.Weekday()]
		if !d.Open {
			continue
		}
		hh, mm := 0, 0
		fmt.Sscanf(d.From, "%d:%d", &hh, &mm)
		open := time.Date(day.Year(), day.Month(), day.Day(), hh, mm, 0, 0, IST)
		if open.After(t) {
			return open, true
		}
	}
	return time.Time{}, false
}

// Summary is the hours in words for the assistant and the policy page.
func (h Hours) Summary() string {
	if !h.Enabled {
		return ""
	}
	names := []string{"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"}
	var parts []string
	for i := 1; i <= 7; i++ { // Monday first, the way shops write it
		d := h.Days[i%7]
		if d.Open {
			parts = append(parts, fmt.Sprintf("%s %s–%s", names[i%7], d.From, d.To))
		} else {
			parts = append(parts, names[i%7]+" closed")
		}
	}
	return strings.Join(parts, ", ") + " (IST)"
}

func (p *AIProfile) Validate() error {
	enums := []struct {
		name, value string
		allowed     []string
	}{
		{"tone", p.Tone, []string{"", "warm", "formal", "fun"}},
		{"language", p.Language, []string{"", "auto", "english", "hinglish", "hindi"}},
		{"emoji", p.Emoji, []string{"", "light", "none", "lots"}},
		{"address", p.Address, []string{"", "aap", "tum"}},
		{"replyWhen", p.ReplyWhen, []string{"", "always", "closed"}},
	}
	for _, e := range enums {
		if !slices.Contains(e.allowed, e.value) {
			return fmt.Errorf("invalid %s %q", e.name, e.value)
		}
	}
	for i, d := range p.Hours.Days {
		if !d.Open {
			continue
		}
		if !hhmm.MatchString(d.From) || !hhmm.MatchString(d.To) || d.From >= d.To {
			return fmt.Errorf("%s: opening time must be before closing time (HH:MM)", time.Weekday(i))
		}
	}
	if p.Hours.Enabled && !slices.ContainsFunc(p.Hours.Days[:], func(d Day) bool { return d.Open }) {
		return errors.New("business hours need at least one open day")
	}
	if p.ReplyWhen == "closed" && !p.Hours.Enabled {
		return errors.New("set business hours to let the assistant reply only while you are closed")
	}
	if p.HandoffAbove < 0 {
		return errors.New("handoff amount cannot be negative")
	}
	p.Away = strings.TrimSpace(p.Away)
	return maxLen(map[string]string{"away message": p.Away}, 500)
}

// Fee is a charge on cash-on-delivery orders.
type Fee struct {
	Kind      string `json:"kind"`      // flat | percent | "" (off)
	Value     int    `json:"value"`     // paise (flat) or whole percent
	Max       int    `json:"max"`       // paise cap on a percent fee; 0 = none
	FreeAbove int    `json:"freeAbove"` // paise; orders at or above skip it; 0 = never free
}

// Discount is a reward for paying online.
type Discount struct {
	Kind     string `json:"kind"`     // flat | percent | "" (off)
	Value    int    `json:"value"`    // paise (flat) or whole percent
	Max      int    `json:"max"`      // paise cap on a percent discount; 0 = none
	MinOrder int    `json:"minOrder"` // paise the order must reach; 0 = any
}

// Pricing is the seller's checkout levers beyond shipping and coupons.
type Pricing struct {
	CodFee          Fee      `json:"codFee"`
	PrepaidDiscount Discount `json:"prepaidDiscount"`
	// Recovery sends one reminder to a buyer who verified their number but
	// did not order. nil = on.
	Recovery *bool `json:"recovery"`
}

func (p Pricing) RecoveryOn() bool { return p.Recovery == nil || *p.Recovery }

func (p *Pricing) Validate() error {
	check := func(name, kind string, value, limit, floor int) error {
		switch kind {
		case "":
			return nil
		case "flat":
			if value < 0 || value > 10_000_00 {
				return fmt.Errorf("%s must be ₹0 to ₹10,000", name)
			}
		case "percent":
			if value < 0 || value > 50 {
				return fmt.Errorf("%s must be 0 to 50 percent", name)
			}
		default:
			return fmt.Errorf("%s type must be flat or percent", name)
		}
		if limit < 0 || floor < 0 {
			return fmt.Errorf("%s limits cannot be negative", name)
		}
		return nil
	}
	if err := check("COD charge", p.CodFee.Kind, p.CodFee.Value, p.CodFee.Max, p.CodFee.FreeAbove); err != nil {
		return err
	}
	return check("prepaid discount", p.PrepaidDiscount.Kind, p.PrepaidDiscount.Value, p.PrepaidDiscount.Max, p.PrepaidDiscount.MinOrder)
}

// Checkout is everything a total depends on besides the cart and coupon.
type Checkout struct {
	ShippingFee       int
	FreeShippingAbove int
	Pricing
}

// Totals is one priced order. Total = Subtotal - Discount - PrepaidDiscount +
// Shipping + CodFee, and it is what the buyer pays.
type Totals struct {
	Subtotal        int `json:"subtotal"`
	Discount        int `json:"discount"`
	PrepaidDiscount int `json:"prepaidDiscount"`
	Shipping        int `json:"shipping"`
	CodFee          int `json:"codFee"`
	Total           int `json:"total"`
}

// Totals prices a cart for a payment method. It is the only place checkout
// money is worked out: order creation, the buyer's quote and the DM summary
// all call it, so what a buyer is shown is what they are charged.
func (c Checkout) Totals(subtotal, discount int, method string) Totals {
	t := Totals{Subtotal: subtotal, Discount: min(discount, subtotal)}
	base := subtotal - t.Discount
	t.Shipping = c.ShippingFee
	if c.FreeShippingAbove > 0 && base >= c.FreeShippingAbove {
		t.Shipping = 0
	}
	switch method {
	case "cod":
		f := c.CodFee
		if f.FreeAbove == 0 || base < f.FreeAbove {
			t.CodFee = charge(f.Kind, f.Value, f.Max, base)
		}
	case "prepaid":
		d := c.PrepaidDiscount
		if base >= d.MinOrder {
			t.PrepaidDiscount = min(charge(d.Kind, d.Value, d.Max, base), base)
		}
	}
	t.Total = base - t.PrepaidDiscount + t.Shipping + t.CodFee
	return t
}

// charge is a flat amount, or a percent of base rounded to whole rupees and
// held under its cap.
func charge(kind string, value, limit, base int) int {
	amount := 0
	switch kind {
	case "flat":
		amount = value
	case "percent":
		amount = (base*value/100 + 50) / 100 * 100
		if limit > 0 {
			amount = min(amount, limit)
		}
	}
	return max(amount, 0)
}

// GST is the seller's tax identity for invoices. The GSTIN itself stays on
// businesses.gstin (collected at signup).
type GST struct {
	Registration string `json:"registration"` // unregistered | regular | composition; "" = regular when a GSTIN exists
	LegalName    string `json:"legalName"`
	DefaultRate  *int   `json:"defaultRate"` // percent; nil = asked on each invoice
	DefaultHSN   string `json:"defaultHsn"`
	Prefix       string `json:"prefix"` // invoice number prefix, up to 4 characters
	Note         string `json:"note"`   // printed under every invoice
}

// Rates are the GST slabs an invoice line can carry.
var Rates = []int{0, 3, 5, 12, 18, 28, 40}

var (
	hsnRe    = regexp.MustCompile(`^[0-9]{4}([0-9]{2}){0,2}$`)
	prefixRe = regexp.MustCompile(`^[A-Z0-9]{1,4}$`)
)

// ValidHSN reports whether s is a 4, 6 or 8 digit HSN/SAC code.
func ValidHSN(s string) bool { return hsnRe.MatchString(s) }

// RegistrationFor is the effective registration given the stored GSTIN.
func (g GST) RegistrationFor(gstin string) string {
	switch {
	case g.Registration != "":
		return g.Registration
	case gstin != "":
		return "regular"
	}
	return "unregistered"
}

func (g *GST) Validate(gstin string) error {
	if !slices.Contains([]string{"", "unregistered", "regular", "composition"}, g.Registration) {
		return errors.New("registration must be unregistered, regular or composition")
	}
	if (g.Registration == "regular" || g.Registration == "composition") && gstin == "" {
		return errors.New("add your GSTIN in the business profile first")
	}
	if g.DefaultRate != nil && !slices.Contains(Rates, *g.DefaultRate) {
		return errors.New("GST rate must be one of 0, 3, 5, 12, 18, 28, 40")
	}
	g.DefaultHSN = strings.TrimSpace(g.DefaultHSN)
	if g.DefaultHSN != "" && !ValidHSN(g.DefaultHSN) {
		return errors.New("HSN code must be 4, 6 or 8 digits")
	}
	g.Prefix = strings.ToUpper(strings.TrimSpace(g.Prefix))
	if g.Prefix != "" && !prefixRe.MatchString(g.Prefix) {
		return errors.New("invoice prefix must be 1 to 4 letters or digits")
	}
	g.LegalName = strings.TrimSpace(g.LegalName)
	return maxLen(map[string]string{"legal name": g.LegalName, "invoice note": g.Note}, 300)
}

// Alerts says how the owner wants to hear about orders, returns and chats.
// nil = on; push only reaches devices the seller subscribed.
type Alerts struct {
	Email    *bool `json:"email"`
	WhatsApp *bool `json:"whatsapp"`
	Push     *bool `json:"push"`
}

func on(b *bool) bool { return b == nil || *b }

func (a Alerts) EmailOn() bool    { return on(a.Email) }
func (a Alerts) WhatsAppOn() bool { return on(a.WhatsApp) }
func (a Alerts) PushOn() bool     { return on(a.Push) }

func maxLen(fields map[string]string, n int) error {
	for name, v := range fields {
		if len([]rune(v)) > n {
			return fmt.Errorf("%s can be at most %d characters", name, n)
		}
	}
	return nil
}

// Settings is every document plus the shipping columns totals need.
type Settings struct {
	Policies Policies
	AI       AIProfile
	Checkout Checkout
	GST      GST
	Alerts   Alerts
}

// Querier is a pool or a transaction.
type Querier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// Load reads a business's settings in one query.
func Load(ctx context.Context, q Querier, bizID string) (*Settings, error) {
	var s Settings
	var policies, ai, pricing, gst, alerts []byte
	err := q.QueryRow(ctx, `select policies, ai_profile, checkout_rules, gst_profile, alert_prefs,
		shipping_fee, free_shipping_above from businesses where id=$1`, bizID).Scan(
		&policies, &ai, &pricing, &gst, &alerts, &s.Checkout.ShippingFee, &s.Checkout.FreeShippingAbove)
	if err != nil {
		return nil, err
	}
	// a malformed document reads as defaults rather than taking checkout down
	json.Unmarshal(policies, &s.Policies)
	json.Unmarshal(ai, &s.AI)
	json.Unmarshal(pricing, &s.Checkout.Pricing)
	json.Unmarshal(gst, &s.GST)
	json.Unmarshal(alerts, &s.Alerts)
	return &s, nil
}
