# CartHedge — Frontend Build Prompt

The Go backend already exists — this describes only the UI/UX and its integration.

---

You are a **principal product designer + senior frontend engineer** building the entire web frontend for **CartHedge**. Treat this as an award-shortlist brief: the marketing site should feel like an Awwwards "Site of the Day" (cinematic, 3D, scroll-driven), and the three product apps behind it should feel like the cleanest SaaS a seller has ever used. Nothing here should look templated, generic, or AI-generated. Every screen is intentional, branded, responsive to the pixel, and fast. the name of product maybe changed later- but as of onw work on this only

## 1. What CartHedge is

CartHedge is an **AI order desk for Instagram/WhatsApp-first sellers** in India (fashion, jewellery, home decor). Sellers take orders in DMs and lose 20–30% of COD orders to RTO (refused delivery). CartHedge:

- reads the DM thread with AI → drafts the order (item, size, address) → one-tap confirm;
- generates a **share link** and a **public storefront** per business so buyers order **without any signup** (phone OTP only);
- runs a COD-confirmation flow that cuts RTO and shows sellers **rupees saved per month**;
- manages every order on one kanban board with courier handoff, broadcasts, reseller pricing, customer ledger, invoices, and analytics.

Sold as monthly plans (Starter ₹499 / Growth ₹999 / Pro ₹1,999) + custom plans, 15-day free trial. Payments via Razorpay.

## 2. The four surfaces you are building

All four are one React app family, sharing the design system and API client, split by route/workspace:

1. **Marketing website** (`carthedge.in` - maybe chanegd later) — the cinematic 3D scroll site. Sells the product: problem, core loop, all features, interactive RTO calculator, pricing, guides, contact. Drives sign-up and trial. Heavy SEO.
2. **Seller app** (`/app`) — post-login workspace for an onboarded business: dashboard, order board, products, links, customers, AI order desk, AI insights, broadcasts, invoices, analytics, settings, billing.
3. **Admin panel** (`/admin`) — CartHedge staff: platform overview (MRR/GMV), business management, plan CRUD, custom-plan requests, payments, editable site content.
4. **Buyer storefront + checkout** (`/s/:businessCode` and `/l/:businessCode/:token`) — mobile-first, no login. Product showcase with real filtering, product detail, cart, address + pincode + OTP + payment (UPI/card/COD), COD confirmation, order tracking. Renders premium inside the Instagram/WhatsApp in-app browser.

## 3. Tech stack (locked)

- **React 18 + TypeScript + Vite**. Strict TS, no `any` unless unavoidable.
- **Routing:** React Router v6, lazy-loaded route groups per surface (marketing / app / admin / store) so bundles stay small.
- **Styling:** Tailwind CSS driven by a **custom design-token layer** (CSS variables → Tailwind theme). No stock Tailwind palette, no default shadows. Component primitives are hand-built (do **not** pull in a generic component kit that dictates look). shadcn/ui is allowed **only** as unstyled/renamed primitives fully re-skinned to the tokens — never its default appearance.
- **Animation:** GSAP + ScrollTrigger (pinned cinematic sequences), **Lenis** for smooth scroll, **Framer Motion** for component/enter transitions and layout animations.
- **3D:** React Three Fiber + drei + Three.js for the marketing hero and core-loop scenes. Lazy-load and code-split every 3D scene; never ship Three.js to the seller/admin/store bundles.
- **Data:** TanStack Query (server state, caching, optimistic updates) + a thin typed API client. **Zustand** for local/session state (auth tokens, cart, theme, UI).
- **Forms:** react-hook-form + zod. Every form is schema-validated; no ad-hoc validation.
- **Charts:** Recharts (seller analytics, admin overview), fully re-themed to tokens with tabular numerals.
- **Icons:** Lucide, plus a small set of custom SVGs for brand moments. No emoji as UI.
- **i18n-ready:** copy in a strings module (English now, Hinglish-friendly), currency/number via `Intl` `en-IN`.
- **SEO:** react-helmet-async (or Vite SSG for marketing routes if you set up `vite-plugin-ssr`/`vite-ssg` — preferred for the marketing site), sitemap, robots, JSON-LD.

## 4. Coding standards (non-negotiable — match the backend author's style)

- **camelCase** for variables, functions, props; **PascalCase** for components/types. **No underscores** in identifiers.
- **Module-wise structure.** One concern per folder. No god-files, no dumping ground `utils.ts`. Co-locate component + styles + hooks + tests per feature.
- **No redundant code.** Reuse primitives and hooks. If you write the same thing twice, extract it. No dead flexibility, no speculative abstractions, no one-off wrappers.
- **No hardcoding.** API base URL, keys, feature flags → env (`VITE_*`). Design values → tokens. Copy → strings module.
- **Short, meaningful comments only.** No long AI-style narration. Code reads like a senior human wrote it.
- **Typed API layer** mirrors the backend contract exactly (camelCase JSON, money in paise). One source of truth for types.
- **Accessibility is not optional:** semantic HTML, focus states, keyboard nav, ARIA where needed, `prefers-reduced-motion` respected everywhere.
- Prettier + ESLint (typescript-eslint, react-hooks, jsx-a11y). CI-clean.

## 5. Design system — the CartHedge brand

Build this first as `theme/` (tokens) + `ui/` (primitives). Everything downstream consumes it. **This is what makes it not look generic — invest here.**

### Brand idea
"**Money you were losing, now visibly saved.**" Premium, trustworthy, quietly confident — a fintech-grade tool dressed for Indian social commerce. Jade (protection, money kept) + warm gold (premium, rupee) on deep warm ink. Not another purple SaaS gradient.

### Color tokens (define both themes; ship dark as default on marketing, respect system on apps)

```
Brand
  jade-500   #0FA968   (primary action, "saved" states)
  jade-600   #0B8A53
  jade-700   #0A6E44
  gold-400   #E8B559   (premium accent, highlights, rupee moments)
  gold-500   #D49B3C

Ink (dark theme surfaces — warm, not blue-black)
  ink-950    #0B0B0E
  ink-900    #101015
  ink-850    #16161C
  ink-800    #1E1E26
  ink-700    #2A2A34

Paper (light theme — warm off-white, never cold #fff)
  paper-50   #FBF9F4
  paper-100  #F4F1E9
  paper-200  #E9E4D8

Neutrals / text
  text-hi    (dark) #F5F3EE  (light) #16161C
  text-mid   (dark) #A9A6A0  (light) #55524B
  text-low   (dark) #6E6B65  (light) #8A867D

Semantic
  success #0FA968   warning #E8B559   danger #E0574B   info #4C8DD4
  rto-risk #E0574B  rto-safe #0FA968
```

Both themes fully specified via CSS variables on `:root` / `[data-theme]`; every component reads variables so theme switching is instant and complete (no half-styled dark mode).

### Typography
- **Display / headings:** **Clash Display** (Fontshare) — self-hosted. Tight tracking, large sizes for cinematic headlines.
- **UI / body:** **Satoshi** (Fontshare) — self-hosted, the workhorse.
- **Numeric / money / code:** **JetBrains Mono** or **Geist Mono**, **tabular-nums** everywhere money or metrics appear.
- Self-host all fonts (no render-blocking CDN), `font-display: swap`, preload the two critical weights.
- Type scale: fluid `clamp()` scale (display 1 → caption). Generous line-height on body, tight on display.

### Space, radius, depth
- 4px base spacing scale; generous whitespace (premium = breathing room).
- Radius: `sm 8 / md 12 / lg 16 / xl 24 / pill`. Consistent.
- **Elevation via layered soft shadows + subtle borders**, not harsh drop shadows. On dark: 1px hairline `rgba(255,255,255,.06)` + soft ambient shadow. Optional **glass** (backdrop-blur + low-opacity fill + hairline) for floating nav, cards over 3D, and the buyer checkout sheet — used sparingly, not everywhere.
- Subtle **film grain / noise** overlay on marketing dark sections for cinematic texture.

### Motion system
- Durations: micro 120ms, standard 240ms, expressive 480ms, cinematic 700ms+. Easing: custom cubic-beziers (e.g. `[0.16,1,0.3,1]` for entrances). Define as tokens; never inline magic numbers.
- Principles: motion has **meaning** (reveals hierarchy, confirms actions, guides the eye). Nothing bounces gratuitously. Everything **60fps** — animate transform/opacity only, never layout-thrashing properties.
- **`prefers-reduced-motion`:** disable scroll-jacking, parallax, and 3D auto-motion; keep essential feedback. Provide a "reduce motion" affordance.
- Marketing uses Lenis smooth scroll + GSAP ScrollTrigger pinned scenes; apps use quick, snappy Framer Motion (no smooth-scroll hijack inside dashboards).

### UI primitives to build (re-skinned, token-driven)
Button (primary/secondary/ghost/danger + loading), IconButton, Input/Textarea/Select/Combobox, Toggle/Switch, Checkbox/Radio, Badge/Pill, Tag, Card, StatTile (metric + delta + sparkline), Table (sortable, sticky header, empty/loading), DataGrid, Tabs, Modal/Dialog, Drawer/Sheet (buyer checkout), Toast, Tooltip, Popover, DropdownMenu, Avatar, Skeleton loaders, Progress, Stepper, Pagination, DateRange, FileDropzone (image upload), EmptyState, MoneyText (paise→₹), StatusChip (order/COD/subscription states), KanbanCard/Column. Consistent focus rings, hover/active/disabled states on all.

## 6. Marketing website — cinematic 3D scroll (build section by section)

Dark cinematic by default (theme toggle available). Lenis smooth scroll. Grain overlay. Each section is a deliberate scene; transitions between sections are composed, not abrupt. Everything degrades gracefully with reduced motion and on low-power devices.

1. **Nav** — floating glass bar, logo (custom wordmark), links (Product, Features, Pricing, Guides, Contact), theme toggle, "Log in", primary "Start free trial". Shrinks/blurs on scroll. Mobile: full-screen animated menu.

2. **Hero** — full-viewport 3D scene (R3F): a glowing DM chat bubble that morphs/assembles into a clean **order card** as it floats; soft jade/gold volumetric light, particles, depth-of-field. Headline (Clash Display, huge): *"The DM is the shop. Now it's a business."* Sub: AI reads the chat, drafts the order, cuts RTO, gets you paid. Dual CTA: **Start 15-day free trial** / **See how it works**. Scroll cue. Runs at 60fps; static poster fallback for reduced-motion/low-end.

3. **The problem** (pinned scroll) — chaotic DM screenshots and sticky notes scatter, then numbers **count up** on scroll: "20–30% COD lost to RTO", "hours chasing payments", "orders tracked in screenshots". Copy lands the pain.

4. **The core loop** (pinned 3D sequence) — a horizontal pipeline that **assembles as you scroll**: DM thread → AI parses (tokens highlight) → order card → payment link / COD confirm → order board tile → delivered + "₹ saved". Each stage snaps into focus. This is the signature scene.

5. **AI order capture — interactive** — a replayable canned demo: a Hinglish DM ("*pink wali kurti M size, COD, 45 Civil Lines Delhi 110054, Priya 98…*") types out, then the AI-parsed **order card** fills field-by-field (item matched to catalog, size, address, COD) with a confidence chip. Button: "Replay" / "Try another message".

6. **RTO savings calculator — interactive** — three sliders (orders/month, average order value ₹, current RTO %). A big **₹ saved / month** counter animates live, with a comparison bar (loss now vs with CartHedge) and "pays for your plan X times over". Uses the real economics from the product. This is the conversion centerpiece.

7. **Everything you get** — **bento grid** of all features, each tile with a micro-animation on hover/in-view: DM order capture · Order board (kanban) · Storefront + share links · WhatsApp COD confirmation · Broadcast drops · Reseller price tiers · Customer ledger + COD-risk flags · Auto status updates · Courier handoff (Shiprocket) · Back-in-stock waitlists · GST-lite invoices · AI reply assistant · Live-selling *(roadmap badge)*.

8. **Storefront preview** — animated device mockups: the seller's public store + a link opening in an IG in-app browser, buyer picking a variant and checking out. Shows "one link, your brand" (business code in the URL).

9. **Pricing** — Starter / Growth / Pro cards with monthly toggle, feature comparison, "most popular" on Growth, per-order-above-quota note, and a **Custom plan** card → contact form (`POST /plans/custom-request` once logged in, or a lead form). Prices pulled live from `GET /api/v1/plans`. ROI line ties back to the calculator.

10. **Trust & security** — Razorpay-secured, seller-verified, per-business data isolation, "your money settles in your account". Logos/badges, calm and credible.

11. **Guides / how it works** — numbered onboarding walkthrough (connect → add products → share link → orders flow in), plus FAQ accordion. Content is real and SEO-rich.

12. **Testimonials** — seller stories carousel (placeholder data, structured for real testimonials + rating JSON-LD).

13. **Final CTA** — big cinematic closer, jade/gold light, "Start selling smarter today", trial CTA, no credit card line.

14. **Footer** — product/company/legal links, contact + socials pulled from `GET /api/v1/site`, newsletter, theme toggle, made-in-India mark.

15. **Contact page** — split layout: form (name, business, email, phone, message; zod-validated) + support hours/email/socials from `/api/v1/site`, subtle map/illustration. Success state animated.

**Marketing performance/SEO:** SSG or prerender these routes; per-route `<title>`/meta/OG/Twitter, canonical, JSON-LD (Organization, Product, FAQ, BreadcrumbList), sitemap.xml, robots.txt, semantic headings, image `alt`, lazy 3D, Lighthouse ≥ 95 on mobile perf/SEO/best-practices/a11y.

## 7. Seller app (`/app`) — clean, dense, delightful

App shell: collapsible sidebar (Dashboard, Orders, Products, Links, Customers, AI Desk, Broadcasts, Invoices, Analytics, Settings), top bar (business name + code, search, notifications, plan/trial chip, theme toggle, avatar menu). Snappy Framer Motion route transitions. **Trial/plan banner** when `subscription.status` is trial/expired; **expired → soft paywall** overlay on gated screens with a "Renew" CTA that opens billing (backend returns `402 subscriptionExpired` on gated APIs — handle globally).

**Auth & onboarding** — a genuinely premium **login/register**: split screen, ambient 3D/gradient panel on one side, form on the other; register is a friendly **multi-step onboarding** (business details → contact/socials → done, trial starts) with a stepper and celebratory success. `POST /auth/register|login`, store access token in memory + refresh token, silent refresh on 401.

**Dashboard home** — hero row of **StatTiles**: today's sales, month revenue, pending orders, COD-at-risk count, repeat-customer rate, and the **RTO savings meter** ("you saved ₹X this month" — the retention anchor, animated). Below: sales trend chart, order-status breakdown, recent orders, top products. From `GET /dashboard`, `GET /analytics/sales`, `GET /analytics/products`.

**AI insights panel** — a distinct, premium module (cards, not a wall of text): best sellers this month, COD-at-risk buyers to watch, repeat-rate trend, suggested broadcast window, RTO trend vs baseline. Derived from analytics endpoints; presented as glanceable, actionable insight cards.

**Order board** — the **kanban** (new / confirmed / packed / shipped / delivered / rto / cancelled), drag-to-advance with optimistic updates and confirm on risky transitions; card shows buyer, items, ₹total, payment + COD state, risk flag, courier status. Filters (status, channel, risk, date), search, and a table view toggle. Order drawer: full detail, timeline (`order_events`), change status, **ship** (courier handoff), resend COD confirm. `GET /orders/board`, `GET /orders/{id}`, `PATCH /orders/{id}/status`, `POST /orders/{id}/ship`.

**Products** — grid/table with search, category, trending, stock filters. **Add one-by-one** (rich form: name, description, category, price/reseller/compare in ₹→paise, SKU, variants builder [size/color], multi-image dropzone → `POST /uploads`, in-stock, trending) and **bulk import** (CSV/JSON with a mapping preview and per-row errors → `POST /products/bulk`). Inline stock/trending toggles. Offers manager (percent/flat, min amount, product scope, expiry). `GET/POST/PUT/DELETE /products`, `PATCH /products/{id}/stock|trending`, `/offers`.

**Links** — generate **product / cart / custom** checkout links; custom = type item + price in seconds. Show the branded URL (`/l/{businessCode}/{token}` and store `/s/{businessCode}`), one-click **copy** + QR + share-to-WhatsApp, live click/order counts, activate/expire. `GET/POST /links`, `PATCH /links/{id}`.

**Customers** — ledger table: name, phone, segment (retail/reseller), orders, LTV (₹), COD refusals, **risk flag**, last order. Detail drawer with history and editable segment/notes. Search + risk filter. `GET /customers`, `GET/PATCH /customers/{id}`.

**AI order desk** — paste a DM thread → **parse** → review the drafted order card (editable fields, matched catalog items, confidence) → **confirm** (creates the order) or discard. List of pending drafts. Feels magical: streaming/parse animation, clear edit affordances. `POST /ai/parse`, `GET /ai/drafts`, `POST /ai/drafts/{id}/confirm|discard`, `POST /ai/reply` (pre-sales reply assistant).

**Broadcasts** — compose a drop (name, message, segment: all/retail/reseller/repeat), schedule or send now, see sent counts and status. Template preview styled like WhatsApp. `GET/POST /broadcasts`, `POST /broadcasts/{id}/send`, `DELETE`.

**Invoices** — list + create GST-lite numbered invoices from delivered orders, printable/downloadable premium invoice layout. `GET/POST /invoices`, `GET /invoices/{id}`.

**Analytics / reports** — sales series (range picker), top products, monthly report with export. Recharts, tokened, tabular money. `GET /analytics/sales|products`, `GET /reports/monthly`.

**Settings & billing** — business profile (name, owner, contact, socials, address, GSTIN, logo upload), **payment settings** (own Razorpay keys — masked, "encrypted at rest" reassurance; UPI id; COD toggle + token amount; shipping fee), and **subscription/billing**: current plan, trial/renew via Razorpay checkout (`POST /subscription/checkout` → Razorpay modal → `POST /subscription/verify`), cancel, request custom plan. `GET/PUT /business`, `PUT /business/payments`, `GET /subscription`.

## 8. Admin panel (`/admin`) — platform control room

Separate login (`POST /admin/login`, role=admin JWT; never mix with seller auth). Distinct but same-family look (slightly more "console": denser, data-forward). Screens:

- **Overview** — KPI tiles: total businesses, trials, paying, MRR, GMV, revenue this month/total, orders last 30 days, open plan requests; growth chart; recent signups. `GET /admin/overview`.
- **Businesses** — searchable/filterable table (name, code, owner, plan, sub status, ends-at, orders, status). Detail view: profile, subscription, usage stats; actions: **suspend/activate** (instant, pauses their store), **assign plan** (any plan + negotiated `customPrice` + extend days). `GET /admin/businesses`, `GET /admin/businesses/{id}`, `PATCH .../status`, `POST .../plan`.
- **Plans** — CRUD table (create/edit plan: code, name, price, quota, per-order fee, features list, custom flag, active), showing active-subscription counts. `GET/POST /admin/plans`, `PUT /admin/plans/{id}`.
- **Plan requests** — pipeline of custom-plan enquiries (open/contacted/closed) with notes; link straight to the business to assign a plan. `GET /admin/plan-requests`, `PATCH /admin/plan-requests/{id}`.
- **Payments** — platform subscription revenue ledger. `GET /admin/payments`.
- **Site content** — editable CartHedge website content (contact, socials, tagline, announcement) that the marketing site reads. JSON-backed key/value editor with friendly forms. `GET/PUT /admin/settings` (public mirror `GET /api/v1/site`).
- **Account** — change admin password (`PUT /admin/password`).

## 9. Buyer storefront + checkout — mobile-first, no login, premium

Optimized for the IG/WhatsApp in-app browser: fast first paint, thumb-reachable, no dead weight (no Three.js here). Warm, trustworthy, brand-forward (uses the seller's name/logo/business code so buyers trust it).

- **Storefront home** (`/s/:businessCode`) — business header (logo, name, city, socials), trust strip ("Payments secured by Razorpay · Seller verified"), category chips, **trending** row, live offers, product grid. `GET /p/{code}/store`.
- **Product listing** — real **filtering** (category, price range, in-stock, search) + sort, responsive grid, quick-add, skeletons, smooth infinite/paged load. `GET /p/{code}/store/products`.
- **Product detail** — gallery (swipe), variant picker (size/color), price + compare-at, stock, add-to-cart, back-in-stock **waitlist** if out of stock. `GET /p/{code}/store/products/{id}`, `POST /p/{code}/waitlist`.
- **Link checkout** (`/l/:businessCode/:token`) — resolves a shared product/cart/custom link into a focused checkout. `GET /p/{code}/{token}`.
- **Cart & checkout sheet** — a polished bottom-sheet flow: cart → address form with **pincode validation + serviceability** and autofill on repeat (from OTP lookup) → **phone OTP verify** (`/p/{code}/otp`, `/otp/verify`) → payment choice **UPI intent / card / COD**. Prepaid → Razorpay (`/p/orders/{code}/pay` + `/p/payments/verify`); COD → confirmation flow (order summary → confirm → optional ₹ token). `POST /p/{code}/store/order` or `/p/{code}/{token}/order`.
- **COD confirmation** — the RTO-cutting flow: clean summary, confirm intent, optional token payment. `POST /p/orders/{code}/confirm`.
- **Order tracking** (`/track` / same link) — enter phone → live status timeline (confirmed → shipped → out for delivery → delivered), courier info, support contact. `GET /p/orders/{code}?phone=`.
- Every buyer screen: reassuring, fast, zero-friction, premium micro-interactions; error/empty/loading states designed, never raw.

## 10. Cross-cutting requirements

- **Responsive:** design mobile-first; verify at 360 / 390 / 768 / 1024 / 1280 / 1536+. Fluid type/space, no horizontal scroll, touch targets ≥ 44px, tables become cards on mobile, sidebar → bottom nav/drawer on mobile.
- **Dark & light:** both fully finished for every surface via tokens; instant switch; persisted per user; marketing defaults dark, apps follow system then user choice.
- **Performance:** route-level code splitting, lazy 3D with poster fallbacks, image `srcset`/AVIF/WebP + lazy, prefetch on intent, memoize hot lists, virtualize long tables/boards, no layout thrash, **60fps** interactions, Lighthouse ≥ 90 across apps / ≥ 95 marketing. No jank, no CLS.
- **SEO (marketing + storefront):** SSG/prerender, meta/OG/Twitter, JSON-LD (Organization, Product for storefront items, FAQ, Breadcrumb), canonical, sitemap, robots, semantic landmarks, accessible names.
- **States everywhere:** loading (skeletons), empty (designed with a next action), error (recoverable, human copy), success (satisfying). Global toast + error boundary. Optimistic updates where safe.
- **Money:** backend sends **paise (int)**. A single `MoneyText`/`formatPaise` helper renders `Intl.NumberFormat('en-IN', {style:'currency',currency:'INR',maximumFractionDigits:0})`, tabular-nums. Never do money math in floats; keep paise, format at the edge.

## 11. API integration

- Base URL from `VITE_API_BASE_URL`. All JSON camelCase. Build a **typed client** (`api/`) with modules mirroring the backend (auth, business, plans, products, links, orders, customers, analytics, broadcasts, invoices, ai, uploads, admin, store). TanStack Query hooks per resource; query keys namespaced; invalidate on mutations.
- **Auth:** seller access token (Bearer) in memory + refresh token persisted; silent refresh via `POST /auth/refresh` on 401; `POST /auth/logout` clears. Admin token separate store, never sent to seller endpoints or vice-versa. Buyer flow is tokenless except the short-lived `orderToken` from OTP verify, consumed at order create.
- **Gating:** intercept `402 {code:"subscriptionExpired"}` globally → route to billing / soft paywall. Handle `429` (rate limit) with friendly retry copy. Handle `403 paused` on buyer store.
- **Razorpay:** load checkout script lazily; open with `razorpayOrderId` + `razorpayKeyId` from checkout responses; on success post the signature to the matching verify endpoint. Buyer payments use the **seller's** Razorpay account (backend handles keys) — the frontend just drives the returned order.
- Reference endpoints (already built): `/api/v1/auth/*`, `/business`, `/business/payments`, `/plans`, `/subscription/*`, `/products*`, `/offers*`, `/links*`, `/orders*`, `/customers*`, `/dashboard`, `/analytics/*`, `/reports/monthly`, `/broadcasts*`, `/invoices*`, `/ai/*`, `/uploads`, `/admin/*`, `/site`, and public `/p/{code}/store*`, `/p/{code}/{token}`, `/p/{code}/otp[/verify]`, `/p/{code}/{token}/order`, `/p/{code}/store/order`, `/p/{code}/waitlist`, `/p/orders/{code}[?phone=]`, `/p/orders/{code}/pay|confirm`, `/p/payments/verify`.

## 12. Folder structure

```
frontend/
  src/
    main.tsx, App.tsx, router.tsx
    theme/           tokens (colors, type, space, motion), ThemeProvider, dark/light, tailwind preset
    ui/              re-skinned primitives (Button, Input, Card, Table, Modal, Sheet, StatTile, MoneyText, StatusChip, Kanban…)
    lib/             money, date, format, seo, validators (zod), analytics
    api/             typed client + TanStack Query hooks, per resource
    store/           zustand slices (auth, adminAuth, cart, theme, ui)
    hooks/           shared hooks (useMediaQuery, useReducedMotion, useCopy, useRazorpay…)
    marketing/       route group: sections/ (Hero, CoreLoop, RtoCalculator, Features, Pricing…), three/ (R3F scenes), pages
    app/             seller workspace: shell/, dashboard/, orders/, products/, links/, customers/, aiDesk/, insights/, broadcasts/, invoices/, analytics/, settings/, billing/, auth/
    admin/           overview/, businesses/, plans/, requests/, payments/, siteContent/, auth/
    store-front/     buyer: storefront/, product/, cart/, checkout/, tracking/
    strings/         copy
  public/            fonts (self-hosted), favicons, og images, robots.txt
  index.html, vite.config.ts, tailwind.config.ts, tsconfig.json, .env.example
```

## 13. Deliverables & acceptance

- All four surfaces built, wired to the real API, both themes complete, fully responsive.
- Marketing site is genuinely cinematic (3D hero + pinned core-loop + interactive RTO calculator) and passes Lighthouse ≥ 95 mobile with reduced-motion and low-end fallbacks.
- Seller/admin/store apps are clean, fast (60fps), with designed loading/empty/error/success states and no generic look anywhere.
- Code is camelCase, module-wise, typed, lint/format-clean, no redundancy, no hardcoded values, tokens/env/strings for everything variable.
- Build it surface by surface: **design system → marketing → seller app → admin → storefront**. Ship each surface working before the next. Ask before inventing product behavior the API doesn't support.

---
Note- If you find colour combination to common you can later that:It will be highly responsive and will look premisum on web and mobile both.
All the views, user,seller, admin, buyer- all the views shold be premium looking
both dark and light mode.
Next dont use generalised form css or text- dont make it look AI generate.
Make it a premisum brand webistt.
prompt accrdong to - award winning cinematic "3d scroll website".
It shoyld reflect what we do , what are plan what are features we offers, complete guides , sections ,proper animations, highly responsingve, very user interactive Very thoughtfult UX, scroll animations, proper 3d scroll, all features lisintg, contact pages, .
For seller aslo - proper admin views, clean dashboard,very interactive and useful features , lgin page higly interactive. Higly animations- not just normal very premisum and should look like developed but any ecper UI desiigner.
Not redualr forms, not normal colours, hihgly professinal premium.
very much SEO optimised, mobile and web both.
FOr buyers- proper product show case, ordering section, for selres- AI infights,for buyer - proper filtering , hihgly interactive components.

It should not feel laggy .


THe code should be very much clean , not reducndant, accordng to my coding practive, proper module wise.
