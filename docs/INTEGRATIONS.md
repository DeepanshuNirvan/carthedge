# CartHedge — API buying & integration guide

_Last updated: 2026-08-01._

Every external service CartHedge can use: **what it is for, where to buy it, the exact steps, and the env var it fills.** Nothing here needs an enterprise contract or a sales call.

> Prices are indicative and change. Confirm on the vendor's own page before you commit.
> Commercial reasoning, alternatives and open-source options live in [`PRODUCTION.md` §8](./PRODUCTION.md). This file is the checklist.

---

## 0. Read this first

**Only three things are truly required to open the doors:** Postgres + Redis, an SMS provider, and your own Razorpay account. Everything else is optional and the app degrades cleanly without it.

| # | Service | Needed for | Blocks launch? | Lead time | Cost to start |
|---|---|---|---|---|---|
| 1 | Postgres + Redis | everything | **Yes** | minutes | ₹0 (free tier) |
| 2 | Domain + TLS | everything | **Yes** | hours | ~₹900/yr |
| 3 | SMS (DLT) | seller signup OTP + buyer OTP | **Yes** | **1–2 weeks (DLT)** | ~₹5,000 one-off + ₹0.20/SMS |
| 4 | Razorpay (platform) | billing your sellers | **Yes** | 1–3 days | ₹0, ~2% per charge |
| 5 | Email (SMTP) | password reset, renewal mail | Practically yes | minutes | ₹0 |
| 6 | LLM (OpenAI / Gemini) | AI order capture, reply assistant | No | minutes | ₹0 free tier |
| 7 | WhatsApp Cloud API | buyer status + COD confirm messages | No, but the RTO feature is theatre without it | **2–4 weeks (review)** | ₹0 + per message |
| 8 | Instagram messaging | DM capture from IG | No | same review | ₹0, no per-message fee |
| 9 | Object storage (R2/S3) | product images at scale | No (local disk works) | minutes | ~₹0–200/mo |
| 10 | Shiprocket | courier handoff + serviceability | No | 1–2 days | ₹0 base |
| 11 | Sentry / uptime | knowing when it breaks | No | minutes | ₹0 |

**Start #3 and #7 on day one.** They are the only two with a multi-week external approval, and everything else can be done in an afternoon while you wait.

**Seller-side note:** sellers do **not** need a payment gateway. A UPI ID alone is enough for them to take prepaid orders (see §4b). You never buy anything on their behalf.

---

## 1. Postgres + Redis

**Buy from:** [Neon](https://neon.tech) or [Supabase](https://supabase.com) for Postgres · [Upstash](https://upstash.com) for Redis. All three have real free tiers. Or one VPS running `docker compose up -d` from the repo root.

**Steps**
1. Create a Postgres project → copy the connection string (it must include `sslmode=require` for managed hosts).
2. Create a Redis database → copy its connection URL.
3. Paste both into `.env`. Migrations run automatically on boot — there is no separate migration command.

```env
DATABASE_URL=postgres://user:pass@host/carthedge?sslmode=require
REDIS_URL=rediss://default:pass@host:6379
```

**Redis must persist.** OTP codes, refresh tokens, rate limits, the trial-per-IP cap and COD confirm tokens all live there. A wiped Redis logs everyone out and voids in-flight confirmation links.

---

## 2. Domain, TLS, CDN

**Buy from:** any registrar (Namecheap, GoDaddy, BigRock) · **[Cloudflare](https://cloudflare.com) free tier** for DNS, TLS, CDN and edge rate limiting.

**Steps**
1. Buy the domain. Point its nameservers at Cloudflare.
2. Add an `A`/`CNAME` record to your server, proxy **on** (orange cloud).
3. SSL/TLS mode → **Full (strict)**.
4. Set `PUBLIC_BASE_URL` to the real `https://` origin and `CORS_ORIGINS` to it too (never `*` in production).

```env
PUBLIC_BASE_URL=https://carthedge.in
CORS_ORIGINS=https://carthedge.in
APP_ENV=production
```

`PUBLIC_BASE_URL` builds every buyer track link, COD confirm link, password-reset link and OG tag. Getting it wrong breaks all of them at once.

---

## 3. SMS — the OTP rail (**the long pole**)

Two flows depend on it: the **seller's signup verification** and the **buyer's checkout OTP**. Without it, nobody can register and nobody can order.

### 3a. DLT registration (mandatory in India, do this first)

**Where:** any operator's DLT portal — [Jio](https://trueconnect.jio.com), [Airtel](https://www.airtel.in/business/commercial-communication/), Vi, or BSNL. Registering on one propagates to all.

**Steps**
1. Register your **entity** — company PAN, GST, address proof, authorised-signatory letter. ₹5,000–6,000 one-off, a few working days.
2. Register a **header** (sender ID): a 6-character alphabetic string, e.g. `CRTHDG`. Transactional category.
3. Register your **templates**, with `{#var#}` in place of the code. You need at least:
   - `Your CartHedge verification code is {#var#}. Valid for 5 minutes.`
   - Register variants for order updates too if you plan to send status by SMS rather than WhatsApp.
4. Note the **template IDs** — your SMS provider needs them per send.

**Unregistered templates are silently dropped by the carriers.** No error, no delivery. This is the single most common launch failure.

### 3b. The SMS provider

**Buy from:** [MSG91](https://msg91.com) or [Fast2SMS](https://www.fast2sms.com) — both India-native, DLT-aware, simple HTTP APIs. ~₹0.15–0.25 per transactional SMS.

**Steps**
1. Create an account, complete KYC, add credit.
2. Link your DLT entity ID, header and template IDs in their dashboard.
3. Copy the auth key.

### 3c. Wiring it into CartHedge

The OTP send path is `internal/notify/notify.go` → `Notifier.WhatsApp`, called by `otp.Service.Send`. It POSTs `{"to": "...", "message": "..."}` with a bearer token to whatever URL you configure — so any provider that accepts a JSON POST works with **no code change**:

```env
WHATSAPP_API_URL=https://your-provider-endpoint
WHATSAPP_API_TOKEN=your_auth_key
```

If your provider's payload differs (MSG91's flow API wants `template_id` + `recipients`), add a small case in `Notifier.WhatsApp` — it is one function, one HTTP call.

**With these unset, codes are logged to the console.** That is a complete, working development and demo path; you do not need DLT to build.

---

## 4. Payments

### 4a. Platform Razorpay — how your sellers pay *you*

**Buy from:** [razorpay.com](https://razorpay.com) — one account in your company's name. Free to open, ~2% + GST per charge.

**Steps**
1. Sign up → complete KYC (PAN, GST, bank account, address proof). 1–3 working days.
2. **Settings → API Keys → Generate Live Key.** The secret is shown **once** — store it now.
3. **Settings → Webhooks → Add** → URL `https://<your-domain>/webhooks/razorpay`, event **`payment.captured`**, set a secret.
4. Paste all three into `.env`.

```env
RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whatever_you_set_in_step_3
```

Build against **test mode** first (`rzp_test_…`) — test cards, test UPI and test webhooks are all free and complete.

### 4b. Seller payments — how buyers pay *your sellers*

**You buy nothing.** This is per seller, and money never touches CartHedge.

Each seller configures one of two rails in **Settings → Payments**:

| Seller enters | What buyers get | How it confirms |
|---|---|---|
| **A UPI ID** (`name@okhdfcbank`) — no account, no signup, no fees | "Open GPay / PhonePe / Paytm" deep link with the amount and order reference pre-filled, plus a scannable QR | Buyer submits the UTR; the seller matches it to their bank alert and taps **Money received** on the order card |
| **Razorpay Key ID + Secret** (their own account) | Full Razorpay checkout — UPI, cards, netbanking | Automatic: signature verification + webhook |
| Neither | Cash on delivery only | — |

**Tell sellers:** a UPI ID alone is enough to start. Razorpay is the upgrade that adds cards and removes the manual check. Their Razorpay secret is stored AES-GCM encrypted with your `ENCRYPTION_KEY` and never shown again.

**Do not automate the UPI confirmation.** Matching a UTR means reading the seller's bank, which is a licensing and trust question — and the moment money routes through you, you need an RBI payment-aggregator licence.

---

## 5. Email (SMTP)

**Buy from:** [Resend](https://resend.com) (best DX, generous free tier) · [Brevo](https://brevo.com) (~300/day free) · [Zoho ZeptoMail](https://zoho.com/zeptomail) (very cheap, India-friendly) · Amazon SES at volume.

**Steps**
1. Create an account, add your sending domain.
2. Add the **SPF**, **DKIM** and **DMARC** DNS records they give you — skip these and password-reset mail lands in spam.
3. Create SMTP credentials.

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxx
SMTP_FROM=orders@carthedge.in
ADMIN_EMAIL=you@carthedge.in     # gets custom-plan requests and contact-form leads
```

Unset = logged to console.

---

## 6. LLM — AI order capture and reply assistant

**Both providers are supported at once.** Configure either or both; the app uses whichever keys exist and fails over automatically.

### Option A — Google Gemini (recommended to start: genuine free tier, no card)

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. **Create API key** in a Google Cloud project.
3. For paid usage, enable billing on that project and set a **budget alert**.

```env
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.0-flash
```

### Option B — OpenAI

1. [platform.openai.com](https://platform.openai.com) → sign up → **Settings → Billing** → add ₹500 of credit.
2. **Settings → Limits** → set a hard monthly cap. Do this before the key exists.
3. **API keys → Create new secret key** (restrict it to the project).

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

`OPENAI_BASE_URL` accepts any OpenAI-compatible endpoint, so Azure OpenAI, OpenRouter, Groq, Together or a local Ollama/vLLM server drop in with no code change.

### Choosing the lead

```env
AI_PROVIDER=auto      # default: use whichever keys are set, OpenAI first
# AI_PROVIDER=gemini  # lead with Gemini, fail over to OpenAI
# AI_PROVIDER=openai  # lead with OpenAI, fail over to Gemini
```

Setting **both** keys is the recommended production posture: a rate limit or outage on one no longer costs a seller their order draft. Set a spend cap on **each** account — the only in-app guard is a 60/min per-business rate limit.

With no key at all, `/ai/parse` and `/ai/reply` return a clear "not configured" error and every other feature keeps working.

---

## 7 & 8. Meta — WhatsApp Cloud API + Instagram DM capture

One Meta app carries both products. **Start this the same week as DLT** — business verification plus app review runs 2–4 weeks.

### Steps (both products)

1. **[developers.facebook.com](https://developers.facebook.com) → My Apps → Create App → Business.**
2. **App settings → Basic:** copy **App ID** and **App Secret**.
3. **[business.facebook.com](https://business.facebook.com) → Business settings → Security Centre → Start verification.** Upload company registration, GST/utility bill, and a domain you control. This is the slow part.
4. Add the **WhatsApp** product → *API Setup*. Meta gives you a free test number and up to 5 verified test recipients — the whole integration can be built on this at zero cost.
5. Add the **Instagram** product → *Instagram API with Instagram Login*. Sellers need an Instagram **professional** (business/creator) account.
6. **Webhooks:** callback URL `https://<your-domain>/webhooks/meta`, verify token = any random string you also put in `.env`. Subscribe to the **`messages`** field on both the WhatsApp and Instagram objects.
7. **App review:** request `whatsapp_business_messaging`, `whatsapp_business_management`, `instagram_business_basic`, `instagram_business_manage_messages`. Record a screencast of the seller connect flow — Meta asks for one.
8. **One-tap seller connect (optional but worth it):** add `https://<your-domain>/oauth/meta/callback` as a valid OAuth redirect URI on both products, and set `META_OAUTH_REDIRECT_URL` to the same string. Without it, sellers paste an account id and token by hand, which still works.

```env
META_APP_ID=1234567890
META_APP_SECRET=xxxxxxxx
META_VERIFY_TOKEN=any_random_string_matching_the_webhook_config
META_GRAPH_VERSION=v21.0
META_OAUTH_REDIRECT_URL=https://carthedge.in/oauth/meta/callback
# only if Instagram Login uses separate credentials; blank falls back to META_APP_*
META_IG_APP_ID=
META_IG_APP_SECRET=
```

**Cost.** Instagram messaging has no per-message fee. WhatsApp charges by category: replies inside the buyer-opened 24-hour window are **free** (which covers most of what CartHedge sends), utility messages are ~₹0.12–0.15, and **marketing messages are ~₹0.70–0.80** — price or meter broadcasts accordingly.

**Hard rule:** never ship unofficial WhatsApp automation (`whatsapp-web.js`, Baileys and friends). It violates the terms and gets your sellers' numbers banned.

---

## 9. Object storage — product images

**Buy from:** [Cloudflare R2](https://developers.cloudflare.com/r2/) — S3-compatible, ~$0.015/GB-month, **zero egress**. Egress dominates for an image-heavy storefront, so this is the biggest single saving. Alternatives: AWS S3, Backblaze B2, DigitalOcean Spaces, or self-hosted MinIO.

**Steps**
1. Create a bucket. Allow public reads on the object path (buyers load these directly).
2. **R2 → Manage API tokens → Create** with Object Read & Write. Copy the access key id and secret.
3. Set the env, restart, upload one product image and confirm the URL loads in a private window.

```env
STORAGE_DRIVER=s3
S3_BUCKET=carthedge-media
S3_REGION=auto
AWS_ACCESS_KEY_ID=xxxx           # standard AWS credential chain
AWS_SECRET_ACCESS_KEY=xxxx
AWS_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
```

`STORAGE_DRIVER=local` writes to `UPLOAD_DIR` and serves from `/uploads` — fine for dev, but **local disk does not survive a redeploy or a second replica**. Move before real sellers upload real photos.

---

## 10. Courier — Shiprocket

Powers both courier handoff and the pincode serviceability check at checkout (an RTO defence, see [`PRODUCTION.md` §10.2](./PRODUCTION.md)).

**Buy from:** [shiprocket.in](https://www.shiprocket.in) — free to open, pay per shipment.

**Steps**
1. Sign up, complete KYC, add a pickup address (this is the origin pincode serviceability is checked against).
2. **Settings → API → Create an API user.** This is a *separate* credential pair from your dashboard login — use it, not your own password.

```env
SHIPROCKET_EMAIL=api-user@yourdomain.com
SHIPROCKET_PASSWORD=the_api_user_password
```

Unset, serviceability returns "not checked" and **never blocks a sale** — that fallback is deliberate — and sellers assign couriers manually.

---

## 11. Monitoring

| What | Buy from | Free tier |
|---|---|---|
| Errors | [Sentry](https://sentry.io) (or self-hosted GlitchTip) | 5k events/mo |
| Uptime | [Better Stack](https://betterstack.com) / UptimeRobot (or self-hosted Uptime Kuma) | yes |
| Metrics & logs | [Grafana Cloud](https://grafana.com/products/cloud/) | yes |
| Product analytics | [PostHog](https://posthog.com) / Plausible / Umami | yes |

Point an uptime check at `GET /healthz` and ship the structured logs somewhere you will actually read them.

---

## 12. Secrets you generate yourself

```bash
openssl rand -hex 32    # ENCRYPTION_KEY — must be exactly 64 hex chars
openssl rand -base64 48 # JWT_SECRET
```

```env
JWT_SECRET=<long random string>
ENCRYPTION_KEY=<64 hex chars>
```

**`ENCRYPTION_KEY` encrypts every seller's Razorpay secret and Meta channel token at rest. Rotating it without re-encrypting those rows locks every seller out of payments and messaging simultaneously.** Back it up somewhere you will still have it in two years.

---

## 13. Minimum viable `.env`

Everything else can stay blank; the app boots and degrades cleanly.

```env
APP_ENV=production
PUBLIC_BASE_URL=https://carthedge.in
CORS_ORIGINS=https://carthedge.in
DATABASE_URL=postgres://...
REDIS_URL=rediss://...
JWT_SECRET=...
ENCRYPTION_KEY=...                 # 64 hex chars
FRONTEND_DIR=/app/frontend/dist    # serves the SPA so shared links get preview tags

RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

WHATSAPP_API_URL=https://your-sms-or-whatsapp-endpoint
WHATSAPP_API_TOKEN=...

SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=orders@carthedge.in
ADMIN_EMAIL=you@carthedge.in

AI_PROVIDER=auto
GEMINI_API_KEY=...
```

---

## 14. Verify each one is actually live

| Service | Check |
|---|---|
| Postgres/Redis | `curl https://<domain>/healthz` → `{"status":"ok"}`; boot log shows migrations applied |
| SMS | Register a new seller — the OTP must arrive on a real handset, not the console |
| Razorpay (platform) | Renew a plan with a test card; Razorpay Dashboard → Webhooks shows a `200` for `payment.captured` |
| Seller UPI | Set a UPI ID in Settings, place a prepaid order, confirm the deep link opens a UPI app with the right amount |
| LLM | AI desk → paste a Hinglish DM → a draft appears with a confidence score |
| WhatsApp/Instagram | Settings → Connect; DM the account from a test handset; the conversation appears in the AI desk inbox |
| Storage | Upload a product image; open its URL in a private window |
| Shiprocket | Enter a pincode at checkout — "Delivers to …" or "Couriers do not deliver …", not silence |
| SEO / previews | Paste a storefront link into WhatsApp — a title, description and image must render |
| Security headers | `curl -sI https://<domain> \| grep -i "content-security\|strict-transport"` |
