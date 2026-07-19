package broadcast

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"carthedge/internal/notify"

	"github.com/jackc/pgx/v5/pgxpool"
)

var validSegments = map[string]bool{"all": true, "retail": true, "reseller": true, "repeat": true}

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

// Service sends drops (new collection, festive sales) to buyer segments over
// WhatsApp, immediately or on schedule.
type Service struct {
	pool   *pgxpool.Pool
	notify *notify.Notifier
	log    *slog.Logger
}

func NewService(pool *pgxpool.Pool, n *notify.Notifier, log *slog.Logger) *Service {
	return &Service{pool: pool, notify: n, log: log}
}

func (s *Service) Create(ctx context.Context, bizID, name, message, segment, scheduledAt string) (*Broadcast, error) {
	if name == "" || message == "" {
		return nil, errors.New("name and message are required")
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

func (s *Service) dispatch(id, bizID string) {
	defer func() {
		if rec := recover(); rec != nil {
			s.log.Error("broadcast panic", "id", id, "err", rec)
		}
	}()
	ctx := context.Background()
	var message, segment string
	if err := s.pool.QueryRow(ctx, `select message, segment from broadcasts where id=$1`, id).Scan(&message, &segment); err != nil {
		return
	}
	where := "business_id = $1"
	switch segment {
	case "retail", "reseller":
		where += " and segment = '" + segment + "'"
	case "repeat":
		where += " and orders_count > 1"
	}
	rows, err := s.pool.Query(ctx, `select phone from customers where `+where, bizID)
	if err != nil {
		return
	}
	var phones []string
	for rows.Next() {
		var p string
		if rows.Scan(&p) == nil {
			phones = append(phones, p)
		}
	}
	rows.Close()

	sent := 0
	for _, phone := range phones {
		if err := s.notify.WhatsApp(phone, message); err == nil {
			sent++
		}
	}
	s.pool.Exec(ctx, `update broadcasts set status='sent', sent_count=$2, updated_at=now() where id=$1`, id, sent)
	s.log.Info("broadcast sent", "id", id, "recipients", sent)
}
