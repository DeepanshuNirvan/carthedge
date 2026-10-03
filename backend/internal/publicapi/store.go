package publicapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"carthedge/internal/courier"
	"carthedge/internal/customer"
	"carthedge/internal/httpx"
	"carthedge/internal/link"
	"carthedge/internal/order"
	"carthedge/internal/product"
	"carthedge/internal/shop"

	"github.com/jackc/pgx/v5"
)

// Storefront: the public per-business shop at /p/{businessCode}/store.
// Buyers browse the catalog and order directly, no link required.

type storeBusiness struct {
	ID            string `json:"-"`
	Code          string `json:"code"`
	Name          string `json:"name"`
	LogoURL       string `json:"logoUrl"`
	City          string `json:"city"`
	State         string `json:"state"`
	Instagram     string `json:"instagram"`
	Whatsapp      string `json:"whatsapp"`
	CodEnabled    bool   `json:"codEnabled"`
	ShippingFee   int    `json:"shippingFee"`
	OnlinePayment string `json:"onlinePayment"` // gateway | upi | none
	// checkout levers the store page advertises ("free delivery above ₹999",
	// "save ₹50 paying online"); the quote endpoint does the actual maths
	FreeShippingAbove int           `json:"freeShippingAbove"`
	CodFee            shop.Fee      `json:"codFee"`
	PrepaidDiscount   shop.Discount `json:"prepaidDiscount"`
}

// toPublic is product.ToPublic — the one buyer-facing projection, shared with
// link checkout so both surfaces hide the same seller-internal fields.
var toPublic = product.ToPublic

func (h *Handler) storeBusiness(ctx context.Context, code string) (*storeBusiness, error) {
	var b storeBusiness
	var razorpayKeyID, upiID string
	var pricing []byte
	err := h.pool.QueryRow(ctx, `select id, code, name, logo_url, city, state, instagram, whatsapp,
		cod_enabled, shipping_fee, razorpay_key_id, upi_id, free_shipping_above, checkout_rules
		from businesses where code=$1 and status='active'`, code).Scan(
		&b.ID, &b.Code, &b.Name, &b.LogoURL, &b.City, &b.State, &b.Instagram, &b.Whatsapp, &b.CodEnabled,
		&b.ShippingFee, &razorpayKeyID, &upiID, &b.FreeShippingAbove, &pricing)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("store not found")
	}
	if err != nil {
		return nil, err
	}
	b.OnlinePayment = link.OnlinePaymentMode(razorpayKeyID, upiID)
	// same reading as shop.Load: a malformed document means no charges
	var rules shop.Pricing
	json.Unmarshal(pricing, &rules)
	b.CodFee, b.PrepaidDiscount = rules.CodFee, rules.PrepaidDiscount
	return &b, nil
}

// Store returns the storefront home: business card, categories, trending
// products and live offers.
func (h *Handler) Store(w http.ResponseWriter, r *http.Request) {
	biz, err := h.storeBusiness(r.Context(), r.PathValue("businessCode"))
	if err != nil {
		httpx.Err(w, http.StatusNotFound, "store not found")
		return
	}

	// sold-out items stay visible — that is what drives waitlist signups
	trending, err := h.products.List(r.Context(), biz.ID, product.Filter{Trending: true})
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load store")
		return
	}

	categories := []string{}
	rows, err := h.pool.Query(r.Context(), `select distinct category from products
		where business_id=$1 and active and category <> '' order by category`, biz.ID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var c string
			if rows.Scan(&c) == nil {
				categories = append(categories, c)
			}
		}
	}

	offers := []httpx.M{}
	oRows, err := h.pool.Query(r.Context(), `select code, kind, value, min_amount from offers
		where business_id=$1 and active and (expires_at is null or expires_at > now())`, biz.ID)
	if err == nil {
		defer oRows.Close()
		for oRows.Next() {
			var code, kind string
			var value, minAmount int
			if oRows.Scan(&code, &kind, &value, &minAmount) == nil {
				offers = append(offers, httpx.M{"code": code, "kind": kind, "value": value, "minAmount": minAmount})
			}
		}
	}

	httpx.OK(w, httpx.M{
		"business":   biz,
		"categories": categories,
		"trending":   toPublic(trending),
		"offers":     offers,
		"paused":     !h.plans.IsActive(r.Context(), biz.ID),
	})
}

// StoreProducts lists the catalog: ?search= &category= &minPrice= &maxPrice=
// (rupees) &inStock=true &sort=priceAsc|priceDesc|name|newest.
func (h *Handler) StoreProducts(w http.ResponseWriter, r *http.Request) {
	biz, err := h.storeBusiness(r.Context(), r.PathValue("businessCode"))
	if err != nil {
		httpx.Err(w, http.StatusNotFound, "store not found")
		return
	}
	f := product.FilterFrom(r.URL.Query())
	f.Limit, f.Offset = httpx.Page(r)
	products, err := h.products.List(r.Context(), biz.ID, f)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load products")
		return
	}
	total, _ := h.products.Count(r.Context(), biz.ID, f)
	httpx.OK(w, httpx.M{"products": toPublic(products), "total": total, "limit": f.Limit, "offset": f.Offset})
}

// Serviceability tells the buyer at address entry whether couriers reach their
// pincode — catching undeliverable addresses before the order exists.
func (h *Handler) Serviceability(w http.ResponseWriter, r *http.Request) {
	pincode := r.URL.Query().Get("pincode")
	if !httpx.ValidPincode(pincode) {
		httpx.Err(w, http.StatusBadRequest, "invalid pincode")
		return
	}
	var pickup string
	if err := h.pool.QueryRow(r.Context(), `select pincode from businesses where code=$1 and status='active'`,
		r.PathValue("businessCode")).Scan(&pickup); err != nil {
		httpx.Err(w, http.StatusNotFound, "store not found")
		return
	}
	res, err := h.courier.Serviceability(r.Context(), pickup, pincode, r.URL.Query().Get("cod") == "true")
	if err != nil {
		// aggregator trouble must never block a sale
		httpx.OK(w, courier.Serviceability{Serviceable: true, CodAvailable: true})
		return
	}
	httpx.OK(w, res)
}

func (h *Handler) StoreProduct(w http.ResponseWriter, r *http.Request) {
	biz, err := h.storeBusiness(r.Context(), r.PathValue("businessCode"))
	if err != nil {
		httpx.Err(w, http.StatusNotFound, "store not found")
		return
	}
	p, err := h.products.Get(r.Context(), biz.ID, r.PathValue("id"))
	if err != nil {
		httpx.Err(w, http.StatusNotFound, "product not found")
		return
	}
	httpx.OK(w, httpx.M{"product": toPublic([]product.Product{*p})[0]})
}

// StoreOrder places a direct storefront order after OTP verification —
// same trust gates as the link flow, catalog-wide item choice.
func (h *Handler) StoreOrder(w http.ResponseWriter, r *http.Request) {
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
	if len(in.Items) == 0 {
		httpx.Err(w, http.StatusBadRequest, "cart is empty")
		return
	}
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
	bizCode := r.PathValue("businessCode")
	if !h.otp.Consume(r.Context(), bizCode, phone, in.OrderToken) {
		httpx.Err(w, http.StatusUnauthorized, "phone verification required")
		return
	}
	fail := func(status int, msg string) {
		h.otp.Restore(r.Context(), bizCode, phone, in.OrderToken)
		httpx.Err(w, status, msg)
	}
	biz, err := h.storeBusiness(r.Context(), bizCode)
	if err != nil {
		fail(http.StatusNotFound, "store not found")
		return
	}
	if !h.plans.IsActive(r.Context(), biz.ID) {
		fail(http.StatusForbidden, "this store is temporarily paused")
		return
	}
	o, err := h.orders.Create(r.Context(), order.CreateParams{
		BusinessID: biz.ID, Source: "store",
		Name: in.Name, Phone: phone, Email: in.Email, Address: in.Address,
		Refs: in.Items, PaymentMethod: in.PaymentMethod, OfferCode: in.OfferCode, Notes: in.Notes,
		BuyerGstin: in.BuyerGstin, BuyerCompany: in.BuyerCompany,
	})
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
