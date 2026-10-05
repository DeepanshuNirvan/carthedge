package otp

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"

	"carthedge/internal/config"
	"carthedge/internal/notify"
)

// Production without a WhatsApp number must say so at once, not tell the
// buyer a code is on its way.
func TestSendRefusesWhenNoCodeCanArrive(t *testing.T) {
	n := notify.New(&config.Config{Env: "production"}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	if err := New(nil, n).Send(context.Background(), "store", "9876543210", ""); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("want ErrUnavailable, got %v", err)
	}
}
