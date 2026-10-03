package publicapi

import (
	"context"
	"errors"
	"net/http"

	"carthedge/internal/aftersale"
	"carthedge/internal/customer"
	"carthedge/internal/httpx"
	"carthedge/internal/link"
	"carthedge/internal/order"
	"carthedge/internal/product"
	"carthedge/internal/shop"
)

// Quote prices the buyer's cart exactly as the order will be billed, for both
// payment methods — coupon, reseller price, free shipping, COD charge and
// prepaid discount included. Checkout shows this instead of doing sums.
func (h *Handler) Quote(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Items      []order.Ref `json:"items"`
		LinkToken  string      `json:"linkToken"`
		OfferCode  string      `json:"offerCode"`
		Phone      string      `json:"phone"`
		OrderToken string      `json:"orderToken"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	bizCode := r.PathValue("businessCode")
	biz, err := h.storeBusiness(r.Context(), bizCode)
	if err != nil {
		httpx.Err(w, http.StatusNotFound, "store not found")
		return
	}
	p := order.QuoteParams{BusinessID: biz.ID, Refs: in.Items, OfferCode: in.OfferCode}
	if in.LinkToken != "" {
		res, err := h.links.Resolve(r.Context(), bizCode, in.LinkToken)
		if err != nil {
			httpx.Err(w, http.StatusNotFound, "this link is no longer available")
			return
		}
		if res.Kind == "custom" {
			p.Refs, p.Custom = nil, []product.Line{{Name: res.Title, Qty: 1, Price: res.Amount}}
		} else if p.Refs, err = pickItems(res, in.Items); err != nil {
			httpx.ErrOrInternal(w, http.StatusBadRequest, err)
			return
		}
	} else if len(in.Items) == 0 {
		httpx.Err(w, http.StatusBadRequest, "cart is empty")
		return
	}
	// a verified buyer gets their own prices and coupon limits
	if phone, ok := httpx.NormalizePhone(in.Phone); ok && h.otp.Valid(r.Context(), bizCode, phone, in.OrderToken) {
		p.Phone = phone
	}
	q, err := h.orders.Quote(r.Context(), p)
	if err != nil {
		httpx.ErrOrInternal(w, http.StatusBadRequest, err)
		return
	}
	httpx.OK(w, q)
}

// Policies is the store's public policy page: returns, cancellation,
// shipping, payments, terms and how to reach the seller. Payment gateways ask
// sellers for exactly these pages when they activate an account.
func (h *Handler) Policies(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var id, code, name, logo, address, city, state, pincode, whatsapp, instagram, gstin, razorpayKeyID, upiID string
	var codEnabled bool
	err := h.pool.QueryRow(ctx, `select id, code, name, logo_url, address, city, state, pincode, whatsapp, instagram,
		gstin, cod_enabled, razorpay_key_id, upi_id from businesses where code=$1 and status='active'`, r.PathValue("businessCode")).Scan(
		&id, &code, &name, &logo, &address, &city, &state, &pincode, &whatsapp, &instagram, &gstin, &codEnabled, &razorpayKeyID, &upiID)
	if err != nil {
		httpx.Err(w, http.StatusNotFound, "store not found")
		return
	}
	settings, err := shop.Load(ctx, h.pool, id)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load policies")
		return
	}
	legalName := ""
	if settings.GST.RegistrationFor(gstin) != "unregistered" {
		legalName = settings.GST.LegalName
	} else {
		gstin = ""
	}
	httpx.OK(w, httpx.M{
		"business": httpx.M{"code": code, "name": name, "logoUrl": logo, "address": address, "city": city, "state": state,
			"pincode": pincode, "whatsapp": whatsapp, "instagram": instagram, "gstin": gstin, "legalName": legalName},
		"policies":          settings.Policies,
		"hours":             settings.AI.Hours.Summary(),
		"shippingFee":       settings.Checkout.ShippingFee,
		"freeShippingAbove": settings.Checkout.FreeShippingAbove,
		"codEnabled":        codEnabled,
		"codFee":            settings.Checkout.CodFee,
		"prepaidDiscount":   settings.Checkout.PrepaidDiscount,
		"onlinePayment":     link.OnlinePaymentMode(razorpayKeyID, upiID),
	})
}

// buyerOrder resolves an order the buyer acts on from the tracking page. The
// phone must be the order's and freshly verified by OTP: these actions cancel
// orders and move parcels, so knowing a code and a number is not enough.
func (h *Handler) buyerOrder(ctx context.Context, code, rawPhone, token string) (bizID, bizCode string, o *order.Order, status int, err error) {
	phone, ok := httpx.NormalizePhone(rawPhone)
	if !ok {
		return "", "", nil, http.StatusBadRequest, errors.New("invalid phone number")
	}
	if err := h.pool.QueryRow(ctx, `select o.business_id, b.code from orders o join businesses b on b.id = o.business_id
		join customers c on c.id = o.customer_id where o.order_code=$1 and c.phone=$2 and b.status='active'`,
		code, phone).Scan(&bizID, &bizCode); err != nil {
		return "", "", nil, http.StatusNotFound, errors.New("order not found for this phone number")
	}
	if !h.otp.Valid(ctx, bizCode, phone, token) {
		return "", "", nil, http.StatusUnauthorized, errors.New("verify your phone number to continue")
	}
	o, err = h.orders.GetByCode(ctx, bizID, code)
	if err != nil {
		return "", "", nil, http.StatusNotFound, err
	}
	return bizID, bizCode, o, 0, nil
}

type buyerAuth struct {
	Phone      string `json:"phone"`
	OrderToken string `json:"orderToken"`
}

func (h *Handler) BuyerCancel(w http.ResponseWriter, r *http.Request) {
	var in struct {
		buyerAuth
		Reason string `json:"reason"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	bizID, _, o, status, err := h.buyerOrder(r.Context(), r.PathValue("code"), in.Phone, in.OrderToken)
	if err != nil {
		httpx.Err(w, status, err.Error())
		return
	}
	if _, err := h.aftersale.BuyerCancel(r.Context(), bizID, o.ID, in.Reason); err != nil {
		httpx.ErrOrInternal(w, http.StatusBadRequest, err)
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

func (h *Handler) BuyerAddress(w http.ResponseWriter, r *http.Request) {
	var in struct {
		buyerAuth
		Address customer.Address `json:"address"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	bizID, _, o, status, err := h.buyerOrder(r.Context(), r.PathValue("code"), in.Phone, in.OrderToken)
	if err != nil {
		httpx.Err(w, status, err.Error())
		return
	}
	if _, err := h.orders.ChangeAddress(r.Context(), bizID, o.ID, in.Address, "buyer"); err != nil {
		httpx.ErrOrInternal(w, http.StatusBadRequest, err)
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

func (h *Handler) BuyerReturn(w http.ResponseWriter, r *http.Request) {
	var in struct {
		buyerAuth
		aftersale.Input
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	bizID, bizCode, o, status, err := h.buyerOrder(r.Context(), r.PathValue("code"), in.Phone, in.OrderToken)
	if err != nil {
		httpx.Err(w, status, err.Error())
		return
	}
	ret, err := h.aftersale.Request(r.Context(), bizID, o.ID, bizCode, "buyer", in.Input)
	if err != nil {
		httpx.ErrOrInternal(w, http.StatusBadRequest, err)
		return
	}
	httpx.Created(w, httpx.M{"code": ret.Code, "status": ret.Status})
}

func (h *Handler) BuyerWithdrawReturn(w http.ResponseWriter, r *http.Request) {
	var in buyerAuth
	if !httpx.Bind(w, r, &in) {
		return
	}
	bizID, _, o, status, err := h.buyerOrder(r.Context(), r.PathValue("code"), in.Phone, in.OrderToken)
	if err != nil {
		httpx.Err(w, status, err.Error())
		return
	}
	if err := h.aftersale.BuyerWithdraw(r.Context(), bizID, o.ID, r.PathValue("id")); err != nil {
		httpx.ErrOrInternal(w, http.StatusBadRequest, err)
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

// BuyerUpload takes a photo for a return request (damaged item, wrong piece).
// Phone and order token come as form fields next to the file.
func (h *Handler) BuyerUpload(w http.ResponseWriter, r *http.Request) {
	h.uploads.Accept(w, r, func(r *http.Request) (string, error) {
		_, bizCode, _, _, err := h.buyerOrder(r.Context(), r.PathValue("code"), r.FormValue("phone"), r.FormValue("orderToken"))
		if err != nil {
			return "", err
		}
		return bizCode + "/returns", nil
	})
}
