package alert

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdh"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"net/url"
	"strings"
	"time"

	"golang.org/x/crypto/hkdf"
)

// Pusher sends Web Push notifications (RFC 8291 message encryption, RFC 8292
// VAPID). The VAPID key is derived from ENCRYPTION_KEY, so there is no extra
// secret to configure and it survives restarts; rotating that key means
// sellers re-enable notifications once.
type Pusher struct {
	priv    *ecdsa.PrivateKey
	pub     []byte // uncompressed P-256 point: the browser's applicationServerKey
	subject string
	hc      *http.Client
}

func NewPusher(encryptionKeyHex, subject string) (*Pusher, error) {
	secret, err := hex.DecodeString(encryptionKeyHex)
	if err != nil {
		return nil, err
	}
	seed := hkdf.New(sha256.New, secret, nil, []byte("carthedge vapid v1"))
	for i := 0; i < 16; i++ { // a scalar outside the curve order is ~2^-32 likely
		d := make([]byte, 32)
		if _, err := io.ReadFull(seed, d); err != nil {
			return nil, err
		}
		key, err := ecdh.P256().NewPrivateKey(d)
		if err != nil {
			continue
		}
		pub := key.PublicKey().Bytes()
		priv := &ecdsa.PrivateKey{
			PublicKey: ecdsa.PublicKey{Curve: elliptic.P256(),
				X: new(big.Int).SetBytes(pub[1:33]), Y: new(big.Int).SetBytes(pub[33:])},
			D: new(big.Int).SetBytes(d),
		}
		return &Pusher{priv: priv, pub: pub, subject: subject, hc: &http.Client{Timeout: 10 * time.Second}}, nil
	}
	return nil, errors.New("could not derive a VAPID key")
}

// PublicKey is what the browser subscribes with.
func (p *Pusher) PublicKey() string { return base64.RawURLEncoding.EncodeToString(p.pub) }

type Subscription struct {
	Endpoint string `json:"endpoint"`
	P256dh   string `json:"p256dh"`
	Auth     string `json:"auth"`
}

// pushHosts are the browser push services. A subscription endpoint is a URL
// the seller's browser hands us and we POST to, so anything else is refused —
// otherwise it is a request-forgery primitive into our own network.
var pushHosts = []string{"fcm.googleapis.com", "push.services.mozilla.com", "push.apple.com", "notify.windows.com"}

// ValidEndpoint reports whether a subscription points at a real push service.
func ValidEndpoint(endpoint string) bool {
	u, err := url.Parse(endpoint)
	if err != nil || u.Scheme != "https" || u.User != nil || len(endpoint) > 2048 {
		return false
	}
	host := strings.ToLower(u.Hostname())
	for _, h := range pushHosts {
		if host == h || strings.HasSuffix(host, "."+h) {
			return true
		}
	}
	return false
}

// errGone means the browser dropped the subscription; delete it.
var errGone = errors.New("push subscription expired")

// Send delivers one encrypted message.
func (p *Pusher) Send(ctx context.Context, sub Subscription, payload []byte) error {
	if !ValidEndpoint(sub.Endpoint) {
		return errGone
	}
	body, err := encrypt(sub, payload)
	if err != nil {
		return errGone // keys we cannot use will never work
	}
	jwt, err := p.vapid(sub.Endpoint)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, sub.Endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/octet-stream")
	req.Header.Set("Content-Encoding", "aes128gcm")
	req.Header.Set("TTL", "86400")
	req.Header.Set("Urgency", "high")
	req.Header.Set("Authorization", "vapid t="+jwt+", k="+p.PublicKey())
	resp, err := p.hc.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
	switch {
	case resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone:
		return errGone
	case resp.StatusCode >= 300:
		return fmt.Errorf("push service answered %d", resp.StatusCode)
	}
	return nil
}

// vapid signs the RFC 8292 token for the push service's origin.
func (p *Pusher) vapid(endpoint string) (string, error) {
	u, err := url.Parse(endpoint)
	if err != nil {
		return "", err
	}
	enc := base64.RawURLEncoding
	header := enc.EncodeToString([]byte(`{"typ":"JWT","alg":"ES256"}`))
	claims, _ := json.Marshal(map[string]any{
		"aud": u.Scheme + "://" + u.Host,
		"exp": time.Now().Add(12 * time.Hour).Unix(),
		"sub": p.subject,
	})
	signing := header + "." + enc.EncodeToString(claims)
	digest := sha256.Sum256([]byte(signing))
	r, s, err := ecdsa.Sign(rand.Reader, p.priv, digest[:])
	if err != nil {
		return "", err
	}
	sig := make([]byte, 64)
	r.FillBytes(sig[:32])
	s.FillBytes(sig[32:])
	return signing + "." + enc.EncodeToString(sig), nil
}

// decodeKey accepts the base64 flavours browsers and libraries produce.
func decodeKey(s string) ([]byte, error) {
	s = strings.TrimRight(s, "=")
	if b, err := base64.RawURLEncoding.DecodeString(s); err == nil {
		return b, nil
	}
	return base64.RawStdEncoding.DecodeString(s)
}

// encrypt is RFC 8291 aes128gcm with one record.
func encrypt(sub Subscription, plaintext []byte) ([]byte, error) {
	uaPub, err := decodeKey(sub.P256dh)
	if err != nil {
		return nil, err
	}
	auth, err := decodeKey(sub.Auth)
	if err != nil || len(auth) < 16 {
		return nil, errors.New("bad auth secret")
	}
	uaKey, err := ecdh.P256().NewPublicKey(uaPub)
	if err != nil {
		return nil, err
	}
	asPriv, err := ecdh.P256().GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}
	asPub := asPriv.PublicKey().Bytes()
	shared, err := asPriv.ECDH(uaKey)
	if err != nil {
		return nil, err
	}
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return nil, err
	}
	cek, nonce, err := deriveKeys(shared, auth, uaPub, asPub, salt)
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(cek)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	record := append(append([]byte{}, plaintext...), 0x02) // last-record delimiter
	out := make([]byte, 0, 86+len(record)+gcm.Overhead())
	out = append(out, salt...)
	out = binary.BigEndian.AppendUint32(out, 4096)
	out = append(out, byte(len(asPub)))
	out = append(out, asPub...)
	return gcm.Seal(out, nonce, record, nil), nil
}

// deriveKeys is RFC 8291 §3.3–3.4: the content key and nonce for one message.
func deriveKeys(shared, auth, uaPub, asPub, salt []byte) (cek, nonce []byte, err error) {
	info := append(append([]byte("WebPush: info\x00"), uaPub...), asPub...)
	ikm := make([]byte, 32)
	if _, err = io.ReadFull(hkdf.New(sha256.New, shared, auth, info), ikm); err != nil {
		return nil, nil, err
	}
	cek = make([]byte, 16)
	if _, err = io.ReadFull(hkdf.New(sha256.New, ikm, salt, []byte("Content-Encoding: aes128gcm\x00")), cek); err != nil {
		return nil, nil, err
	}
	nonce = make([]byte, 12)
	_, err = io.ReadFull(hkdf.New(sha256.New, ikm, salt, []byte("Content-Encoding: nonce\x00")), nonce)
	return cek, nonce, err
}
