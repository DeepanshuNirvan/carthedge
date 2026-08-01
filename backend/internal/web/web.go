// Package web serves the built frontend and rewrites the document head per
// route. Link previews (WhatsApp, Instagram, Twitter) and search crawlers read
// the HTML that comes off the wire — they never run the SPA — so a shared
// storefront or product link is only as good as the tags injected here.
package web

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"log/slog"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	pool    *pgxpool.Pool
	dir     string
	baseURL string
	index   string
	log     *slog.Logger
}

var titleTag = regexp.MustCompile(`(?is)<title>.*?</title>`)

// New loads the built index.html once. An empty dir disables SPA serving (the
// dev setup runs Vite separately); a set-but-broken dir is a boot error.
func New(pool *pgxpool.Pool, dir, baseURL string, log *slog.Logger) (*Handler, error) {
	if dir == "" {
		return nil, nil
	}
	raw, err := os.ReadFile(filepath.Join(dir, "index.html"))
	if err != nil {
		return nil, errors.New("FRONTEND_DIR is set but index.html is missing: " + err.Error())
	}
	return &Handler{pool: pool, dir: dir, baseURL: strings.TrimRight(baseURL, "/"),
		index: titleTag.ReplaceAllString(string(raw), ""), log: log}, nil
}

func (h *Handler) Mount(mux *http.ServeMux) {
	if h == nil {
		return
	}
	mux.HandleFunc("GET /robots.txt", h.robots)
	mux.HandleFunc("GET /sitemap.xml", h.sitemap)
	mux.HandleFunc("GET /", h.serve)
}

// meta is the document head for one route.
type meta struct {
	Title       string
	Description string
	Image       string
	Type        string
	NoIndex     bool
	NotFound    bool // serve the shell, but with a 404 so crawlers do not index it
	JSONLD      any
}

func (h *Handler) serve(w http.ResponseWriter, r *http.Request) {
	// URL paths are slash-separated on every OS — filepath.Clean would rewrite
	// them with backslashes on Windows and break every route match below
	clean := path.Clean(r.URL.Path)
	// hashed assets and public files: serve from disk, never the SPA shell
	if path.Ext(clean) != "" {
		file := filepath.Join(h.dir, filepath.FromSlash(clean))
		if info, err := os.Stat(file); err == nil && !info.IsDir() {
			if strings.HasPrefix(clean, "/assets/") || strings.HasPrefix(clean, "/fonts/") {
				w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			}
			http.ServeFile(w, r, file)
			return
		}
		http.NotFound(w, r)
		return
	}

	m := h.metaFor(r.Context(), clean)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	// crawlers and previews revalidate often; the shell itself is tiny
	w.Header().Set("Cache-Control", "public, max-age=0, must-revalidate")
	// the SPA still renders its own NotFound screen — the status is what stops a
	// crawler treating every junk URL as another copy of the homepage
	if m.NotFound {
		w.WriteHeader(http.StatusNotFound)
	}
	w.Write([]byte(strings.Replace(h.index, "</head>", h.head(m, clean)+"</head>", 1)))
}

// spaRoutes are the paths react-router actually renders; anything else is a 404
// no matter how well-formed it looks.
func knownRoute(seg []string) bool {
	switch {
	case len(seg) == 1 && (seg[0] == "" || seg[0] == "contact" || seg[0] == "reset-password" || seg[0] == "track"):
		return true
	case seg[0] == "app" || seg[0] == "admin":
		return true
	case seg[0] == "s" && (len(seg) == 2 || (len(seg) == 4 && seg[2] == "p")):
		return true
	case seg[0] == "l" && len(seg) == 3:
		return true
	case seg[0] == "o" && (len(seg) == 2 || (len(seg) == 3 && seg[2] == "confirm")):
		return true
	}
	return false
}

const (
	siteName       = "CartHedge"
	defaultTitle   = "CartHedge — The AI order desk for Instagram & WhatsApp sellers"
	defaultDesc    = "AI reads the DM and drafts the order, you share one branded link, and the COD confirmation flow cuts RTO losses. Built for Instagram and WhatsApp sellers in India."
	descLimit      = 200
	sitemapMaxURLs = 5000
)

// metaFor resolves the buyer-facing routes against the database; everything
// else falls back to the marketing defaults.
func (h *Handler) metaFor(ctx context.Context, path string) meta {
	seg := strings.Split(strings.Trim(path, "/"), "/")
	switch {
	case seg[0] == "app", seg[0] == "admin", seg[0] == "o", seg[0] == "track", seg[0] == "reset-password":
		return meta{Title: siteName, Description: defaultDesc, NoIndex: true}

	// private checkout link: rich preview for the buyer, never indexed
	case seg[0] == "l" && len(seg) == 3:
		return h.linkMeta(ctx, seg[1], seg[2])

	case seg[0] == "s" && len(seg) == 4 && seg[2] == "p":
		return h.productMeta(ctx, seg[1], seg[3])

	case seg[0] == "s" && len(seg) == 2:
		return h.storeMeta(ctx, seg[1])

	case path == "/contact":
		return meta{Title: "Contact CartHedge — Talk to a human",
			Description: "Questions about CartHedge plans, migrations or custom volume pricing? We reply within a working day."}
	}
	if !knownRoute(seg) {
		return meta{Title: "Page not found — " + siteName, Description: defaultDesc, NoIndex: true, NotFound: true}
	}
	return meta{Title: defaultTitle, Description: defaultDesc, JSONLD: map[string]any{
		"@context": "https://schema.org", "@type": "Organization", "name": siteName,
		"url": h.baseURL, "logo": h.baseURL + "/favicon.svg", "description": defaultDesc,
	}}
}

func (h *Handler) storeMeta(ctx context.Context, code string) meta {
	var name, logo, city, state string
	err := h.pool.QueryRow(ctx, `select name, logo_url, city, state from businesses
		where code=$1 and status='active'`, code).Scan(&name, &logo, &city, &state)
	if err != nil {
		return meta{Title: "Store not found — " + siteName, Description: defaultDesc, NoIndex: true, NotFound: true}
	}
	where := strings.TrimSpace(strings.Trim(city+", "+state, ", "))
	desc := "Shop the full " + name + " collection"
	if where != "" {
		desc += " from " + where
	}
	desc += ". Order in a tap — no app, no signup. Cash on delivery and UPI accepted."
	return meta{
		Title: name + " — Shop online", Description: desc, Image: h.abs(logo), Type: "website",
		JSONLD: map[string]any{
			"@context": "https://schema.org", "@type": "Store", "name": name,
			"url": h.baseURL + "/s/" + code, "image": h.abs(logo),
			"address": map[string]any{"@type": "PostalAddress", "addressLocality": city, "addressRegion": state, "addressCountry": "IN"},
		},
	}
}

func (h *Handler) productMeta(ctx context.Context, code, productID string) meta {
	var bizName, name, description string
	var price int
	var inStock bool
	var images []byte
	err := h.pool.QueryRow(ctx, `select b.name, p.name, p.description, p.price, p.in_stock, p.images
		from products p join businesses b on b.id = p.business_id
		where b.code=$1 and p.id=$2 and p.active and b.status='active'`, code, productID).Scan(
		&bizName, &name, &description, &price, &inStock, &images)
	if err != nil {
		return meta{Title: "Product not found — " + siteName, Description: defaultDesc, NoIndex: true, NotFound: true}
	}
	var urls []string
	json.Unmarshal(images, &urls)
	image := ""
	if len(urls) > 0 {
		image = h.abs(urls[0])
	}
	rupees := strconv.Itoa(price / 100)
	desc := clamp(description, descLimit)
	if desc == "" {
		desc = name + " from " + bizName + " — ₹" + rupees + ". Order in a tap, no signup needed."
	}
	availability := "https://schema.org/InStock"
	if !inStock {
		availability = "https://schema.org/OutOfStock"
	}
	return meta{
		Title: name + " — ₹" + rupees + " · " + bizName, Description: desc, Image: image, Type: "product",
		JSONLD: map[string]any{
			"@context": "https://schema.org", "@type": "Product", "name": name,
			"description": desc, "image": image, "brand": map[string]any{"@type": "Brand", "name": bizName},
			"offers": map[string]any{
				"@type": "Offer", "priceCurrency": "INR", "price": strconv.FormatFloat(float64(price)/100, 'f', 2, 64),
				"availability": availability, "url": h.baseURL + "/s/" + code + "/p/" + productID,
			},
		},
	}
}

func (h *Handler) linkMeta(ctx context.Context, code, token string) meta {
	var bizName, title, logo string
	var amount int
	err := h.pool.QueryRow(ctx, `select b.name, l.title, b.logo_url, l.amount from order_links l
		join businesses b on b.id = l.business_id
		where b.code=$1 and l.token=$2 and l.active and b.status='active'
		and (l.expires_at is null or l.expires_at > now())`, code, token).Scan(&bizName, &title, &logo, &amount)
	if err != nil {
		return meta{Title: siteName, Description: defaultDesc, NoIndex: true}
	}
	if title == "" {
		title = "Your order"
	}
	desc := "Confirm your order with " + bizName + " — address, payment and tracking on one page. No app, no signup."
	if amount > 0 {
		desc = "₹" + strconv.Itoa(amount/100) + " · " + desc
	}
	return meta{Title: title + " — " + bizName, Description: desc, Image: h.abs(logo), NoIndex: true}
}

// head renders the tags. Everything interpolated is escaped: business name,
// product name and description are seller-supplied.
func (h *Handler) head(m meta, path string) string {
	url := h.baseURL + path
	image := m.Image
	if image == "" {
		image = h.baseURL + "/og.png"
	}
	kind := m.Type
	if kind == "" {
		kind = "website"
	}
	var b strings.Builder
	tag := func(format string, values ...string) {
		escaped := make([]any, len(values))
		for i, v := range values {
			escaped[i] = html.EscapeString(v)
		}
		b.WriteString(fmt.Sprintf(format, escaped...))
	}
	tag(`<title>%s</title>`, m.Title)
	tag(`<meta name="description" content="%s"/>`, m.Description)
	tag(`<link rel="canonical" href="%s"/>`, url)
	if m.NoIndex {
		b.WriteString(`<meta name="robots" content="noindex,nofollow"/>`)
	}
	tag(`<meta property="og:type" content="%s"/>`, kind)
	tag(`<meta property="og:site_name" content="%s"/>`, siteName)
	tag(`<meta property="og:title" content="%s"/>`, m.Title)
	tag(`<meta property="og:description" content="%s"/>`, m.Description)
	tag(`<meta property="og:url" content="%s"/>`, url)
	tag(`<meta property="og:image" content="%s"/>`, image)
	b.WriteString(`<meta name="twitter:card" content="summary_large_image"/>`)
	tag(`<meta name="twitter:title" content="%s"/>`, m.Title)
	tag(`<meta name="twitter:description" content="%s"/>`, m.Description)
	tag(`<meta name="twitter:image" content="%s"/>`, image)
	if m.JSONLD != nil {
		if raw, err := json.Marshal(m.JSONLD); err == nil {
			// a closing tag inside JSON would end the script element early
			b.WriteString(`<script type="application/ld+json">` +
				strings.ReplaceAll(string(raw), "</", `<\/`) + `</script>`)
		}
	}
	return b.String()
}

func (h *Handler) robots(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Write([]byte("User-agent: *\n" +
		"Disallow: /app\nDisallow: /admin\nDisallow: /l/\nDisallow: /o/\nDisallow: /track\n" +
		"Disallow: /reset-password\nDisallow: /api/\nDisallow: /p/\n\n" +
		"Sitemap: " + h.baseURL + "/sitemap.xml\n"))
}

// sitemap lists the marketing pages plus every active storefront and its
// products — the pages that are meant to rank.
func (h *Handler) sitemap(w http.ResponseWriter, r *http.Request) {
	type entry struct {
		loc      string
		priority string
	}
	entries := []entry{{h.baseURL + "/", "1.0"}, {h.baseURL + "/contact", "0.5"}}

	rows, err := h.pool.Query(r.Context(), `select b.code, p.id from businesses b
		left join products p on p.business_id = b.id and p.active
		where b.status='active' and exists (select 1 from subscriptions s
			where s.business_id = b.id and s.status in ('trial','active','cancelled') and s.ends_at > now())
		order by b.code limit $1`, sitemapMaxURLs)
	if err == nil {
		defer rows.Close()
		seen := map[string]bool{}
		for rows.Next() {
			var code string
			var productID *string
			if rows.Scan(&code, &productID) != nil {
				continue
			}
			if !seen[code] {
				seen[code] = true
				entries = append(entries, entry{h.baseURL + "/s/" + code, "0.8"})
			}
			if productID != nil {
				entries = append(entries, entry{h.baseURL + "/s/" + code + "/p/" + *productID, "0.6"})
			}
		}
	}

	today := time.Now().Format("2006-01-02")
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	b.WriteString(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` + "\n")
	for _, e := range entries {
		b.WriteString("<url><loc>" + html.EscapeString(e.loc) + "</loc><lastmod>" + today +
			"</lastmod><priority>" + e.priority + "</priority></url>\n")
	}
	b.WriteString("</urlset>\n")
	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.Write([]byte(b.String()))
}

// abs turns a stored relative upload path into an absolute URL — previews and
// crawlers reject relative image sources.
func (h *Handler) abs(url string) string {
	if url == "" || strings.HasPrefix(url, "http://") || strings.HasPrefix(url, "https://") {
		return url
	}
	return h.baseURL + "/" + strings.TrimPrefix(url, "/")
}

func clamp(s string, n int) string {
	s = strings.Join(strings.Fields(s), " ")
	if len(s) <= n {
		return s
	}
	return strings.TrimSpace(s[:n]) + "…"
}
