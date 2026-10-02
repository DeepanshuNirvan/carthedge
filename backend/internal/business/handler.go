package business

import (
	"net/http"

	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
	"carthedge/internal/secure"

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
	httpx.OK(w, p)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	bizID := middleware.BusinessID(r.Context())
	var in struct {
		Name               string `json:"name"`
		OwnerName          string `json:"ownerName"`
		Phone              string `json:"phone"`
		WhatsApp           string `json:"whatsapp"`
		Instagram          string `json:"instagram"`
		Address            string `json:"address"`
		City               string `json:"city"`
		State              string `json:"state"`
		Pincode            string `json:"pincode"`
		Gstin              string `json:"gstin"`
		LogoURL            string `json:"logoUrl"`
		ShippingFee        *int   `json:"shippingFee"`
		FreeShippingAbove  *int   `json:"freeShippingAbove"`
		CodEnabled         *bool  `json:"codEnabled"`
		CodTokenAmount     *int   `json:"codTokenAmount"`
		BaselineRtoPercent *int   `json:"baselineRtoPercent"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if in.Name == "" || in.OwnerName == "" {
		httpx.Err(w, http.StatusBadRequest, "name and ownerName are required")
		return
	}
	phone, ok := httpx.NormalizePhone(in.Phone)
	if !ok {
		httpx.Err(w, http.StatusBadRequest, "invalid phone number")
		return
	}
	if in.Pincode != "" && !httpx.ValidPincode(in.Pincode) {
		httpx.Err(w, http.StatusBadRequest, "invalid pincode")
		return
	}
	if in.WhatsApp != "" {
		whatsapp, ok := httpx.NormalizePhone(in.WhatsApp)
		if !ok {
			httpx.Err(w, http.StatusBadRequest, "invalid WhatsApp number")
			return
		}
		in.WhatsApp = whatsapp
	}
	in.Instagram = httpx.NormalizeHandle(in.Instagram)
	_, err := h.pool.Exec(r.Context(), `update businesses set
		name=$2, owner_name=$3, phone=$4, whatsapp=$5, instagram=$6, address=$7, city=$8, state=$9,
		pincode=$10, gstin=$11, logo_url=$12,
		shipping_fee=coalesce($13, shipping_fee),
		free_shipping_above=coalesce($14, free_shipping_above),
		cod_enabled=coalesce($15, cod_enabled),
		cod_token_amount=coalesce($16, cod_token_amount),
		baseline_rto_percent=coalesce($17, baseline_rto_percent),
		updated_at=now()
		where id=$1`,
		bizID, in.Name, in.OwnerName, phone, in.WhatsApp, in.Instagram, in.Address, in.City, in.State,
		in.Pincode, in.Gstin, in.LogoURL, in.ShippingFee, in.FreeShippingAbove, in.CodEnabled,
		in.CodTokenAmount, in.BaselineRtoPercent)
	if err != nil {
		// the same mobile / WhatsApp / Instagram cannot sit on two businesses
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

// UpdatePayments stores the seller's own Razorpay keys (buyer money goes to
// the seller's account, never the platform's). Secret is encrypted at rest.
func (h *Handler) UpdatePayments(w http.ResponseWriter, r *http.Request) {
	bizID := middleware.BusinessID(r.Context())
	var in struct {
		RazorpayKeyID     string `json:"razorpayKeyId"`
		RazorpayKeySecret string `json:"razorpayKeySecret"`
		UpiID             string `json:"upiId"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	q := `update businesses set razorpay_key_id=$2, upi_id=$3, updated_at=now()`
	args := []any{bizID, in.RazorpayKeyID, in.UpiID}
	// a blank secret means "keep the stored one" — the seller can edit the rest of
	// the form without retyping a key the API never gives back
	if in.RazorpayKeySecret != "" {
		enc, err := h.cipher.Encrypt(in.RazorpayKeySecret)
		if err != nil {
			httpx.Err(w, http.StatusInternalServerError, "could not store keys")
			return
		}
		q += `, razorpay_key_secret=$4`
		args = append(args, enc)
	}
	if _, err := h.pool.Exec(r.Context(), q+` where id=$1`, args...); err != nil {
		httpx.Err(w, http.StatusInternalServerError, "update failed")
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}
