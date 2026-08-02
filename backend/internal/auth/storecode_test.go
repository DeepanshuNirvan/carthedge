package auth

import (
	"errors"
	"strings"
	"testing"
)

// The store code is public, permanent and printed on packaging. Every rule here
// is enforced server-side in Register, so a client that skips the form's
// checking gains nothing.
func TestValidateStoreCode(t *testing.T) {
	valid := []string{
		"ritika-closet",
		"abc",
		"kurti99",
		"a1-b2-c3",
		strings.Repeat("a", storeCodeMax),
	}
	for _, c := range valid {
		if err := ValidateStoreCode(c); err != nil {
			t.Errorf("ValidateStoreCode(%q) = %v, want nil", c, err)
		}
	}

	invalid := map[string]string{
		"":                                  "too short",
		"ab":                                "too short",
		strings.Repeat("a", storeCodeMax+1): "too long",
		"Ritika":                            "uppercase",
		"ritika closet":                     "space",
		"ritika_closet":                     "underscore",
		"ritika.closet":                     "dot",
		"ritika/closet":                     "slash — would forge a path",
		"ritika@closet":                     "at sign",
		"-ritika":                           "leading hyphen",
		"ritika-":                           "trailing hyphen",
		"ritika--closet":                    "double hyphen",
		"admin":                             "reserved",
		"carthedge":                         "reserved, impersonates the platform",
		"carthedge-official":                "impersonates the platform",
		"my-carthedge":                      "impersonates the platform",
		"carthedge-support":                 "impersonates the platform",
		"app":                               "reserved route root",
		"checkout":                          "reserved",
		"../etc":                            "traversal attempt",
	}
	for code, why := range invalid {
		err := ValidateStoreCode(code)
		if err == nil {
			t.Errorf("ValidateStoreCode(%q) = nil, want an error (%s)", code, why)
			continue
		}
		if !errors.Is(err, ErrCodeInvalid) {
			t.Errorf("ValidateStoreCode(%q) error does not wrap ErrCodeInvalid: %v", code, err)
		}
	}
}

// Every reserved word must itself be rejected — a typo in the list is a route
// a seller could shadow.
func TestReservedCodesAreRejected(t *testing.T) {
	for code := range reservedCodes {
		if len(code) < storeCodeMin {
			continue // rejected on length anyway
		}
		if err := ValidateStoreCode(code); err == nil {
			t.Errorf("reserved code %q was accepted", code)
		}
	}
}

func TestNormalizeStoreCode(t *testing.T) {
	cases := map[string]string{
		"Ritika's Closet": "ritika-s-closet",
		"  RITIKA  ":      "ritika",
		"ritika__closet":  "ritika-closet",
		"Kurti & Co.":     "kurti-co",
		"---ritika---":    "ritika",
		"!!!":             "",
	}
	for in, want := range cases {
		if got := NormalizeStoreCode(in); got != want {
			t.Errorf("NormalizeStoreCode(%q) = %q, want %q", in, got, want)
		}
	}
}

// Normalising must never produce something the validator would then reject on
// a character rule — otherwise the seller gets an error they cannot act on.
func TestNormalizeThenValidateNeverFailsOnCharset(t *testing.T) {
	for _, raw := range []string{"Ritika's Closet!!", "  Kurti & Co.  ", "ritika__closet", "मेरी दुकान shop"} {
		code := NormalizeStoreCode(raw)
		if code == "" {
			continue
		}
		if err := ValidateStoreCode(code); err != nil && strings.Contains(err.Error(), "only lowercase") {
			t.Errorf("normalising %q produced %q, which fails the charset rule", raw, code)
		}
	}
}
