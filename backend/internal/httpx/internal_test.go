package httpx

import (
	"errors"
	"fmt"
	"net"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

func TestInternal(t *testing.T) {
	infra := []error{
		&pgconn.PgError{Code: "23505"},
		fmt.Errorf("load: %w", &net.OpError{Op: "read", Err: errors.New("connection reset")}),
		errors.New("ERROR: syntax error (SQLSTATE 42601)"),
	}
	for _, err := range infra {
		if !Internal(err) {
			t.Errorf("%v should count as internal", err)
		}
	}
	if Internal(errors.New("you can refund up to ₹499 on this order")) {
		t.Error("a user message must pass through")
	}
}
