package secure

import (
	"strings"
	"testing"
)

func TestCipherRoundtrip(t *testing.T) {
	key := strings.Repeat("ab", 32)
	c, err := NewCipher(key)
	if err != nil {
		t.Fatal(err)
	}
	enc, err := c.Encrypt("rzp_secret_xyz")
	if err != nil {
		t.Fatal(err)
	}
	dec, err := c.Decrypt(enc)
	if err != nil || dec != "rzp_secret_xyz" {
		t.Fatalf("roundtrip failed: %q %v", dec, err)
	}
	// empty stays empty (unset merchant keys)
	if enc, _ := c.Encrypt(""); enc != "" {
		t.Fatal("empty plaintext must encrypt to empty")
	}
	if _, err := c.Decrypt("not-base64!!!"); err == nil {
		t.Fatal("garbage ciphertext must error")
	}
}

func TestSlug(t *testing.T) {
	cases := map[string]string{
		"Meera's Kurti House": "meera-s-kurti-house",
		"  Fancy!! Store  ":   "fancy-store",
		"हिंदी नाम":           "",
	}
	for in, want := range cases {
		if got := Slug(in); got != want {
			t.Fatalf("Slug(%q) = %q, want %q", in, got, want)
		}
	}
}
