package web

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// The marketing home reaches crawlers that run no JavaScript: the page's gist
// sits in a <noscript> before the React root, and the head says it may be
// indexed with large previews and carries the schema.org graph.
func TestHomeIsReadableWithoutJavaScript(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "index.html"),
		[]byte(`<!doctype html><html><head><title>x</title></head><body><div id="root"></div></body></html>`), 0o600); err != nil {
		t.Fatal(err)
	}
	h, err := New(nil, dir, "https://carthedge.in", nil)
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	h.Mount(mux)

	get := func(path string) string {
		res := httptest.NewRecorder()
		mux.ServeHTTP(res, httptest.NewRequest(http.MethodGet, path, nil))
		return res.Body.String()
	}
	home := get("/")
	for _, want := range []string{
		`<noscript><main><h1>`, `</noscript><div id="root">`,
		`content="index,follow,max-image-preview:large`, `"@graph"`, `"SoftwareApplication"`,
	} {
		if !strings.Contains(home, want) {
			t.Errorf("home missing %q", want)
		}
	}
	if app := get("/app/orders"); strings.Contains(app, "<noscript>") || strings.Contains(app, "index,follow") {
		t.Error("the seller app must stay noindex and carry no marketing fallback")
	}
}
