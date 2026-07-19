package customer

import (
	"errors"
	"net/http"

	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, offset := httpx.Page(r)
	customers, err := h.svc.List(r.Context(), middleware.BusinessID(r.Context()),
		q.Get("search"), q.Get("segment"), q.Get("risk") == "true", limit, offset)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load customers")
		return
	}
	if customers == nil {
		customers = []Customer{}
	}
	httpx.OK(w, httpx.M{"customers": customers})
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	c, err := h.svc.Get(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			httpx.Err(w, http.StatusNotFound, err.Error())
			return
		}
		httpx.Err(w, http.StatusInternalServerError, "could not load customer")
		return
	}
	httpx.OK(w, c)
}

func (h *Handler) Patch(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Segment     string `json:"segment"`
		RiskFlagged *bool  `json:"riskFlagged"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.Patch(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"), in.Segment, in.RiskFlagged); err != nil {
		if errors.Is(err, ErrNotFound) {
			httpx.Err(w, http.StatusNotFound, err.Error())
			return
		}
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}
