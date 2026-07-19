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
	CodEnabled         bool   `json:"codEnabled"`
	CodTokenAmount     int    `json:"codTokenAmount"`
	BaselineRtoPercent int    `json:"baselineRtoPercent"`
	RazorpayKeyID      string `json:"razorpayKeyId"`
	RazorpayConfigured bool   `json:"razorpayConfigured"`
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	bizID := middleware.BusinessID(r.Context())
	var p Profile
	var secretEnc string
	err := h.pool.QueryRow(r.Context(), `select id, code, name, owner_name, email, phone, whatsapp, instagram,
		address, city, state, pincode, gstin, upi_id, logo_url, shipping_fee, cod_enabled, cod_token_amount,
		baseline_rto_percent, razorpay_key_id, razorpay_key_secret
		from businesses where id = $1`, bizID).Scan(
		&p.ID, &p.Code, &p.Name, &p.OwnerName, &p.Email, &p.Phone, &p.WhatsApp, &p.Instagram,
		&p.Address, &p.City, &p.State, &p.Pincode, &p.Gstin, &p.UpiID, &p.LogoURL, &p.ShippingFee,
		&p.CodEnabled, &p.CodTokenAmount, &p.BaselineRtoPercent, &p.RazorpayKeyID, &secretEnc)
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
	_, err := h.pool.Exec(r.Context(), `update businesses set
		name=$2, owner_name=$3, phone=$4, whatsapp=$5, instagram=$6, address=$7, city=$8, state=$9,
		pincode=$10, gstin=$11, logo_url=$12,
		shipping_fee=coalesce($13, shipping_fee),
		cod_enabled=coalesce($14, cod_enabled),
		cod_token_amount=coalesce($15, cod_token_amount),
		baseline_rto_percent=coalesce($16, baseline_rto_percent),
		updated_at=now()
		where id=$1`,
		bizID, in.Name, in.OwnerName, phone, in.WhatsApp, in.Instagram, in.Address, in.City, in.State,
		in.Pincode, in.Gstin, in.LogoURL, in.ShippingFee, in.CodEnabled, in.CodTokenAmount, in.BaselineRtoPercent)
	if err != nil {
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
	enc, err := h.cipher.Encrypt(in.RazorpayKeySecret)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not store keys")
		return
	}
	q := `update businesses set razorpay_key_id=$2, upi_id=$3, updated_at=now()`
	args := []any{bizID, in.RazorpayKeyID, in.UpiID}
	if in.RazorpayKeySecret != "" {
		q += `, razorpay_key_secret=$4`
		args = append(args, enc)
	}
	if _, err := h.pool.Exec(r.Context(), q+` where id=$1`, args...); err != nil {
		httpx.Err(w, http.StatusInternalServerError, "update failed")
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}
