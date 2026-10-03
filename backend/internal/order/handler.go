package order

import (
	"errors"
	"net/http"
	"sync"

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
		BuyerGstin    string           `json:"buyerGstin"`
		BuyerCompany  string           `json:"buyerCompany"`
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
		BuyerGstin: in.BuyerGstin, BuyerCompany: in.BuyerCompany,
	})
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.Created(w, o)
}

// ChangeAddress is the seller correcting where an order goes, before it ships.
func (h *Handler) ChangeAddress(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Address customer.Address `json:"address"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	o, err := h.svc.ChangeAddress(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"), in.Address, "seller")
	if err != nil {
		respondErr(w, err)
		return
	}
	httpx.OK(w, o)
}

// maxBulk caps one bulk action; a festive drop is tens of orders, not thousands.
const maxBulk = 100

// BulkStatus moves many orders at once. Each order goes through the same
// guarded transition as a single move, so one that changed meanwhile, or
// cannot make the move, is reported without stopping the rest.
func (h *Handler) BulkStatus(w http.ResponseWriter, r *http.Request) {
	var in struct {
		IDs    []string `json:"ids"`
		Status string   `json:"status"`
		Note   string   `json:"note"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if len(in.IDs) == 0 || len(in.IDs) > maxBulk {
		httpx.Err(w, http.StatusBadRequest, "pick 1 to 100 orders")
		return
	}
	bizID := middleware.BusinessID(r.Context())
	type result struct {
		ID    string `json:"id"`
		OK    bool   `json:"ok"`
		Error string `json:"error,omitempty"`
	}
	var ids []string
	seen := map[string]bool{}
	for _, id := range in.IDs {
		if !seen[id] {
			seen[id] = true
			ids = append(ids, id)
		}
	}
	// each move is independent and guarded on the status it read, so a few
	// run at once. ponytail: 4 workers keep a 100-order move quick without
	// taking more than a few pool connections from everyone else.
	results := make([]result, len(ids))
	sem := make(chan struct{}, 4)
	var wg sync.WaitGroup
	for i, id := range ids {
		if !httpx.ValidID(id) {
			results[i] = result{ID: id, Error: "not found"}
			continue
		}
		wg.Add(1)
		sem <- struct{}{}
		go func(i int, id string) {
			defer func() { <-sem; wg.Done() }()
			if _, err := h.svc.SetStatus(r.Context(), bizID, id, in.Status, in.Note); err != nil {
				msg := err.Error()
				if httpx.Internal(err) {
					msg = "could not update this order — try again"
				}
				results[i] = result{ID: id, Error: msg}
				return
			}
			results[i] = result{ID: id, OK: true}
		}(i, id)
	}
	wg.Wait()
	done := 0
	for _, r := range results {
		if r.OK {
			done++
		}
	}
	httpx.OK(w, httpx.M{"updated": done, "results": results})
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
	httpx.ErrOrInternal(w, http.StatusBadRequest, err)
}

// Abandoned lists buyers who verified at checkout but did not order.
func (h *Handler) Abandoned(w http.ResponseWriter, r *http.Request) {
	list, err := h.svc.AbandonedCheckouts(r.Context(), middleware.BusinessID(r.Context()))
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load checkouts")
		return
	}
	httpx.OK(w, httpx.M{"checkouts": list})
}
