# CartHedge — Product & Production Readiness

_Last updated: 2026-07-25. Reflects a full local run of the stack (Go API + Postgres + Redis + React) with every surface exercised end-to-end._

---

## 1. What it is

CartHedge is an AI order desk + instant storefront for Instagram/WhatsApp-first sellers in India. AI reads the DM and drafts the order, the seller shares one branded link, the buyer orders without signing up, and an automated COD-confirmation flow cuts RTO losses that are reported back to the seller in rupees saved.

**Four surfaces, one Go API:**

| Surface | Path | Auth |
|---|---|---|
| Marketing website | `/` | none |
| Seller app | `/app` | email + password (JWT) |
| Buyer storefront + checkout | `/s/:code`, `/l/:code/:token`, `/o/:code`, `/track` | none (phone OTP only) |
| Platform admin | `/admin` | separate admin login (JWT, role=admin) |

**Stack:** React 18 + Vite + TS (frontend) · Go 1.23 stdlib `net/http` (backend) · PostgreSQL (pgx, migrations auto-run at boot) · Redis (OTP, cache, rate limits, refresh tokens, SSE pub/sub) · Razorpay (REST+HMAC, no SDK) · OpenAI or Gemini for AI · local disk or S3 for images. All money is in **paise** (integers).

---

## 2. Feature inventory (by surface)

Everything below is built and wired to the backend. Items marked ✅ were verified against the live backend on 2026-07-25.

### Seller
- Registration → business + 15-day trial, no card ✅; multi-step onboarding (Business → Reach → Done); unique business code per seller.
- Business profile + settings (WhatsApp, Instagram, GSTIN, logo, UPI, shipping fee, COD toggle + token amount, own Razorpay keys encrypted at rest).
- Dashboard: today/month revenue, pending orders, COD-at-risk, repeat rate, RTO savings meter, sales trend, top products ✅.
- Catalog: products with **multiple images** ✅, variants ✅, reseller price, compare-at price, SKU, counted inventory (stock drawn down inside the order transaction) ✅, trending toggle, bulk CSV/JSON import (upserts on SKU), offers (percent/flat, min amount, scope, expiry), back-in-stock waitlist.
- Order links: product / cart / custom, branded URL, QR, click + order counts, activate/expire.
- Order board: kanban new → confirmed → packed → shipped → delivered | rto | cancelled ✅, drag to advance, state-machine guards ✅, filters (status/source/risk/date), search, order detail + event timeline, manual order creation, courier handoff (Shiprocket), resend COD confirmation.
- Customers ledger: auto-built, retail/reseller segment ✅, LTV, COD-refusal count, risk flag, address autofill.
- Broadcasts (segmented), auto status updates, AI reply assistant.
- Money: GST-lite invoices, subscription + billing, custom-plan request.
- Live board: SSE stream (`/api/v1/events`) over Redis pub/sub.

### Buyer (no login)
- Storefront: business header, trust strip, categories, trending, offers, product grid, filters (category/price/in-stock/search/sort), product detail with gallery + variant picker + waitlist ✅.
- Checkout: cart → address with pincode + serviceability check ✅ → phone OTP (only identity step) ✅ → UPI/card/COD; COD triggers confirmation flow with optional token ✅.
- After order: track at `/o/:code` (phone-gated) ✅, COD confirm page, WhatsApp status updates.

### Admin
- Overview (businesses, trials, paying, MRR, GMV, revenue, open plan requests) ✅.
- Businesses (search, detail, suspend/activate — pauses seller + store instantly, assign plan with custom price + extended days).
- Plans full CRUD (code, price, quota, per-order fee, feature bullets, enforced capabilities, custom/active flags) ✅.
- Plan requests pipeline, subscription payments ledger, editable site content (marketing copy) ✅.

---

## 3. Feature → service map (which feature uses what)

| Feature | Depends on | Config (env) | Works without it? |
|---|---|---|---|
| Core app (auth, catalog, orders, storefront) | PostgreSQL + Redis | `DATABASE_URL`, `REDIS_URL` | **Required** |
| Buyer phone OTP | Redis (stores code + short-lived order token) | — | Required; **SMS delivery** not wired (see §9) |
| AI order capture (`/ai/parse`) + reply (`/ai/reply`) | OpenAI or Gemini LLM | `AI_PROVIDER`, `OPENAI_API_KEY`/`OPENAI_MODEL` or `GEMINI_API_KEY`/`GEMINI_MODEL` | No — returns a clear "AI provider not configured" error ✅ |
| AI draft → order confirm | none (uses stored draft) | — | Yes ✅ (no LLM call) |
| Buyer payments (UPI/card) | Seller's **own** Razorpay account | seller adds keys in Settings (encrypted with `ENCRYPTION_KEY`) | No — returns "seller has not enabled online payments" ✅ |
| Subscription billing | **Platform** Razorpay account | `RAZORPAY_KEY_ID/SECRET`, `RAZORPAY_WEBHOOK_SECRET` | No |
| Product images | local disk or S3 | `STORAGE_DRIVER`, `UPLOAD_DIR` or `S3_BUCKET/S3_REGION` | Local works out of the box ✅ |
| Courier handoff | Shiprocket | `SHIPROCKET_EMAIL/PASSWORD` | Manual courier entry works without it |
| WhatsApp status/confirm messages | WhatsApp provider | `WHATSAPP_API_URL/TOKEN` | Dev: logged to console; **prod needs a provider** |
| Email (reset, renewal reminders) | SMTP | `SMTP_*` | Dev: logged to console |
| Background jobs (broadcast, expiry, COD nudge) | in-process scheduler | — | Yes, always on |

---

## 4. Payments & purchase APIs

Two independent money flows, both Razorpay, kept strictly separate:

**Subscription (seller pays CartHedge)** — platform Razorpay account:
- `POST /api/v1/subscription/checkout` → creates a Razorpay order for `planAmount + overageAmount` (per-order fees above quota), returns the breakdown ✅.
- `POST /api/v1/subscription/verify` → signature check → marks paid, extends 30 days.
- `POST /webhooks/razorpay` → signature-verified, idempotent safety net.

**Buyer payment (buyer pays seller)** — seller's own Razorpay account, money never touches CartHedge:
- `POST /p/orders/{code}/pay` (`kind: order | token`) → Razorpay order on the seller's keys ✅ (guarded: already-paid orders rejected).
- `POST /p/payments/verify` → signature check against the seller's secret → marks paid.
- COD: `POST /p/orders/{code}/confirm` (+ optional token payment).

**Double-charge protection** (hardened this session): buyer verify and the webhook both flip the payment `pending → paid` atomically (`where status <> 'paid'` + rows-affected gate), so `MarkPaid` — which messages the buyer and writes an event — runs exactly once even if both fire. Buyer checkout rejects orders already `paid`/`token_paid`. Webhook is additionally idempotent per Razorpay event id (Redis `SetNX`).

---

## 5. AI / LLM usage

- **Provider:** OpenAI (`api.openai.com/v1/chat/completions`) or Google Gemini (`generativelanguage.googleapis.com`), selected by `AI_PROVIDER`. No Anthropic path today. Pure REST — no SDK. Lives in `backend/internal/ai`.
- **Where used:** `POST /ai/parse` (Hinglish DM thread → structured order draft, matched against the live catalog, with a confidence score) and `POST /ai/reply` (pre-sales answer drafts). Both are gated by plan capability (`ai` / `aiReply`) and rate-limited per business (60/min) because each call costs money.
- **Without a key:** parse/reply return `AI provider not configured; set OPENAI_API_KEY or GEMINI_API_KEY` ✅. Listing drafts and confirming a draft into an order need no LLM.
- **Production note:** the default model names in `.env.example` (`gpt-4o-mini`, `gemini-2.0-flash`) are pinned via env — set a current, appropriate model for your accuracy/cost target at deploy time. Consider a cost cap/alerting on the LLM account; the per-business rate limit is the only guard today.

---

## 6. Pricing

Current plans (seeded, live on the pricing page and admin-editable):

| Plan | ₹/month | Orders included | Overage/order | Enforced capabilities |
|---|---|---|---|---|
| Starter | ₹499 | 100 | ₹3 | order links, board, COD flow, ledger, WhatsApp status |
| Growth | ₹999 | 500 | ₹2.50 | + `ai`, `broadcasts`, `offers`, `invoices` |
| Pro | ₹1,999 | 2,000 | ₹2 | + `aiReply`, `courier`, `waitlist` |
| Custom | negotiated | negotiated | negotiated | assigned from admin console |

**Recommendation.** The pricing is sound because it is anchored to ROI, not features: a seller doing 150 COD orders/month at ₹800 AOV with 35% RTO loses ~₹8–15k/month, so even the ₹999 plan pays for itself if RTO drops a few points. Keep the 15-day no-card trial. Two levers worth revisiting after launch: (1) the per-order overage fee is the real margin scaler — make sure the LLM + payment costs per order sit comfortably under ₹2; (2) consider a usage-based add-on for AI-heavy sellers rather than bundling unlimited AI into Growth, since LLM cost is the one variable that scales with abuse.

---

## 7. Integration test results (verified live, 2026-07-25)

Stack run locally: React `:5173` → Vite proxy → Go API `:8080` → Postgres `:55432` + Redis `:63790`.

| Area | Result |
|---|---|
| Migrations auto-run at boot (0001–0009) | ✅ |
| Frontend ↔ backend over the Vite proxy (`/api`, `/p`, `/uploads`) | ✅ all 200, real JSON |
| Marketing content from DB + admin edit → public site round-trip | ✅ |
| Plans live on pricing page | ✅ |
| Seller login → dashboard with real seeded data | ✅ |
| Storefront: browse, categories, offers, trending, multi-image, reseller/SKU hidden from buyers | ✅ |
| Serviceability + pincode validation (bad pincode → 400) | ✅ |
| Buyer flow: OTP send → verify → COD order → **stock drawdown** → appears on seller board | ✅ |
| Image upload (multipart, per-business folder, served back) | ✅ |
| AI: list drafts, draft → order confirm (no LLM) | ✅ |
| AI parse without a key → graceful error | ✅ |
| Payment module wired (needs seller Razorpay keys) | ✅ |
| Order state machine rejects illegal transitions | ✅ |
| New seller register + trial; bad-email validation | ✅ |

**Two boot-blocking bugs were found and fixed by this live run** (the code had never actually been started before): a Go 1.22 router pattern conflict that panicked on startup, and buyer WhatsApp track/confirm links pointing at API paths instead of the frontend pages. Both fixed and re-verified.

### Answers to specific questions
- **Sellers upload product images?** Yes — `POST /api/v1/uploads` (multipart, 5 MB cap), stored per business, returns a URL ✅.
- **Catalogues allowed?** Yes — full product CRUD plus bulk CSV/JSON import that upserts on SKU.
- **Multiple images per product?** Yes — `products.images` is a JSON array; the ProductForm uses a multi-file dropzone; the storefront gallery renders all of them ✅.
- **Does the UI expose all this?** Yes — seller app, admin, storefront and a 3-step onboarding are all built against the real API hooks, with skeleton loading states. Marketing copy is now DB-driven and admin-editable.
- **Validations?** Backend validates phone, email, pincode, amounts, and status transitions; frontend uses Zod schemas per form. Both were exercised ✅.
- **Payment UI/module linked?** Yes — the buyer checkout calls `pay` → Razorpay (via `useRazorpay`) → `verify`; the module is wired and returns the correct "seller hasn't enabled payments" until keys are added.

---

## 8. Local run (reproduce this)

```bash
# 1. dependencies (Postgres + Redis)
docker compose up -d

# 2. backend  (auto-migrates + seeds; listens on :8080)
cd backend && cp .env.example .env    # then edit as needed
go run ./cmd/server

# 3. (optional) richer demo data with product images
docker exec -i carthedge-postgres-1 psql -U postgres -d carthedge < backend/seed/demo.sql

# 4. frontend
cd frontend && npm run dev            # http://localhost:5173
```

Logins: seller `demo@carthedge.in` / `Demo@123` · admin `admin@carthedge.in` / `Admin@123`.

> Local-dev note (this machine): a host Postgres occupies 5432/5433, so `docker-compose.yml` publishes Postgres on **55432** and Redis on **63790**, and `backend/.env` connects via `127.0.0.1` (not `localhost`, which resolved to the host Postgres over IPv6). On a clean machine you can move these back to the defaults.

---

## 9. Production go-live checklist

**Secrets & accounts (must):**
- [ ] Strong `JWT_SECRET`; real `ENCRYPTION_KEY` (64 hex / 32 bytes) — and never rotate it without re-encrypting stored seller Razorpay secrets.
- [ ] Platform Razorpay account (`RAZORPAY_KEY_ID/SECRET`) + webhook secret, webhook URL registered.
- [ ] LLM key (`OPENAI_API_KEY` or `GEMINI_API_KEY`) + a chosen current model, with a spend cap.
- [ ] **SMS/WhatsApp provider** — OTP and all buyer messaging currently log to console. This is the single biggest gap: buyer OTP won't reach real phones until a provider is wired (`WHATSAPP_API_URL/TOKEN`, and a real SMS route for OTP).
- [ ] SMTP for password reset + renewal emails.
- [ ] Shiprocket credentials if courier handoff is offered.
- [ ] S3 (`STORAGE_DRIVER=s3`, bucket/region + AWS creds) — local disk does not survive redeploys/replicas.

**Data & config:**
- [ ] Remove `0005_seed.sql` (demo business) and `backend/seed/demo.sql` from prod; change the seeded admin password immediately.
- [ ] `APP_ENV=production`, `LOG_LEVEL=info`, real `PUBLIC_BASE_URL` (used to build buyer track/confirm links — must be the site domain), and a locked-down `CORS_ORIGINS` (not `*`).
- [ ] Managed Postgres with backups + PITR; managed Redis (persistence for OTP/rate-limit correctness across restarts).

**Hardening / operational (recommended):**
- [ ] Serve the frontend build behind a CDN; proxy `/api`, `/p`, `/uploads` to the API (same-origin, as the dev proxy already models).
- [ ] Run the API as ≥2 replicas — migrations use an advisory lock and events fan out via Redis, so this is safe. In-process background jobs (broadcast/expiry/COD-nudge) will run on **every** replica; before scaling, gate them to a single leader (or move to a dedicated worker) to avoid duplicate sends.
- [ ] TLS termination, security headers, and a WAF/rate-limit at the edge (app-level rate limits exist on login/OTP/order/payment but are per-instance in Redis).
- [ ] Razorpay webhook is the source of truth for missed client verifications — make sure it is reachable and monitored.
- [ ] Add health/readiness probes (`/healthz` exists), structured log shipping, and error alerting.
- [ ] Load-test the buyer OTP → order → pay path; add DB indexes if hot queries show up (catalog and orders are already indexed).

---

## 10. Known gaps before real usage

1. **OTP/WhatsApp delivery is not wired** — highest priority; buyers can't receive codes in prod.
2. **AI and payments need external accounts** — expected, but nothing works end-to-end for those two until keys/accounts are added.
3. **Background jobs are per-replica** — fine single-instance, must be leader-gated before horizontal scale.
4. **Local file storage** — switch to S3 for any multi-instance or durable deploy.
5. **No automated end-to-end test suite** — backend has focused unit tests (order/payment/product/secure/middleware); the flows above were verified manually this session. A small API smoke-test script (or Playwright for the UI) would protect the critical buyer + payment paths in CI.
6. **Track/confirm links depend on `PUBLIC_BASE_URL`** pointing at the frontend origin — verify per environment.

---

## 11. Messaging integration — Instagram + WhatsApp automation

CartHedge supports two ways to turn a DM into an order, and both feed the **same** AI draft → seller-approval → order pipeline:

1. **Manual paste** (always available) — seller pastes any chat thread into the AI desk (`POST /ai/parse`). No connection required; works for any platform.
2. **Automated capture** (this build) — the seller connects their Instagram and/or WhatsApp once; inbound DMs are ingested automatically, the AI drafts an order, and the seller approves it from the dashboard. **No copy-paste.**

### Chosen approach (best + most cost-effective)
- **WhatsApp → Meta WhatsApp Business Cloud API, direct** (no BSP reseller markup — the cheapest path). Inbound via webhook (`whatsapp_business_account`), outbound via `graph.facebook.com/{phoneNumberId}/messages`. Replies inside the **24-hour customer-service window are free-form** (no paid template), which covers order confirmation right after a buyer messages.
- **Instagram → Instagram API with Instagram Login** (no linked Facebook Page required). Inbound via webhook (`instagram`, sender = Instagram-scoped ID), outbound via `graph.instagram.com`. Scope `instagram_business_manage_messages`. Instagram messaging carries **no per-message fee**.
- **One webhook endpoint** for both (`/webhooks/meta`), verified with `X-Hub-Signature-256` (HMAC-SHA256 of the raw body with the Meta app secret) and the `hub.verify_token` handshake on subscribe.

### Cost controls (baked in)
- **Webhooks, not polling** — zero idle API cost.
- **Debounce per conversation** — a buyer's burst of messages is collected and parsed with **one** LLM call after a short lull, not one call per message.
- **Cheap model** (`OPENAI_MODEL`/`GEMINI_MODEL`, gpt-4o-mini class) + only text inbound is parsed (statuses/echoes skipped).
- **Free-window replies** — automated confirmations go out inside the 24h/session window, avoiding template charges.

### Seller approval (mediated on the dashboard)
Inbound DM → conversation stored → AI draft created and **linked to the conversation** → seller sees it in the AI desk / inbox with an unread badge and a live SSE notification → one-tap **Confirm** creates the order (the existing draft-confirm flow) or **Discard**. The seller can also reply in-thread from the dashboard.

### Config (env) for go-live
`META_APP_ID`, `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_GRAPH_VERSION` (default a current Graph version). Per-seller channel access tokens are stored **encrypted** (same `ENCRYPTION_KEY` as Razorpay secrets). Requires a Meta app with WhatsApp + Instagram products, business verification, and app review for the messaging permissions before it can serve real accounts.

_See §12 for the exact endpoints, data model and what was verified._

---

## 12. Messaging integration — what was built (2026-07-25)

The automated capture pipeline is implemented and verified locally end-to-end. Manual paste (`POST /ai/parse`) is untouched and still works.

### Data model (migration `0010_messaging.sql`)
- `channel_connections` — one row per seller per channel: `channel`, `external_id` (WA `phone_number_id` / IG account id, the webhook routing key), encrypted `access_token`, `status`.
- `conversations` — one thread per buyer per channel: `contact_id`, `contact_name`, `unread`, `parse_pending`, `last_inbound_at`, `draft_id`.
- `conversation_messages` — every inbound/outbound message (`direction`, `body`).
- `ai_drafts` gained `source` (`manual|whatsapp|instagram`) and `conversation_id`, so a draft traces back to the DM it came from.

### Backend (`internal/messaging`)
- `client.go` — Meta Graph send (WhatsApp `graph.facebook.com/{phoneNumberId}/messages`, Instagram `graph.instagram.com/me/messages`), `X-Hub-Signature-256` HMAC verification, and the webhook payload parser (normalises both `whatsapp_business_account` and `instagram` shapes, drops statuses/echoes/non-text).
- `service.go` — connect/disconnect channels (token encrypted with the existing cipher), inbound `Receive` (route → upsert conversation → store message → SSE `messageReceived`), a **debounce loop** (5 s ticker; a conversation quiet for 12 s is parsed once via `ai.ParseConversation` → linked `ai_draft` → SSE `draftReady`), conversation list/detail, and in-thread `Reply`.
- Config: `META_APP_ID`, `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_GRAPH_VERSION`.

### Endpoints
- **Public webhook:** `GET /webhooks/meta` (verify-token handshake), `POST /webhooks/meta` (signature-verified receive; no rate limit — Meta retries).
- **Seller** (JWT + active subscription + `ai` plan capability): `GET/POST /api/v1/channels`, `DELETE /api/v1/channels/{channel}`, `GET /api/v1/conversations`, `GET /api/v1/conversations/{id}`, `POST /api/v1/conversations/{id}/reply`.

### Frontend
- **Settings → Connected channels:** connect/disconnect WhatsApp & Instagram, live status.
- **AI desk → Inbox:** auto-captured conversations with unread badges (polled), a thread view with in-thread reply, and a "Review & confirm" hand-off into the existing draft-approval modal. Drafts show a channel-source badge. The manual paste box and reply assistant remain.

### Verified locally
Webhook verify handshake (challenge echo + 403 on bad token); signature check (**200 valid / 401 forged**); channel connect; a signed WhatsApp DM created a conversation + stored message + inbox entry (`unread:1`); the debounce loop parsed once and, with no LLM key, failed **gracefully** (no draft, `parse_pending` cleared, no loop, no panic); drafts expose `source`. All through the same Vite proxy the browser uses.

### To activate for real accounts
1. Create a Meta app with the **WhatsApp** and **Instagram** products; complete business verification and app review for `whatsapp_business_messaging` + `instagram_business_manage_messages`.
2. Set `META_APP_SECRET` / `META_VERIFY_TOKEN`; register the webhook callback `https://<domain>/webhooks/meta` with that verify token and subscribe to `messages`.
3. Each seller connects their channel (WhatsApp `phone_number_id` + system-user token / IG account id + token) — via the Settings UI, or later an Embedded-Signup/OAuth flow that fills the same fields.
4. Set an LLM key (`OPENAI_API_KEY`/`GEMINI_API_KEY`) so inbound DMs actually draft orders.

Cost stays low by design: **direct Cloud API** (no BSP markup), **webhooks** (no polling), **one debounced parse** per conversation burst, and **free-window** replies.
