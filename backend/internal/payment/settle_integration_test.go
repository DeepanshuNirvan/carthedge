//go:build integration

package payment

// Runs the buyer-payment safety nets against a real Postgres and Redis with a
// fake Razorpay. Skipped unless TEST_DATABASE_URL and TEST_REDIS_URL point at
// throwaway instances:
//
//	TEST_DATABASE_URL=postgres://… TEST_REDIS_URL=redis://… go test -tags integration ./internal/payment/

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"

	"carthedge/internal/alert"
	"carthedge/internal/cache"
	"carthedge/internal/config"
	"carthedge/internal/courier"
	"carthedge/internal/customer"
	"carthedge/internal/database"
	"carthedge/internal/events"
	"carthedge/internal/notify"
	"carthedge/internal/order"
	"carthedge/internal/product"
	"carthedge/internal/secure"
)

// fakeRazorpay answers order creation and, per Razorpay order, the payment
// attempts the test says were captured.
type fakeRazorpay struct {
	mu       sync.Mutex
	n        int
	captured map[string]int // razorpay order id → amount captured
	down     bool           // payment lookups fail, like a Razorpay outage
	run      string
}

func (f *fakeRazorpay) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()
	switch {
	case r.Method == http.MethodPost && r.URL.Path == "/orders":
		io.Copy(io.Discard, r.Body)
		f.n++
		// unique per run: Razorpay ids never repeat, and the payment id index holds us to it
		json.NewEncoder(w).Encode(map[string]string{"id": "order_" + f.run + strings.Repeat("x", f.n)})
	case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/payments") && f.down:
		w.WriteHeader(http.StatusBadGateway)
	case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/payments"):
		id := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/orders/"), "/payments")
		items := []Payment{}
		if amt, ok := f.captured[id]; ok {
			items = append(items, Payment{ID: "pay_" + id, Amount: amt, Status: "captured", OrderID: id})
		}
		json.NewEncoder(w).Encode(map[string]any{"items": items})
	default:
		http.NotFound(w, r)
	}
}

func TestBuyerPaymentSafetyNets(t *testing.T) {
	dbURL, redisURL := os.Getenv("TEST_DATABASE_URL"), os.Getenv("TEST_REDIS_URL")
	if dbURL == "" || redisURL == "" {
		t.Skip("TEST_DATABASE_URL and TEST_REDIS_URL are not set")
	}
	ctx := context.Background()
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	pool, err := database.Connect(ctx, dbURL)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	if err := database.Migrate(ctx, pool, log); err != nil {
		t.Fatal(err)
	}
	rdb, err := cache.Connect(ctx, redisURL)
	if err != nil {
		t.Fatal(err)
	}
	key := strings.Repeat("ab", 32)
	cipher, _ := secure.NewCipher(key)
	pusher, err := alert.NewPusher(key, "mailto:test@example.com")
	if err != nil {
		t.Fatal(err)
	}
	cfg := &config.Config{Env: "development"}
	n := notify.New(cfg, log)
	alerts := alert.New(pool, n, pusher, log, "http://x.test")
	orders := order.NewService(pool, rdb, customer.NewService(pool, key), product.NewService(pool, n, alerts, log),
		n, alerts, courier.New("", "", rdb), events.New(rdb, log), log, "http://x.test")
	var closed []string
	orders.SetCloseHook(func(_ context.Context, _, orderID, status string) { closed = append(closed, orderID+":"+status) })
	svc := NewService(pool, rdb, orders, cipher, cfg, log)

	fake := &fakeRazorpay{captured: map[string]int{}, run: secure.Token(6)}
	srv := httptest.NewServer(fake)
	defer srv.Close()
	apiBase = srv.URL
	defer func() { apiBase = "https://api.razorpay.com/v1" }()

	// a seller with a gateway and one counted product
	secretEnc, _ := cipher.Encrypt("rzp_secret")
	code := "settle-" + strings.ToLower(secure.Token(6))
	var bizID, productID string
	if err := pool.QueryRow(ctx, `insert into businesses (code, name, owner_name, email, email_normalized, phone, password_hash, razorpay_key_id, razorpay_key_secret)
		values ($1,'Settle Test','Owner',$1||'@x.test',$1||'@x.test',$2,'x','rzp_test_key',$3) returning id`,
		code, "9"+randDigits(9), secretEnc).Scan(&bizID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, `insert into products (business_id, name, price, stock_qty) values ($1,'Kurti',100000,5) returning id`,
		bizID).Scan(&productID); err != nil {
		t.Fatal(err)
	}
	newOrder := func() *order.Order {
		t.Helper()
		o, err := orders.Create(ctx, order.CreateParams{BusinessID: bizID, Source: "link", Name: "Priya", Phone: "98" + randDigits(8),
			Address:       customer.Address{Line: "12 MG Road", City: "Jaipur", State: "Rajasthan", Pincode: "302001"},
			PaymentMethod: "prepaid", Refs: []order.Ref{{ProductID: productID, Qty: 1}}})
		if err != nil {
			t.Fatal(err)
		}
		return o
	}
	state := func(id string) (status, payment string) {
		pool.QueryRow(ctx, `select status, payment_status from orders where id=$1`, id).Scan(&status, &payment)
		return
	}
	stock := func() (q int) {
		pool.QueryRow(ctx, `select stock_qty from products where id=$1`, productID).Scan(&q)
		return
	}

	t.Run("paid but the callback never came: found, booked once, no second charge", func(t *testing.T) {
		o := newOrder()
		info, err := svc.BuyerCheckout(ctx, o.Code, "order")
		if err != nil {
			t.Fatal(err)
		}
		fake.captured[info.RazorpayOrderID] = o.Total
		if got, err := svc.SettlePending(ctx, o.ID); got != 1 {
			t.Log("settle err:", err)
			t.Fatalf("settled %d, want 1", got)
		}
		if s, p := state(o.ID); s != "confirmed" || p != "paid" {
			t.Fatalf("order is %s/%s, want confirmed/paid", s, p)
		}
		if got, _ := svc.SettlePending(ctx, o.ID); got != 0 {
			t.Fatalf("second sweep settled %d, want 0", got)
		}
		if _, err := svc.BuyerCheckout(ctx, o.Code, "order"); err == nil || !strings.Contains(err.Error(), "already paid") {
			t.Fatalf("a paid order offered a new checkout: %v", err)
		}
	})

	t.Run("a captured payment found when the buyer retries checkout", func(t *testing.T) {
		o := newOrder()
		info, _ := svc.BuyerCheckout(ctx, o.Code, "order")
		fake.captured[info.RazorpayOrderID] = o.Total
		if _, err := svc.BuyerCheckout(ctx, o.Code, "order"); err == nil || !strings.Contains(err.Error(), "already paid") {
			t.Fatalf("retry after paying started a second checkout: %v", err)
		}
		if _, p := state(o.ID); p != "paid" {
			t.Fatalf("payment status %s, want paid", p)
		}
	})

	t.Run("paid twice: the order stays paid and the seller is told to refund one", func(t *testing.T) {
		o := newOrder()
		a, _ := svc.BuyerCheckout(ctx, o.Code, "order")
		b, _ := svc.BuyerCheckout(ctx, o.Code, "order") // a second tab, before either paid
		fake.captured[a.RazorpayOrderID], fake.captured[b.RazorpayOrderID] = o.Total, o.Total
		svc.SettlePending(ctx, o.ID)
		var dup int
		pool.QueryRow(ctx, `select count(*) from order_events where order_id=$1 and status='payment'`, o.ID).Scan(&dup)
		if _, p := state(o.ID); p != "paid" || dup != 1 {
			t.Fatalf("payment %s with %d duplicate notes, want paid with 1", p, dup)
		}
	})

	t.Run("paid after the seller cancelled: owed back, not packed", func(t *testing.T) {
		o := newOrder()
		info, _ := svc.BuyerCheckout(ctx, o.Code, "order")
		if _, err := orders.SetStatus(ctx, bizID, o.ID, "cancelled", "test"); err != nil {
			t.Fatal(err)
		}
		closed = nil
		fake.captured[info.RazorpayOrderID] = o.Total
		svc.SettlePending(ctx, o.ID)
		if s, p := state(o.ID); s != "cancelled" || p != "paid" {
			t.Fatalf("order is %s/%s, want cancelled/paid", s, p)
		}
		if len(closed) != 1 || closed[0] != o.ID+":cancelled" {
			t.Fatalf("refund hook calls %v, want one for the order", closed)
		}
	})

	t.Run("nobody paid in 48 hours: cancelled and the piece is back on sale", func(t *testing.T) {
		o := newOrder()
		svc.BuyerCheckout(ctx, o.Code, "order") // opened, never paid
		before := stock()
		pool.Exec(ctx, `update orders set created_at = now() - interval '49 hours' where id=$1`, o.ID)
		if got, _ := svc.ExpireUnpaid(ctx); got < 1 {
			t.Fatalf("expired %d, want at least 1", got)
		}
		if s, _ := state(o.ID); s != "cancelled" || stock() != before+1 {
			t.Fatalf("order %s with stock %d→%d, want cancelled and +1", s, before, stock())
		}
	})

	t.Run("Razorpay unreachable: an old unpaid order is left alone, never cancelled on a guess", func(t *testing.T) {
		o := newOrder()
		svc.BuyerCheckout(ctx, o.Code, "order")
		pool.Exec(ctx, `update orders set created_at = now() - interval '49 hours' where id=$1`, o.ID)
		fake.down = true
		svc.ExpireUnpaid(ctx)
		fake.down = false
		if s, _ := state(o.ID); s != "new" {
			t.Fatalf("order is %s, want new (left for the next sweep)", s)
		}
		pool.Exec(ctx, `update orders set status='cancelled' where id=$1`, o.ID) // out of the next case's way
	})

	t.Run("an old unpaid order that was paid after all is booked, not cancelled", func(t *testing.T) {
		o := newOrder()
		info, _ := svc.BuyerCheckout(ctx, o.Code, "order")
		fake.captured[info.RazorpayOrderID] = o.Total
		pool.Exec(ctx, `update orders set created_at = now() - interval '49 hours' where id=$1`, o.ID)
		svc.ExpireUnpaid(ctx)
		if s, p := state(o.ID); s != "confirmed" || p != "paid" {
			t.Fatalf("order is %s/%s, want confirmed/paid", s, p)
		}
	})
}

func randDigits(n int) string {
	var b strings.Builder
	for _, c := range secure.Hex(n) {
		b.WriteByte('0' + byte(c)%10)
		if b.Len() == n {
			break
		}
	}
	return b.String()
}
