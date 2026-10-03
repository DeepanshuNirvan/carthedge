package business

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"carthedge/internal/gst"
	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
	"carthedge/internal/payment"
	"carthedge/internal/secure"
	"carthedge/internal/shop"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	pool   *pgxpool.Pool
	cipher *secure.Cipher
}

func NewHandler(pool *pgxpool.Pool, cipher *secure.Cipher) *Handler {
	return &Handler{pool: pool, cipher: cipher}
}

type Profile struct {
	ID                 string `json:"id"`
	Code               string `json:"code"`
	Name               string `json:"name"`
	OwnerName          string `json:"ownerName"`
	Email              string `json:"email"`
	Phone              string `json:"phone"`
	WhatsApp           string `json:"whatsapp"`
	Instagram          string `json:"instagram"`
	Address            string `json:"address"`
	City               string `json:"city"`
	State              string `json:"state"`
	Pincode            string `json:"pincode"`
	Gstin              string `json:"gstin"`
	UpiID              string `json:"upiId"`
	LogoURL            string `json:"logoUrl"`
	ShippingFee        int    `json:"shippingFee"`
	FreeShippingAbove  int    `json:"freeShippingAbove"` // 0 = off
	CodEnabled         bool   `json:"codEnabled"`
	CodTokenAmount     int    `json:"codTokenAmount"`
	BaselineRtoPercent int    `json:"baselineRtoPercent"`
	RazorpayKeyID      string `json:"razorpayKeyId"`
	RazorpayConfigured bool   `json:"razorpayConfigured"`
	AiAutoReply        bool   `json:"aiAutoReply"`
	AiAutoOrder        bool   `json:"aiAutoOrder"`
	AiNotes            string `json:"aiNotes"`
	// settings documents (see internal/shop)
	Policies  shop.Policies  `json:"policies"`
	AIProfile shop.AIProfile `json:"aiProfile"`
	Checkout  shop.Pricing   `json:"checkout"`
	GST       shop.GST       `json:"gst"`
	Alerts    shop.Alerts    `json:"alerts"`
	// DeletionScheduledAt is set while an account deletion waits out its grace period
	DeletionScheduledAt string `json:"deletionScheduledAt,omitempty"`
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	bizID := middleware.BusinessID(r.Context())
	var p Profile
	var secretEnc string
	err := h.pool.QueryRow(r.Context(), `select id, code, name, owner_name, email, phone, whatsapp, instagram,
		address, city, state, pincode, gstin, upi_id, logo_url, shipping_fee, free_shipping_above,
		cod_enabled, cod_token_amount, baseline_rto_percent, razorpay_key_id, razorpay_key_secret,
		ai_auto_reply, ai_auto_order, ai_notes
		from businesses where id = $1`, bizID).Scan(
		&p.ID, &p.Code, &p.Name, &p.OwnerName, &p.Email, &p.Phone, &p.WhatsApp, &p.Instagram,
		&p.Address, &p.City, &p.State, &p.Pincode, &p.Gstin, &p.UpiID, &p.LogoURL, &p.ShippingFee,
		&p.FreeShippingAbove, &p.CodEnabled, &p.CodTokenAmount, &p.BaselineRtoPercent, &p.RazorpayKeyID, &secretEnc,
		&p.AiAutoReply, &p.AiAutoOrder, &p.AiNotes)
	if err != nil {
		httpx.Err(w, http.StatusNotFound, "business not found")
		return
	}
	p.RazorpayConfigured = p.RazorpayKeyID != "" && secretEnc != ""
	if s, err := shop.Load(r.Context(), h.pool, bizID); err == nil {
		p.Policies, p.AIProfile, p.Checkout, p.GST, p.Alerts = s.Policies, s.AI, s.Checkout.Pricing, s.GST, s.Alerts
	}
	h.pool.QueryRow(r.Context(), `select coalesce(to_char(deleted_at + interval '30 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '')
		from businesses where id=$1`, bizID).Scan(&p.DeletionScheduledAt)
	httpx.OK(w, p)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	bizID := middleware.BusinessID(ctx)
	// every field is optional: the profile form sends them all, the quick
	// settings (COD switch, token, shipping fee, RTO baseline) send one each
	var in struct {
		Name               *string `json:"name"`
		OwnerName          *string `json:"ownerName"`
		Phone              *string `json:"phone"`
		WhatsApp           *string `json:"whatsapp"`
		Instagram          *string `json:"instagram"`
		Address            *string `json:"address"`
		City               *string `json:"city"`
		State              *string `json:"state"`
		Pincode            *string `json:"pincode"`
		Gstin              *string `json:"gstin"`
		LogoURL            *string `json:"logoUrl"`
		ShippingFee        *int    `json:"shippingFee"`
		FreeShippingAbove  *int    `json:"freeShippingAbove"`
		CodEnabled         *bool   `json:"codEnabled"`
		CodTokenAmount     *int    `json:"codTokenAmount"`
		BaselineRtoPercent *int    `json:"baselineRtoPercent"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	blank := func(p *string) bool { return p != nil && strings.TrimSpace(*p) == "" }
	if blank(in.Name) || blank(in.OwnerName) {
		httpx.Err(w, http.StatusBadRequest, "name and ownerName are required")
		return
	}
	if in.Phone != nil {
		phone, ok := httpx.NormalizePhone(*in.Phone)
		if !ok {
			httpx.Err(w, http.StatusBadRequest, "invalid phone number")
			return
		}
		// the verified mobile is the account's identity (one trial per number):
		// swapping it here would free the number for another trial
		var current string
		h.pool.QueryRow(ctx, `select phone from businesses where id=$1`, bizID).Scan(&current)
		if phone != current {
			httpx.Err(w, http.StatusBadRequest, "your mobile number is your verified login — contact support to change it")
			return
		}
	}
	if in.Pincode != nil && *in.Pincode != "" && !httpx.ValidPincode(*in.Pincode) {
		httpx.Err(w, http.StatusBadRequest, "invalid pincode")
		return
	}
	if in.Gstin != nil {
		g := strings.ToUpper(strings.TrimSpace(*in.Gstin))
		if g != "" && !gst.ValidGSTIN(g) {
			httpx.Err(w, http.StatusBadRequest, "that GSTIN does not look right — 15 characters, as on your GST certificate")
			return
		}
		in.Gstin = &g
	}
	if in.WhatsApp != nil && *in.WhatsApp != "" {
		whatsapp, ok := httpx.NormalizePhone(*in.WhatsApp)
		if !ok {
			httpx.Err(w, http.StatusBadRequest, "invalid WhatsApp number")
			return
		}
		in.WhatsApp = &whatsapp
	}
	if in.Instagram != nil {
		handle := httpx.NormalizeHandle(*in.Instagram)
		in.Instagram = &handle
	}
	for _, amount := range []*int{in.ShippingFee, in.FreeShippingAbove, in.CodTokenAmount} {
		if amount != nil && *amount < 0 {
			httpx.Err(w, http.StatusBadRequest, "amounts cannot be negative")
			return
		}
	}
	if p := in.BaselineRtoPercent; p != nil && (*p < 0 || *p > 100) {
		httpx.Err(w, http.StatusBadRequest, "baseline RTO must be between 0 and 100 percent")
		return
	}
	_, err := h.pool.Exec(ctx, `update businesses set
		name=coalesce($2, name), owner_name=coalesce($3, owner_name), whatsapp=coalesce($4, whatsapp),
		instagram=coalesce($5, instagram), address=coalesce($6, address), city=coalesce($7, city),
		state=coalesce($8, state), pincode=coalesce($9, pincode), gstin=coalesce($10, gstin),
		logo_url=coalesce($11, logo_url),
		shipping_fee=coalesce($12, shipping_fee),
		free_shipping_above=coalesce($13, free_shipping_above),
		cod_enabled=coalesce($14, cod_enabled),
		cod_token_amount=coalesce($15, cod_token_amount),
		baseline_rto_percent=coalesce($16, baseline_rto_percent),
		updated_at=now()
		where id=$1`,
		bizID, in.Name, in.OwnerName, in.WhatsApp, in.Instagram, in.Address, in.City, in.State,
		in.Pincode, in.Gstin, in.LogoURL, in.ShippingFee, in.FreeShippingAbove, in.CodEnabled,
		in.CodTokenAmount, in.BaselineRtoPercent)
	if err != nil {
		// the same WhatsApp / Instagram cannot sit on two businesses
		if field, dup := httpx.DuplicateField(err); dup {
			httpx.Err(w, http.StatusConflict, "this "+field+" already belongs to another business")
			return
		}
		httpx.Err(w, http.StatusInternalServerError, "update failed")
		return
	}
	h.Get(w, r)
}

// UpdateAI sets how the DM assistant behaves: answer buyers automatically,
// place orders without the seller's tap, and the notes it may quote. Omitted
// fields keep their value.
func (h *Handler) UpdateAI(w http.ResponseWriter, r *http.Request) {
	var in struct {
		AutoReply *bool   `json:"autoReply"`
		AutoOrder *bool   `json:"autoOrder"`
		Notes     *string `json:"notes"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if in.Notes != nil && len([]rune(*in.Notes)) > 2000 {
		httpx.Err(w, http.StatusBadRequest, "notes can be at most 2000 characters")
		return
	}
	if _, err := h.pool.Exec(r.Context(), `update businesses set
		ai_auto_reply=coalesce($2, ai_auto_reply), ai_auto_order=coalesce($3, ai_auto_order),
		ai_notes=coalesce($4, ai_notes), updated_at=now() where id=$1`,
		middleware.BusinessID(r.Context()), in.AutoReply, in.AutoOrder, in.Notes); err != nil {
		httpx.Err(w, http.StatusInternalServerError, "update failed")
		return
	}
	h.Get(w, r)
}

// sections are the settings documents a seller can save, one at a time.
var sections = map[string]string{
	"policies": "policies", "ai": "ai_profile", "checkout": "checkout_rules", "gst": "gst_profile", "alerts": "alert_prefs",
}

// UpdateSettings saves one validated settings document whole (the form sends
// the full section). The GST section is checked against the stored GSTIN.
func (h *Handler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	bizID := middleware.BusinessID(ctx)
	section := r.PathValue("section")
	column, ok := sections[section]
	if !ok {
		httpx.Err(w, http.StatusNotFound, "unknown settings section")
		return
	}
	var doc interface{ Validate() error }
	switch section {
	case "policies":
		doc = &shop.Policies{}
	case "ai":
		doc = &shop.AIProfile{}
	case "checkout":
		doc = &shop.Pricing{}
	case "alerts":
		doc = &alertsDoc{}
	case "gst":
		var gstin string
		h.pool.QueryRow(ctx, `select gstin from businesses where id=$1`, bizID).Scan(&gstin)
		doc = &gstDoc{gstin: gstin}
	}
	if !httpx.Bind(w, r, doc) {
		return
	}
	if err := doc.Validate(); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	raw, _ := json.Marshal(doc)
	// column comes from the fixed map above, never from the request
	if _, err := h.pool.Exec(ctx, `update businesses set `+column+`=$2::jsonb, updated_at=now() where id=$1`, bizID, string(raw)); err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not save settings")
		return
	}
	h.Get(w, r)
}

// alertsDoc has nothing to validate beyond its shape.
type alertsDoc struct{ shop.Alerts }

func (alertsDoc) Validate() error { return nil }

// gstDoc validates the GST profile against the GSTIN on file.
type gstDoc struct {
	shop.GST
	gstin string
}

func (g *gstDoc) Validate() error { return g.GST.Validate(g.gstin) }

func (g gstDoc) MarshalJSON() ([]byte, error) { return json.Marshal(g.GST) }

// UpdatePayments stores the seller's own Razorpay keys (buyer money goes to
// the seller's account, never the platform's) and UPI ID. Omitted fields keep
// their value — the form sends only what the seller touched — and a blank
// secret keeps the stored one. Secret is encrypted at rest.
func (h *Handler) UpdatePayments(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	bizID := middleware.BusinessID(ctx)
	var in struct {
		RazorpayKeyID     *string `json:"razorpayKeyId"`
		RazorpayKeySecret *string `json:"razorpayKeySecret"`
		UpiID             *string `json:"upiId"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	var keyID, secretEnc, upiID string
	if err := h.pool.QueryRow(ctx, `select razorpay_key_id, razorpay_key_secret, upi_id from businesses where id=$1`,
		bizID).Scan(&keyID, &secretEnc, &upiID); err != nil {
		httpx.Err(w, http.StatusNotFound, "business not found")
		return
	}
	if in.UpiID != nil {
		upiID = strings.TrimSpace(*in.UpiID)
		if upiID != "" && !httpx.ValidUPI(upiID) {
			httpx.Err(w, http.StatusBadRequest, "enter a UPI ID like yourname@okhdfcbank")
			return
		}
	}
	newKey := keyID
	if in.RazorpayKeyID != nil {
		newKey = strings.TrimSpace(*in.RazorpayKeyID)
	}
	newSecret := ""
	if in.RazorpayKeySecret != nil {
		newSecret = strings.TrimSpace(*in.RazorpayKeySecret)
	}
	switch {
	case newKey == "":
		secretEnc = "" // removing the key disconnects Razorpay completely
	case newKey != keyID || newSecret != "":
		// a changed pair is checked with Razorpay now, not on a buyer's checkout
		secret := newSecret
		if secret == "" {
			secret, _ = h.cipher.Decrypt(secretEnc)
		}
		if secret == "" {
			httpx.Err(w, http.StatusBadRequest, "add the Razorpay key secret too")
			return
		}
		if err := payment.NewClient(newKey, secret).Verify(ctx); err != nil {
			if errors.Is(err, payment.ErrBadKeys) {
				httpx.Err(w, http.StatusBadRequest, "Razorpay did not accept these keys — copy the Key ID and Key Secret again from Razorpay Dashboard → API Keys")
				return
			}
			httpx.Err(w, http.StatusBadGateway, "could not reach Razorpay to check the keys — try again")
			return
		}
		if newSecret != "" {
			enc, err := h.cipher.Encrypt(newSecret)
			if err != nil {
				httpx.Err(w, http.StatusInternalServerError, "could not store keys")
				return
			}
			secretEnc = enc
		}
	}
	if _, err := h.pool.Exec(ctx, `update businesses set razorpay_key_id=$2, razorpay_key_secret=$3, upi_id=$4,
		updated_at=now() where id=$1`, bizID, newKey, secretEnc, upiID); err != nil {
		httpx.Err(w, http.StatusInternalServerError, "update failed")
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}
