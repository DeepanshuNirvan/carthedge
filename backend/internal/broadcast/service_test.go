package broadcast

import (
	"strings"
	"testing"
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
