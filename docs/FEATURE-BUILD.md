# Feature build — Oct 2026 (resume file)

Owner request (2026-10-03): build the gap list from [FEATURE-GAPS.md](FEATURE-GAPS.md) items 1–8 + real GST. No commits, no Docker, run with the UAT env, migrations for every DB change, no redundant code, responsive UI, validate everything. Update `product.txt` / `PRODUCT.md` at the end.

## Rules that bind this build (read before touching code)

- **Migrations are append-only once applied.** The UAT Neon DB is shared with the deployed Render app and `Migrate` runs at boot, so the first local server start applies a new file for good. Never edit an applied migration — fix forward with the next number. Every change must be additive (old deployed code keeps working on the new schema).
- **Go 1.23 APIs only** (Dockerfile builds with `golang:1.23-alpine`, local toolchain is newer). `go vet ./...` runs the `stdversion` check. HKDF comes from the already-vendored `golang.org/x/crypto/hkdf`.
- Money is paise ints; prices are GST-inclusive (invoices extract tax, totals never change).
- One pricing path: `shop.Pricing.Totals` is used by order creation, the buyer quote endpoint and the DM assistant's summary — the UI never does money maths.
- Line endings don't matter for the repo: `core.autocrlf=true` and the index is LF for every file. Tokens only (no raw hex / arbitrary values), jade single accent, verify both themes + 390px.
- `useEffect` bodies are blocks, never expression arrows: current Chrome returns a Promise from `scrollIntoView`/scroll methods, and React calls whatever an effect returns on cleanup (crashed Settings once).
- **Inside a transaction, every query goes through that transaction.** Calling anything that uses the pool while holding a transaction connection deadlocks the pool under load (BUG-053). Functions that may run inside one take a `product.DB` / `shop.Querier`; an order created inside another transaction uses `order.CreateIn` + `Announce`.
- **Lock, then read in the next statement.** Under READ COMMITTED a statement that waited for a row lock still reads other tables from its old snapshot, so caps checked against sums must be computed after the lock (BUG-054).
- Razorpay: only a 4xx is a decline; a 5xx or no answer is "outcome unknown" and stays pending. Refunds carry our id as `receipt` and are looked up before any retry or void.
- Run the E2E suites with `IPH=CF-Connecting-IP` — the server only trusts that header, so without it every simulated buyer shares 127.0.0.1 and trips the OTP limit.
- Keep existing invariants from `docs/qa/QA-TRACKER.md` / memory `carthedge-qa-oct2026` (CF-Connecting-IP, biz claim, guarded status updates, keep-stock edits, IST boundaries…).

## Todo

Legend: `[ ]` todo · `[~]` in progress · `[x]` done + verified

### Foundations
- [x] `internal/shop`: Policies, AI profile, checkout Pricing (+Totals), GST profile, alert prefs — validated JSON on `businesses`
- [x] `internal/gst`: GSTIN checksum, state codes (GSTIN / name / pincode), FY, per-scope serials (`doc_counters`)
- [x] `internal/alert`: owner alerts by prefs (WhatsApp, email, web push) + VAPID/aes128gcm web push (stdlib + x/crypto)
- [x] Migration `0015` (all schema below), checked additive

### 1. Returns, exchanges, refunds, buyer self-service
- [x] Return/exchange request (reason, note, photos, items, partial qty) — buyer (track page, OTP) and seller
- [x] Flow requested → approved → picked_up → received → completed (refund | exchange); rejected / cancelled
- [x] Policy enforcement: window from delivery, allowed kinds/reasons, photo-required reasons
- [x] Restock on **received** only, per-line restock flag (damaged stays out)
- [x] Replacement order linked to original (`orders.replacement_of`), credit applied, not billed as a new plan order
- [x] Refund records (pending/processed/failed, method, reference), over-refund guard, Razorpay refund via seller keys
- [x] Credit note auto-issued for refunds on GST-invoiced orders
- [x] Buyer cancel (policy window) + change address before dispatch (OTP); seller address edit
- [x] Buyer photo upload endpoint (order-token gated)

### 2. AI customisation
- [x] Structured store policies (returns, cancellation, delivery, COD max, warranty, terms, support contact, FAQs)
- [x] Buyer policy page `/s/:code/policies` (+ SPA route meta, linked from store/checkout/track)
- [x] FAQ pairs used word for word (relevant ones only, token-capped)
- [x] Tone / language / emoji / aap-tum
- [x] Business hours, away message, "AI only when closed" mode, next-open time in facts
- [x] Seller-chosen handoff topics + hand off orders above ₹X (Go-enforced)
- [x] Per-product details (label/value) + size chart image, in product page and AI facts
- [x] Practice chat (stateless turn, no orders placed, rate-limited)
- [x] AI token usage recorded per seller/day/model

### 3. New-order alerts
- [x] Owner alert on new order / return / buyer cancel / address change / UPI claim / handoff, per prefs
- [x] Web push (service worker, subscribe/unsubscribe, expired endpoints pruned)
- [x] In-app live toast + chime via SSE while the app is open

### 4. Stock quantity in product form
- [x] Track-stock toggle + qty for product and variants; edit sends qty only when changed

### 5. Packing slips
- [x] Per-order slip (ship-from/to, items, COD to collect, QR), bulk slips + pick list, print CSS

### 6. Account
- [x] Change password (current required), other sessions revoked incl. access tokens
- [x] Log out other devices
- [x] Export my data (JSON)
- [x] Delete account: 30-day grace, self-restore, purge job, phone hash blocks a second trial
- [x] Erase one buyer's personal data (customer anonymise)

### 7. Orders & checkout
- [x] COD fee (flat/percent, cap, free above) and prepaid discount (flat/percent, cap, min order)
- [x] Coupon box in checkout + server quote endpoint (fixes free-shipping total mismatch)
- [x] Coupon limits: total uses, per buyer, first order only, max discount, edit/delete
- [x] Bulk order actions (status, slips, pick list)
- [x] Abandoned checkout: record on OTP verify, one reminder, seller toggle, list for seller
- [x] Optional buyer GSTIN / company at checkout

### 8. Billing & admin
- [x] Platform GST invoice for every subscription payment + seller payment history/invoice print
- [x] Admin billing profile (platform GSTIN, legal name, address, SAC)
- [x] Autopay via Razorpay Subscriptions (create, verify, webhooks charged/halted/cancelled, cancel)
- [x] Admin AI usage & cost per seller (overview + detail + list)
- [x] Admin view-as-seller (read-only token, banner) + audit log

### GST (seller → buyer invoices)
- [x] GST profile: registration (unregistered/regular/composition), legal name, default rate/HSN, invoice prefix, note
- [x] Per-product HSN + GST rate
- [x] Invoice: line HSN, taxable value, CGST/SGST vs IGST by place of supply, buyer GSTIN, FY numbering, amount in words, bill of supply for composition
- [x] Invoice dialog overrides: place of supply, buyer GSTIN/name, rate

### Wrap-up
- [x] go vet + go test, tsc + eslint + vite build
- [x] Live E2E on the UAT env (API scripts) + UI pass both themes, 1440 + 390
- [x] Update `product.txt`, `PRODUCT.md`, `docs/FEATURE-GAPS.md` status, `docs/qa/MANUAL-TESTS.md`

## Progress log
- 2026-10-04 (assisted WhatsApp, owner decision: no seller WhatsApp connection yet): `notify` rewritten for the Cloud API — CartHedge's own number sends three approved templates (`carthedge_code` with copy-code button, `order_update` in the shop's name, `seller_alert`), placeholders cleaned to Meta's rules, codes never logged in production (BUG-064), OTP answers 503 when no code can arrive. Offers seam `notify.SetOffers` (nil now): broadcasts are drafts only (send/schedule 409), cart reminders wait, back-in-stock hands the waiting buyers to the seller in one alert. Switch `WHATSAPP_SELLER_CHANNEL` (off): WhatsApp connect link, OAuth callback and manual token entry refuse with 409; Settings shows WhatsApp as assisted (link to the AI desk, asks for the profile's WhatsApp number when missing). Order drawer WhatsApp button opens the chat with the status update typed in. Env: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN`, `WHATSAPP_SELLER_CHANNEL`, `META_GRAPH_URL` (tests); `WHATSAPP_API_URL/TOKEN` removed. Tests: unit (`notify`, `otp`, `broadcast`, `messaging`, `product`), new p8 15/15 against a fake Graph API; every suite now runs through it — p1 68/69 (BUG-007 data) · p2a 82/83 (E1.1 port) · p2b 78/78 · p2c 64/64 · p5 22/22 · p6a 71/71 · p6b 54/54 · p6c 52/52 · p7 54/54 · race 13/13 · stress 6/6; `go vet`, `go test`, `tsc`, `eslint`, `vite build` clean. Owner steps and phase-2 switch-on list: [WHATSAPP-INSTAGRAM-GO-LIVE.md](WHATSAPP-INSTAGRAM-GO-LIVE.md), "Phase 1".
- 2026-10-04 (options, label details, consent — separate request, same rules): migration `0017_options_legal_consent.sql` (additive; **applied to the shared UAT DB** — next change is 0018). Product option groups (`product/options.go`: up to 3 groups, values with photos from the gallery, combinations named "M / Pink" so orders, links, invoices and the assistant need no change; old rows read as one plain group), label details (MRP with price ≤ MRP, origin, maker), WhatsApp-offers consent (`customer/consent.go`, checkout box, order page, stop link `/unsubscribe/:token`, START/STOP, seller stop, broadcast rules acceptance), broadcasts only to subscribed buyers with a per-buyer stop link. Pre-existing bugs found and fixed: BUG-059 (stuck rate-limit/OTP counters), BUG-060 (cross-store variant overwrite), BUG-061 (bulk re-import wiped photos/variants), BUG-062 (erase missed WhatsApp chats), BUG-063 (broadcasts without consent). Results on the final binary: new p7 55/55 · p1 68/69 (BUG-007 data) · p2a 82/83 (E1.1 compares the link URL with port 10000 while the server ran on 10002) · p2b 78/78 · p2c 64/64 · p5 22/22 (broadcast tests updated to the consent rules) · p6a 71/71 · p6b 54/54 · p6c 52/52 · race 12/12 · stress 6/6; `go vet`, `go test`, `tsc`, `eslint`, `vite build` clean. UI driven end to end in the built-in browser and captured over CDP (phone + desktop, dark + light) with no console errors. WhatsApp go-live plan: [WHATSAPP-INSTAGRAM-GO-LIVE.md](WHATSAPP-INSTAGRAM-GO-LIVE.md).
- 2026-10-03 (final run, final binary, every suite in order): p1 68/69 (A0.4 = BUG-007 owner data) · p2a 83/83 · p2b 78/78 · p2c 64/64 · p5 21/21 · p6a 71/71 · p6b 54/54 · p6c 52/52 · race 12/12 · stress 6/6 (no 5xx; 40 checkouts at once → exactly 25 orders; coupon cap exactly 10) · p4 12/12. `go vet`, `go test` (incl. the Razorpay refund idempotency test), `tsc`, `eslint`, `vite build` clean. Migrations 0015 and 0016 applied.
- 2026-10-03 (UI write flows): every write flow driven through the real UI on a dev React build — settings saves (policies, checkout charges, GST, assistant), practice chat (live Hinglish reply), product stock edit, coupon create/delete, bulk move, seller address edit, invoice from the drawer (numbered with the prefix saved in GST settings), seller exchange (approve → replacement → picked up → received → close), buyer checkout with coupon (₹499 − ₹120 + ₹60 shipping + ₹59 COD = ₹498, checked in the database), buyer address change and cancel behind the OTP, password change, delete → re-login → restore, admin "view as seller" (saves refused) and invalid billing GSTIN refused. Found BUG-057 (category required in the form blocked editing imported products) and BUG-058; both fixed.
- 2026-10-03 (concurrency, stress, payments, compliance): new `race.mjs` (12 checks: coupon, last piece, duplicate returns, duplicate full refunds, duplicate bulk moves, parallel invoice numbering, double "mark refunded") and `stress.mjs` (600-request read burst at 80 concurrent, 40 buyers for 25 pieces, 20 buyers for a 10-use coupon, bulk move + parallel invoices, 45 s soak at 50 concurrent). Found and fixed BUG-053 (pool deadlock on simultaneous checkouts — pre-existing; froze all checkouts for 5 min in the stress test), BUG-054 (simultaneous refunds over the cap), BUG-055 (Razorpay refund idempotency), BUG-056 (privacy notice/retention). Pool default 20 connections (2 warm), migration `0016` indexes the foreign keys hot paths use, bulk moves run 4 at a time, public order tracking rate-limited per IP. `docs/COMPLIANCE.md` written (payment data, idempotency, e-mandate, GST retention, DPDP). Results: race 12/12, stress 6/6 (no 5xx; 40 checkouts at once → exactly 25 orders in 12 s; coupon cap exactly 10).
- 2026-10-03 (UI pass + final regression): every new screen driven in headless Chrome over CDP (1440 dark, 390 light) on a dev React build, so warnings surface. Found and fixed: (1) Settings crashed on leaving it — the practice chat's `useEffect(() => el.scrollIntoView())` returned a Promise in current Chrome; (2) a render loop in checkout charges — `useDraft` now compares its source by value; (3) the order drawer offered "Create invoice" for an invoiced order (409) — orders now carry `invoiceId` and show "Open invoice"; (4) the tracking page kept the previous order when following the exchange's replacement link — the view is keyed by order code; (5) "Withdraw" without a verified code opened the return form — now verify → confirm; an expired 15-minute code asks again; (6) return progress overflowed on phones; (7) the public `/api/v1/site` exposed the staff-only `billing` and `aiPricing` settings — removed from the public response. Speed: storefront business query folds in the checkout rules (one round trip fewer on every buyer page), the tracking page's after-sales reads run concurrently and reuse the store already resolved, the admin overview no longer recomputes AI spend the page already loads. Graceful shutdown no longer logs job errors. Buyer return → withdraw driven end to end through the UI. Final run on the rebuilt server: p6a 71/71 · p6b 54/54 · p6c 52/52 (X1.2 now checks the ai-usage totals the overview tile uses) · p1 68/69 (A0.4 = BUG-007 owner data) · p2a 83/83 · p2b 78/78 · p2c 64/64 · p4 12/12 · p5 21/21; `go vet`, `go test`, `tsc`, `eslint`, `vite build` clean. (Suites share state: run p2a before p2c and p6a→p6b→p6c in order; a rerun out of order fails on data, not code.)
- 2026-10-03 (live API pass): migration 0015 applied at 13:40 IST. New suites p6a 69/71 (2 were test-math errors, fixed) · p6b 54/54 · p6c 52/52; regression p1 68/69 (BUG-007 data) · p2a 83/83 · p2b 78/78 · p2c 64/64 · p5 21/21 (harness made self-sufficient; invoice format change is intended). Found + fixed BUG-048 (migration advisory lock leaking through pgbouncer — see QA tracker). Hardened billing/after-sales handlers so DB/network errors never reach the client (`httpx.ErrOrInternal`). Unregistered sellers can no longer put GST on an invoice (clear 400).
- 2026-10-03 (backend pass): all backend code written, `go build`, `go vet` (incl. Go 1.23 stdversion), `go test ./...` green. New packages: `shop` (settings + single pricing path), `gst`, `alert` (+ web push), `aftersale` (returns/refunds/cancel). Migration `0015_aftersale_settings_gst.sql` written; NOT yet applied at this point — once a server boots on the UAT DB it is final (fix forward with 0016).
  New API: `PUT /business/settings/{policies|ai|checkout|gst|alerts}`, `/p/{code}/quote`, `/p/{code}/policies`, `/p/orders/{code}/{cancel|address|returns|uploads}`, `/orders/{id}/{address|aftersale|returns|refunds}`, `/orders/bulk-status`, `/orders/abandoned`, `/returns…`, `/refunds…`, `/customers/{id}/erase`, `/ai/practice`, `/push/*`, `/auth/password`, `/auth/sessions/revoke`, `/account/{export|delete|restore}`, `/subscription/{invoices|autopay}`, `/offers/{id}` PUT/DELETE, admin `/businesses/{id}/impersonate`, `/admin/ai-usage`.
- 2026-10-03: analysis done (backend + frontend mapped); found checkout has no coupon input and shows the flat shipping fee even when free shipping applies (server bills the lower total).
