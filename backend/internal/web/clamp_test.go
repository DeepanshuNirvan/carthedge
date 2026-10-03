package web

import (
	"strings"
	"testing"
	"unicode/utf8"
)

// Hindi descriptions must not be cut through a character in link previews.
func TestClampKeepsRunesWhole(t *testing.T) {
	got := clamp(strings.Repeat("चिकनकारी कुर्ती ", 30), descLimit)
	if !utf8.ValidString(got) {
		t.Fatalf("clamped description is not valid UTF-8: %q", got)
	}
	if n := utf8.RuneCountInString(strings.TrimSuffix(got, "…")); n > descLimit {
		t.Fatalf("got %d runes, want at most %d", n, descLimit)
	}
}
