package order

import (
	"strings"
	"testing"
)

// Placeholders must stay in step with the args slice, or the board silently
// filters by the wrong value.
func TestListFilterSQL(t *testing.T) {
	where, args := ListFilter{
		Status: "new", Payment: "cod", Source: "ai", RiskOnly: true,
		From: "2026-07-01", To: "2026-07-31", Search: "priya",
	}.sql("biz-1")

	want := []any{"biz-1", "new", "cod", "ai", "2026-07-01", "2026-07-31", "%priya%"}
	if len(args) != len(want) {
		t.Fatalf("args = %v, want %v", args, want)
	}
	for i := range want {
		if args[i] != want[i] {
			t.Fatalf("args[%d] = %v, want %v", i, args[i], want[i])
		}
	}
	for _, fragment := range []string{"o.status = $2", "o.payment_method = $3", "o.source = $4",
		"o.created_at >= $5::date", "o.created_at < $6::date + 1", "c.phone like $7"} {
		if !strings.Contains(where, fragment) {
			t.Fatalf("where clause missing %q:\n%s", fragment, where)
		}
	}

	// tenant scope survives an empty filter
	where, args = ListFilter{}.sql("biz-1")
	if where != "o.business_id = $1" || len(args) != 1 {
		t.Fatalf("empty filter = %q %v", where, args)
	}
}
