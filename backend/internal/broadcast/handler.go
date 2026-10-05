package broadcast

import (
	"errors"
	"net/http"

	"carthedge/internal/customer"
	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
	"carthedge/internal/notify"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name        string `json:"name"`
		Message     string `json:"message"`
		Segment     string `json:"segment"`
		ScheduledAt string `json:"scheduledAt"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	b, err := h.svc.Create(r.Context(), middleware.BusinessID(r.Context()), in.Name, in.Message, in.Segment, in.ScheduledAt)
	if err != nil {
		httpx.Err(w, status(err), err.Error())
		return
	}
	httpx.Created(w, b)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	limit, offset := httpx.Page(r)
	broadcasts, err := h.svc.List(r.Context(), middleware.BusinessID(r.Context()), limit, offset)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load broadcasts")
		return
	}
	if broadcasts == nil {
		broadcasts = []Broadcast{}
	}
	httpx.OK(w, httpx.M{"broadcasts": broadcasts})
}

func (h *Handler) Send(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.Send(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id")); err != nil {
		httpx.Err(w, status(err), err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true, "status": "sending"})
}

// status: offers that cannot go out yet are a state of the platform, not a
// bad request.
func status(err error) int {
	if errors.Is(err, notify.ErrOffersOff) {
		return http.StatusConflict
	}
	return http.StatusBadRequest
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.Delete(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id")); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

// Audience is who a broadcast reaches (buyers who said yes, per segment) and
// whether the seller has accepted the broadcast rules.
func (h *Handler) Audience(w http.ResponseWriter, r *http.Request) {
	a, err := h.svc.Audience(r.Context(), middleware.BusinessID(r.Context()))
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load the audience")
		return
	}
	httpx.OK(w, a)
}

// AcceptTerms records the seller accepting the broadcast rules, with where from.
func (h *Handler) AcceptTerms(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.AcceptTerms(r.Context(), middleware.BusinessID(r.Context()), customer.ProofFrom(r)); err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not record that, try again")
		return
	}
	h.Audience(w, r)
}
