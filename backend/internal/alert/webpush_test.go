package alert

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdh"
	"crypto/ecdsa"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"math/big"
	"strings"
	"testing"
)

// The browser side of RFC 8291: decrypting what encrypt produced proves the
// header layout and the key schedule.
func TestEncryptRoundTrip(t *testing.T) {
	ua, _ := ecdh.P256().GenerateKey(rand.Reader)
	auth := make([]byte, 16)
	rand.Read(auth)
	enc := base64.RawURLEncoding
	sub := Subscription{Endpoint: "https://fcm.googleapis.com/fcm/send/x",
		P256dh: enc.EncodeToString(ua.PublicKey().Bytes()), Auth: enc.EncodeToString(auth)}

	body, err := encrypt(sub, []byte(`{"title":"New order"}`))
	if err != nil {
		t.Fatal(err)
	}
	salt, rs, idLen := body[:16], binary.BigEndian.Uint32(body[16:20]), int(body[20])
	asPubBytes := body[21 : 21+idLen]
	if rs != 4096 || idLen != 65 {
		t.Fatalf("header wrong: rs=%d idlen=%d", rs, idLen)
	}
	asPub, err := ecdh.P256().NewPublicKey(asPubBytes)
	if err != nil {
		t.Fatal(err)
	}
	shared, _ := ua.ECDH(asPub)
	cek, nonce, _ := deriveKeys(shared, auth, ua.PublicKey().Bytes(), asPubBytes, salt)
	block, _ := aes.NewCipher(cek)
	gcm, _ := cipher.NewGCM(block)
	plain, err := gcm.Open(nil, nonce, body[21+idLen:], nil)
	if err != nil {
		t.Fatal("decrypt failed: ", err)
	}
	if string(plain) != `{"title":"New order"}`+"\x02" {
		t.Fatalf("plaintext wrong: %q", plain)
	}
}

func TestVapidTokenVerifies(t *testing.T) {
	p, err := NewPusher(strings.Repeat("ab", 32), "mailto:ops@example.com")
	if err != nil {
		t.Fatal(err)
	}
	again, _ := NewPusher(strings.Repeat("ab", 32), "mailto:ops@example.com")
	if p.PublicKey() != again.PublicKey() {
		t.Fatal("VAPID key must be stable for the same secret")
	}
	jwt, err := p.vapid("https://fcm.googleapis.com/fcm/send/abc")
	if err != nil {
		t.Fatal(err)
	}
	parts := strings.Split(jwt, ".")
	sig, _ := base64.RawURLEncoding.DecodeString(parts[2])
	digest := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
	r, s := new(big.Int).SetBytes(sig[:32]), new(big.Int).SetBytes(sig[32:])
	if !ecdsa.Verify(&p.priv.PublicKey, digest[:], r, s) {
		t.Fatal("VAPID signature does not verify")
	}
	claims, _ := base64.RawURLEncoding.DecodeString(parts[1])
	if !strings.Contains(string(claims), `"aud":"https://fcm.googleapis.com"`) {
		t.Fatalf("aud must be the push service origin: %s", claims)
	}
}

func TestValidEndpoint(t *testing.T) {
	for _, ok := range []string{"https://fcm.googleapis.com/fcm/send/a", "https://web.push.apple.com/QG",
		"https://updates.push.services.mozilla.com/wpush/v2/x", "https://wns2-par02p.notify.windows.com/w/?token=1"} {
		if !ValidEndpoint(ok) {
			t.Errorf("%s should be allowed", ok)
		}
	}
	for _, bad := range []string{"http://fcm.googleapis.com/x", "https://169.254.169.254/latest", "https://evilfcm.googleapis.com.attacker.io/",
		"https://localhost/x", "https://user@fcm.googleapis.com/x"} {
		if ValidEndpoint(bad) {
			t.Errorf("%s should be refused", bad)
		}
	}
}
