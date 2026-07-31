package web

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestHeadEscapesAndTags(t *testing.T) {
	h := &Handler{baseURL: "https://carthedge.in"}
	head := h.head(meta{
		Title:       `Priya's "Kurti" <Store>`,
		Description: "Best & cheapest",
		Image:       "https://cdn.test/a.jpg",
		Type:        "product",
	}, "/s/demo/p/1")

	if strings.Contains(head, "<Store>") {
		t.Fatalf("seller-supplied title was not escaped: %s", head)
	}
	for _, want := range []string{
		`<title>Priya&#39;s &#34;Kurti&#34; &lt;Store&gt;</title>`,
		`property="og:image" content="https://cdn.test/a.jpg"`,
		`property="og:url" content="https://carthedge.in/s/demo/p/1"`,
		`property="og:type" content="product"`,
		`name="twitter:card" content="summary_large_image"`,
	} {
		if !strings.Contains(head, want) {
			t.Errorf("head missing %q", want)
		}
	}
	if strings.Contains(head, "noindex") {
		t.Error("public page must stay indexable")
	}
}

func TestPrivateRoutesAreNoIndexed(t *testing.T) {
	h := &Handler{baseURL: "https://carthedge.in"}
	for _, path := range []string{"/app/orders", "/admin", "/o/AB12CD", "/track", "/reset-password"} {
		if m := h.metaFor(context.Background(), path); !m.NoIndex {
			t.Errorf("%s should be noindex", path)
		}
	}
	if m := h.metaFor(context.Background(), "/"); m.NoIndex || m.JSONLD == nil {
		t.Error("marketing home must be indexable and carry JSON-LD")
	}
}

func TestJSONLDCannotBreakOutOfScript(t *testing.T) {
	h := &Handler{baseURL: "https://carthedge.in"}
	head := h.head(meta{Title: "x", JSONLD: map[string]any{"name": "</script><script>alert(1)</script>"}}, "/")
	if strings.Contains(head, "</script><script>") {
		t.Fatalf("JSON-LD escaped its script element: %s", head)
	}
}

// End-to-end through the real handler: a route gets the SPA shell with exactly
// one injected title, and a missing asset 404s instead of returning HTML.
func TestServeInjectsOnceAndKeepsAssetsSeparate(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "index.html"),
		[]byte(`<!doctype html><html><head><title>Static</title></head><body><div id="root"></div></body></html>`), 0o600); err != nil {
		t.Fatal(err)
	}
	h, err := New(nil, dir, "https://carthedge.in/", nil)
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	h.Mount(mux)

	res := httptest.NewRecorder()
	mux.ServeHTTP(res, httptest.NewRequest(http.MethodGet, "/app/orders", nil))
	body := res.Body.String()
	if strings.Count(body, "<title>") != 1 {
		t.Fatalf("expected exactly one title, got:\n%s", body)
	}
	if !strings.Contains(body, `id="root"`) {
		t.Error("SPA shell was not returned")
	}
	if !strings.Contains(body, "noindex") {
		t.Error("seller app must not be indexable")
	}

	res = httptest.NewRecorder()
	mux.ServeHTTP(res, httptest.NewRequest(http.MethodGet, "/assets/missing.js", nil))
	if res.Code != http.StatusNotFound {
		t.Errorf("missing asset returned %d, want 404", res.Code)
	}

	res = httptest.NewRecorder()
	mux.ServeHTTP(res, httptest.NewRequest(http.MethodGet, "/robots.txt", nil))
	if !strings.Contains(res.Body.String(), "Sitemap: https://carthedge.in/sitemap.xml") {
		t.Errorf("robots.txt missing sitemap line: %s", res.Body.String())
	}
}

func TestDisabledWhenNoFrontendDir(t *testing.T) {
	h, err := New(nil, "", "https://carthedge.in", nil)
	if h != nil || err != nil {
		t.Fatalf("empty dir should disable SPA serving, got %v %v", h, err)
	}
	if _, err := New(nil, t.TempDir(), "https://carthedge.in", nil); err == nil {
		t.Error("a configured dir without index.html must fail at boot")
	}
}

func TestIndexTitleIsReplacedNotDuplicated(t *testing.T) {
	stripped := titleTag.ReplaceAllString("<head><title>Old</title><meta/></head>", "")
	if strings.Contains(stripped, "Old") {
		t.Fatalf("static title survived: %s", stripped)
	}
}
