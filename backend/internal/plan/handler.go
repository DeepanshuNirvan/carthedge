package plan

import (
	"net/http"

	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	plans, err := h.svc.List(r.Context())
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load plans")
		return
	}
	httpx.OK(w, httpx.M{"plans": plans})
}

func (h *Handler) Current(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	bizID := middleware.BusinessID(ctx)
	sub, err := h.svc.Current(ctx, bizID)
	if err != nil {
		httpx.Err(w, http.StatusNotFound, "no subscription found")
		return
	}
	// surface what renewal will actually cost, quota overage included
	fee, orders, _ := h.svc.Overage(ctx, bizID)
	httpx.OK(w, httpx.M{"subscription": sub, "overageFee": fee, "overageOrders": orders})
}

func (h *Handler) Checkout(w http.ResponseWriter, r *http.Request) {
	var in struct {
		PlanCode string `json:"planCode"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	out, err := h.svc.Checkout(r.Context(), middleware.BusinessID(r.Context()), in.PlanCode)
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, out)
}

func (h *Handler) Verify(w http.ResponseWriter, r *http.Request) {
	var in struct {
		RazorpayOrderID   string `json:"razorpayOrderId"`
		RazorpayPaymentID string `json:"razorpayPaymentId"`
		Signature         string `json:"signature"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.VerifyCheckout(r.Context(), middleware.BusinessID(r.Context()), in.RazorpayOrderID, in.RazorpayPaymentID, in.Signature); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

func (h *Handler) Cancel(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.Cancel(r.Context(), middleware.BusinessID(r.Context())); err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not cancel")
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

func (h *Handler) CustomRequest(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Message        string `json:"message"`
		ExpectedOrders int    `json:"expectedOrders"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.CustomRequest(r.Context(), middleware.BusinessID(r.Context()), in.Message, in.ExpectedOrders); err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not submit request")
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}
