package enquiry

import (
	"errors"
	"net/http"
	"slices"

	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// List returns one status page (?status=, all when empty) and the count in
// every status, so the tabs need no second request.
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	bizID := middleware.BusinessID(r.Context())
	status := r.URL.Query().Get("status")
	if status != "" && !slices.Contains(Statuses, status) {
		httpx.Err(w, http.StatusBadRequest, "unknown status")
		return
	}
	limit, offset := httpx.Page(r)
	list, err := h.svc.List(r.Context(), bizID, status, limit, offset)
	if err != nil {
		httpx.ErrOrInternal(w, http.StatusInternalServerError, err)
		return
	}
	counts, err := h.svc.Counts(r.Context(), bizID)
	if err != nil {
		httpx.ErrOrInternal(w, http.StatusInternalServerError, err)
		return
	}
	httpx.OK(w, httpx.M{"enquiries": list, "counts": counts})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var in Input
	if !httpx.Bind(w, r, &in) {
		return
	}
	e, err := h.svc.Create(r.Context(), middleware.BusinessID(r.Context()), in)
	if err != nil {
		httpx.ErrOrInternal(w, http.StatusBadRequest, err)
		return
	}
	httpx.Created(w, e)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	var in Patch
	if !httpx.Bind(w, r, &in) {
		return
	}
	e, err := h.svc.Update(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"), in)
	if err != nil {
		respondErr(w, err)
		return
	}
	httpx.OK(w, e)
}

// Quote saves the price and sends it on the buyer's chat. sent tells the app
// whether the buyer got it or the owner has to message them.
func (h *Handler) Quote(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Amount int    `json:"amount"`
		Note   string `json:"note"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	e, sent, err := h.svc.Quote(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"), in.Amount, in.Note)
	if err != nil {
		respondErr(w, err)
		return
	}
	httpx.OK(w, httpx.M{"enquiry": e, "sent": sent})
}

// Delete erases an enquiry, for a buyer who asks for their details to go.
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.Delete(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id")); err != nil {
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
