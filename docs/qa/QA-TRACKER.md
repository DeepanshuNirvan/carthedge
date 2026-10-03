# CartHedge QA tracker (UAT, Oct 2026)

Living file. Every tested area, every bug, its fix status. **Resume from here — anything marked PASS/FIXED does not need retesting** unless code in that area changes. Manual-only checks live in [MANUAL-TESTS.md](MANUAL-TESTS.md).

## How to resume

- Server: built binary run from the session scratchpad with the owner's UAT env (Neon DB + Upstash Redis + OpenAI + Razorpay test). Local overrides only: `PUBLIC_BASE_URL=http://localhost:10000`, `CORS_ORIGINS=http://localhost:10000`, `FRONTEND_DIR=<repo>/frontend/dist`. Owner approved testing against the shared DB (2026-10-02).
- OTPs: WhatsApp is unconfigured, so OTP codes are only written to the server log (`"whatsapp (dev log)"`).
- Test data is prefixed `qa-` (store codes `qa-...`, emails `qa.*@example.com`, phones `9000xxxxxx`). Nothing pre-existing was edited except via its own API (none deleted).
- E2E suite (Node, no deps) lives in the session scratchpad: `p1-auth`, `p2a-catalog`, `p2b-checkout`, `p2c-billing`, `p3-ai`, `p4-expired`, `p5-misc`. After BUG-003 the suite simulates clients with `IPH=CF-Connecting-IP`.
- Build/verify: `go vet ./... && go test ./...` (backend), `npx tsc --noEmit && npx eslint src && npx vite build` (frontend).

## Status legend

PASS = verified working · FIXED = was broken, fixed, re-verified · OWNER ACTION = needs the owner (data/credentials/config) · MANUAL = needs a human · TODO = not tested yet

## Coverage matrix

| # | Area | Roles | Status | Notes |
|---|------|-------|--------|-------|
| 1 | Static checks: go build/vet/test, tsc, eslint, vite build | — | PASS | green before and after the fixes (charts chunk 518 kB warning only) |
| 2 | Auth: register (signup OTP, store code), login, refresh, logout, forgot/reset | anon, seller | FIXED | p1 68/69 after fixes (only BUG-007 data left) |
| 3 | RBAC: seller vs admin tokens, tampered/expired JWT | all | FIXED | alg-none / wrong secret / expired / role swap 401; BUG-004 fixed |
| 4 | Tenant isolation (IDOR) across sellers | sellers | PASS | 404 on foreign orders/links/customers/claims/drafts/chats/invoices/broadcasts/subscription payments |
| 5 | Plan gating (ai, aiReply, offers, broadcasts, invoices, courier, waitlist) | trial/starter/growth/pro/custom | PASS | 403 `featureNotInPlan`; admin changes apply instantly |
| 6 | Subscription: trial, expired (402), checkout, verify, webhook, overage, cancel, custom request | seller | FIXED | p2c 64/64, p4 12/12 |
| 7 | Suspension → seller API + storefront paused | admin, seller, buyer | FIXED | now 403 `accountSuspended` → app signs out |
| 8 | Business profile, payments, AI settings | seller | FIXED | partial saves, key verification, UPI shape, phone lock |
| 9 | Products: CRUD, variants, stock, bulk import, uploads | seller | FIXED | p2a 83/83 |
| 10 | Offers | seller | PASS | |
| 11 | Links: product/cart/custom, resolve, clicks, expire | seller, buyer | FIXED | BUG-030 |
| 12 | Storefront | buyer | PASS | |
| 13 | Checkout: OTP, order token, tampering, stock, COD, prepaid, UPI claim | buyer | FIXED | p2b 78/78 |
| 14 | Payments: Razorpay order/verify, webhook, replay, idempotency | buyer, platform | FIXED | |
| 15 | Orders: board, filters, transitions, ship, resend COD, manual, SSE | seller | FIXED | SSE streams again |
| 16 | Tracking + COD confirm | buyer | FIXED | BUG-046 label, phone carried from checkout |
| 17 | Customers ledger, segments, reseller pricing | seller, buyer | FIXED | |
| 18 | Dashboard, analytics, insights, monthly report CSV | seller | FIXED | IST boundaries, formula-safe CSV |
| 19 | Broadcasts | seller | PASS | sent counts are fake while WhatsApp is unconfigured — see OPS-1 |
| 20 | Invoices | seller | PASS | numbering unique under parallel creates |
| 21 | AI desk: parse, drafts confirm/discard, reply | seller | FIXED | p3 48/48 |
| 22 | DM assistant (signed simulated WhatsApp webhooks) | buyer, seller | PASS | understand → summary → "haan" → draft → seller tap → order; handoff; de-dup; pause/resume |
| 23 | Meta: OAuth URLs/state, webhook verify + HMAC (both secrets), deauthorize, data deletion | platform | FIXED | BUG-035; real IG login/DM = MANUAL |
| 24 | Admin console (API + UI) | admin | PASS | |
| 25 | Marketing/SEO/SSR meta/404s/sitemap/robots | anon | FIXED | BUG-044 phone overflow |
| 26 | Security headers, CORS, rate limits, uploads, XSS, SQLi | all | FIXED | |
| 27 | UI pass: every screen, desktop + phone, dark + light, console errors | all | FIXED | built-in browser on the real build: signup (OTP), product edit, settings quick-saves + payments, links, AI desk paste → confirm, storefront → cart → OTP → UPI claim → seller confirm, tracking, COD confirm, billing → Razorpay test checkout opens, all 12 seller + 7 admin pages (no console errors, no overflow at 1440); marketing at 375px fixed (BUG-044) |

## Bug log

| ID | Sev | Area | Summary | Status |
|----|-----|------|---------|--------|
| BUG-001 | P0 | Security / data | Seed admin `admin@carthedge.in` / `Admin@123` (printed in `backend/README.md`) logs in on the shared DB the live Render app uses → anyone can run the admin console | OWNER ACTION |
| BUG-002 | P0 | Security / data | Seed seller `demo@carthedge.in` / `Demo@123` logs in on the shared DB, and `demo-store` holds the real @carthedgeofficial Instagram connection → anyone can read buyer DMs and reply as the brand | OWNER ACTION |
| BUG-003 | P1 | Security | Rate limits + trials-per-IP cap keyed on client-set `X-Forwarded-For[0]` → all limits bypassable | FIXED — `ClientIP` = `CF-Connecting-IP` (set by Render's Cloudflare edge) else socket |
| BUG-004 | P1 | Security | OAuth `state` JWT accepted as a seller access token (10-min account takeover from the authorize URL) | FIXED — `Auth` requires the `biz` claim |
| BUG-005 | P2 | Security | Password reset left existing refresh sessions alive | FIXED — reset stamps `auth:revoked:<biz>`, older refresh tokens refused; refresh rotation now atomic (GETDEL) |
| BUG-006 | P3 | Auth | Password > 72 bytes → 500 | FIXED — 400 "at most 72 characters" (register, reset, admin) |
| BUG-007 | P3 | Data | Three "QA Plan v3" plans active on public pricing | OWNER ACTION — deactivate in admin → Plans |
| BUG-008 | P3 | UX | Stray space around email failed login/register | FIXED — trimmed in zod + API |
| BUG-009 | P0 | Billing | Subscription verify replayable (+30 days per call); webhook + verify extended twice | FIXED — pending→paid flip in the activation tx; one shared `payment.ActivateSubscription` |
| BUG-010 | P1 | Billing | Renewal never reset the usage period → overage on every order since signup | FIXED — `starts_at = now()` on activation (and on admin plan change) |
| BUG-011 | P1 | Inventory | Product edit wiped counted stock (form omits `stockQty`); `stockQty:-1` saved as tracked 0 | FIXED — omitted keeps stock (product + variants), negative = untracked; switching a sold-out counted item back on makes it toggle-managed |
| BUG-012 | P1 | Orders | Concurrent status changes all applied (3 cancels → 3 restocks) | FIXED — update guarded on the read status |
| BUG-013 | P1 | Payments | Cancelled/RTO/delivered orders could be paid or UPI-claimed | FIXED |
| BUG-014 | P2 | Checkout | Rejected order burned the buyer's OTP token | FIXED — token handed back on any refusal after consume |
| BUG-015 | P2 | Data | Refused orders created ghost customers / bumped counts | FIXED — customer upsert inside the order transaction |
| BUG-016 | P2 | Pricing | Reseller got a pricier variant at base price | FIXED — `linePrice` rule + test |
| BUG-017 | P2 | Security / cost | OTPs sent for non-existent store codes (free relay) | FIXED — store must exist and be active |
| BUG-018 | P2 | Analytics | UTC day/month boundaries for an IST business | FIXED — dashboard, sales, insights, report, CSV dates, order date filter, admin revenue month |
| BUG-019 | P2 | Security | CSV formula injection in monthly export | FIXED — `cell()` defuses `= + - @` |
| BUG-020 | P2 | Billing | Negotiated price stuck after switching to a standard plan | FIXED |
| BUG-021 | P2 | UX | Suspended seller shown the paywall | FIXED — 403 `accountSuspended`, app signs out, login explains |
| BUG-022 | P2 | Trial abuse | Verified mobile swappable in profile | FIXED — phone locked (API 400, field read-only in Settings) |
| BUG-023 | P2 | Payments setup | Wrong Razorpay keys / malformed UPI accepted | FIXED — keys checked with Razorpay on change; UPI shape validated |
| BUG-024 | P2 | Uploads | No size cap, no content check, folder listings | FIXED |
| BUG-025 | P3 | API | Malformed ids leaked Postgres errors | FIXED — router-level UUID check + body ids in `ResolveLine` |
| BUG-026 | P3 | Validation | Negative fees, RTO 250%, empty custom request accepted | FIXED |
| BUG-027 | P3 | Orders | Ship on a non-shippable order stamped courier details | FIXED — transition checked first |
| BUG-028 | P3 | Import | CSV `inStock` "0"/"no" = in stock | FIXED |
| BUG-029 | P3 | API | Product `createdAt` not ISO-8601 | FIXED |
| BUG-030 | P3 | Analytics | Order POST counted as a link click | FIXED |
| BUG-031 | P1 | Orders | Double-tap Confirm on an AI draft → duplicate orders | FIXED — draft claimed at the start of the order tx |
| BUG-032 | P2 | AI cost | No input cap on paid AI calls | FIXED — 12,000-char paste, 1,000-char question |
| BUG-033 | P1 | Live board | SSE always 500 (logging wrapper hid `Flusher`) | FIXED — `Flush`/`Unwrap` on the wrapper |
| BUG-034 | P2 | DM assistant | Two instances could answer the same buyer | FIXED — atomic claim with `FOR UPDATE SKIP LOCKED` (ingest + nudge) |
| BUG-035 | P2 | Security | Manual channel connect trusted the typed account id | FIXED — token must own the id (Graph check) |
| BUG-036 | P3 | Payments | Webhook idempotency key never expired, failures never retried | FIXED — DB flip is the guard; failures return 500 so Razorpay retries |
| BUG-037 | P3 | SEO | Preview description clamp cut by bytes (Hindi → invalid UTF-8) | FIXED — by rune + test |
| BUG-038 | P3 | AI desk | Confirming a draft didn't normalise the phone or check the pincode | FIXED |
| BUG-039 | P1 | Settings | Saving only a UPI ID wiped the Razorpay key id (form sends dirty fields, API overwrote all) | FIXED — omitted = keep |
| BUG-040 | P1 | Settings | COD switch, COD token, shipping fee, RTO baseline and logo could never be saved (400 "name and ownerName are required", silent in UI) | FIXED — profile API takes partial updates; UI shows errors |
| BUG-041 | P2 | Billing | Any seller could self-checkout another business's custom plan | FIXED — only the assigned business renews it |
| BUG-042 | P3 | Signup | Signup stored a malformed UPI ID ("not a vpa") — only Settings checked it | FIXED — one `httpx.ValidUPI` for both + inline zod error on the form |
| BUG-043 | P2 | Payments | CSP blocked Razorpay's own risk-detection script (`cdn.razorpay.com`) on every checkout | FIXED — `cdn.razorpay.com` in script-src, `*.razorpay.com` in connect-src (verified the bundle now loads) |
| BUG-044 | P2 | Marketing UI | Homepage 410px wide on a 375px phone (end lamp's glow); horizontal scroll, menu button clipped | FIXED — strand wrapper `overflow-x-clip` (glow kept) |
| BUG-045 | P2 | Orders UI | Order drawer offers Ship on *confirmed* orders but the API only allowed packed→shipped, so Ship always failed | FIXED — confirmed→shipped allowed (sellers who skip "packed") |
| BUG-046 | P3 | Buyer UI | Tracking said "Total (paid online)" for unpaid prepaid orders and offered "Complete payment" on cancelled ones; buyer had to retype the phone right after checkout | FIXED — honest label, no pay button on closed orders, phone passed in router state (never the URL) |
| BUG-047 | P3 | Billing UI | Razorpay subscription checkout did not prefill the seller's name/phone/email | FIXED |

## Product gaps noticed (not built — need an owner call)

- COD confirm page shows only the order code, not the item/total/address summary the product spec describes.
- The SPA polls (board 30 s, inbox 10 s) and never opens the SSE stream; BUG-033 only mattered for API clients.
- WhatsApp voice notes / locations / stickers get no reply (silently dropped).
- Buyer cannot see "only N left" (stock counts are private by design), so an over-quantity cart fails at checkout with "out of stock".
- Seller cannot mark a manual prepaid order as paid (cash/bank transfer) — only buyer UPI claims can be settled.
- Customer "notes" from the spec are not implemented (segment + risk flag only).

## Operational blockers (owner decisions, not code bugs)

- **OPS-1 — no OTP or WhatsApp delivery in production.** `WHATSAPP_API_URL` is blank, so every OTP, COD confirmation, status update, broadcast and handoff alert is only *logged* while the code reports success. Real sellers cannot finish signup and real buyers cannot check out on the live site. Needs a WhatsApp/SMS provider (DLT) or an email-OTP fallback decision.
- **OPS-2 — rotate the secrets shared in chat** (OpenAI, Razorpay, Meta app secrets, DB password, JWT secret, Mailtrap) — they were pasted into a conversation transcript.
- **OPS-3 — buyer payments have no webhook safety net.** Buyer money settles in the seller's own Razorpay; if a buyer closes the tab after paying but before the verify call, the order stays unpaid in CartHedge (seller sees it in Razorpay). A reconcile job using the seller's keys would close this.
- **OPS-4 — Render deploys overlap two instances.** BUG-034 made the DM loops claim atomically; the jobs (expiry, reminders, COD nudge) and the broadcast scheduler already used atomic `update … returning`, so they were safe.
