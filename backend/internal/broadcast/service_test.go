package broadcast

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"strings"
	"testing"

	"carthedge/internal/config"
	"carthedge/internal/notify"
)

func TestComposeFillsStoreLinkAndAddsStopLink(t *testing.T) {
	got := compose("New drop! {{store link}}", "Rangrez", "https://x.test/s/rangrez", "https://x.test/unsubscribe/tok")
	if !strings.HasPrefix(got, "New drop! https://x.test/s/rangrez") {
		t.Fatalf("store link not filled: %q", got)
	}
	if !strings.HasSuffix(got, "https://x.test/unsubscribe/tok") || !strings.Contains(got, "Rangrez") {
		t.Fatalf("every offer must end with its own stop link: %q", got)
	}
}

func TestSegmentFilterAlwaysNeedsConsent(t *testing.T) {
	for _, seg := range []string{"all", "retail", "reseller", "repeat", "anything"} {
		if !strings.Contains(segmentFilter(seg), "marketing_opt_in") {
			t.Errorf("%s reaches buyers who never said yes", seg)
		}
	}
}

func TestOffersWaitForTheSellersWhatsApp(t *testing.T) {
	s := &Service{notify: notify.New(&config.Config{}, slog.New(slog.NewTextHandler(io.Discard, nil)))}
	ctx := context.Background()
	if err := s.Send(ctx, "b", "x"); !errors.Is(err, notify.ErrOffersOff) {
		t.Fatalf("send must wait for the seller's own WhatsApp, got %v", err)
	}
	if _, err := s.Create(ctx, "b", "Drop", "New stock", "all", "2030-01-01T10:00:00Z"); !errors.Is(err, notify.ErrOffersOff) {
		t.Fatalf("a schedule would never fire, got %v", err)
	}
}
