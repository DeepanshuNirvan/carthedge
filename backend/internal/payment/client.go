package payment

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client is a minimal Razorpay REST client: create order + HMAC verification.
type Client struct {
	keyID     string
	keySecret string
	hc        *http.Client
}

func NewClient(keyID, keySecret string) *Client {
	return &Client{keyID: keyID, keySecret: keySecret, hc: &http.Client{Timeout: 15 * time.Second}}
}

func (c *Client) Configured() bool { return c.keyID != "" && c.keySecret != "" }

func (c *Client) KeyID() string { return c.keyID }

// CreateOrder creates a Razorpay order; amount in paise.
func (c *Client) CreateOrder(ctx context.Context, amount int, receipt string, notes map[string]string) (string, error) {
	if !c.Configured() {
		return "", fmt.Errorf("razorpay keys not configured")
	}
	body, _ := json.Marshal(map[string]any{
		"amount":   amount,
		"currency": "INR",
		"receipt":  receipt,
		"notes":    notes,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.razorpay.com/v1/orders", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.SetBasicAuth(c.keyID, c.keySecret)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.hc.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("razorpay order create failed: %s", raw)
	}
	var out struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(raw, &out); err != nil || out.ID == "" {
		return "", fmt.Errorf("razorpay returned unexpected response")
	}
	return out.ID, nil
}

// Refund returns money on a captured payment (amount in paise). Razorpay
// answers pending or processed; either way the refund is underway. receipt
// is our refund id, which lets a retry find a refund that already went out.
func (c *Client) Refund(ctx context.Context, paymentID string, amount int, receipt string, notes map[string]string) (string, error) {
	var out struct {
		ID string `json:"id"`
	}
	err := c.call(ctx, http.MethodPost, "/payments/"+paymentID+"/refund",
		map[string]any{"amount": amount, "speed": "normal", "receipt": receipt, "notes": notes}, &out)
	return out.ID, err
}

// GatewayRefund is a refund as Razorpay holds it.
type GatewayRefund struct {
	ID      string `json:"id"`
	Amount  int    `json:"amount"`
	Receipt string `json:"receipt"`
	Status  string `json:"status"`
}

// RefundByReceipt is the refund Razorpay already holds on a payment for our
// receipt, if any — how a retry tells "went through" from "never sent".
func (c *Client) RefundByReceipt(ctx context.Context, paymentID, receipt string) (string, error) {
	var out struct {
		Items []GatewayRefund `json:"items"`
	}
	if err := c.call(ctx, http.MethodGet, "/payments/"+paymentID+"/refunds?count=100", nil, &out); err != nil {
		return "", err
	}
	for _, r := range out.Items {
		if r.Receipt == receipt && r.Status != "failed" {
			return r.ID, nil
		}
	}
	return "", nil
}

// APIError is an answer from Razorpay. Below 500 Razorpay declined and
// nothing happened; a 5xx, like a network error, leaves the outcome unknown.
type APIError struct {
	Status      int
	Description string
}

func (e *APIError) Error() string { return fmt.Sprintf("razorpay: %s (%d)", e.Description, e.Status) }

// Refused reports whether Razorpay clearly declined the request.
func Refused(err error) bool {
	var e *APIError
	return errors.As(err, &e) && e.Status < 500
}

var apiBase = "https://api.razorpay.com/v1" // tests point it at a fake

// call is one authenticated JSON request to Razorpay.
func (c *Client) call(ctx context.Context, method, path string, in, out any) error {
	if !c.Configured() {
		return fmt.Errorf("razorpay keys not configured")
	}
	var body io.Reader
	if in != nil {
		raw, _ := json.Marshal(in)
		body = bytes.NewReader(raw)
	}
	req, err := http.NewRequestWithContext(ctx, method, apiBase+path, body)
	if err != nil {
		return err
	}
	req.SetBasicAuth(c.keyID, c.keySecret)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.hc.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode >= 300 {
		var e struct {
			Error struct {
				Description string `json:"description"`
			} `json:"error"`
		}
		json.Unmarshal(raw, &e)
		if e.Error.Description == "" {
			e.Error.Description = "request failed"
		}
		return &APIError{Status: resp.StatusCode, Description: e.Error.Description}
	}
	if out != nil {
		return json.Unmarshal(raw, out)
	}
	return nil
}

// CreatePlan makes a monthly Razorpay plan for an amount (paise).
func (c *Client) CreatePlan(ctx context.Context, name string, amount int) (string, error) {
	var out struct {
		ID string `json:"id"`
	}
	err := c.call(ctx, http.MethodPost, "/plans", map[string]any{
		"period": "monthly", "interval": 1,
		"item": map[string]any{"name": name, "amount": amount, "currency": "INR"},
	}, &out)
	return out.ID, err
}

// CreateSubscription starts a monthly mandate on a plan. startAt (unix) puts
// the first charge in the future; 0 charges now.
func (c *Client) CreateSubscription(ctx context.Context, planID string, startAt int64, notes map[string]string) (string, error) {
	in := map[string]any{"plan_id": planID, "total_count": 120, "customer_notify": 1, "notes": notes}
	if startAt > 0 {
		in["start_at"] = startAt
	}
	var out struct {
		ID string `json:"id"`
	}
	err := c.call(ctx, http.MethodPost, "/subscriptions", in, &out)
	return out.ID, err
}

// CancelSubscription stops a mandate; atCycleEnd lets the paid period run out.
func (c *Client) CancelSubscription(ctx context.Context, id string, atCycleEnd bool) error {
	flag := 0
	if atCycleEnd {
		flag = 1
	}
	return c.call(ctx, http.MethodPost, "/subscriptions/"+id+"/cancel", map[string]any{"cancel_at_cycle_end": flag}, nil)
}

// AddAddon puts a one-off amount on a subscription's next charge (overage).
func (c *Client) AddAddon(ctx context.Context, id, name string, amount int) error {
	return c.call(ctx, http.MethodPost, "/subscriptions/"+id+"/addons", map[string]any{
		"item": map[string]any{"name": name, "amount": amount, "currency": "INR"}, "quantity": 1,
	}, nil)
}

// Payment is what Razorpay says about one payment.
type Payment struct {
	ID      string `json:"id"`
	Amount  int    `json:"amount"`
	Status  string `json:"status"`
	OrderID string `json:"order_id"`
}

func (c *Client) FetchPayment(ctx context.Context, id string) (*Payment, error) {
	var p Payment
	err := c.call(ctx, http.MethodGet, "/payments/"+id, nil, &p)
	return &p, err
}

// VerifySubscriptionSignature checks a subscription checkout:
// HMAC-SHA256(paymentId|subscriptionId).
func VerifySubscriptionSignature(paymentID, subscriptionID, signature, secret string) bool {
	return VerifySignature(paymentID, subscriptionID, signature, secret)
}

// ErrBadKeys is Razorpay refusing a key pair.
var ErrBadKeys = errors.New("razorpay rejected the keys")

// Verify checks the key pair with Razorpay, so a typo is caught when the
// seller saves it instead of on a buyer's checkout.
func (c *Client) Verify(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.razorpay.com/v1/orders?count=1", nil)
	if err != nil {
		return err
	}
	req.SetBasicAuth(c.keyID, c.keySecret)
	resp, err := c.hc.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	switch {
	case resp.StatusCode == http.StatusUnauthorized, resp.StatusCode == http.StatusBadRequest:
		return ErrBadKeys
	case resp.StatusCode >= 300:
		return fmt.Errorf("razorpay returned %d", resp.StatusCode)
	}
	return nil
}

// VerifySignature checks the checkout callback signature: HMAC-SHA256(orderId|paymentId).
func VerifySignature(rzpOrderID, rzpPaymentID, signature, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(rzpOrderID + "|" + rzpPaymentID))
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

// VerifyWebhook checks the X-Razorpay-Signature header over the raw body.
func VerifyWebhook(body []byte, signature, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}
