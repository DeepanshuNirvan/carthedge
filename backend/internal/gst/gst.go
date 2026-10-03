// Package gst holds the Indian GST rules invoices need: GSTIN validation,
// state codes for place of supply, the financial year, document serials and
// the tax split of a GST-inclusive amount.
package gst

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/jackc/pgx/v5"
)

// States maps GST state codes to names (CBIC list; 25 merged into 26, 28 retired).
var States = map[string]string{
	"01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
	"05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
	"10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
	"15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
	"20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
	"26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra", "29": "Karnataka", "30": "Goa",
	"31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
	"35": "Andaman and Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
}

// aliases are how buyers actually type states in an address box.
var aliases = map[string]string{
	"jk": "01", "jandk": "01", "jammu": "01", "kashmir": "01", "hp": "02", "himachal": "02", "pb": "03",
	"ch": "04", "uk": "05", "ua": "05", "uttaranchal": "05", "hr": "06", "dl": "07", "newdelhi": "07",
	"ncr": "07", "delhincr": "07", "nctofdelhi": "07", "rj": "08", "up": "09", "br": "10", "sk": "11",
	"ar": "12", "nl": "13", "mn": "14", "mz": "15", "tr": "16", "ml": "17", "as": "18", "wb": "19",
	"bengal": "19", "jh": "20", "od": "21", "or": "21", "orissa": "21", "cg": "22", "ct": "22",
	"chattisgarh": "22", "mp": "23", "gj": "24", "dnh": "26", "dd": "26", "daman": "26", "diu": "26",
	"dadranagarhaveli": "26", "silvassa": "26", "mh": "27", "ka": "29", "ga": "30", "ld": "31",
	"kl": "32", "tn": "33", "tamilnadu": "33", "py": "34", "pondicherry": "34", "pondy": "34",
	"an": "35", "andaman": "35", "ts": "36", "tg": "36", "ap": "37", "andhra": "37", "la": "38",
}

var byName = func() map[string]string {
	m := map[string]string{}
	for code, name := range States {
		m[squash(name)] = code
	}
	for alias, code := range aliases {
		m[alias] = code
	}
	return m
}()

// squash lowercases and drops everything but letters: "Tamil Nadu" and
// "tamil-nadu" compare equal, "&" reads as "and".
func squash(s string) string {
	s = strings.ReplaceAll(strings.ToLower(s), "&", "and")
	var b strings.Builder
	for _, r := range s {
		if unicode.IsLetter(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// StateCode resolves a typed state name or abbreviation; "" if unknown.
func StateCode(name string) string {
	name = strings.TrimSpace(name)
	if _, ok := States[name]; ok {
		return name // already a code
	}
	return byName[squash(name)]
}

// pinRanges maps the first digits of a pincode to its state. Postal circles
// and states mostly agree; the exceptions are listed by three digits first.
var pin3 = map[string]string{
	"160": "04", "194": "38", "246": "05", "248": "05", "249": "05", "262": "05", "263": "05",
	"396": "26", "403": "30", "605": "34", "737": "11", "744": "35", "790": "12", "791": "12",
	"792": "12", "793": "17", "794": "17", "795": "14", "796": "15", "797": "13", "798": "13",
	"799": "16", "814": "20", "815": "20", "816": "20", "822": "20", "825": "20", "826": "20",
	"827": "20", "828": "20", "829": "20", "831": "20", "832": "20", "833": "20", "834": "20", "835": "20",
}

var pin2 = map[string]string{
	"11": "07", "12": "06", "13": "06", "14": "03", "15": "03", "16": "03", "17": "02", "18": "01", "19": "01",
	"20": "09", "21": "09", "22": "09", "23": "09", "24": "09", "25": "09", "26": "09", "27": "09", "28": "09",
	"30": "08", "31": "08", "32": "08", "33": "08", "34": "08", "36": "24", "37": "24", "38": "24", "39": "24",
	"40": "27", "41": "27", "42": "27", "43": "27", "44": "27", "45": "23", "46": "23", "47": "23", "48": "23",
	"49": "22", "50": "36", "51": "37", "52": "37", "53": "37", "56": "29", "57": "29", "58": "29", "59": "29",
	"60": "33", "61": "33", "62": "33", "63": "33", "64": "33", "67": "32", "68": "32", "69": "32",
	"70": "19", "71": "19", "72": "19", "73": "19", "74": "19", "75": "21", "76": "21", "77": "21", "78": "18",
	"80": "10", "81": "10", "82": "10", "83": "20", "84": "10", "85": "10",
}

// StateFromPincode is the fallback when the typed state is unreadable.
func StateFromPincode(pin string) string {
	if len(pin) != 6 {
		return ""
	}
	if code, ok := pin3[pin[:3]]; ok {
		return code
	}
	return pin2[pin[:2]]
}

// PlaceOfSupply is the buyer's state code from their address.
func PlaceOfSupply(state, pincode string) string {
	if code := StateCode(state); code != "" {
		return code
	}
	return StateFromPincode(pincode)
}

var gstinRe = regexp.MustCompile(`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$`)

const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

// ValidGSTIN checks the format, the state code and the check digit.
func ValidGSTIN(s string) bool {
	if !gstinRe.MatchString(s) {
		return false
	}
	if _, ok := States[s[:2]]; !ok && s[:2] != "97" && s[:2] != "99" {
		return false
	}
	sum := 0
	for i := 0; i < 14; i++ {
		v := strings.IndexByte(charset, s[i]) * (i%2 + 1)
		sum += v/36 + v%36
	}
	return charset[(36-sum%36)%36] == s[14]
}

// StateOfGSTIN is the registration state, the first two digits.
func StateOfGSTIN(gstin string) string {
	if len(gstin) < 2 {
		return ""
	}
	return gstin[:2]
}

// FY is the Indian financial year a moment falls in, e.g. "2026-27".
func FY(t time.Time) string {
	t = t.In(time.FixedZone("IST", 5*3600+1800))
	y := t.Year()
	if t.Month() < time.April {
		y--
	}
	return fmt.Sprintf("%d-%02d", y, (y+1)%100)
}

// fyShort is the FY in four digits for a document number: "2627".
func fyShort(fy string) string { return fy[2:4] + fy[5:7] }

// Number formats a document number under the GST 16-character limit:
// PREFIX/2627/0001.
func Number(prefix, fy string, n int) string {
	return fmt.Sprintf("%s/%s/%04d", prefix, fyShort(fy), n)
}

// Execer is a pool or a transaction.
type Execer interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// NextSerial hands out the next number in a series atomically; two invoices
// issued at the same moment never share one. Inside a transaction, a rollback
// gives the number back.
func NextSerial(ctx context.Context, q Execer, scope string) (int, error) {
	var n int
	err := q.QueryRow(ctx, `insert into doc_counters (scope, n) values ($1, 1)
		on conflict (scope) do update set n = doc_counters.n + 1 returning n`, scope).Scan(&n)
	return n, err
}

// Split takes the tax out of a GST-inclusive amount. intra (same state) splits
// it into equal CGST and SGST; otherwise it is all IGST.
func Split(gross, rate int, intra bool) (taxable, cgst, sgst, igst int) {
	taxable = gross
	if rate > 0 {
		taxable = (gross*200 + 100 + rate) / (2 * (100 + rate)) // rounded half up
	}
	tax := gross - taxable
	if intra {
		cgst = tax / 2
		return taxable, cgst, tax - cgst, 0
	}
	return taxable, 0, 0, tax
}
