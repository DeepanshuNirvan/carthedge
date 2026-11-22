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
| 19 | Broadcasts | seller | FIXED | 4 Oct: only buyers who said yes are reached, each message ends with the buyer's own stop link, seller accepts the rules once (BUG-063). Later 4 Oct (assisted WhatsApp): offers wait for the seller's own WhatsApp; drafts only, send and schedule answer 409 (p5, p7, p8) |
| 20 | Invoices | seller | PASS | numbering unique under parallel creates |
| 21 | AI desk: parse, drafts confirm/discard, reply | seller | FIXED | p3 48/48 |
| 22 | DM assistant (signed simulated WhatsApp webhooks) | buyer, seller | PASS | understand → summary → "haan" → draft → seller tap → order; handoff; de-dup; pause/resume |
| 23 | Meta: OAuth URLs/state, webhook verify + HMAC (both secrets), deauthorize, data deletion | platform | FIXED | BUG-035; real IG login/DM = MANUAL |
| 24 | Admin console (API + UI) | admin | PASS | |
| 25 | Marketing/SEO/SSR meta/404s/sitemap/robots | anon | FIXED | BUG-044 phone overflow |
| 26 | Security headers, CORS, rate limits, uploads, XSS, SQLi | all | FIXED | |
| 27 | UI pass: every screen, desktop + phone, dark + light, console errors | all | FIXED | built-in browser on the real build: signup (OTP), product edit, settings quick-saves + payments, links, AI desk paste → confirm, storefront → cart → OTP → UPI claim → seller confirm, tracking, COD confirm, billing → Razorpay test checkout opens, all 12 seller + 7 admin pages (no console errors, no overflow at 1440); marketing at 375px fixed (BUG-044) |
| 29 | Assisted WhatsApp: CartHedge's number sends 3 approved templates via the Cloud API; sellers cannot connect WhatsApp (switch `WHATSAPP_SELLER_CHANNEL`); offers, cart reminders, back-in-stock never leave from CartHedge's number | seller, buyer, platform | PASS | 4 Oct: p8 15/15 against a fake Graph API (template names, params, copy-code button, token, `91…` numbers, no free text, 409 on WhatsApp connect); every suite now runs through it (219 template posts, 0 malformed); UI captured phone + desktop, dark + light |
| 28 | Product options (size × colour, any group), photos per choice, label details (MRP, origin, maker), WhatsApp offers consent | seller, buyer | PASS | 4 Oct: p7 55/55; UI driven end to end in the built-in browser (editor → storefront picker → checkout box → seller record → broadcast → stop link → order page); phone + desktop, dark + light over CDP, no console errors |

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
| BUG-048 | P1 | Boot / migrations | `database.Migrate` took a session advisory lock (`pg_advisory_lock`) through Neon's pgbouncer (transaction pooling). The unlock could run on a different server session, so the lock leaked onto a pooled connection and the next boot (local or a Render deploy) waited on it indefinitely. Seen 2026-10-03 during the feature build. Fixed: all pending migrations run in one transaction holding `pg_advisory_xact_lock`, released with the transaction. | FIXED (code) — a lock leaked by the old code clears when the pooler recycles that connection |
| BUG-049 | P1 | Seller app / Settings (feature build) | Leaving Settings crashed the app into the error screen in current Chrome: the practice chat's `useEffect(() => el.scrollIntoView())` returned the Promise `scrollIntoView` now returns, and React called it as the cleanup. Same crash after any practice message. Fixed: block-bodied effect; no other expression-bodied effect returns a value. | FIXED (verified in headless Chrome) |
| BUG-050 | P2 | Seller app / Settings (feature build) | Checkout charges re-rendered endlessly ("Maximum update depth") because its draft source was a new object every render and `useDraft` reset on identity. Fixed in `useDraft`: the source is compared by value. | FIXED (verified) |
| BUG-051 | P2 | Public API (feature build) | `GET /api/v1/site` returned every site setting, including the new staff-only `billing` and `aiPricing`. Fixed: removed from the public response. | FIXED (code) |
| BUG-052 | P2 | Buyer order page (feature build) | Following an exchange's "Replacement order" link kept the previous order on screen (same component instance), and "Withdraw" without a verified code opened the return form. Fixed: the order view is keyed by order code; withdraw is verify → confirm; an expired 15-minute code asks again. Also the drawer offered "Create invoice" on invoiced orders (server 409) — orders now carry `invoiceId` and show "Open invoice". | FIXED (verified end to end in the UI) |
| BUG-053 | P0 | Orders / database pool (pre-existing) | Simultaneous checkouts could freeze ordering: `order.Create` priced items through the pool (`ResolveLine`) while holding its own transaction connection. Once every pool connection was held by a checkout waiting for a second one, all of them waited until the client gave up. With pgx's default pool (max(4, CPUs) — 4 on a one-CPU Render instance) four buyers at once were enough. Stress test: 40 simultaneous checkouts hung for 5 minutes. Fixed: everything inside a transaction reads through that transaction (`product.DB`); the same pattern was removed from signup, subscription verify, refunds and exchange replacements (now one transaction via `order.CreateIn`). Pool default raised to 20 connections, 2 kept warm. | FIXED (stress: 40 at once → 25 orders, 15 out-of-stock refusals, 12 s) |
| BUG-054 | P0 | Refunds (feature build) | Three simultaneous refunds of the full amount all went through (₹3,451 refunded on a ₹1,483 order in the race test): the cap was checked in the same statement that took the order lock, and under READ COMMITTED a statement that waited for a lock still sums other tables from its old snapshot. Fixed: lock first, sum in the next statement. | FIXED (race test R4) |
| BUG-055 | P1 | Razorpay refunds (feature build) | A Razorpay 5xx was treated as "declined" (could lead to a second refund on retry), refunds carried no id Razorpay could be asked about, and two quick retries could both call Razorpay. Fixed: typed Razorpay errors (only 4xx is a decline), our refund id sent as the refund `receipt`, retry/void ask Razorpay for that receipt first, and the refund row stays locked during the call. | FIXED (unit test + race) |
| BUG-056 | P2 | Privacy / data retention | The privacy policy named only Gemini and missed return photos, refunds, B2B GSTIN, dropped-checkout reminders, device push, AI usage counts and support access; checkout had no notice of what the details are used for; dropped-checkout rows were kept forever. Fixed: policy/terms/data-deletion text updated, a notice under Continue at checkout, rows deleted after 30 days. | FIXED (needs a lawyer's review) |
| BUG-057 | P2 | Products (pre-existing) | The product form required a category, which the API does not, so products from CSV/bulk import (no category) could not have their stock or price edited in the form ("Category helps buyers filter" blocked Save). Fixed: category optional in the form, with the hint kept. The API also had no length limits on name, category, description or SKU — now 200 / 60 / 5,000 / 64. | FIXED (verified in the UI) |
| BUG-058 | P3 | Orders (pre-existing) | Any database error while loading the seller during order creation was reported as "business not found"; a client that hung up was logged as an error. Fixed: only a missing row says not found; hang-ups log as a warning. | FIXED (code) |
| BUG-059 | P1 | Rate limits / OTP (pre-existing) | Counters were `INCR` then a separate `EXPIRE` only on the first hit. If that call was skipped (client gone, Redis blip) the counter never expired: a permanent lockout for that IP or phone. Found live: `rl:login:::1` at 24 with no TTL blocked all local logins. Same pattern in the buyer OTP send counter (a stuck key = that buyer can never get a code from that store), OTP attempts and the trial-per-IP cap. Fixed: one atomic Lua step (`cache.Count`) that also gives any counter without an expiry one, so stuck keys heal on their next hit. | FIXED (verified: stuck key healed, p1 68/69, race, stress) |
| BUG-060 | P0 | Products / tenant isolation (pre-existing) | `POST /products` upserted variants by whatever id the client sent (`on conflict (id) do update`), and variant ids are public in the storefront JSON — a seller could create a product carrying another store's variant id and overwrite that store's variant name, price and stock. Fixed: variants are written in one statement that updates only ids the product already owns; any other id is inserted fresh. | FIXED (p7 O9.1–O9.2) |
| BUG-061 | P2 | Products / bulk import (pre-existing) | A CSV or bulk re-import matched by SKU wiped the product's photos and variants (the update wrote `images = []` and deleted every variant the sheet did not mention). Fixed: omitted photos, options and variants keep what is stored; the bulk import modal no longer sends empty lists. | FIXED (p7 O1.13–O1.14) |
| BUG-062 | P3 | Customers / DPDP erase (pre-existing) | Erasing a buyer deleted WhatsApp chats by the 10-digit phone, but WhatsApp chats are keyed by the number with its country code (`91…`), so the chats stayed. Fixed: both forms are deleted; the buyer's consent record is erased too. | FIXED (p7 O6.2) |
| BUG-064 | P1 | Security / OTP (pre-existing, OPS-1) | In production without a WhatsApp provider, every one-time code (buyer checkout and seller signup) was written in plain text to the server log, and the API answered "sent" although nothing was delivered. Fixed: production never logs codes; with no number configured the API says so (503) unless the buyer gave an email, which then gets the code. | FIXED (unit tests `notify`, `otp`) |
| BUG-063 | P1 | Broadcasts / compliance (pre-existing) | Broadcasts went to every customer in a segment with no consent check and no way to stop them — against WhatsApp's opt-in policy and the DPDP Act. Fixed: WhatsApp-offers consent (unticked box at checkout, order page, START/STOP on WhatsApp, a one-tap stop link in every offer, seller stop on request), each change logged with wording, source, IP and browser; broadcasts reach only buyers who said yes; the seller accepts the broadcast rules once (recorded). | FIXED (p7, p5 updated to the new rules) |

### Pre-launch pass, 25 Oct 2026 (go-live checklist: [GO-LIVE.md](../GO-LIVE.md))

BUG-001, BUG-002 and BUG-007 re-checked read-only on the live DB: all three still open (seed admin + demo passwords work; three "QA Plan v3" plans on the public pricing page). Production now refuses the two seed passwords (BUG-068), but the owner must still change them.

| ID | Sev | Area | Summary | Status |
|----|-----|------|---------|--------|
| BUG-065 | P1 | DM assistant | "Is the rose chikankari kurti available?" 22 days after an old bargaining message was handed to the owner as a price request: chats had no session boundary, so the whole old thread and a stale cart were read | FIXED — 72 h of quiet starts a fresh conversation (cutoff, empty cart; drafts/handoffs keep state); handoff judged on the newest messages; `"none"` handoff ignored. Eval 18/18 on gpt-4.1-mini, E2E p9 8/8 |
| BUG-066 | P2 | DM assistant | After an order, "order kab tak aayega?" re-added the ordered item to a new cart and asked its size | FIXED — a status question never changes the cart (unit test) |
| BUG-067 | P2 | DM assistant | Writer told a buyer "confirm kar diya hai" while details were still missing | FIXED — hard rule: only the order system says an order is confirmed |
| BUG-068 | P0 | Security | Seed admin/demo passwords accepted in production | FIXED (guard) — refused in production with a clear message; owner action still required |
| BUG-069 | P1 | Security / scam | Every store showed "Verified seller" (hard-coded) — a fraudulent store got CartHedge's trust badge | FIXED — "Mobile verified", only when the seller's mobile passed OTP |
| BUG-070 | P1 | Security | Production without SMTP logged email bodies, i.e. password-reset links | FIXED — refused, never logged; subjects sanitised against header injection |
| BUG-071 | P1 | Security | No per-account login limit; admin password change left old admin sessions valid | FIXED — 10 wrong passwords / 15 min per email (seller + admin); admin sessions revoked on change |
| BUG-072 | P1 | Dependencies | govulncheck: 17 reachable vulns (pgx GO-2026-5004 SQL injection, jwt, go-redis, x/text, AWS SDK, EOL Go 1.23 stdlib) | FIXED — modules upgraded; Dockerfile on Go 1.27 / Node 22 / Alpine 3.22, non-root |
| BUG-073 | P2 | Security | Login token accepted in the URL on every API route | FIXED — event stream only |
| BUG-074 | P2 | Buyer UI | Storefront sort select 12 px on phones (iOS zoom); policy contact links 24 px tall | FIXED — 16 px; 48 px tap targets |
| BUG-075 | P3 | Seller UI | RTO meter drew a full red "your rate" bar while still "Measuring" | FIXED — empty track until 5 settled COD orders |
| BUG-076 | P0 | Payments | A buyer who paid in the Instagram/WhatsApp browser and lost the tab before the callback stayed "unpaid" forever (seller-account payments never reach the platform webhook), and the pay button would happily take a second payment | FIXED — `payment.SettlePending` (15-min sweep + before every new checkout) books captured Razorpay payments; integration test `settle_integration_test.go` |
| BUG-077 | P1 | Payments | `MarkPaid` rewrote any order: a second payment re-sent "we are packing it", a payment landing on a cancelled order told the buyer it was being packed and never became a refund, a late one on a refunded order flipped it back to paid | FIXED — settles once (guarded on payment status); paid-after-cancel books a refund due and tells the buyer; a duplicate charge alerts the seller to refund it |
| BUG-078 | P1 | Orders / stock | Online-payment orders nobody paid for held their stock (and coupon uses) forever | FIXED — gateway sellers only: unpaid after 48 h (Razorpay asked first) → cancelled, stock and coupon released, buyer told |
| BUG-079 | P1 | Auth | A suspended seller kept refreshing their session forever (only login checked the status) | FIXED — refresh refuses suspended/purged businesses; a DB blip does not sign anyone out |
| BUG-080 | P2 | DM assistant | "We'll check and get back" (and the fallback holding line) alerted nobody, so the promise was never kept | FIXED — writer flags it with a hidden `[ASK OWNER]` token, Go strips it and alerts the owner; service date checks excluded (the enquiry already carries them) |
| BUG-081 | P2 | DM assistant / reminders | The one follow-up to a quiet buyer, and the abandoned-cart reminder, could land at 3 a.m. | FIXED — both go out only 10:00–20:00 IST (their windows always contain a daytime slot) |
| BUG-082 | P2 | Billing | Autopay overage marked "billed" before Razorpay accepted the add-on, so a failed call dropped that month's overage | FIXED — un-marked on failure, retried next tick |
| BUG-083 | P3 | Orders | A COD confirmation link could stamp "buyer confirmed" on a cancelled order | FIXED — only open orders confirm |
| BUG-084 | P2 | DM assistant | The grounding check stopped invented prices and links but not invented times ("2-3 din me aa jayega") | FIXED — any days/hours figure in a reply must already be in the shop's delivery or return policy facts, else the draft is rewritten (unit test) |

## Product gaps noticed (not built — need an owner call)

- COD confirm page shows only the order code, not the item/total/address summary the product spec describes.
- The SPA polls (board 30 s, inbox 10 s) and never opens the SSE stream; BUG-033 only mattered for API clients.
- WhatsApp voice notes / locations / stickers get no reply (silently dropped).
- Buyer cannot see "only N left" (stock counts are private by design), so an over-quantity cart fails at checkout with "out of stock".
- Seller cannot mark a manual prepaid order as paid (cash/bank transfer) — only buyer UPI claims can be settled.
- Customer "notes" from the spec are not implemented (segment + risk flag only).

## Operational blockers (owner decisions, not code bugs)

- **OPS-1 — no OTP or WhatsApp delivery in production.** Code side done 4 Oct 2026: CartHedge's own number sends the approved templates through Meta's Cloud API (no DLT needed for WhatsApp). **Owner action left:** add the number, the three templates and a system-user token in Meta, then set `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_TOKEN` on Render ([WHATSAPP-INSTAGRAM-GO-LIVE.md](../WHATSAPP-INSTAGRAM-GO-LIVE.md), "Phase 1"). Until then production sends no codes (BUG-064).
- **OPS-2 — rotate the secrets shared in chat** (OpenAI, Razorpay, Meta app secrets, DB password, JWT secret, Mailtrap) — they were pasted into a conversation transcript.
- **OPS-3 — buyer payments had no webhook safety net.** RESOLVED 22 Nov 2026 (BUG-076): a 15-minute sweep asks Razorpay, with the seller's own keys, about every checkout from the last 3 days that never reported back and books the captured ones; the pay button runs the same check first, so a buyer who paid and closed the tab is never charged twice.
- **OPS-4 — Render deploys overlap two instances.** BUG-034 made the DM loops claim atomically; the jobs (expiry, reminders, COD nudge) and the broadcast scheduler already used atomic `update … returning`, so they were safe.
