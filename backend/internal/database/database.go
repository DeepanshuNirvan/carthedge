package database

import (
	"context"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(ctx context.Context, url string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, err
	}
	cfg.MaxConnLifetime = time.Hour
	// pgx defaults to max(4, CPUs) connections: on a one-CPU host that is four
	// requests at a time. Neon's pooler takes far more; the URL can still set
	// pool_max_conns / pool_min_conns explicitly.
	if !strings.Contains(url, "pool_max_conns") {
		cfg.MaxConns = 20
	}
	if !strings.Contains(url, "pool_min_conns") {
		cfg.MinConns = 2 // warm connections spare a burst the TLS handshakes
	}
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}
