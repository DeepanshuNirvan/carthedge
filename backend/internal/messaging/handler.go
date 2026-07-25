package messaging

import (
	"io"
	"net/http"

	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
)

type Handler struct {
	svc         *Service
	client      *Client
	verifyToken string
}

func NewHandler(svc *Service, client *Client, verifyToken string) *Handler {
	return &Handler{svc: svc, client: client, verifyToken: verifyToken}
}

// Verify answers Meta's webhook subscription handshake.
func (h *Handler) Verify(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	if q.Get("hub.mode") == "subscribe" && h.verifyToken != "" && q.Get("hub.verify_token") == h.verifyToken {
		w.Write([]byte(q.Get("hub.challenge")))
		return
	}
	http.Error(w, "verification failed", http.StatusForbidden)
}

// Webhook ingests inbound DMs from Meta. A fast 200 is required, so parsing is
// best-effort after the signature check.
func (h *Handler) Webhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 3<<20))
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, "unreadable body")
		return
	}
	if !h.client.VerifySignature(body, r.Header.Get("X-Hub-Signature-256")) {
		httpx.Err(w, http.StatusUnauthorized, "bad signature")
		return
	}
	h.svc.Receive(r.Context(), body)
	httpx.OK(w, httpx.M{"ok": true})
}

// --- seller (authed) ---

func (h *Handler) ListChannels(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListChannels(r.Context(), middleware.BusinessID(r.Context()))
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load channels")
		return
	}
	httpx.OK(w, httpx.M{"channels": items})
}

func (h *Handler) Connect(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Channel     string `json:"channel"`
		ExternalID  string `json:"externalId"`
		AccessToken string `json:"accessToken"`
		DisplayName string `json:"displayName"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.ConnectChannel(r.Context(), middleware.BusinessID(r.Context()),
		in.Channel, in.ExternalID, in.AccessToken, in.DisplayName); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

func (h *Handler) Disconnect(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.Disconnect(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("channel")); err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not disconnect")
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

func (h *Handler) ListConversations(w http.ResponseWriter, r *http.Request) {
	limit, offset := httpx.Page(r)
	items, err := h.svc.ListConversations(r.Context(), middleware.BusinessID(r.Context()), limit, offset)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load conversations")
		return
	}
	httpx.OK(w, httpx.M{"conversations": items})
}

func (h *Handler) Conversation(w http.ResponseWriter, r *http.Request) {
	out, err := h.svc.Conversation(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"))
	if err != nil {
		httpx.Err(w, http.StatusNotFound, err.Error())
		return
	}
	httpx.OK(w, out)
}

func (h *Handler) Reply(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Text string `json:"text"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.Reply(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"), in.Text); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}
