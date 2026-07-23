package jobs

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"carthedge/internal/notify"
	"carthedge/internal/order"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

const (
	tick = 15 * time.Minute
	// how long a COD order may sit unconfirmed before the buyer is nudged
	codGrace = 6 * time.Hour
)

// Runner owns the recurring platform work: subscription lifecycle (expiry +
// renewal reminders) and the COD confirmation nudge. One ticker, no cron.
type Runner struct {
	pool    *pgxpool.Pool
	rdb     *redis.Client
	orders  *order.Service
	notify  *notify.Notifier
	log     *slog.Logger
	baseURL string
}

func New(pool *pgxpool.Pool, rdb *redis.Client, orders *order.Service, n *notify.Notifier, log *slog.Logger, baseURL string) *Runner {
	return &Runner{pool: pool, rdb: rdb, orders: orders, notify: n, log: log, baseURL: baseURL}
}

func (r *Runner) Start(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(tick)
		defer ticker.Stop()
		r.runOnce(ctx)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				r.runOnce(ctx)
			}
		}
	}()
}

func (r *Runner) runOnce(ctx context.Context) {
	if n, err := r.expireSubscriptions(ctx); err != nil {
		r.log.Error("job expireSubscriptions failed", "err", err)
	} else if n > 0 {
		r.log.Info("subscriptions expired", "count", n)
	}
	if n, err := r.remindExpiring(ctx); err != nil {
		r.log.Error("job remindExpiring failed", "err", err)
	} else if n > 0 {
		r.log.Info("renewal reminders sent", "count", n)
	}
	if n, err := r.orders.NudgePendingCod(ctx, codGrace); err != nil {
		r.log.Error("job nudgePendingCod failed", "err", err)
	} else if n > 0 {
		r.log.Info("cod confirmation nudges sent", "count", n)
	}
}

// expireSubscriptions flips lapsed plans so the admin console and reports read
// the real state instead of inferring it from ends_at on every query.
func (r *Runner) expireSubscriptions(ctx context.Context) (int, error) {
	rows, err := r.pool.Query(ctx, `update subscriptions s set status='expired', updated_at=now()
		from businesses b where b.id = s.business_id
		and s.status in ('trial','active','cancelled') and s.ends_at <= now()
		returning b.id, b.email, b.owner_name`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	type lapsed struct{ id, email, owner string }
	var all []lapsed
	for rows.Next() {
		var l lapsed
		if err := rows.Scan(&l.id, &l.email, &l.owner); err != nil {
			return 0, err
		}
		all = append(all, l)
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}
	for _, l := range all {
		r.rdb.Del(ctx, "sub:"+l.id)
		body := fmt.Sprintf("Hi %s,\n\nYour CartHedge plan has ended, so your store link and dashboard are paused.\nRenew here to switch it back on: %s/billing\n\n— CartHedge", l.owner, r.baseURL)
		r.notify.Async("subscriptionExpired", func() error {
			return r.notify.Email(l.email, "Your CartHedge plan has ended", body)
		})
	}
	return len(all), nil
}

// remindExpiring warns sellers three days out; reminder_sent_at keeps it to one
// email per period however often the job runs.
func (r *Runner) remindExpiring(ctx context.Context) (int, error) {
	rows, err := r.pool.Query(ctx, `update subscriptions s set reminder_sent_at = now()
		from businesses b where b.id = s.business_id
		and s.status in ('trial','active') and s.ends_at between now() and now() + interval '3 days'
		and (s.reminder_sent_at is null or s.reminder_sent_at < s.ends_at - interval '3 days')
		returning b.email, b.owner_name, s.status, s.ends_at`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	type due struct {
		email, owner, status string
		endsAt               time.Time
	}
	var all []due
	for rows.Next() {
		var d due
		if err := rows.Scan(&d.email, &d.owner, &d.status, &d.endsAt); err != nil {
			return 0, err
		}
		all = append(all, d)
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}
	for _, d := range all {
		what := "subscription"
		if d.status == "trial" {
			what = "free trial"
		}
		body := fmt.Sprintf("Hi %s,\n\nYour CartHedge %s ends on %s. Renew to keep your store link and order desk running: %s/billing\n\n— CartHedge",
			d.owner, what, d.endsAt.Format("2 Jan 2006"), r.baseURL)
		r.notify.Async("subscriptionReminder", func() error {
			return r.notify.Email(d.email, "Your CartHedge "+what+" ends soon", body)
		})
	}
	return len(all), nil
}
