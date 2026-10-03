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
