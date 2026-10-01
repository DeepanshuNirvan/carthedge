package messaging

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
	"carthedge/internal/secure"

	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
)

type Handler struct {
	svc         *Service
	client      *Client
	rdb         *redis.Client
	verifyToken string
	jwtSecret   string
	appBaseURL  string
	oauth       OAuthConfig
}

type HandlerDeps struct {
	Service     *Service
	Client      *Client
	Rdb         *redis.Client
	VerifyToken string
	JWTSecret   string
	AppBaseURL  string
	OAuth       OAuthConfig
}

func NewHandler(d HandlerDeps) *Handler {
	return &Handler{svc: d.Service, client: d.Client, rdb: d.Rdb, verifyToken: d.VerifyToken,
		jwtSecret: d.JWTSecret, appBaseURL: d.AppBaseURL, oauth: d.OAuth}
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
	bizID := middleware.BusinessID(r.Context())
	items, err := h.svc.ListChannels(r.Context(), bizID)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load channels")
		return
	}
	auto, err := h.svc.Automation(r.Context(), bizID)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load channels")
		return
	}
	out := httpx.M{"channels": items,
		// the UI offers manual entry when a channel has no app credentials yet
		"oauth":      httpx.M{"whatsapp": h.oauth.enabled("whatsapp"), "instagram": h.oauth.enabled("instagram")},
		"automation": auto,
		// auto-reply is a plan feature; the toggle shows, locked, below it
		"autoReplyAvailable": middleware.HasFeature(r.Context(), "aiReply"),
	}
	if h.oauth.enabled("whatsapp") {
		// public values: the Facebook JS SDK needs them in the browser
		out["whatsappSignup"] = httpx.M{"appId": h.oauth.AppID, "configId": h.oauth.WAConfigID, "version": h.oauth.Version}
	}
	httpx.OK(w, out)
}

// SetAutomation turns DM auto-reply / auto-confirm on or off for the seller.
func (h *Handler) SetAutomation(w http.ResponseWriter, r *http.Request) {
	var in Automation
	if !httpx.Bind(w, r, &in) {
		return
	}
	if in.AutoReply && !middleware.HasFeature(r.Context(), "aiReply") {
		httpx.JSON(w, http.StatusForbidden, httpx.M{
			"error": "auto-reply needs a plan with the AI reply assistant", "code": "featureNotInPlan", "feature": "aiReply"})
		return
	}
	if err := h.svc.SetAutomation(r.Context(), middleware.BusinessID(r.Context()), in); err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not save the setting")
		return
	}
	httpx.OK(w, in)
}

// WhatsAppSignup finishes Embedded Signup: the browser posts what Meta's
// popup returned, and the server swaps the code for a business token.
func (h *Handler) WhatsAppSignup(w http.ResponseWriter, r *http.Request) {
	var in EmbeddedSignup
	if !httpx.Bind(w, r, &in) {
		return
	}
	conn, err := h.client.ExchangeWhatsApp(r.Context(), h.oauth, in)
	if err == nil {
		err = h.svc.ConnectChannel(r.Context(), middleware.BusinessID(r.Context()), conn)
	}
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true, "displayName": conn.DisplayName})
}

// ConnectURL starts the OAuth handshake. The state is a short-lived signed
// token: the callback arrives as a plain browser redirect with no session, so
// the business id has to travel inside it, and a one-time Redis key stops it
// being replayed.
func (h *Handler) ConnectURL(w http.ResponseWriter, r *http.Request) {
	channel := r.PathValue("channel")
	nonce := secure.Token(16)
	state, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": middleware.BusinessID(r.Context()), "channel": channel,
		"jti": nonce, "exp": time.Now().Add(oauthStateTTL).Unix(),
	}).SignedString([]byte(h.jwtSecret))
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not start the connection")
		return
	}
	authorizeURL, err := h.oauth.AuthorizeURL(channel, state)
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	h.rdb.Set(r.Context(), "oauthState:"+nonce, "1", oauthStateTTL)
	httpx.OK(w, httpx.M{"url": authorizeURL})
}

// OAuthCallback is where Meta returns the seller. It is public by necessity, so
// every claim of identity comes from the signed state.
func (h *Handler) OAuthCallback(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	bizID, channel, err := h.readState(r, q.Get("state"))
	if err != nil {
		http.Redirect(w, r, h.settingsURL("", "That connection link expired — start again from Settings."), http.StatusFound)
		return
	}
	if q.Get("code") == "" {
		reason := q.Get("error_description")
		if reason == "" {
			reason = "The connection was cancelled."
		}
		http.Redirect(w, r, h.settingsURL("", reason), http.StatusFound)
		return
	}
	if channel != "instagram" {
		http.Redirect(w, r, h.settingsURL("", "That connection link is not valid — start again from Settings."), http.StatusFound)
		return
	}
	conn, err := h.client.ExchangeInstagram(r.Context(), h.oauth, q.Get("code"))
	if err == nil {
		err = h.svc.ConnectChannel(r.Context(), bizID, conn)
	}
	if err != nil {
		http.Redirect(w, r, h.settingsURL("", err.Error()), http.StatusFound)
		return
	}
	http.Redirect(w, r, h.settingsURL(channel, ""), http.StatusFound)
}

func (h *Handler) readState(r *http.Request, raw string) (bizID, channel string, err error) {
	token, err := jwt.Parse(raw, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(h.jwtSecret), nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil || !token.Valid {
		return "", "", errors.New("invalid state")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", errors.New("invalid state")
	}
	nonce, _ := claims["jti"].(string)
	if h.rdb.Del(r.Context(), "oauthState:"+nonce).Val() != 1 {
		return "", "", errors.New("state already used")
	}
	bizID, _ = claims["sub"].(string)
	channel, _ = claims["channel"].(string)
	if bizID == "" || channel == "" {
		return "", "", errors.New("invalid state")
	}
	return bizID, channel, nil
}

func (h *Handler) settingsURL(connected, failure string) string {
	q := url.Values{}
	if connected != "" {
		q.Set("connected", connected)
	}
	if failure != "" {
		q.Set("connectError", failure)
	}
	return h.appBaseURL + "/app/settings?" + q.Encode()
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
	conn := &Connection{Channel: in.Channel, ExternalID: strings.TrimSpace(in.ExternalID),
		Token: strings.TrimSpace(in.AccessToken), DisplayName: in.DisplayName}
	if conn.Channel == "instagram" {
		// a pasted long-lived token is assumed fresh; the sweep renews it
		exp := time.Now().Add(instagramTokenTTL)
		conn.ExpiresAt = &exp
		if conn.Token != "" {
			if err := h.client.SubscribeInstagram(r.Context(), conn.Token); err != nil {
				httpx.Err(w, http.StatusBadRequest, "Instagram rejected that token: "+err.Error())
				return
			}
		}
	}
	if err := h.svc.ConnectChannel(r.Context(), middleware.BusinessID(r.Context()), conn); err != nil {
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

// --- Meta platform callbacks (public, signed by Meta) ---

// signedAccount reads the account id out of a Meta signed_request form post.
func (h *Handler) signedAccount(r *http.Request) (string, error) {
	if err := r.ParseForm(); err != nil {
		return "", err
	}
	data, err := h.client.ParseSignedRequest(r.PostForm.Get("signed_request"))
	if err != nil {
		return "", err
	}
	switch id := data["user_id"].(type) {
	case string:
		if id != "" {
			return id, nil
		}
	case json.Number:
		return id.String(), nil
	}
	return "", errors.New("signed_request has no user_id")
}

// Deauthorize is called when a seller removes CartHedge from their Instagram
// account. The token is dead from that moment; drop it.
func (h *Handler) Deauthorize(w http.ResponseWriter, r *http.Request) {
	account, err := h.signedAccount(r)
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, "invalid signed_request")
		return
	}
	if _, err := h.svc.Deauthorize(r.Context(), account); err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not process")
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

// DataDeletion erases what CartHedge holds for a Meta account and answers in
// the shape Meta requires: a status URL and a confirmation code.
func (h *Handler) DataDeletion(w http.ResponseWriter, r *http.Request) {
	account, err := h.signedAccount(r)
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, "invalid signed_request")
		return
	}
	code, err := h.svc.DeleteAccountData(r.Context(), account)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not process")
		return
	}
	httpx.OK(w, httpx.M{"url": h.appBaseURL + "/data-deletion?code=" + code, "confirmation_code": code})
}

// DeletionStatus lets the /data-deletion page confirm a request by its code.
func (h *Handler) DeletionStatus(w http.ResponseWriter, r *http.Request) {
	status, at, err := h.svc.DeletionStatus(r.Context(), r.PathValue("code"))
	if err != nil {
		httpx.Err(w, http.StatusNotFound, "no deletion request with that code")
		return
	}
	httpx.OK(w, httpx.M{"status": status, "requestedAt": at})
}
