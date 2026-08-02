package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"carthedge/internal/secure"
)

// A store code is the seller's public identity: it is in every buyer URL, QR
// and share link (/s/ritika-closet), printed on packaging and pasted into an
// Instagram bio. It used to be generated — a name collision appended four
// random characters, so the second "Ritika Closet" was handed
// /s/ritika-closet-k7m2, which reads like a phishing link next to the first.
//
// The seller picks it now. These rules are the authority: the form mirrors them
// for a live preview, but nothing here trusts the form.

const (
	storeCodeMin = 3
	storeCodeMax = 30
)

var (
	ErrCodeTaken   = errors.New("that store link is already taken")
	ErrCodeInvalid = errors.New("invalid store link")
)

// reservedCodes are segments a store code must never shadow: real route
// prefixes (a store at /s/... cannot collide, but these have been route roots
// before and may be again), plus words that would let a seller pass themselves
// off as CartHedge or as a system page.
var reservedCodes = map[string]bool{
	// route roots and infrastructure
	"api": true, "app": true, "admin": true, "assets": true, "healthz": true,
	"l": true, "o": true, "oauth": true, "p": true, "s": true, "static": true,
	"track": true, "uploads": true, "webhooks": true, "www": true, "cdn": true,
	// platform identity
	"carthedge": true, "support": true, "help": true, "official": true,
	"security": true, "root": true, "system": true, "mail": true,
	// pages a seller must not be able to impersonate
	"about": true, "account": true, "billing": true, "cart": true, "checkout": true,
	"contact": true, "dashboard": true, "docs": true, "faq": true, "invoice": true,
	"invoices": true, "legal": true, "login": true, "logout": true, "order": true,
	"orders": true, "payment": true, "payments": true, "plans": true, "pricing": true,
	"privacy": true, "refund": true, "register": true, "settings": true,
	"shipping": true, "signup": true, "store": true, "terms": true,
}

// protectedTerms may not appear *anywhere* in a store code. Reserving the exact
// word "carthedge" is not enough — carthedge-official, my-carthedge and
// carthedge-support all read as the platform to a buyer deciding whether a
// payment link is genuine.
var protectedTerms = []string{"carthedge", "cart-hedge", "carthedg"}

// NormalizeStoreCode turns whatever the seller typed into the canonical form.
// Forgiving on input ("Ritika's Closet!" -> "ritika-s-closet"), strict on the
// result — ValidateStoreCode still has to pass.
func NormalizeStoreCode(s string) string { return secure.Slug(s) }

// ValidateStoreCode enforces the shape of a store code. Errors are written for
// the seller to read, because this is what the signup form shows them.
func ValidateStoreCode(code string) error {
	switch {
	case len(code) < storeCodeMin:
		return fmt.Errorf("%w: use at least %d characters", ErrCodeInvalid, storeCodeMin)
	case len(code) > storeCodeMax:
		return fmt.Errorf("%w: keep it under %d characters", ErrCodeInvalid, storeCodeMax+1)
	case reservedCodes[code]:
		return fmt.Errorf("%w: %q is reserved — pick something with your brand in it", ErrCodeInvalid, code)
	}
	for i := 0; i < len(code); i++ {
		c := code[i]
		ok := c >= 'a' && c <= 'z' || c >= '0' && c <= '9' || c == '-'
		if !ok {
			return fmt.Errorf("%w: only lowercase letters, numbers and hyphens", ErrCodeInvalid)
		}
	}
	if code[0] == '-' || code[len(code)-1] == '-' {
		return fmt.Errorf("%w: cannot start or end with a hyphen", ErrCodeInvalid)
	}
	if strings.Contains(code, "--") {
		return fmt.Errorf("%w: no double hyphens", ErrCodeInvalid)
	}
	for _, term := range protectedTerms {
		if strings.Contains(code, term) {
			return fmt.Errorf("%w: a store link cannot contain %q", ErrCodeInvalid, term)
		}
	}
	return nil
}

// CodeAvailable reports whether a valid code is still free.
func (s *Service) CodeAvailable(ctx context.Context, code string) (bool, error) {
	var exists bool
	err := s.pool.QueryRow(ctx, `select exists(select 1 from businesses where code = $1)`, code).Scan(&exists)
	return !exists, err
}

// StoreCodeStatus is what the signup form renders under the field.
type StoreCodeStatus struct {
	Code        string   `json:"code"`      // canonical form of what was typed
	Available   bool     `json:"available"` // valid AND free
	Reason      string   `json:"reason,omitempty"`
	Suggestions []string `json:"suggestions,omitempty"`
}

// CheckStoreCode answers the availability lookup. When a code is taken it
// offers readable alternatives — a city or a number, never random characters,
// because the alternative is what ends up on the seller's packaging.
func (s *Service) CheckStoreCode(ctx context.Context, requested, city string) (*StoreCodeStatus, error) {
	code := NormalizeStoreCode(requested)
	out := &StoreCodeStatus{Code: code}
	if err := ValidateStoreCode(code); err != nil {
		out.Reason = strings.TrimPrefix(err.Error(), ErrCodeInvalid.Error()+": ")
		if code != "" {
			out.Suggestions, _ = s.suggestCodes(ctx, code, city)
		}
		return out, nil
	}
	free, err := s.CodeAvailable(ctx, code)
	if err != nil {
		return nil, err
	}
	out.Available = free
	if !free {
		out.Reason = "already taken"
		out.Suggestions, _ = s.suggestCodes(ctx, code, city)
	}
	return out, nil
}

// suggestCodes builds up to three free alternatives from the seller's own
// words. Deterministic on purpose: the seller should recognise the result.
func (s *Service) suggestCodes(ctx context.Context, base, city string) ([]string, error) {
	base = strings.Trim(NormalizeStoreCode(base), "-")
	if base == "" {
		return nil, nil
	}
	// keep room for the suffix rather than emitting an over-long candidate
	if len(base) > storeCodeMax-6 {
		base = strings.Trim(base[:storeCodeMax-6], "-")
	}
	candidates := []string{}
	if c := NormalizeStoreCode(city); c != "" {
		candidates = append(candidates, base+"-"+c)
	}
	for _, suffix := range []string{"store", "official", "2", "3", "4"} {
		candidates = append(candidates, base+"-"+suffix)
	}

	out := []string{}
	for _, c := range candidates {
		if len(out) == 3 {
			break
		}
		if ValidateStoreCode(c) != nil {
			continue
		}
		free, err := s.CodeAvailable(ctx, c)
		if err != nil {
			return out, err
		}
		if free {
			out = append(out, c)
		}
	}
	return out, nil
}

// resolveStoreCode settles the code a registration will use. An empty request
// falls back to the business name, but a collision is an error the seller has
// to resolve — it never silently becomes something else.
func (s *Service) resolveStoreCode(ctx context.Context, requested, businessName string) (string, error) {
	if strings.TrimSpace(requested) == "" {
		requested = businessName
	}
	code := NormalizeStoreCode(requested)
	if err := ValidateStoreCode(code); err != nil {
		return "", err
	}
	free, err := s.CodeAvailable(ctx, code)
	if err != nil {
		return "", err
	}
	if !free {
		return "", ErrCodeTaken
	}
	return code, nil
}
