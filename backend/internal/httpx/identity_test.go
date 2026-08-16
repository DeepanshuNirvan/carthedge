package httpx

import "testing"

// Email aliasing and handle formatting are the cheapest ways to farm free
// trials; these are the exact inputs the unique indexes have to collapse.
func TestNormalizeEmail(t *testing.T) {
	cases := map[string]string{
		"Ritika@Gmail.com":          "ritika@gmail.com",
		"ri.ti.ka+trial2@gmail.com": "ritika@gmail.com",
		"ritika@googlemail.com":     "ritika@gmail.com",
		// dots are significant outside the Gmail family — do not strip them
		"ri.tika@outlook.com": "ri.tika@outlook.com",
		"ritika+x@yahoo.in":   "ritika@yahoo.in",
		"notanemail":          "notanemail",
	}
	for in, want := range cases {
		if got := NormalizeEmail(in); got != want {
			t.Errorf("NormalizeEmail(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestNormalizeHandle(t *testing.T) {
	for _, in := range []string{"@Ritika", "ritika", "https://www.instagram.com/ritika/", "instagram.com/Ritika"} {
		if got := NormalizeHandle(in); got != "ritika" {
			t.Errorf("NormalizeHandle(%q) = %q, want %q", in, got, "ritika")
		}
	}
}

func TestDuplicateField(t *testing.T) {
	if field, dup := DuplicateField(errString(`duplicate key value violates unique constraint "businesses_phone_key"`)); !dup || field != "mobile number" {
		t.Errorf("got (%q, %v), want (mobile number, true)", field, dup)
	}
	if _, dup := DuplicateField(errString("connection reset")); dup {
		t.Error("unrelated error reported as a duplicate")
	}
	if _, dup := DuplicateField(nil); dup {
		t.Error("nil error reported as a duplicate")
	}
}

type errString string

func (e errString) Error() string { return string(e) }
