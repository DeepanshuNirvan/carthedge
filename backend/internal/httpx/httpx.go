package httpx

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"strings"
)

type M map[string]any

func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func OK(w http.ResponseWriter, v any) { JSON(w, http.StatusOK, v) }

func Created(w http.ResponseWriter, v any) { JSON(w, http.StatusCreated, v) }

func Err(w http.ResponseWriter, status int, msg string) {
	JSON(w, status, M{"error": msg})
}

func Bind(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		Err(w, http.StatusBadRequest, "invalid json body")
		return false
	}
	return true
}

// Page parses ?page & ?limit into limit/offset (default 20, max 100).
func Page(r *http.Request) (limit, offset int) {
	limit = 20
	if n, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && n > 0 && n <= 100 {
		limit = n
	}
	page := 1
	if n, err := strconv.Atoi(r.URL.Query().Get("page")); err == nil && n > 1 {
		page = n
	}
	return limit, (page - 1) * limit
}

var emailRe = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

func ValidEmail(s string) bool { return emailRe.MatchString(s) }

// gmail and its aliases deliver to the same inbox regardless of dots and +tags,
// which makes "unique email" free to defeat when a free trial is on the line.
var aliasDomains = map[string]string{
	"gmail.com":      "gmail.com",
	"googlemail.com": "gmail.com",
}

// NormalizeEmail canonicalises an address for duplicate detection only — the
// address the user typed is what gets stored and logged in with.
func NormalizeEmail(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	local, domain, ok := strings.Cut(s, "@")
	if !ok {
		return s
	}
	if canonical, alias := aliasDomains[domain]; alias {
		local = strings.ReplaceAll(local, ".", "")
		domain = canonical
	}
	if tag := strings.IndexByte(local, '+'); tag >= 0 {
		local = local[:tag]
	}
	return local + "@" + domain
}

// NormalizePhone strips +91/0 prefixes and validates a 10-digit Indian mobile.
// A prefix is only stripped when what remains is a full 10-digit number —
// 91xxxxxxxx is itself a live mobile series, so trimming it unconditionally
// rejects real buyers.
func NormalizePhone(s string) (string, bool) {
	s = strings.NewReplacer(" ", "", "-", "", "(", "", ")", "").Replace(s)
	s = strings.TrimPrefix(s, "+")
	for _, p := range []string{"91", "0"} {
		if len(s) == 10+len(p) && strings.HasPrefix(s, p) {
			s = s[len(p):]
			break
		}
	}
	if len(s) != 10 || s[0] < '6' {
		return "", false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return "", false
		}
	}
	return s, true
}

// NormalizeHandle canonicalises an Instagram handle so "@Ritika", "ritika" and
// "instagram.com/ritika/" collapse to one value the unique index can compare.
func NormalizeHandle(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	for _, prefix := range []string{"https://", "http://", "www.", "instagram.com/", "@"} {
		s = strings.TrimPrefix(s, prefix)
	}
	return strings.Trim(s, "/ ")
}

// identityIndexes maps a unique-index violation onto the field the seller has to
// change. One person, one identity: reusing any of these is how trials get farmed.
var identityIndexes = map[string]string{
	"businesses_email_key":            "email",
	"businesses_email_normalized_key": "email",
	"businesses_phone_key":            "mobile number",
	"businesses_whatsapp_key":         "WhatsApp number",
	"businesses_instagram_key":        "Instagram handle",
}

// DuplicateField names the identity a write collided on, or reports false when
// the error is something else.
func DuplicateField(err error) (string, bool) {
	if err == nil {
		return "", false
	}
	msg := err.Error()
	for index, field := range identityIndexes {
		if strings.Contains(msg, index) {
			return field, true
		}
	}
	return "", false
}

var pincodeRe = regexp.MustCompile(`^[1-9][0-9]{5}$`)

func ValidPincode(s string) bool { return pincodeRe.MatchString(s) }
