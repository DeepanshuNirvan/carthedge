// Package alert tells a seller about what needs them — a new order, a return
// request, a buyer cancelling, a reported UPI payment, a chat that needs a
// person — on every channel they keep on: WhatsApp, email and web push.
package alert

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
	"carthedge/internal/notify"
	"carthedge/internal/shop"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	pool    *pgxpool.Pool
	notify  *notify.Notifier
	push    *Pusher
	log     *slog.Logger
	baseURL string
}

func New(pool *pgxpool.Pool, n *notify.Notifier, push *Pusher, log *slog.Logger, baseURL string) *Service {
	return &Service{pool: pool, notify: n, push: push, log: log, baseURL: baseURL}
}

// Alert is one thing the owner should hear about.
type Alert struct {
	Kind  string // newOrder | returnRequested | orderCancelled | addressChanged | upiClaim | chatHandoff | test
	Title string // one short line, also the email subject
	Body  string
	Path  string // where it opens in the app, e.g. /app/orders?order=<id>
}

// Seller sends an alert in the background on the owner's chosen channels.
func (s *Service) Seller(bizID string, a Alert) {
	s.notify.Async("alert:"+a.Kind, func() error {
		ctx := context.Background()
		var phone, email, owner string
		var prefsRaw []byte
		if err := s.pool.QueryRow(ctx, `select phone, email, owner_name, alert_prefs from businesses
			where id=$1 and status='active'`, bizID).Scan(&phone, &email, &owner, &prefsRaw); err != nil {
			return nil // gone or suspended: nobody to tell
		}
		var prefs shop.Alerts
		json.Unmarshal(prefsRaw, &prefs)
		link := s.baseURL + a.Path
		var errs []error
		if prefs.WhatsAppOn() {
			errs = append(errs, s.notify.WhatsApp(phone, notify.SellerAlert(a.Title, a.Body, link)))
		}
		if prefs.EmailOn() && email != "" {
			errs = append(errs, s.notify.Email(email, a.Title, "Hi "+owner+",\n\n"+a.Body+"\n\nOpen it here: "+link+"\n\n— CartHedge"))
		}
		if prefs.PushOn() {
			s.pushAll(ctx, bizID, a)
		}
		return errors.Join(errs...)
	})
}

// pushAll reaches every device the seller enabled; dead subscriptions are dropped.
func (s *Service) pushAll(ctx context.Context, bizID string, a Alert) int {
	rows, err := s.pool.Query(ctx, `select id, endpoint, p256dh, auth from push_subscriptions where business_id=$1`, bizID)
	if err != nil {
		return 0
	}
	type entry struct {
		id  string
		sub Subscription
	}
	var subs []entry
	for rows.Next() {
		var e entry
		if rows.Scan(&e.id, &e.sub.Endpoint, &e.sub.P256dh, &e.sub.Auth) == nil {
			subs = append(subs, e)
		}
	}
	rows.Close()
	payload, _ := json.Marshal(map[string]string{"title": a.Title, "body": a.Body, "url": a.Path, "tag": a.Kind})
	sent := 0
	for _, e := range subs {
		err := s.push.Send(ctx, e.sub, payload)
		switch {
		case errors.Is(err, errGone):
			s.pool.Exec(ctx, `delete from push_subscriptions where id=$1`, e.id)
		case err != nil:
			s.log.Warn("web push failed", "businessId", bizID, "err", err)
		default:
			sent++
		}
	}
	return sent
}

// PushKey hands the browser the VAPID public key to subscribe with.
func (s *Service) PushKey(w http.ResponseWriter, r *http.Request) {
	httpx.OK(w, httpx.M{"publicKey": s.push.PublicKey()})
}

// Subscribe stores this browser's push subscription for the seller. The same
// browser signed in to another store moves over rather than alerting both.
func (s *Service) Subscribe(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Endpoint string `json:"endpoint"`
		Keys     struct {
			P256dh string `json:"p256dh"`
			Auth   string `json:"auth"`
		} `json:"keys"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if !ValidEndpoint(in.Endpoint) || in.Keys.P256dh == "" || in.Keys.Auth == "" {
		httpx.Err(w, http.StatusBadRequest, "this browser's push subscription is not supported")
		return
	}
	bizID := middleware.BusinessID(r.Context())
	var count int
	s.pool.QueryRow(r.Context(), `select count(*) from push_subscriptions where business_id=$1`, bizID).Scan(&count)
	if count >= 20 {
		httpx.Err(w, http.StatusBadRequest, "notifications are on for 20 devices already — turn one off first")
		return
	}
	if _, err := s.pool.Exec(r.Context(), `insert into push_subscriptions (business_id, endpoint, p256dh, auth)
		values ($1,$2,$3,$4) on conflict (endpoint) do update set business_id=excluded.business_id,
		p256dh=excluded.p256dh, auth=excluded.auth`, bizID, in.Endpoint, in.Keys.P256dh, in.Keys.Auth); err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not save the subscription")
		return
	}
	httpx.Created(w, httpx.M{"ok": true})
}

func (s *Service) Unsubscribe(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Endpoint string `json:"endpoint"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	s.pool.Exec(r.Context(), `delete from push_subscriptions where business_id=$1 and endpoint=$2`,
		middleware.BusinessID(r.Context()), in.Endpoint)
	httpx.OK(w, httpx.M{"ok": true})
}

// Test sends a sample notification to every device, so the seller sees it work.
func (s *Service) Test(w http.ResponseWriter, r *http.Request) {
	sent := s.pushAll(r.Context(), middleware.BusinessID(r.Context()), Alert{Kind: "test",
		Title: "Notifications are on", Body: "New orders, returns and chats that need you will show up here.", Path: "/app/orders"})
	httpx.OK(w, httpx.M{"sent": sent})
}
