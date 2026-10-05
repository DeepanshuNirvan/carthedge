package broadcast

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"time"

	"carthedge/internal/customer"
	"carthedge/internal/notify"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var validSegments = map[string]bool{"all": true, "retail": true, "reseller": true, "repeat": true}

// TermsVersion is the broadcast rules a seller accepts before the first send
// (/terms, "Broadcasts"). Changing the rules means a new version, and every
// seller accepts again.
const TermsVersion = "2026-10-04"

var ErrTermsNeeded = errors.New("accept the broadcast rules before sending")

type Broadcast struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Message     string `json:"message"`
	Segment     string `json:"segment"`
	Status      string `json:"status"`
	ScheduledAt string `json:"scheduledAt,omitempty"`
	SentCount   int    `json:"sentCount"`
	CreatedAt   string `json:"createdAt"`
}

// Service sends drops (new collection, festive sales) over WhatsApp to the
// buyers who said yes to offers, immediately or on schedule. Offers are
// marketing, so they leave from the seller's own WhatsApp (notify.Offer);
// until sellers can connect one, drafts are all a seller can make.
type Service struct {
	pool      *pgxpool.Pool
	notify    *notify.Notifier
	customers *customer.Service
	log       *slog.Logger
	baseURL   string
}

func NewService(pool *pgxpool.Pool, n *notify.Notifier, customers *customer.Service, log *slog.Logger, baseURL string) *Service {
	return &Service{pool: pool, notify: n, customers: customers, log: log, baseURL: baseURL}
}

func (s *Service) Create(ctx context.Context, bizID, name, message, segment, scheduledAt string) (*Broadcast, error) {
	name, message = strings.TrimSpace(name), strings.TrimSpace(message)
	if name == "" || message == "" {
		return nil, errors.New("name and message are required")
	}
	if len([]rune(name)) > 80 || len([]rune(message)) > 1000 {
		return nil, errors.New("keep the name under 80 characters and the message under 1,000")
	}
	if segment == "" {
		segment = "all"
	}
	if !validSegments[segment] {
		return nil, errors.New("segment must be all, retail, reseller or repeat")
	}
	status := "draft"
	var schedAt any
	if scheduledAt != "" {
		t, err := time.Parse(time.RFC3339, scheduledAt)
		if err != nil {
			return nil, errors.New("scheduledAt must be RFC3339")
		}
		// a scheduled drop goes out on its own, so it must be able to, and
		// the rules are accepted now
		if !s.notify.OffersOn() {
			return nil, notify.ErrOffersOff
		}
		if err := s.requireTerms(ctx, bizID); err != nil {
			return nil, err
		}
		schedAt = t
		status = "scheduled"
	}
	var b Broadcast
	err := s.pool.QueryRow(ctx, `insert into broadcasts (business_id, name, message, segment, status, scheduled_at)
		values ($1,$2,$3,$4,$5,$6) returning id, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
		bizID, name, message, segment, status, schedAt).Scan(&b.ID, &b.CreatedAt)
	if err != nil {
		return nil, err
	}
	b.Name, b.Message, b.Segment, b.Status, b.ScheduledAt = name, message, segment, status, scheduledAt
	return &b, nil
}

func (s *Service) List(ctx context.Context, bizID string, limit, offset int) ([]Broadcast, error) {
	rows, err := s.pool.Query(ctx, `select id, name, message, segment, status,
		coalesce(to_char(scheduled_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''), sent_count,
		to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		from broadcasts where business_id=$1 order by created_at desc limit $2 offset $3`, bizID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Broadcast
	for rows.Next() {
		var b Broadcast
		if err := rows.Scan(&b.ID, &b.Name, &b.Message, &b.Segment, &b.Status, &b.ScheduledAt, &b.SentCount, &b.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}

// Send dispatches a draft/scheduled broadcast now.
func (s *Service) Send(ctx context.Context, bizID, id string) error {
	if !s.notify.OffersOn() {
		return notify.ErrOffersOff
	}
	if err := s.requireTerms(ctx, bizID); err != nil {
		return err
	}
	ct, err := s.pool.Exec(ctx, `update broadcasts set status='sending', updated_at=now()
		where id=$1 and business_id=$2 and status in ('draft','scheduled')`, id, bizID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("broadcast not found or already sent")
	}
	go s.dispatch(id, bizID)
	return nil
}

func (s *Service) Delete(ctx context.Context, bizID, id string) error {
	ct, err := s.pool.Exec(ctx, `delete from broadcasts where id=$1 and business_id=$2 and status in ('draft','scheduled')`, id, bizID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("broadcast not found or already sent")
	}
	return nil
}

// Audience is who a broadcast can reach: buyers who said yes to offers, per
// segment, beside everyone in the ledger, whether the rules are accepted, and
// whether offers can go out at all yet.
type Audience struct {
	Customers       int            `json:"customers"`
	OptedIn         map[string]int `json:"optedIn"`
	TermsVersion    string         `json:"termsVersion"`
	TermsAcceptedAt string         `json:"termsAcceptedAt,omitempty"`
	CanSend         bool           `json:"canSend"`
}

func (s *Service) Audience(ctx context.Context, bizID string) (*Audience, error) {
	var all, yes, retail, reseller, repeat int
	err := s.pool.QueryRow(ctx, `select count(*),
		count(*) filter (where marketing_opt_in),
		count(*) filter (where marketing_opt_in and segment = 'retail'),
		count(*) filter (where marketing_opt_in and segment = 'reseller'),
		count(*) filter (where marketing_opt_in and orders_count > 1)
		from customers where business_id=$1 and phone not like 'erased-%'`, bizID).Scan(&all, &yes, &retail, &reseller, &repeat)
	if err != nil {
		return nil, err
	}
	a := &Audience{Customers: all, TermsVersion: TermsVersion, CanSend: s.notify.OffersOn(),
		OptedIn: map[string]int{"all": yes, "retail": retail, "reseller": reseller, "repeat": repeat}}
	a.TermsAcceptedAt, err = s.termsAcceptedAt(ctx, bizID)
	return a, err
}

// AcceptTerms records the seller accepting the current broadcast rules.
func (s *Service) AcceptTerms(ctx context.Context, bizID string, proof customer.Proof) error {
	_, err := s.pool.Exec(ctx, `insert into terms_acceptances (business_id, document, version, ip, user_agent)
		values ($1,'broadcasts',$2,$3,$4)`, bizID, TermsVersion, proof.IP, proof.UserAgent)
	return err
}

func (s *Service) termsAcceptedAt(ctx context.Context, bizID string) (string, error) {
	var at string
	err := s.pool.QueryRow(ctx, `select to_char(max(accepted_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from terms_acceptances
		where business_id=$1 and document='broadcasts' and version=$2 having count(*) > 0`, bizID, TermsVersion).Scan(&at)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return at, err
}

func (s *Service) requireTerms(ctx context.Context, bizID string) error {
	at, err := s.termsAcceptedAt(ctx, bizID)
	if err != nil {
		return err
	}
	if at == "" {
		return ErrTermsNeeded
	}
	return nil
}

// StartScheduler fires due scheduled broadcasts once a minute.
func (s *Service) StartScheduler(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if !s.notify.OffersOn() {
					continue // nothing can be scheduled until offers can go out
				}
				rows, err := s.pool.Query(ctx, `update broadcasts set status='sending', updated_at=now()
					where status='scheduled' and scheduled_at <= now() returning id, business_id`)
				if err != nil {
					continue
				}
				type due struct{ id, bizID string }
				var dues []due
				for rows.Next() {
					var d due
					if rows.Scan(&d.id, &d.bizID) == nil {
						dues = append(dues, d)
					}
				}
				rows.Close()
				for _, d := range dues {
					go s.dispatch(d.id, d.bizID)
				}
			}
		}
	}()
}

// segmentFilter narrows the ledger to a broadcast's audience. Only buyers who
// said yes are ever in it.
func segmentFilter(segment string) string {
	where := "business_id = $1 and marketing_opt_in"
	switch segment {
	case "retail":
		where += " and segment = 'retail'"
	case "reseller":
		where += " and segment = 'reseller'"
	case "repeat":
		where += " and orders_count > 1"
	}
	return where
}

// compose is the WhatsApp text one buyer gets: the seller's message with the
// store link filled in, and their own stop link at the foot. Every marketing
// message carries a way out.
func compose(message, store, storeURL, stopURL string) string {
	body := strings.ReplaceAll(message, "{{store link}}", storeURL)
	return body + "\n\nNo more offers from " + store + "? Tap " + stopURL
}

func (s *Service) dispatch(id, bizID string) {
	defer func() {
		if rec := recover(); rec != nil {
			s.log.Error("broadcast panic", "id", id, "err", rec)
		}
	}()
	ctx := context.Background()
	var message, segment, store, code string
	if err := s.pool.QueryRow(ctx, `select b.message, b.segment, z.name, z.code from broadcasts b
		join businesses z on z.id = b.business_id where b.id=$1`, id).Scan(&message, &segment, &store, &code); err != nil {
		return
	}
	rows, err := s.pool.Query(ctx, `select id, phone from customers where `+segmentFilter(segment), bizID)
	if err != nil {
		return
	}
	type recipient struct{ id, phone string }
	var recipients []recipient
	for rows.Next() {
		var r recipient
		if rows.Scan(&r.id, &r.phone) == nil {
			recipients = append(recipients, r)
		}
	}
	rows.Close()

	sent := 0
	storeURL := s.baseURL + "/s/" + code
	for _, r := range recipients {
		stopURL := s.baseURL + "/unsubscribe/" + s.customers.UnsubscribeToken(r.id)
		if err := s.notify.Offer(ctx, bizID, r.phone, compose(message, store, storeURL, stopURL)); err == nil {
			sent++
		}
	}
	s.pool.Exec(ctx, `update broadcasts set status='sent', sent_count=$2, updated_at=now() where id=$1`, id, sent)
	s.log.Info("broadcast sent", "id", id, "recipients", len(recipients), "sent", sent)
}
