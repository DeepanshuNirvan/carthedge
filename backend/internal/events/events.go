package events

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"
)

// Bus pushes live board updates (new order, status change, payment) to the
// seller's open dashboards over SSE. Redis pub/sub so any replica can serve
// a stream regardless of which one handled the write.
type Bus struct {
	rdb *redis.Client
	log *slog.Logger
}

func New(rdb *redis.Client, log *slog.Logger) *Bus { return &Bus{rdb: rdb, log: log} }

func channel(bizID string) string { return "events:" + bizID }

// DashboardKey is the cached dashboard payload; any published event invalidates it.
func DashboardKey(bizID string) string { return "dash:" + bizID }

// Publish fans an event out to open dashboards and drops the cached dashboard,
// which the same change has just invalidated.
func (b *Bus) Publish(ctx context.Context, bizID, kind string, payload any) {
	msg, err := json.Marshal(map[string]any{
		"type": kind, "data": payload, "at": time.Now().UTC().Format(time.RFC3339),
	})
	if err != nil {
		return
	}
	b.rdb.Del(ctx, DashboardKey(bizID))
	if err := b.rdb.Publish(ctx, channel(bizID), msg).Err(); err != nil {
		b.log.Error("event publish failed", "kind", kind, "businessId", bizID, "err", err)
	}
}

// Stream holds the seller's SSE connection open and forwards their events.
func (b *Bus) Stream(w http.ResponseWriter, r *http.Request, bizID string) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	// a stream outlives the server-wide write timeout
	http.NewResponseController(w).SetWriteDeadline(time.Time{})

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no") // nginx must not buffer SSE
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, ": connected\n\n")
	flusher.Flush()

	sub := b.rdb.Subscribe(r.Context(), channel(bizID))
	defer sub.Close()
	ch := sub.Channel()

	ping := time.NewTicker(25 * time.Second)
	defer ping.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case msg, open := <-ch:
			if !open {
				return
			}
			fmt.Fprintf(w, "data: %s\n\n", msg.Payload)
			flusher.Flush()
		case <-ping.C:
			fmt.Fprint(w, ": ping\n\n")
			flusher.Flush()
		}
	}
}
