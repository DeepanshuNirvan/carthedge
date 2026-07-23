package order

import (
	"errors"
	"net/http"

	"carthedge/internal/customer"
	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
	"carthedge/internal/product"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, offset := httpx.Page(r)
	orders, err := h.svc.List(r.Context(), middleware.BusinessID(r.Context()), ListFilter{
		Status: q.Get("status"), Search: q.Get("search"), Payment: q.Get("payment"),
		Source: q.Get("source"), RiskOnly: q.Get("risk") == "true",
		From: q.Get("from"), To: q.Get("to"), Limit: limit, Offset: offset,
	})
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load orders")
		return
	}
	if orders == nil {
		orders = []Order{}
	}
	httpx.OK(w, httpx.M{"orders": orders})
}

func (h *Handler) Board(w http.ResponseWriter, r *http.Request) {
	board, err := h.svc.Board(r.Context(), middleware.BusinessID(r.Context()))
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load board")
		return
	}
	httpx.OK(w, board)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	o, err := h.svc.GetByID(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"))
	if err != nil {
		respondErr(w, err)
		return
	}
	httpx.OK(w, o)
}

// Create is the seller's manual order entry (walk-in DM orders without a link).
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name          string           `json:"name"`
		Phone         string           `json:"phone"`
		Email         string           `json:"email"`
		Address       customer.Address `json:"address"`
		Items         []Ref            `json:"items"`
		CustomItems   []product.Line   `json:"customItems"`
		PaymentMethod string           `json:"paymentMethod"`
		OfferCode     string           `json:"offerCode"`
		Notes         string           `json:"notes"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	phone, ok := httpx.NormalizePhone(in.Phone)
	if !ok {
		httpx.Err(w, http.StatusBadRequest, "invalid phone number")
		return
	}
	if !httpx.ValidPincode(in.Address.Pincode) {
		httpx.Err(w, http.StatusBadRequest, "invalid pincode")
		return
	}
	o, err := h.svc.Create(r.Context(), CreateParams{
		BusinessID: middleware.BusinessID(r.Context()), Source: "manual",
		Name: in.Name, Phone: phone, Email: in.Email, Address: in.Address,
		Refs: in.Items, CustomLines: in.CustomItems,
		PaymentMethod: in.PaymentMethod, OfferCode: in.OfferCode, Notes: in.Notes,
	})
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.Created(w, o)
}

func (h *Handler) SetStatus(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Status string `json:"status"`
		Note   string `json:"note"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	o, err := h.svc.SetStatus(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"), in.Status, in.Note)
	if err != nil {
		respondErr(w, err)
		return
	}
	httpx.OK(w, o)
}

// Ship hands the order to a courier: pass courierName+trackingId for manual
// assignment, or an empty body to push through Shiprocket. Manual assignment is
// on every plan; the aggregator handoff is a paid feature.
func (h *Handler) Ship(w http.ResponseWriter, r *http.Request) {
	var in struct {
		CourierName string `json:"courierName"`
		TrackingID  string `json:"trackingId"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if in.CourierName == "" && !middleware.HasFeature(r.Context(), "courier") {
		httpx.JSON(w, http.StatusForbidden, httpx.M{
			"error": "courier handoff is not in your plan — add the courier name and tracking id manually",
			"code":  "featureNotInPlan", "feature": "courier",
		})
		return
	}
	o, err := h.svc.Ship(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"), in.CourierName, in.TrackingID)
	if err != nil {
		respondErr(w, err)
		return
	}
	httpx.OK(w, o)
}

// ResendCodConfirmation re-sends the COD confirmation link to the buyer.
func (h *Handler) ResendCodConfirmation(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.ResendCodConfirmation(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id")); err != nil {
		respondErr(w, err)
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

func respondErr(w http.ResponseWriter, err error) {
	if errors.Is(err, ErrNotFound) {
		httpx.Err(w, http.StatusNotFound, err.Error())
		return
	}
	httpx.Err(w, http.StatusBadRequest, err.Error())
}
