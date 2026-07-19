# CartHedge Backend

AI-powered order desk for Instagram/WhatsApp-first sellers. Standalone JSON API (Go) — any frontend (web, mobile) plugs in.

**Two-sided model:** sellers get a dashboard behind JWT login; buyers get a share-link checkout with **no login** (phone OTP instead). Every business gets a unique code baked into its links: `/p/{businessCode}/{token}`.

## Stack

- **Go 1.23** — stdlib `net/http` router (Go 1.22+ patterns), `log/slog` logging
- **PostgreSQL** (pgx) — migrations embedded, **auto-run at boot**, last migration seeds demo data
- **Redis** — caching (dashboard, subscription status), OTPs, refresh tokens, rate limits
- **Razorpay** — REST + HMAC directly, no SDK. Platform keys bill sellers; each seller stores **their own keys** (AES-GCM encrypted at rest) so buyer money settles in *their* account
- **AI** — OpenAI or Gemini, switched by `AI_PROVIDER` env. Implemented as a Go module (`internal/ai`) — LLM use is pure REST; a separate Python service can be added later if real ML shows up
- **Storage** — `STORAGE_DRIVER=local` (server uploads folder) or `s3`

> **All money is in paise** (integers). ₹499 = `49900`. No floats anywhere.

## Run

```bash
cd backend
cp .env.example .env        # set DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY (openssl rand -hex 32)
go run ./cmd/server         # migrations auto-run, then listens on :8080
```

Seeded demo login: `demo@carthedge.in` / `Demo@123` (business code `demo-store`). Remove `0005_seed.sql` before pointing at a production database.

Tests: `go test ./...`

## Folder structure

```
backend/
  cmd/server/          entrypoint, dependency wiring
  internal/
    config/            env loading (.env aware), validation
    logger/            slog setup (text dev / JSON prod)
    database/          pgx pool + embedded migrator + migrations/*.sql
    cache/             redis client
    secure/            AES-GCM cipher, tokens, OTP digits, slugs
    httpx/             JSON responses, binding, validation, pagination
    middleware/        JWT auth, logging, recover, CORS, redis rate limit
    auth/              register (onboarding + auto trial), login, refresh, reset
    business/          profile, settings, seller Razorpay keys (encrypted)
    plan/              plans, subscriptions, trial, checkout, custom plans, RequireActive gate
    product/           catalog CRUD, variants, bulk CSV/JSON, offers, waitlist
    storage/           local/S3 driver + image upload handler
    link/              product/cart/custom checkout links, public resolve
    customer/          auto-built ledger, segments, COD-risk, LTV
    order/             order creation, pricing, kanban board, transitions, COD flow
    courier/           Shiprocket handoff (optional, env-based)
    payment/           Razorpay client, buyer checkout/verify, webhook
    publicapi/         buyer-facing endpoints (no auth, OTP-gated)
    analytics/         dashboard, RTO savings meter, sales series, reports
    broadcast/         segment drops + minute scheduler
    invoice/           GST-lite numbered invoices
    ai/                provider client, DM parse → draft → confirm, reply assistant
```

## Core flows

**Order from a link (buyer, no login):**
`GET /p/{biz}/{token}` → `POST /p/{biz}/otp` → `POST /p/{biz}/otp/verify` (returns `orderToken` + repeat-buyer prefill) → `POST /p/{biz}/{token}/order` → prepaid: `POST /p/orders/{code}/pay` + `POST /p/payments/verify`; COD: WhatsApp confirmation link → `POST /p/orders/{code}/confirm` (optional ₹ token via `pay` with `kind:"token"`). Track anytime: `GET /p/orders/{code}?phone=`.

**AI order capture (seller):** paste DM thread → `POST /api/v1/ai/parse` (Hinglish-aware, matched against the live catalog) → review draft → `POST /api/v1/ai/drafts/{id}/confirm` (optional edited overrides) → live order.

**RTO defense:** COD orders start unconfirmed → automated WhatsApp confirm flow; repeat refusers get `riskFlagged` (auto at 2 RTOs); dashboard `rtoMeter` shows ₹ saved vs the seller's baseline RTO rate.

**Subscriptions:** register → 15-day trial (plan set by `TRIAL_PLAN_CODE`). Expired → seller APIs return `402 subscriptionExpired` (plan/billing routes stay open), buyer links show `paused`. `POST /api/v1/subscription/checkout` → Razorpay → `verify` extends 30 days. Custom plans: rows with `is_custom` + per-subscription `custom_price`; `POST /api/v1/plans/custom-request` emails the platform.

## API surface

Auth `POST /api/v1/auth/` — `register` `login` `refresh` `logout` `forgot-password` `reset-password`

Seller (Bearer JWT; * = also requires active subscription):
| Area | Endpoints |
|---|---|
| Business | `GET/PUT /business`, `PUT /business/payments` |
| Plans | `GET /plans`, `GET /subscription`, `POST /subscription/checkout|verify|cancel`, `POST /plans/custom-request` |
| Products* | `GET/POST /products`, `POST /products/bulk` (JSON or CSV), `GET/PUT/DELETE /products/{id}`, `PATCH /products/{id}/stock|trending` |
| Offers* | `GET/POST /offers`, `PATCH /offers/{id}` |
| Links* | `GET/POST /links`, `PATCH /links/{id}` |
| Orders* | `GET/POST /orders`, `GET /orders/board`, `GET /orders/{id}`, `PATCH /orders/{id}/status`, `POST /orders/{id}/ship` |
| Customers* | `GET /customers`, `GET/PATCH /customers/{id}` |
| Analytics* | `GET /dashboard`, `GET /analytics/sales|products`, `GET /reports/monthly` |
| Broadcasts* | `GET/POST /broadcasts`, `POST /broadcasts/{id}/send`, `DELETE /broadcasts/{id}` |
| Invoices* | `GET/POST /invoices`, `GET /invoices/{id}` |
| AI* | `POST /ai/parse`, `GET /ai/drafts`, `POST /ai/drafts/{id}/confirm|discard`, `POST /ai/reply` |
| Uploads* | `POST /uploads` (multipart image → URL) |

Buyer (public, rate-limited): `GET /p/{biz}/{token}`, `POST /p/{biz}/otp`, `POST /p/{biz}/otp/verify`, `POST /p/{biz}/{token}/order`, `POST /p/{biz}/waitlist`, `GET /p/orders/{code}`, `POST /p/orders/{code}/pay|confirm`, `POST /p/payments/verify`

Webhooks: `POST /webhooks/razorpay` (signature-verified, idempotent; safety net for payments + subscription activation)

Order statuses: `new → confirmed → packed → shipped → delivered | rto`, cancel allowed until shipped.

## Conventions

- JSON fields camelCase; SQL columns snake_case (Postgres standard); amounts in paise
- Every seller-scoped query filters by `business_id` — full tenant isolation
- WhatsApp/email providers unset ⇒ messages log to console (dev mode keeps flows testable)
