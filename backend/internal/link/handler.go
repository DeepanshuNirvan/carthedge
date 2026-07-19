package link

import (
	"net/http"

	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var in CreateInput
	if !httpx.Bind(w, r, &in) {
		return
	}
	ctx := r.Context()
	l, err := h.svc.Create(ctx, middleware.BusinessID(ctx), middleware.BusinessCode(ctx), in)
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.Created(w, l)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	limit, offset := httpx.Page(r)
	links, err := h.svc.List(ctx, middleware.BusinessID(ctx), middleware.BusinessCode(ctx), limit, offset)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load links")
		return
	}
	if links == nil {
		links = []Link{}
	}
	httpx.OK(w, httpx.M{"links": links})
}

func (h *Handler) SetActive(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Active bool `json:"active"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.SetActive(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"), in.Active); err != nil {
		httpx.Err(w, http.StatusNotFound, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}
