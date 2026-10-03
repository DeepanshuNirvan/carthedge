package publicapi

import (
	"encoding/json"
	"errors"
	"net/http"

	"carthedge/internal/aftersale"
	"carthedge/internal/courier"
	"carthedge/internal/customer"
	"carthedge/internal/httpx"
	"carthedge/internal/link"
	"carthedge/internal/order"
	"carthedge/internal/otp"
	"carthedge/internal/payment"
	"carthedge/internal/plan"
	"carthedge/internal/product"
	"carthedge/internal/storage"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Handler is the buyer-facing surface: no login, phone OTP as identity.
type Handler struct {
	pool      *pgxpool.Pool
	links     *link.Service
	orders    *order.Service
	otp       *otp.Service
	payments  *payment.Service
	plans     *plan.Service
	products  *product.Service
	customers *customer.Service
	courier   *courier.Shiprocket
	aftersale *aftersale.Service
	uploads   *storage.Handler
}

func NewHandler(pool *pgxpool.Pool, links *link.Service, orders *order.Service, otpSvc *otp.Service,
	payments *payment.Service, plans *plan.Service, products *product.Service, customers *customer.Service,
	sr *courier.Shiprocket, after *aftersale.Service, uploads *storage.Handler) *Handler {
	return &Handler{pool: pool, links: links, orders: orders, otp: otpSvc, payments: payments,
		plans: plans, products: products, customers: customers, courier: sr, aftersale: after, uploads: uploads}
}

// ResolveLink renders the checkout payload; a lapsed seller subscription
// pauses the store instead of erroring.
func (h *Handler) ResolveLink(w http.ResponseWriter, r *http.Request) {
	res, err := h.links.Resolve(r.Context(), r.PathValue("businessCode"), r.PathValue("token"))
	if err != nil {
		httpx.Err(w, http.StatusNotFound, "this link is no longer available")
		return
	}
	res.Paused = !h.plans.IsActive(r.Context(), res.Business.ID)
	h.links.CountClick(res.LinkID)
	httpx.OK(w, res)
}

func (h *Handler) SendOtp(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Phone string `json:"phone"`
		Email string `json:"email"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	phone, ok := httpx.NormalizePhone(in.Phone)
	if !ok {
		httpx.Err(w, http.StatusBadRequest, "invalid phone number")
		return
	}
	// the send limit is per store, so an unchecked code would make this a free
	// OTP relay to any phone
	var exists bool
	if h.pool.QueryRow(r.Context(), `select exists(select 1 from businesses where code=$1 and status='active')`,
		r.PathValue("businessCode")).Scan(&exists); !exists {
		httpx.Err(w, http.StatusNotFound, "store not found")
		return
	}
	if err := h.otp.Send(r.Context(), r.PathValue("businessCode"), phone, in.Email); err != nil {
		httpx.Err(w, http.StatusTooManyRequests, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

// VerifyOtp returns the order token plus repeat-buyer prefill data.
func (h *Handler) VerifyOtp(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Phone string `json:"phone"`
		Code  string `json:"code"`
		// what is in the cart, so a buyer who stops here can get one reminder
		Items     []order.Ref `json:"items"`
		LinkToken string      `json:"linkToken"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	phone, ok := httpx.NormalizePhone(in.Phone)
	if !ok {
		httpx.Err(w, http.StatusBadRequest, "invalid phone number")
		return
	}
	bizCode := r.PathValue("businessCode")
	token, err := h.otp.Verify(r.Context(), bizCode, phone, in.Code)
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	out := httpx.M{"orderToken": token}
	var bizID string
	if h.pool.QueryRow(r.Context(), `select id from businesses where code=$1`, bizCode).Scan(&bizID) == nil {
		if c, err := h.customers.Lookup(r.Context(), bizID, phone); err == nil {
			out["prefill"] = httpx.M{"name": c.Name, "email": c.Email, "address": c.LastAddress}
		}
		if len(in.Items) > 0 || in.LinkToken != "" {
			if len(in.Items) > 50 || len(in.LinkToken) > 64 {
				in.Items, in.LinkToken = in.Items[:min(len(in.Items), 50)], ""
			}
			items, _ := json.Marshal(in.Items)
			// a reminder already sent this week stays sent: reminded_at is kept
			h.pool.Exec(r.Context(), `insert into checkout_sessions (business_id, phone, items, link_token)
				values ($1,$2,$3::jsonb,$4) on conflict (business_id, phone) do update set
				items=excluded.items, link_token=excluded.link_token, verified_at=now()`,
				bizID, phone, string(items), in.LinkToken)
		}
	}
	httpx.OK(w, out)
}

// CreateOrder places the order behind a link after OTP verification.
func (h *Handler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	var in struct {
		OrderToken    string           `json:"orderToken"`
		Name          string           `json:"name"`
		Phone         string           `json:"phone"`
		Email         string           `json:"email"`
		Address       customer.Address `json:"address"`
		Items         []order.Ref      `json:"items"`
		PaymentMethod string           `json:"paymentMethod"`
		OfferCode     string           `json:"offerCode"`
		Notes         string           `json:"notes"`
		BuyerGstin    string           `json:"buyerGstin"`
		BuyerCompany  string           `json:"buyerCompany"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	bizCode := r.PathValue("businessCode")
	phone, ok := httpx.NormalizePhone(in.Phone)
	if !ok {
		httpx.Err(w, http.StatusBadRequest, "invalid phone number")
		return
	}
	if !httpx.ValidPincode(in.Address.Pincode) {
		httpx.Err(w, http.StatusBadRequest, "invalid pincode — please recheck, wrong pincodes cause failed deliveries")
		return
	}
	if in.Email != "" && !httpx.ValidEmail(in.Email) {
		httpx.Err(w, http.StatusBadRequest, "invalid email")
		return
	}
	if !h.otp.Consume(r.Context(), bizCode, phone, in.OrderToken) {
		httpx.Err(w, http.StatusUnauthorized, "phone verification required")
		return
	}
	fail := func(status int, msg string) {
		h.otp.Restore(r.Context(), bizCode, phone, in.OrderToken)
		httpx.Err(w, status, msg)
	}

	res, err := h.links.Resolve(r.Context(), bizCode, r.PathValue("token"))
	if err != nil {
		fail(http.StatusNotFound, "this link is no longer available")
		return
	}
	if !h.plans.IsActive(r.Context(), res.Business.ID) {
		fail(http.StatusForbidden, "this store is temporarily paused")
		return
	}

	params := order.CreateParams{
		BusinessID: res.Business.ID, LinkID: res.LinkID, Source: "link",
		Name: in.Name, Phone: phone, Email: in.Email, Address: in.Address,
		PaymentMethod: in.PaymentMethod, OfferCode: in.OfferCode, Notes: in.Notes,
		BuyerGstin: in.BuyerGstin, BuyerCompany: in.BuyerCompany,
	}
	if res.Kind == "custom" {
		params.CustomLines = []product.Line{{Name: res.Title, Qty: 1, Price: res.Amount}}
	} else {
		refs, err := pickItems(res, in.Items)
		if err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		params.Refs = refs
	}
	o, err := h.orders.Create(r.Context(), params)
	if err != nil {
		fail(http.StatusBadRequest, err.Error())
		return
	}
	next := "pay"
	if o.PaymentMethod == "cod" {
		next = "codPending"
	}
	httpx.Created(w, httpx.M{"orderCode": o.Code, "total": o.Total, "tokenAmount": o.TokenAmount,
		"paymentMethod": o.PaymentMethod, "next": next})
}

// pickItems keeps buyers inside the link's catalog scope while letting them
// choose variants and quantities.
func pickItems(res *link.Resolved, chosen []order.Ref) ([]order.Ref, error) {
	allowed := map[string]bool{}
	for _, ref := range res.Refs {
		allowed[ref.ProductID] = true
	}
	if len(chosen) == 0 {
		refs := make([]order.Ref, len(res.Refs))
		for i, ref := range res.Refs {
			refs[i] = order.Ref{ProductID: ref.ProductID, VariantID: ref.VariantID, Qty: max(ref.Qty, 1)}
		}
		return refs, nil
	}
	for _, ref := range chosen {
		if !allowed[ref.ProductID] {
			return nil, errors.New("item is not part of this link")
		}
	}
	return chosen, nil
}

// Track shows order status to the buyer; phone number gates the data.
func (h *Handler) Track(w http.ResponseWriter, r *http.Request) {
	phone, ok := httpx.NormalizePhone(r.URL.Query().Get("phone"))
	if !ok {
		httpx.Err(w, http.StatusBadRequest, "phone query parameter is required")
		return
	}
	o, store, err := h.orders.TrackByCode(r.Context(), r.PathValue("code"), phone)
	if err != nil {
		httpx.Err(w, http.StatusNotFound, "order not found for this phone number")
		return
	}
	out := httpx.M{
		"orderCode": o.Code, "businessName": store.Name, "businessCode": store.Code, "status": o.Status,
		"paymentMethod": o.PaymentMethod, "paymentStatus": o.PaymentStatus, "paymentRef": o.PaymentRef,
		"items": o.Items, "subtotal": o.Subtotal, "discount": o.Discount, "prepaidDiscount": o.PrepaidDiscount,
		"shipping": o.Shipping, "codFee": o.CodFee, "tokenAmount": o.TokenAmount,
		"total": o.Total, "courierName": o.CourierName, "courierTrackingId": o.CourierTracking,
		"address": o.Address, "replacementOf": o.ReplacementOf,
		"events": o.Events, "createdAt": o.CreatedAt,
	}
	if v, err := h.aftersale.BuyerView(r.Context(), store.ID, o); err == nil {
		out["afterSale"] = v
	}
	httpx.OK(w, out)
}

// Pay starts a Razorpay checkout for the full amount or the COD token.
func (h *Handler) Pay(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Kind string `json:"kind"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if in.Kind == "" {
		in.Kind = "order"
	}
	info, err := h.payments.BuyerCheckout(r.Context(), r.PathValue("code"), in.Kind)
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, info)
}

// ClaimUpi records the UTR a buyer got after paying the seller's UPI ID by
// hand. The seller verifies it against their bank alert — CartHedge never sees
// the money, so it can never confirm the transfer itself.
func (h *Handler) ClaimUpi(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Reference string `json:"reference"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.payments.ClaimUpiPayment(r.Context(), r.PathValue("code"), in.Reference); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

func (h *Handler) VerifyPayment(w http.ResponseWriter, r *http.Request) {
	var in struct {
		RazorpayOrderID   string `json:"razorpayOrderId"`
		RazorpayPaymentID string `json:"razorpayPaymentId"`
		Signature         string `json:"signature"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.payments.VerifyBuyer(r.Context(), in.RazorpayOrderID, in.RazorpayPaymentID, in.Signature); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

// ConfirmCod completes the WhatsApp COD confirmation flow.
func (h *Handler) ConfirmCod(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Token string `json:"token"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.orders.ConfirmCod(r.Context(), r.PathValue("code"), in.Token); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

// Waitlist signs a buyer up for back-in-stock alerts.
func (h *Handler) Waitlist(w http.ResponseWriter, r *http.Request) {
	var in struct {
		ProductID string `json:"productId"`
		Phone     string `json:"phone"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	phone, ok := httpx.NormalizePhone(in.Phone)
	if !ok {
		httpx.Err(w, http.StatusBadRequest, "invalid phone number")
		return
	}
	var bizID string
	if err := h.pool.QueryRow(r.Context(), `select id from businesses where code=$1 and status='active'`,
		r.PathValue("businessCode")).Scan(&bizID); err != nil {
		httpx.Err(w, http.StatusNotFound, "store not found")
		return
	}
	if !h.plans.HasFeature(r.Context(), bizID, "waitlist") {
		httpx.Err(w, http.StatusForbidden, "back-in-stock alerts are not available for this store")
		return
	}
	if err := h.products.AddWaitlist(r.Context(), bizID, in.ProductID, phone); err != nil {
		httpx.Err(w, http.StatusNotFound, "product not found")
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}
