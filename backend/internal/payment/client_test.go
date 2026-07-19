package payment

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"testing"
)

func TestVerifySignature(t *testing.T) {
	secret := "testsecret"
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte("order_123|pay_456"))
	sig := hex.EncodeToString(mac.Sum(nil))

	if !VerifySignature("order_123", "pay_456", sig, secret) {
		t.Fatal("valid signature rejected")
	}
	if VerifySignature("order_123", "pay_456", sig, "wrongsecret") {
		t.Fatal("signature accepted with wrong secret")
	}
	if VerifySignature("order_999", "pay_456", sig, secret) {
		t.Fatal("signature accepted for tampered order id")
	}
}

func TestVerifyWebhook(t *testing.T) {
	secret := "hooksecret"
	body := []byte(`{"event":"payment.captured"}`)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	sig := hex.EncodeToString(mac.Sum(nil))

	if !VerifyWebhook(body, sig, secret) {
		t.Fatal("valid webhook signature rejected")
	}
	if VerifyWebhook([]byte(`tampered`), sig, secret) {
		t.Fatal("webhook signature accepted for tampered body")
	}
}
