package ai

import (
	"net/http"

	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
)

// input caps for the paid model calls
const (
	maxPaste    = 12000
	maxQuestion = 1000
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// Parse drafts an order card from a pasted DM conversation.
func (h *Handler) Parse(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Conversation string `json:"conversation"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	// every character is paid for at the model; a chat this long is a paste of
	// the whole history, and the order is in the last part of it
	if len([]rune(in.Conversation)) > maxPaste {
		httpx.Err(w, http.StatusBadRequest, "that chat is too long — paste just the part with the order (12,000 characters max)")
		return
	}
	draft, err := h.svc.ParseOrder(r.Context(), middleware.BusinessID(r.Context()), in.Conversation)
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.Created(w, draft)
}

func (h *Handler) ListDrafts(w http.ResponseWriter, r *http.Request) {
	limit, offset := httpx.Page(r)
	drafts, err := h.svc.ListDrafts(r.Context(), middleware.BusinessID(r.Context()), limit, offset)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load drafts")
		return
	}
	if drafts == nil {
		drafts = []Draft{}
	}
	httpx.OK(w, httpx.M{"drafts": drafts})
}

// Confirm is the one-tap: draft becomes a live order. Body may carry the
// seller-edited draft as overrides.
func (h *Handler) Confirm(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Overrides *DraftData `json:"overrides"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	o, err := h.svc.ConfirmDraft(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"), in.Overrides)
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.Created(w, o)
}

func (h *Handler) Discard(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.DiscardDraft(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id")); err != nil {
		httpx.Err(w, http.StatusNotFound, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

// Reply suggests an answer to a buyer's pre-sales question.
func (h *Handler) Reply(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Question string `json:"question"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if len([]rune(in.Question)) > maxQuestion {
		httpx.Err(w, http.StatusBadRequest, "keep the question under 1,000 characters")
		return
	}
	reply, err := h.svc.Reply(r.Context(), middleware.BusinessID(r.Context()), in.Question)
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"reply": reply})
}
