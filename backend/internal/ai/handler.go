package ai

import (
	"net/http"
	"slices"

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

// Practice is the seller chatting with their own assistant before letting it
// loose on buyers: a real turn on the live catalog and settings that places
// nothing. The client carries the cart and stage between turns.
func (h *Handler) Practice(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Messages []struct {
			Who  string `json:"who"` // buyer | shop
			Text string `json:"text"`
		} `json:"messages"`
		Cart        Cart   `json:"cart"`
		Stage       string `json:"stage"`
		SummaryHash string `json:"summaryHash"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if len(in.Messages) == 0 || len(in.Messages) > 40 {
		httpx.Err(w, http.StatusBadRequest, "send 1 to 40 messages")
		return
	}
	p := PracticeInput{Cart: in.Cart, Stage: in.Stage, SummaryHash: in.SummaryHash}
	for _, m := range in.Messages {
		if m.Who != "buyer" && m.Who != "shop" {
			httpx.Err(w, http.StatusBadRequest, "who must be buyer or shop")
			return
		}
		if len([]rune(m.Text)) > 1000 {
			httpx.Err(w, http.StatusBadRequest, "keep each message under 1,000 characters")
			return
		}
		p.Transcript = append(p.Transcript, ChatLine{Who: m.Who, Text: m.Text})
	}
	if !slices.Contains([]string{"", "open", "confirming", "awaiting_seller", "handoff"}, p.Stage) {
		httpx.Err(w, http.StatusBadRequest, "unknown stage")
		return
	}
	res, err := h.svc.Practice(r.Context(), middleware.BusinessID(r.Context()), p)
	if err != nil {
		httpx.Err(w, http.StatusBadGateway, "the assistant could not answer just now — try again")
		return
	}
	note := ""
	switch res.Action {
	case ActPlace:
		if len(res.Messages) == 0 {
			note = "In a real chat the order is placed now (auto-confirm is on) and the buyer gets the order link."
		} else {
			note = "In a real chat this order now waits on your AI desk for one tap."
		}
	case ActHandoff:
		note = "In a real chat the assistant pauses here and alerts you: " + res.Handoff
	case ActSilent:
		note = "The assistant would stay quiet on this message."
	}
	httpx.OK(w, httpx.M{"messages": orEmptyStrings(res.Messages), "cart": res.Cart, "stage": res.Stage,
		"summaryHash": res.SummaryHash, "action": res.Action, "note": note})
}

func orEmptyStrings(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
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
