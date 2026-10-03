package aftersale

import (
	"errors"
	"net/http"

	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
	"carthedge/internal/order"
)

// Seller-side after-sales routes.

func respond(w http.ResponseWriter, v any, err error) {
	switch {
	case errors.Is(err, ErrNotFound), errors.Is(err, order.ErrNotFound):
		httpx.Err(w, http.StatusNotFound, err.Error())
	case err != nil:
		httpx.ErrOrInternal(w, http.StatusBadRequest, err)
	default:
		httpx.OK(w, v)
	}
}

func (s *Service) HandleList(w http.ResponseWriter, r *http.Request) {
	limit, offset := httpx.Page(r)
	list, err := s.List(r.Context(), middleware.BusinessID(r.Context()), r.URL.Query().Get("status"), limit, offset)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load returns")
		return
	}
	httpx.OK(w, httpx.M{"returns": list})
}

func (s *Service) HandleGet(w http.ResponseWriter, r *http.Request) {
	ret, err := s.Get(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"))
	respond(w, ret, err)
}

// HandleCreate is the seller logging a return or exchange the buyer asked
// for in a chat or on a call.
func (s *Service) HandleCreate(w http.ResponseWriter, r *http.Request) {
	var in Input
	if !httpx.Bind(w, r, &in) {
		return
	}
	ctx := r.Context()
	ret, err := s.Request(ctx, middleware.BusinessID(ctx), r.PathValue("id"), middleware.BusinessCode(ctx), "seller", in)
	respond(w, ret, err)
}

func (s *Service) HandleStatus(w http.ResponseWriter, r *http.Request) {
	var in StatusInput
	if !httpx.Bind(w, r, &in) {
		return
	}
	ret, err := s.SetStatus(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"), in)
	respond(w, ret, err)
}

func (s *Service) HandleReplacement(w http.ResponseWriter, r *http.Request) {
	var in ReplacementInput
	if !httpx.Bind(w, r, &in) {
		return
	}
	o, err := s.CreateReplacement(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"), in)
	respond(w, o, err)
}

func (s *Service) HandleOrderView(w http.ResponseWriter, r *http.Request) {
	v, err := s.ForOrderView(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"))
	respond(w, v, err)
}

func (s *Service) HandleRefund(w http.ResponseWriter, r *http.Request) {
	var in RefundInput
	if !httpx.Bind(w, r, &in) {
		return
	}
	f, err := s.CreateRefund(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"), in)
	respond(w, f, err)
}

func (s *Service) HandleProcessRefund(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Method    string `json:"method"`
		Reference string `json:"reference"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	f, err := s.ProcessRefund(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"), in.Method, in.Reference)
	respond(w, f, err)
}

func (s *Service) HandleCancelRefund(w http.ResponseWriter, r *http.Request) {
	err := s.CancelRefund(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"))
	respond(w, httpx.M{"ok": true}, err)
}

func (s *Service) HandlePendingRefunds(w http.ResponseWriter, r *http.Request) {
	list, err := s.PendingRefunds(r.Context(), middleware.BusinessID(r.Context()))
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load refunds")
		return
	}
	httpx.OK(w, httpx.M{"refunds": list})
}
