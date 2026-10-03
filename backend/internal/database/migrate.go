package database

import (
	"context"
	"embed"
	"fmt"
	"log/slog"
	"sort"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

const migrationLockID = 748291

// Migrate applies pending SQL migrations in order; safe across replicas
// via an advisory lock. Runs automatically at boot.
//
// Everything happens in ONE transaction holding a transaction-scoped lock.
// The database is reached through a transaction-pooling proxy (Neon's
// pgbouncer), where consecutive statements outside a transaction can land on
// different server sessions: a session lock taken by one statement and
// "released" by the next was left behind on a pooled connection, and the
// next boot waited on it forever. A transaction stays on one session, and
// its lock ends with it — on commit, rollback or a dropped connection.
func Migrate(ctx context.Context, pool *pgxpool.Pool, log *slog.Logger) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, "select pg_advisory_xact_lock($1)", migrationLockID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `create table if not exists schema_migrations (
		version int primary key,
		name text not null,
		applied_at timestamptz not null default now()
	)`); err != nil {
		return err
	}

	applied := map[int]bool{}
	rows, err := tx.Query(ctx, "select version from schema_migrations")
	if err != nil {
		return err
	}
	for rows.Next() {
		var v int
		if err := rows.Scan(&v); err != nil {
			rows.Close()
			return err
		}
		applied[v] = true
	}
	rows.Close()

	entries, err := migrationFS.ReadDir("migrations")
	if err != nil {
		return err
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Name() < entries[j].Name() })

	var done []string
	for _, e := range entries {
		name := e.Name()
		prefix, _, ok := strings.Cut(name, "_")
		if !ok {
			return fmt.Errorf("migration %s: expected NNNN_name.sql", name)
		}
		version, err := strconv.Atoi(prefix)
		if err != nil {
			return fmt.Errorf("migration %s: bad version prefix", name)
		}
		if applied[version] {
			continue
		}
		sql, err := migrationFS.ReadFile("migrations/" + name)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, string(sql)); err != nil {
			return fmt.Errorf("migration %s: %w", name, err)
		}
		if _, err := tx.Exec(ctx, "insert into schema_migrations (version, name) values ($1, $2)", version, name); err != nil {
			return err
		}
		done = append(done, name)
	}
	// pending migrations land together or not at all
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	for _, name := range done {
		log.Info("migration applied", "file", name)
	}
	return nil
}
