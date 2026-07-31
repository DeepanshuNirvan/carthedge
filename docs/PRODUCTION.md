# CartHedge — Product, Operations & Go-To-Market Handbook

_Last updated: 2026-07-31. Covers what the product does, how each type of user drives it, every third-party service you must buy (with free and open-source alternatives), how to pitch it, and where to take it next._

> **Prices in this document are indicative** and were accurate to the best of our knowledge when written. Every vendor changes pricing, free tiers and India-specific rates. Confirm on the vendor's own pricing page before you commit.

---

## Contents

**Part I — The product**
1. What it is · 2. Who uses it · 3. Complete feature inventory

**Part II — Running it**
4. Seller playbook · 5. Buyer journey · 6. Platform-admin playbook · 7. Visitor / marketing site

**Part III — What you have to buy**
8. Service-by-service: vendor, cost, free tier, open-source alternative · 9. Unit economics · 10. Legal and compliance

**Part IV — Selling it**
11. Pricing & plans · 12. How to pitch · 13. Demo script and objection handling · 14. Channels and first 100 sellers

**Part V — Engineering reference**
15. Architecture · 16. Feature → service map · 17. Payments · 18. AI · 19. Messaging · 20. Local run · 21. Go-live checklist · 22. Known gaps

**Part VI — Where it goes**
23. Feature roadmap, ranked · 24. What makes it defensible · 25. Changelog

---
---

# Part I — The product

## 1. What it is

CartHedge is an **AI order desk + instant storefront for Instagram- and WhatsApp-first sellers in India**.

The AI reads the DM and drafts the order. The seller shares one branded link. The buyer orders without signing up. An automated COD-confirmation flow cuts RTO losses, and those losses are reported back to the seller **in rupees saved per month**.

**The insight:** don't move the seller off chat — instrument the chat. Competitors hand a seller a website and hope the buyer goes there. Buyers don't. The DM is the shop. CartHedge sits behind the DM and turns it into a business.

**Four surfaces, one Go API:**

| Surface | Path | Auth |
|---|---|---|
| Marketing website | `/` | none |
| Seller app | `/app` | email + password (JWT) |
| Buyer storefront + checkout | `/s/:code`, `/l/:code/:token`, `/o/:code`, `/track` | none — phone OTP only |
| Platform admin | `/admin` | separate admin login (JWT, `role=admin`) |

**Stack:** React 18 + Vite + TypeScript · Go 1.23 stdlib `net/http` · PostgreSQL (pgx, migrations auto-run at boot) · Redis (OTP, cache, rate limits, refresh tokens, SSE pub/sub) · Razorpay via REST + HMAC (no SDK) · OpenAI or Gemini · local disk or S3. **All money is in paise (integers)** — no floating-point rupee bugs anywhere.

---

## 2. Who uses it

| Actor | Who they are | How they get in | What they care about |
|---|---|---|---|
| **Seller** | Instagram/WhatsApp-first D2C seller — boutique, jewellery, home decor, reseller hub | Email + password, own isolated workspace | Fewer refused deliveries, no retyping orders, getting paid |
| **Buyer** | Anyone who taps the seller's link | Nothing — phone OTP at checkout only | Trust, speed, being able to track the parcel |
| **Platform admin** | Your staff — support, sales, ops | Separate admin login | MRR, GMV, who to call, who to suspend |
| **Visitor** | A prospect on the marketing site | Nothing | "Will this make me money?" |

**Data isolation:** every seller query is scoped by `business_id`. One seller can never read another's orders, customers or catalog. Subscription expiry or admin suspension stops the seller API **and** their public storefront in the same gate (`plan.IsActive` joins `businesses.status`), while billing stays reachable so they can pay to switch back on.

---

## 3. Complete feature inventory

### 3.1 Seller — account and onboarding
- Self-serve registration → business created → **15-day free trial, no card**.
- Three-step onboarding: business details → contact and socials → done.
- **Unique business code** per business, used in every buyer URL (`/s/demo-store`) so links carry the seller's identity, not yours.
- Business profile: name, owner, email, phone, WhatsApp, Instagram, address, city, state, pincode, GSTIN, logo.
- Login, logout, forgot password, reset password.

### 3.2 Seller — dashboard and insights
- Today's sales, month revenue, pending orders, COD-at-risk count, repeat-customer rate.
- **RTO savings meter** — rupees prevented this month against the seller's own baseline. The retention anchor.
- Sales trend chart, order-status breakdown, recent orders, top products.
- **Insights** (`GET /insights`, derived from the seller's own data — no LLM cost): best sellers this month, COD-risk buyers with their open COD orders, repeat-buyer movement month on month, RTO trend vs last month, and **the hour their own buyers actually order in** (drives broadcast timing).
- Monthly report with CSV export for the accountant.

### 3.3 Seller — catalog and inventory
- Products: name, description, category, price / reseller price / compare-at price, SKU, **multiple images**.
- Variants (size, colour) with their own price and stock.
- **Counted inventory** — `stock_qty` of `-1` is untracked, `0+` is a real count drawn down inside the order transaction. Low-stock strip on the Products page.
- Add one by one or **bulk CSV/JSON import** that upserts on SKU with per-row validation.
- In-stock toggle, trending toggle (drives the storefront trending row).
- Offers: percent or flat, minimum order amount, product scope, expiry, active toggle.
- **Reseller pricing tier** — a second price shown only to buyers tagged as resellers.
- Back-in-stock waitlist — buyers leave their number on a sold-out item.

### 3.4 Seller — links and sharing
Four things to share, all through one control (copy · QR · WhatsApp):
- **Storefront link** — the whole catalog, for the Instagram bio. First-class card on the Links page and in Settings.
- **Product link** — one item, shared straight from the product card.
- **Cart link** — several items pre-loaded.
- **Custom link** — seller types item + price in about ten seconds, for made-to-order work.

Every link is branded with the business code, has live click and order counts, and can be expired. **Shared links carry server-rendered previews** — business name, product name, price and image show up in WhatsApp and Instagram instead of a bare URL.

### 3.5 Seller — order board
- Kanban across every source: new → confirmed → packed → shipped → delivered, plus rto and cancelled.
- Drag to advance on desktop; a snap carousel plus a drawer on touch (HTML5 drag does not work on mobile).
- State-machine guards reject illegal transitions.
- Card shows buyer, items, ₹ total, payment method and status, COD confirmation state, risk flag, courier status.
- Filters: status, source (AI / link / storefront / manual), risk, date range. Search. Table view.
- Order detail: full breakdown, event timeline, status change, courier handoff, **send / resend COD confirmation**, generate invoice.
- Manual order creation for phone and walk-in orders.
- **Live board** — SSE stream over Redis pub/sub, so a new order appears without a refresh.

### 3.6 Seller — customers
- Auto-built from orders: name, phone, email, last address.
- Segment retail vs reseller — drives which price that buyer sees on the storefront.
- Orders count, lifetime value, **COD refusals count**, risk flag, last order date.
- Detail view with full order history, editable segment and notes.
- Address autofill on repeat purchase, keyed to the phone number.

### 3.7 Seller — messaging and AI
- **AI order capture** — paste a Hinglish DM thread, get a structured draft matched against the live catalog with a confidence score. One tap to confirm into an order.
- **Automated DM capture** — connect Instagram and WhatsApp once; inbound DMs become drafts automatically. One-tap connect via Meta OAuth, or manual token entry.
- **Inbox** — captured conversations with unread badges, thread view, in-thread reply.
- **AI reply assistant** — drafts answers to price / fabric / delivery questions, which are most of DM volume.
- **Broadcasts** — segmented drops (all / retail / reseller / repeat), schedule or send now, with sent counts.
- **Automatic status updates** to the buyer on shipped / out-for-delivery / delivered.
- **COD confirmation sequence** — the automated re-confirmation before dispatch. This is the RTO killer.

### 3.8 Seller — money
- GST-lite invoices, numbered, generated from orders, printable.
- Payment settings: the seller connects **their own Razorpay account**; buyer money settles directly to them and never touches CartHedge. Keys AES-GCM encrypted at rest. Plus UPI ID, COD on/off, COD token amount, shipping fee, free-shipping threshold, RTO baseline.
- Subscription and billing: current plan, trial countdown, orders used against quota, renew, cancel, request a custom plan.

### 3.9 Buyer — storefront (no login)
- Business header with logo, name, city, socials.
- Trust strip: payments secured by Razorpay, seller verified.
- Category chips, trending row, live offers, product grid.
- Real filtering: category, price range, in-stock, search, sort.
- Product detail: image gallery, variant picker, price + compare-at, stock state, waitlist when sold out.
- Reseller price shown automatically to buyers tagged as resellers.

### 3.10 Buyer — checkout (no login)
- Cart → address form with **pincode validation and live courier serviceability**: checking / delivers / undeliverable, COD hidden where the courier will not collect, and the flow blocked on a confirmed non-serviceable pincode. Bad addresses are a top RTO cause, so this is caught before the order exists.
- Autofill on repeat purchase via phone.
- **Phone OTP** — the only identity step. No account, no password.
- Payment choice: UPI intent (opens GPay/PhonePe), card, or COD with an optional ₹50–100 token.
- Order confirmation with an order code.

### 3.11 Buyer — after the order
- Track at the same link: enter phone → live status timeline, courier info, support contact.
- COD confirmation page: clean summary → confirm intent → optional token payment.
- WhatsApp status updates.

### 3.12 Platform admin
- Overview: total businesses, trials, paying, MRR, GMV, revenue this month and total, orders last 30 days, open plan requests, **open website enquiries**, growth chart, recent signups.
- Businesses: searchable table, detail view with profile / subscription / usage. Suspend or activate — instantly pauses their storefront and API. Assign any plan with a negotiated price and extended days.
- **Plans CRUD** with a capability picker: code, name, monthly price, order quota, per-order fee, marketing bullets, and the **enforced capability list** that actually unlocks features. Live active-subscription counts per plan.
- Plan requests pipeline (open → contacted → closed) with notes, linking straight to the business.
- **Website enquiries** — contact-form leads, worked in the same pipeline.
- Payments: subscription revenue ledger.
- Site content: contact details, socials, tagline, announcement bar, landing-page stats, testimonials and FAQs — all read live by the marketing site.
- Account: change admin password.

### 3.13 Platform-wide
- Per-business data isolation.
- Subscription gating with one gate for seller APIs and the public storefront, and a clear renew path.
- Rate limiting on login, OTP, order creation, payments, contact form and OAuth.
- Buyer identity is a short-lived token from OTP, consumed once at order creation.
- **SEO**: server-rendered meta and JSON-LD per route, `robots.txt`, generated `sitemap.xml` covering every active storefront and product.
- Money in paise everywhere.

---
---

# Part II — Running it

## 4. Seller playbook

### Day 0 — signup to first link (target: under 10 minutes)
1. **Register** at `/app/register` → business created, 15-day trial starts, no card.
2. **Onboarding**: business details → WhatsApp + Instagram handles → done. This sets the business code that appears in every buyer URL.
3. **Settings → Business profile**: upload the logo, set city/state/pincode (the pincode is the courier pickup point that serviceability checks against).
4. **Settings → Payments**: paste Razorpay Key ID and Secret. Until this is done the storefront still works but only COD is offered. Set COD on/off, the COD token amount, shipping fee, and the RTO baseline (industry default 25%).
5. **Products**: add 3–5 items, or bulk-import a CSV. Products go live on the storefront instantly.
6. **Links → Your storefront**: copy it into the Instagram bio. That single action is the whole day-0 goal.

### Day 1–7 — the daily loop
- **Morning**: open the Dashboard. Pending orders and COD-at-risk are the two numbers that matter.
- **A buyer DMs**: either paste the thread into the AI desk, or — if the channel is connected — the draft is already waiting in the inbox. Review, fix anything the AI got wrong, confirm. Order created.
- **Send the link**: for a specific item, share the product link from the product card. For made-to-order work, create a custom link with a title and price in ten seconds.
- **Order comes in**: it lands on the board under `new`. Drag to `confirmed`.
- **Before dispatch on a COD order**: hit **Send COD confirmation**. The buyer gets a link, confirms intent, optionally pays a token. This is the single action that moves the RTO number.
- **Ship**: enter courier and tracking, or hand off to the courier integration. The buyer gets an automatic status update.
- **Mark delivered** — or `rto` if it bounces. Both feed the savings meter and the buyer's refusal count.

### Day 15 — the renewal moment
The trial banner counts down. The seller opens **Billing** and sees their plan, their orders used against quota, and what renewal costs including overage. The pitch at this moment is not a feature list — it is the **RTO savings meter**: "you saved ₹11,400 this month; the plan is ₹999."

### Ongoing
- **Customers**: tag reseller buyers so they see reseller prices automatically. Watch the risk-flagged list — those buyers get a token request before COD ships.
- **Insights**: check the suggested broadcast window, the best seller, and the RTO trend.
- **Broadcasts**: new collection drop → segment (all / retail / reseller / repeat) → schedule or send.
- **Invoices**: generate from delivered orders for the accountant.
- **Monthly report**: export CSV.

### What a seller should never have to do
Retype an order. Screenshot a payment. Maintain two price lists. Answer "bhaiya order kahan hai". Chase a COD that was never going to be accepted. If any of those are still happening, that is the product failing, not the seller.

---

## 5. Buyer journey

The buyer never installs anything, never creates an account, and never leaves the flow they were already in.

1. **Tap a link** in a DM, a story, or a bio. It opens in the Instagram/WhatsApp in-app browser. The preview they saw before tapping already showed the shop name, the product and the price — that is the trust step.
2. **Browse or go straight to checkout**, depending on which link it was.
3. **Address** — pincode is validated and checked for courier reach live. If couriers do not deliver there they are told immediately, not after paying.
4. **Phone OTP** — the one identity step. Repeat buyers get their name and address auto-filled.
5. **Pay** — UPI intent opens GPay/PhonePe directly, or card, or COD.
6. **If COD** — a confirmation page: summary, confirm intent, optionally pay a small token that is adjusted in the final bill.
7. **Track** at the same link with their phone number: confirmed → shipped → out for delivery → delivered, with courier info and a support contact.

**Why this converts better than a bare UPI QR:** the buyer sees an order summary with the seller's name, gets an order code, and can track it. A QR gives them none of that.

---

## 6. Platform-admin playbook

### Daily
- **Overview** — MRR, trials, paying, GMV, open plan requests, open website enquiries. Two numbers to act on: trials about to expire, and open requests.
- **Requests → Website enquiries** — every contact-form lead, with the message, email and phone. Mark contacted, leave an internal note.
- **Requests → Plan requests** — sellers asking for custom volume pricing. Open the linked business, look at their real order volume in the usage panel, then assign a plan with a negotiated price and extended days.

### Weekly
- **Businesses** — search, sort, look at order counts. High-volume sellers on a small plan are your upsell list. Zero-order sellers past day 5 of trial are your churn list; call them, they usually just never imported a catalog.
- **Payments** — subscription revenue ledger, reconcile against Razorpay.

### As needed
- **Plans** — full CRUD with a capability picker. Two separate fields, and the distinction matters:
  - **Included features (capabilities)** — checkboxes. These are *enforced* by the API and the seller app. Unchecking one locks that feature for every seller on the plan.
  - **Pricing page bullets** — free text. Marketing copy only. Unlocks nothing.
- **Suspend / activate a business** — takes effect immediately, pausing both their dashboard and their public storefront. Use for non-payment or abuse; the seller keeps their data and a working billing page.
- **Site content** — tagline, announcement bar, contact details, socials, landing-page stats, testimonials, FAQs. Edits are read live by the marketing site. Use the announcement bar for launches and pricing changes.
- **Account** — change the admin password. Do this before you ever go live; the seeded password ships in a migration.

---

## 7. Visitor / marketing site

Public, SEO-heavy, and its content is DB-driven so you can change the story without a deploy.

Sections: the problem framed in rupees lost, the core loop, a feature tour, an **interactive RTO savings calculator**, live pricing pulled from the plans table, testimonials, guides/FAQ, and a contact form that files a real lead into the admin console.

Everything except structural copy (eyebrows and section titles) is editable from **Admin → Site content**.

---
---

# Part III — What you have to buy

## 8. Service by service

This is the complete list of external dependencies. For each: what it does, what to buy, roughly what it costs, what you can use free while building, and whether an open-source path exists.

### 8.0 Summary — the minimum to go live

| Capability | Must have at launch? | Cheapest real option | Rough monthly cost at ~50 sellers |
|---|---|---|---|
| Postgres + Redis | **Yes** | One VPS running both, or free managed tiers | ₹0–1,200 |
| Hosting | **Yes** | Single VPS (Hetzner/DO) | ₹500–1,500 |
| Domain + TLS | **Yes** | Registrar + Cloudflare (TLS free) | ~₹70 (₹800/yr) |
| SMS OTP | **Yes** | MSG91 / Fast2SMS, after DLT registration | ₹300–1,500 |
| Platform Razorpay | **Yes** (you bill sellers) | Razorpay standard | 2% of your own subscription revenue |
| Email | **Yes** | Brevo or Resend free tier | ₹0 |
| Object storage | Strongly recommended | Cloudflare R2 | ₹0–200 |
| LLM | For the AI plans | Gemini Flash free tier, then paid | ₹0–800 |
| WhatsApp Cloud API | For status updates | Meta direct | ₹300–2,000 (usage) |
| Courier | Optional | Shiprocket | ₹0 base, per-shipment |
| Error tracking | Recommended | Sentry free tier | ₹0 |

**You can be live for well under ₹3,000/month.** Nothing here needs enterprise contracts.

---

### 8.1 Payments — buyer money (per seller)

**What it does:** buyers pay sellers by UPI or card. Money goes **directly to the seller's own account** and never touches CartHedge.

- **Buy:** nothing. Each seller creates their own **Razorpay** account (free to open) and pastes their Key ID and Secret into Settings. Razorpay's standard rate is around **2% + GST** on cards and net banking; **UPI merchant discount rate is zero by regulation in India** for most merchants, which is exactly the rail these sellers use most.
- **Alternatives sellers can use instead:** Cashfree, PhonePe Payment Gateway, Paytm for Business, Instamojo. Adding one is a new client implementing the same three calls (create order, verify signature, webhook) — the integration is already abstracted behind `internal/payment`.
- **Free for testing:** Razorpay **test mode** is free and complete — test keys, test cards, test UPI, and webhooks. You never need a real transaction to build against it.
- **Open source:** **Hyperswitch** (by Juspay, Apache-2.0) is an open-source payments orchestrator that can front multiple Indian gateways. Worth considering later if you want sellers to pick their own gateway without you writing a client per provider. Note that an orchestrator still needs a real gateway behind it — it removes integration work, not the merchant account.
- **Env:** none — per-seller keys are stored encrypted in the database.

### 8.2 Payments — your subscription revenue (platform)

**What it does:** sellers pay you ₹499/₹999/₹1,999 per month.

- **Buy:** one **Razorpay** account in your company's name. Same ~2% + GST. Register the webhook at `https://<domain>/webhooks/razorpay`.
- **Alternatives:** Cashfree, PhonePe PG, Stripe (if you ever bill outside India).
- **Free for testing:** Razorpay test mode.
- **Env:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.

### 8.3 SMS — buyer OTP

**This is the single hardest requirement to skip.** Buyer OTP is the only identity step in the entire checkout. Without SMS delivery, no real buyer can place an order.

- **India-specific requirement:** **DLT registration is mandatory** (TRAI). You register your entity, your sender ID (a 6-character header like `CRTHDG`) and every message template on a DLT portal — Jio, Airtel, Vodafone-Idea or BSNL all run one. Budget **one-time ₹5,000–6,000** for entity + header registration and **a few working days**. Unregistered templates are silently blocked. Start this early; it is the longest lead time in the whole launch.
- **Buy (recommended for India):** **MSG91** or **Fast2SMS** — both India-native, DLT-aware, with a simple HTTP API. Transactional SMS lands around **₹0.15–0.25 per message**. At 5,000 OTPs/month that is roughly ₹750–1,250.
- **Other vendors:** Gupshup, Kaleyra, TextLocal, Twilio (much more expensive for India — around ₹4–5/SMS — but excellent DX for prototyping), AWS SNS.
- **Free for testing:** MSG91 and Fast2SMS both give trial credits. In development the code already **logs the OTP to the console** — you can build and demo the entire buyer flow with zero spend and zero DLT.
- **Cheaper, higher-deliverability alternative worth evaluating:** send the OTP over **WhatsApp** using a Meta *authentication* template. Per-message cost in India is broadly comparable to SMS, delivery is more reliable, and you are already integrated with the Cloud API. Keep SMS as the fallback for buyers who do not have WhatsApp.
- **Open source:** there is no open-source way to originate SMS — you always pay a carrier. For **development only**, an Android SMS-gateway app on a spare handset with a normal SIM can act as a sender. Never use this in production: no DLT compliance, no throughput, no delivery guarantees.

### 8.4 WhatsApp — buyer messaging (status updates, COD confirmation)

**What it does:** order confirmations, shipped/delivered updates, the COD confirmation link, broadcasts.

- **Buy:** go **direct to the Meta WhatsApp Business Cloud API**. This is deliberate — BSP resellers (AiSensy, Interakt, Wati, Gupshup, Zoko) add a monthly platform fee plus a markup on every message, and you do not need what they add because the platform is already built.
- **Cost model:** Meta prices per message by category. **Service messages (replies inside the 24-hour window a buyer opened) are free** — and that window covers most of what CartHedge sends, because the buyer just messaged or just ordered. **Utility** messages (order updates outside the window) are cheap in India — on the order of **₹0.12–0.15 each**. **Marketing** messages (broadcast drops) are much more expensive — on the order of **₹0.70–0.80 each** — so price broadcasts accordingly, or push sellers to send them inside the free window.
- **What you must do:** create a Meta app with the WhatsApp product, complete **business verification**, and pass **app review** for `whatsapp_business_messaging`. Budget **2–4 weeks**. Start it the same week you start DLT.
- **Free for testing:** Meta gives every app a **free test phone number** and lets you message up to **5 verified test recipients** with no cost and no review. The entire integration can be built and demoed on this.
- **Open source:** none that is legitimate. Unofficial libraries that drive WhatsApp Web (`whatsapp-web.js`, Baileys) exist and **will get seller numbers banned** — they violate WhatsApp's terms. Do not ship them. This is a hard line.
- **Env:** `META_APP_ID`, `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_GRAPH_VERSION`, `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN`.

### 8.5 Instagram — DM capture

- **Buy:** nothing. **Instagram API with Instagram Login** has **no per-message fee**.
- **What you must do:** add the Instagram product to the same Meta app and pass app review for `instagram_business_manage_messages`. Sellers need an Instagram **professional** account.
- **Free for testing:** same Meta test-app path as WhatsApp.
- **Env:** shares the Meta app credentials; `META_IG_APP_ID` / `META_IG_APP_SECRET` only if you use separate Instagram Login credentials. `META_OAUTH_REDIRECT_URL` enables the one-tap connect flow.

### 8.6 LLM — AI order capture and reply assistant

**What it does:** turns a Hinglish DM thread into a structured order draft matched against the seller's catalog; drafts pre-sales replies.

- **Cost reality check:** one parse is roughly 1–2k input tokens and a few hundred output tokens. On a small model that is **well under ₹0.10 per parsed conversation**. Even a seller doing 500 AI-parsed orders a month costs you under ₹50. **The LLM is not your cost problem** — but it is the one line item that scales with abuse, which is why parses are rate-limited per business and debounced per conversation.
- **Buy — recommended:** **Google Gemini Flash**. It has a genuinely usable **free tier** (rate-limited, no card), and its paid rate is among the cheapest available. Best price/performance for this workload.
- **Buy — alternative:** **OpenAI `gpt-4o-mini`** class models. Around **$0.15 per million input tokens and $0.60 per million output** — pennies at this volume, with the most predictable instruction-following.
- **Other options:** Groq (very fast, free tier), OpenRouter (one key, many models, easy A/B), Together AI, Anthropic Claude Haiku.
- **Free for testing:** Gemini's free tier covers all of development. The app also **degrades cleanly with no key at all** — parse and reply return a clear "AI provider not configured" error, and everything else including draft-to-order confirmation keeps working.
- **Open source / self-hosted:** run **Llama 3.1 8B** or **Qwen 2.5 7B** behind **Ollama** (easiest) or **vLLM** (production throughput). Realistic assessment: Hinglish code-mixed parsing with catalog matching is a *harder* task than it looks, and small open models are noticeably weaker at it. Self-hosting also costs a GPU — a modest cloud GPU runs more per month than the API bill would at your scale. **Recommendation: use the API. Revisit self-hosting only if data residency becomes a customer requirement**, not to save money.
- **Env:** `AI_PROVIDER` (`openai` | `gemini`), `OPENAI_API_KEY` + `OPENAI_MODEL`, or `GEMINI_API_KEY` + `GEMINI_MODEL`.
- **Do this:** set a hard spend cap on the LLM account. The per-business rate limit is the only in-app guard.

### 8.7 Object storage — product images

**What it does:** stores seller product photos and logos.

- **Buy — best value:** **Cloudflare R2**. S3-compatible API, ~$0.015/GB-month, and **zero egress fees**. For an image-heavy storefront that buyers browse on mobile, egress is normally the dominant cost, so this is the single biggest saving available.
- **Alternatives:** AWS S3 (~$0.023/GB + egress), Backblaze B2 (cheap, small free tier), DigitalOcean Spaces (flat ~$5/month including 250 GB).
- **Free for testing:** `STORAGE_DRIVER=local` writes to disk and serves from `/uploads` — already supported and fine for development and demos.
- **Open source:** **MinIO** is S3-compatible and self-hostable. Because the code speaks the S3 API, pointing it at MinIO is configuration, not a rewrite. Sensible if you already run a VPS and want zero external dependencies.
- **Do this before launch:** local disk does **not** survive redeploys or a second replica. Move to object storage before you have real sellers' photos in it.
- **Env:** `STORAGE_DRIVER`, `UPLOAD_DIR` or `S3_BUCKET` + `S3_REGION` (+ standard AWS credential chain).

### 8.8 Email — password reset, renewal reminders, lead alerts

- **Buy:** **Resend** (excellent DX, generous free tier), **Brevo** (~300 emails/day free), or **Amazon SES** (about $0.10 per 1,000 — cheapest at volume, but the approval process and reputation management are on you).
- **Alternatives:** Mailgun, Postmark (best deliverability, pricier), Zoho ZeptoMail (very cheap, India-friendly).
- **Free for testing:** with `SMTP_*` unset, emails are **logged to the console**. Brevo's free tier covers real testing.
- **Open source:** **Postal** or **Mailu** self-hosted. Honest warning: **do not self-host outbound email for transactional mail unless you enjoy deliverability work.** Password-reset emails landing in spam is a support disaster. Use a provider.
- **Env:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `ADMIN_EMAIL`.

### 8.9 Courier — shipping handoff and serviceability

**What it does:** hands an order to a courier, returns tracking, and — used at checkout — answers whether couriers reach a pincode at all.

- **Buy:** **Shiprocket** is already integrated. Aggregator model: no meaningful monthly fee, you pay per shipment at negotiated rates, and you can keep a margin.
- **Alternatives:** NimbusPost, iThink Logistics, Pickrr, Shyplite, or going direct to **Delhivery** / **Blue Dart** / **Ekart** at volume.
- **Free for testing:** Shiprocket offers a sandbox. Without credentials the serviceability endpoint returns "not checked" and **never blocks a sale** — that fallback is deliberate.
- **Open source:** none — this is physical logistics. What *is* worth doing yourself is a **pincode reference dataset** (India Post publishes pincode data) to validate the pincode format and city/state mapping offline, before spending an API call.
- **Env:** `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`.
- **Margin note:** courier spread (₹3–8/shipment) is listed in the business model as a later revenue stream. It only works once you have volume to negotiate with.

### 8.10 Hosting, database and cache

- **Cheapest credible production setup:** one **Hetzner** (from ~€4/month) or **DigitalOcean** (~$6/month) VPS running the Go binary, Postgres and Redis via `docker compose`, behind **Cloudflare** for TLS and DNS. This genuinely handles your first few hundred sellers.
- **Managed, low-effort:** **Railway**, **Render** or **Fly.io** for the app; **Neon** or **Supabase** for Postgres (both have real free tiers with branching); **Upstash** for Redis (free tier, per-request pricing).
- **At scale:** AWS/GCP with RDS + ElastiCache. You do not need this at launch and it will cost 5–10× more.
- **Open source:** the entire stack is already open source and self-hostable — Postgres, Redis, Go, Caddy or nginx for TLS. `docker-compose.yml` in the repo is the starting point.
- **Note the architecture already supports:** ≥2 API replicas (migrations take an advisory lock; events fan out through Redis). The one thing to fix before scaling horizontally is the in-process job scheduler — see §22.

### 8.11 Monitoring, errors and analytics

- **Errors:** **Sentry** free tier (5k events/month) is plenty at launch. Open-source alternative: **GlitchTip** (Sentry-compatible, self-hostable).
- **Uptime:** **Better Stack** or **UptimeRobot** free tiers. Open source: **Uptime Kuma** — self-hosted, excellent, five minutes to set up.
- **Metrics/logs:** **Grafana Cloud** free tier. Open source: Prometheus + Grafana + Loki.
- **Product analytics:** **PostHog** (free tier, and open-source self-hostable), **Plausible** or **Umami** (both open source, privacy-friendly, no cookie banner needed).
- The app already exposes `/healthz` and emits structured logs — point something at both.

### 8.12 Domain, TLS, CDN

- **Domain:** ~₹800–1,200/year from any registrar.
- **TLS + DNS + CDN:** **Cloudflare free tier** covers all three, plus basic WAF and rate limiting at the edge. There is no reason to pay for this at launch.
- **Important:** `PUBLIC_BASE_URL` must be your real domain. It builds every buyer track link, COD confirm link, reset-password link and OG tag. Getting it wrong breaks all of them at once.

---

## 9. Unit economics

**Per seller, per month, at the ₹999 Growth plan:**

| Line | Cost |
|---|---|
| LLM (say 300 AI parses) | ~₹20 |
| WhatsApp utility messages (say 400 outside the free window) | ~₹50 |
| SMS OTP (say 300 orders) | ~₹60 |
| Storage + bandwidth (R2) | ~₹5 |
| Infrastructure share | ~₹20 |
| Razorpay fee on your ₹999 | ~₹24 |
| **Total variable cost** | **~₹180** |
| **Gross margin** | **~82%** |

Two things to watch:
1. **Marketing-category WhatsApp messages are the one line that can flip a seller unprofitable.** A seller blasting 2,000 marketing broadcasts a month costs you ~₹1,500 against a ₹999 plan. **Meter broadcasts, or price them as an add-on.** This is the most important commercial detail in this document.
2. **The per-order overage fee (₹2–3) must sit comfortably above per-order variable cost (~₹0.40).** It does today, with room.

---

## 10. Legal and compliance

- **You do not need a payment aggregator licence** — and this is a deliberate architectural decision. Buyer money settles directly into each seller's own Razorpay account and never passes through CartHedge. The moment you take a cut of GMV or hold funds in transit, you are a payment aggregator and need RBI authorisation. **Do not cross that line casually**; the "payment take-rate" idea in the business model needs a licensed partner, not a code change.
- **DLT registration** (TRAI) is mandatory before you can send a single production SMS. See §8.3.
- **Meta business verification + app review** is mandatory before WhatsApp or Instagram works for real seller accounts. See §8.4.
- **GST**: you charge GST on subscription revenue. Sellers' own GST is their concern — the invoice feature is a convenience, not a filing tool. Label it accordingly.
- **Data**: you store buyer names, phone numbers and addresses on behalf of sellers. Have a privacy policy, a data-deletion path, and do not reuse one seller's buyer data for another. India's DPDP Act obligations apply — get the policy reviewed.
- **Never ship unofficial WhatsApp automation.** It gets sellers' numbers banned and it is a terms violation.

---
---

# Part IV — Selling it

## 11. Pricing and plans

| Plan | ₹/month | Orders included | Overage/order | Enforced capabilities |
|---|---|---|---|---|
| Starter | ₹499 | 100 | ₹3 | order links, board, COD confirmation flow, customer ledger, WhatsApp status |
| Growth | ₹999 | 500 | ₹2.50 | + `ai`, `broadcasts`, `offers`, `invoices` |
| Pro | ₹1,999 | 2,000 | ₹2 | + `aiReply`, `courier`, `waitlist` |
| Custom | negotiated | negotiated | negotiated | assigned from the admin console |

15-day free trial, no card. Billed through your own Razorpay account.

**Why this pricing works:** it is anchored to ROI, not to features. A seller doing 150 COD orders a month at ₹800 AOV with 35% RTO loses ₹8,000–15,000 a month. Cutting RTO to 20% saves more than the ₹999 plan every single month. You are not selling software; you are selling back a fraction of the money they are currently setting on fire.

**Levers to revisit after launch:**
- **Meter or price WhatsApp marketing broadcasts.** See §9 — this is the real margin risk.
- Consider an AI add-on rather than bundling unlimited parses, if usage skews.
- The per-order overage fee is the growth mechanic: your revenue rises with the seller's success without a renegotiation.

---

## 12. How to pitch

### The one-liner
> "Your Instagram DMs become confirmed orders, and your COD refusals drop. We show you the rupees saved every month."

### The 60-second pitch
> You're doing 150 orders a month out of your DMs. Roughly a third of your COD orders get refused at the door — you eat forward shipping, return shipping, packaging, and the item sits blocked for a week. That's ten to fifteen thousand rupees a month, gone.
>
> CartHedge sits behind your DMs. The AI reads the chat and drafts the order — item, size, address, phone, payment — you check it and tap confirm. You send one link, the buyer orders without signing up, and before anything ships, every COD order gets a confirmation message the buyer has to respond to. The ones who were never going to accept it, don't.
>
> Everything lands on one board. And at the top of your dashboard there's one number: rupees saved from RTO this month. Last month one of our sellers saw eleven thousand. The plan is nine hundred and ninety-nine.

### Positioning against the alternatives

| They say | You say |
|---|---|
| "I'll use Dukaan / DotPe" | Those give you a website. Your buyers don't go to websites — they're in your DMs and they stay there. We don't move them; we instrument the conversation you're already having. The storefront is a bonus, not the product. |
| "I use a Google Form / notes app" | A form doesn't stop an RTO. Nothing you have today re-confirms a COD order before it ships, and that's where the money leaks. |
| "I just send a UPI QR" | A QR has no order context, no proof, no tracking. Buyers hesitate. An order link with your shop name, the item and a tracking page converts better and cuts "did you get my payment?" messages to zero. |
| "It's too expensive" | What did RTO cost you last month? (Wait for the number. It is always bigger than ₹999.) |
| "I don't trust giving you my payments" | You don't. You connect *your own* Razorpay account. Buyer money goes straight to you — it never touches us. We can't hold it even if we wanted to. |
| "What if I stop paying?" | Your data stays. Your dashboard and storefront pause, billing stays open, and everything comes back exactly as it was when you renew. |
| "I'm not technical" | Signup to your first shareable link is about ten minutes, and we'll import your catalog for you on the call. |

### The three proof points that actually close
1. **The savings meter.** A number in rupees, on their own data, updated monthly. Every other feature is a means to that number.
2. **The branded link.** `yourshop` in the URL, their logo, their name on the checkout. They are building their own brand, not yours.
3. **Money never touches you.** This kills the biggest objection before it is raised — lead with it.

---

## 13. Demo script and objection handling

### The 3-minute demo (exact click path)

Run this on a phone, not a laptop. Their buyers are on phones and so are they.

1. **Open a real-looking DM thread** (have one prepared in Hinglish). "This is a normal order conversation. Watch."
2. **AI desk → paste the thread → Draft the order.** The draft comes back with the item matched to the catalog, size, quantity, name, phone, address, payment preference, and a confidence score. *Pause here — this is the moment that sells.*
3. **Fix one field deliberately**, then confirm. "You're always in control. It drafts, you decide."
4. **Order board** — the order is there under `new`. Drag it to `confirmed`.
5. **Open the order → Send COD confirmation.** Show the message the buyer receives. "This is the part that saves the money. The buyer has to say yes before anything ships."
6. **Links → Your storefront → share to WhatsApp.** Show the preview card with their shop name and logo. "This goes in your bio."
7. **Dashboard → the savings meter.** "And this is the number you'll check every month."

Do not demo analytics, invoices or broadcasts unless asked. They are why sellers *stay*, not why they *start*.

### Onboarding-led selling
The single highest-converting thing you can do is **import their catalog for them during the call**. Ask for their product list in any format; the bulk importer takes CSV or JSON. A seller who leaves the call with a live storefront link converts at a completely different rate to one who leaves with a login.

### Metrics to hold yourself to
- Time from signup → first shared link (target: **under 10 minutes**)
- Percentage of trials that create ≥1 order (this is your real activation metric)
- Trial → paid conversion
- RTO percentage change for sellers in month 2 vs month 1 — **your product's actual claim, measured**
- Monthly churn, and orders-per-seller trend (rising orders per seller is the overage flywheel)

---

## 14. Channels — getting the first 100 sellers

1. **Instagram outbound, manually.** Search hashtags — `#jaipurkurti`, `#handmadejewellery`, `#resellersindia` — find accounts with a "DM to order" bio and 2k–50k followers. That bio line is the qualifying signal. DM them the one-liner and a Loom of the 3-minute demo. This is slow and it works.
2. **Reseller hubs.** One reseller hub brings dozens of downstream sellers. The reseller-pricing feature exists precisely for this, and it makes hubs your best distribution channel.
3. **Wholesale market clusters.** Surat (textiles), Jaipur (jewellery, block print), Tirupur (knitwear), Delhi (Sadar/Chandni Chowk). Physical presence for a week beats months of ads.
4. **The buyer loop.** Every branded checkout page is seen by dozens of buyers, some of whom sell too. A discreet "powered by CartHedge" on the checkout footer is free distribution — worth testing against conversion impact.
5. **Content that ranks.** The RTO calculator is a genuinely linkable asset. Write the honest guides — "how to reduce COD returns", "what RTO actually costs you" — and let the sitemap do its job.
6. **Referral.** One free month per referred seller who converts. Cheap, and it works in tightly-networked communities like these.

---
---

# Part V — Engineering reference

## 15. Architecture

Four surfaces, one Go API, one Postgres, one Redis. Handler + service per domain under `backend/internal`. The frontend is a single React app with four route groups sharing one design-token system.

**Serving model in production:** the Go API serves the built SPA (`FRONTEND_DIR`) and rewrites the document head per route, so `/api`, `/p`, `/uploads` and the SPA are all one origin. This is what makes shared links render previews — see §3.13 and the changelog.

## 16. Feature → service map

| Feature | Depends on | Config (env) | Works without it? |
|---|---|---|---|
| Core app (auth, catalog, orders, storefront) | PostgreSQL + Redis | `DATABASE_URL`, `REDIS_URL` | **Required** |
| Link previews + SEO | built frontend served by the API | `FRONTEND_DIR`, `PUBLIC_BASE_URL` | Yes — but shared links lose their preview |
| One-tap Instagram/WhatsApp connect | Meta app + approved permissions | `META_OAUTH_REDIRECT_URL`, `META_APP_ID/SECRET`, optional `META_IG_APP_ID/SECRET` | Yes — sellers enter account id + token manually |
| Buyer phone OTP | Redis + an SMS provider | — | **No** — see §8.3, biggest launch dependency |
| AI order capture + reply | OpenAI or Gemini | `AI_PROVIDER`, `OPENAI_API_KEY`/`OPENAI_MODEL` or `GEMINI_API_KEY`/`GEMINI_MODEL` | No — returns a clear "not configured" error |
| AI draft → order confirm | none | — | Yes — no LLM call |
| Buyer payments | seller's **own** Razorpay | seller adds keys in Settings (encrypted) | No — "seller has not enabled online payments" |
| Subscription billing | **platform** Razorpay | `RAZORPAY_KEY_ID/SECRET`, `RAZORPAY_WEBHOOK_SECRET` | No |
| Product images | local disk or S3-compatible | `STORAGE_DRIVER`, `UPLOAD_DIR` or `S3_BUCKET/S3_REGION` | Local works out of the box |
| Courier handoff + serviceability | Shiprocket | `SHIPROCKET_EMAIL/PASSWORD` | Yes — manual courier entry; serviceability returns "not checked" and never blocks a sale |
| WhatsApp status/confirm messages | Meta Cloud API | `WHATSAPP_API_URL/TOKEN` | Dev: console; **prod needs it** |
| Email | SMTP | `SMTP_*`, `ADMIN_EMAIL` | Dev: console |
| Background jobs | in-process scheduler | — | Always on |

## 17. Payments

Two independent flows, strictly separated.

**Subscription (seller pays you)** — platform Razorpay:
`POST /api/v1/subscription/checkout` (plan + overage, returns the breakdown) → `POST /api/v1/subscription/verify` (signature → paid, extend 30 days) → `POST /webhooks/razorpay` (signature-verified, idempotent safety net).

**Buyer payment (buyer pays seller)** — the seller's own Razorpay, money never touches CartHedge:
`POST /p/orders/{code}/pay` (`kind: order | token`) → `POST /p/payments/verify` → COD via `POST /p/orders/{code}/confirm`.

**Double-charge protection:** buyer verify and the webhook both flip `pending → paid` atomically (`where status <> 'paid'` plus a rows-affected gate), so the side effects — messaging the buyer, writing the event — run exactly once even when both fire. Checkout rejects already-paid orders. The webhook is additionally idempotent per Razorpay event id via Redis `SetNX`.

## 18. AI

OpenAI or Gemini over plain REST (no SDK), selected by `AI_PROVIDER`, in `backend/internal/ai`. Used by `POST /ai/parse` (Hinglish thread → structured draft matched against the live catalog with a confidence score) and `POST /ai/reply`. Both gated by plan capability (`ai` / `aiReply`) and rate-limited per business at 60/min because each call costs money. With no key configured both fail with a clear message and nothing else breaks. Set a spend cap on the account.

## 19. Messaging — Instagram + WhatsApp

Two paths into the **same** draft → approve → order pipeline:
1. **Manual paste** — always available, works for any platform, no connection needed.
2. **Automated capture** — the seller connects once; inbound DMs are ingested and drafted automatically.

**Approach:** WhatsApp through the **Meta Cloud API direct** (no BSP markup); Instagram through **Instagram API with Instagram Login** (no linked Facebook Page required, no per-message fee). **One webhook** (`/webhooks/meta`) handles both objects, verified by `X-Hub-Signature-256` and the `hub.verify_token` handshake.

**Cost controls baked in:** webhooks not polling; **one debounced LLM parse** per conversation burst (5s ticker, 12s lull) rather than one per message; a cheap model; text-only inbound; replies inside the free 24-hour window.

**Data model** (`0010_messaging.sql`): `channel_connections` (per-seller encrypted token, `external_id` is the webhook routing key), `conversations`, `conversation_messages`; `ai_drafts` gained `source` and `conversation_id` so every draft traces back to the DM it came from.

**Connect flow:** one-tap OAuth (`internal/messaging/oauth.go`) — WhatsApp via the Facebook dialog (token → `debug_token` → WABA → phone number id, then subscribes the WABA to the webhook), Instagram via Instagram Business Login (short → long-lived token → account id). The callback carries identity in a signed single-use state (JWT + Redis nonce, 10-minute TTL) because Meta returns the browser with no session. Manual entry remains the fallback.

**To activate for real accounts:** Meta app with both products → business verification → app review for `whatsapp_business_messaging` and `instagram_business_manage_messages` → set `META_APP_SECRET`/`META_VERIFY_TOKEN` → register `https://<domain>/webhooks/meta` and subscribe to `messages` → set an LLM key.

## 20. Local run

```bash
# 1. dependencies (Postgres + Redis)
docker compose up -d

# 2. backend (auto-migrates + seeds; listens on :8080)
cd backend && cp .env.example .env    # then edit as needed
go run ./cmd/server

# 3. (optional) richer demo data with product images
docker exec -i carthedge-postgres-1 psql -U postgres -d carthedge < backend/seed/demo.sql

# 4. frontend
cd frontend && npm run dev            # http://localhost:5173
```

Logins: seller `demo@carthedge.in` / `Demo@123` · admin `admin@carthedge.in` / `Admin@123`.

> **This machine:** a host Postgres occupies 5432/5433, so compose publishes Postgres on **55432** and Redis on **63790**, and `.env` connects via `127.0.0.1` (not `localhost`, which resolves to the host Postgres over IPv6). On a clean machine, move these back to the defaults.

**To test the production serving path** (SPA + link previews) locally: `cd frontend && npm run build`, then run the backend with `FRONTEND_DIR=../frontend/dist` and hit `:8080` directly — `curl -s localhost:8080/s/demo-store | head -40` should show real OG tags.

## 21. Production go-live checklist

**Long lead time — start these first:**
- [ ] **DLT registration** for SMS (entity + header + templates). Days to weeks.
- [ ] **Meta business verification + app review** for WhatsApp and Instagram messaging. 2–4 weeks.

**Secrets and accounts:**
- [ ] Strong `JWT_SECRET`; real `ENCRYPTION_KEY` (64 hex / 32 bytes). **Never rotate it without re-encrypting stored seller Razorpay secrets and channel tokens.**
- [ ] Platform Razorpay keys + webhook secret, webhook URL registered.
- [ ] LLM key with a spend cap.
- [ ] SMS provider (buyer OTP will not reach real phones without it).
- [ ] WhatsApp Cloud API credentials.
- [ ] SMTP for password reset, renewal reminders and lead alerts.
- [ ] Shiprocket credentials if you offer courier handoff.
- [ ] S3-compatible storage (`STORAGE_DRIVER=s3`) — local disk does not survive redeploys.

**Data and config:**
- [ ] Remove `0005_seed.sql` (demo business) and `backend/seed/demo.sql`. **Change the seeded admin password immediately.**
- [ ] `APP_ENV=production`, `LOG_LEVEL=info`, real `PUBLIC_BASE_URL` (builds every buyer link and OG tag), locked-down `CORS_ORIGINS` (not `*`).
- [ ] `FRONTEND_DIR` pointing at the built SPA, so shared links render previews.
- [ ] Managed Postgres with backups + PITR; Redis with persistence (OTP and rate-limit correctness across restarts).

**Hardening:**
- [ ] TLS, security headers, edge rate limiting (Cloudflare free tier covers all three).
- [ ] ≥2 API replicas are safe — **but gate the in-process background jobs to a single leader first**, or broadcasts and reminders send twice.
- [ ] Razorpay webhook reachable and monitored — it is the source of truth for missed client verifications.
- [ ] Health probes (`/healthz` exists), log shipping, error alerting.
- [ ] Load-test the OTP → order → pay path.
- [ ] Verify `/robots.txt` and `/sitemap.xml` on the real domain, and check one storefront link in WhatsApp and in Facebook's sharing debugger.

## 22. Known gaps

1. **SMS/WhatsApp delivery needs accounts** — the highest-priority external dependency. Buyer OTP logs to console until a provider is wired.
2. **Background jobs are per-replica** — fine on one instance, must be leader-gated before horizontal scale.
3. **Local file storage** — switch to object storage before real seller photos land in it.
4. **No automated end-to-end suite** — there are focused unit tests (order, payment, product, secure, middleware, web) and the flows were verified manually. An API smoke script or Playwright run in CI would protect the buyer + payment path.
5. **No team seats** — one login per business. Sellers with staff will ask; see §23.
6. **No returns/exchange flow** — RTO is handled, customer-initiated returns are not.
7. **`PUBLIC_BASE_URL` is load-bearing** — it builds track links, confirm links, reset links and OG tags. Verify per environment.

---
---

# Part VI — Where it goes

## 23. Feature roadmap, ranked

Ranked by *(value to the seller) × (defensibility)* ÷ *(effort)*. The top three are worth more than the rest combined.

### Tier 1 — build these next

**1. Abandoned checkout recovery.**
The single highest-ROI feature not yet built. You already capture the phone number at OTP, before payment. Any checkout that reaches OTP and does not become an order is a warm lead with a working contact. One WhatsApp message an hour later — "your order is still waiting, tap to finish" — typically recovers a meaningful share of them. Small build: one table, one job, one template. Sell it as "we recover orders you didn't know you lost".

**2. Prepaid incentive / COD deterrent.**
Let the seller offer a small automatic discount (say ₹30 or 5%) for paying online. This is the most direct RTO lever that exists — it converts the risky order into a safe one at the moment of choice, rather than trying to rescue it later. It also lifts your prepaid mix, which makes the savings meter climb faster, which drives retention. Small build, large effect.

**3. Network-level COD risk score.**
Today each seller sees only their own refusal history. Aggregate anonymously across all sellers and a buyer's phone number carries a reputation the whole network can see. **This is the moat** — it gets better with every seller and every order, and no competitor can copy it without the same data. Build it as a private score first (seller sees "high risk" not the raw history), and be careful and transparent about the privacy framing.

### Tier 2 — high value, moderate effort

**4. Team seats and roles.** One login per business does not survive a seller hiring a packer. Owner / manager / packer roles, scoped to the order board. Also an upsell lever.

**5. Returns and exchanges.** RTO is covered; a buyer-initiated return is not. Boutiques and apparel need it, and it is the most common gap a seller will name in month two.

**6. Voice-note order capture.** Enormously Indian and genuinely differentiating. A large share of DM orders arrive as voice notes. Transcribe (Whisper or an equivalent) and feed the existing parse pipeline — the whole downstream flow already exists, so this is a front-end to something you have already built. Nobody else in this category does it.

**7. Delivery-date promise.** "Delivers by Tuesday" on the product page and at checkout. Serviceability already returns estimated days; surfacing it converts, and it reduces "where is my order" messages.

**8. Store credit and loyalty.** Refunds as credit instead of cash keeps money inside the seller's shop, and repeat rate is already tracked — the data is there.

**9. Instagram Story/post product tagging.** Auto-build a mini-catalog from tagged posts. Straight from the product spec's roadmap and it removes catalog setup, the biggest activation blocker.

### Tier 3 — later, or once volume justifies it

**10. Live selling — comment-to-order.** During an Instagram Live, a comment becomes an order. CommentSold built a very large business on exactly this; India's live-commerce wave is early. High effort, high ceiling.
**11. RTO protection / COD guarantee.** Priced insurance on protected order value — only credible once the network risk score has real depth. This is the long-term business, not a feature.
**12. Accounting exports.** Deeper GST and Tally-style reporting for the seller's CA.
**13. Storefront themes.** Let sellers pick a look. Pure retention/vanity, but it matters for brand-conscious sellers.
**14. Multi-channel catalog sync.** Push the same catalog to a WhatsApp Business catalog and an Instagram shop.
**15. Buyer referral.** "Share this shop, both get ₹50." Free acquisition inside the seller's own audience.

### Quick wins worth doing in a spare afternoon
- Order-level **profit tracking** (cost price per product → margin per order).
- **Duplicate-order detection** — same phone, same item, ten minutes apart.
- **Bulk status update** on the board (select ten orders → mark packed).
- **Saved reply templates** for the inbox.
- **Export customers** to CSV.
- A **"powered by CartHedge"** line on the buyer checkout footer, A/B tested against conversion.

---

## 24. What makes it defensible

Five things, in order of how hard they are to copy:

1. **The data network effect.** Per-seller COD-refusal history today → a network-level buyer risk score tomorrow → an insurable RTO-protection product after that. Every order makes it better and a competitor starting today cannot catch up without the same volume. **This is the only true moat here — prioritise anything that feeds it.**
2. **The DM stays the shop.** Every competitor's answer is a website. That is the wrong answer for this market, and their whole product is built around it. Being right about the insight is a durable advantage as long as you do not drift into building a store builder.
3. **Sold in rupees, not features.** The savings meter is the retention mechanic. A seller who can see ₹11,000 saved does not churn over ₹999, and does not comparison-shop on feature lists.
4. **Switching cost that builds itself.** Order history, the customer ledger with LTV and refusal counts, invoices, and a branded link already in an Instagram bio and printed on packaging. Leaving costs a seller real money after month three.
5. **Money never touches you.** The strongest trust position in Indian SMB software, and it removes the biggest objection before it is raised. It is also why you need no RBI licence — a structural advantage, not just a talking point. Protect it.

**Where the danger is:** drifting into a generic store builder. The moment CartHedge is judged on "does it have themes / does it have a POS", it loses to companies with ten times the engineers. Stay on the conversation, the confirmation flow, and the rupees-saved number.

---

## 25. Changelog

### 2026-07-31 — Product-completeness pass
An end-to-end audit found features that existed on only one side of the wire. All closed.

**Shared links and SEO**
- Share links pointed at the **API** (`/p/{code}/{token}` returns JSON), so every copied link, QR and WhatsApp share opened raw JSON. Now `/l/{code}/{token}`, the checkout page.
- New `internal/web` serves the built SPA and rewrites the document head per route — storefront gets business name, city, logo and `Store` JSON-LD; product gets name, price, image and `Product` JSON-LD with live availability; checkout links get a rich but `noindex` preview; `/app`, `/admin`, `/o`, `/track` are `noindex`. Seller text is HTML-escaped; JSON-LD cannot break out of its script element.
- `robots.txt` and a generated `sitemap.xml` (marketing + active storefronts + products).
- Enabled with `FRONTEND_DIR`. Unset = dev; set-but-missing = boot error, never a silent downgrade.

**Plans and entitlements**
- `plans.capabilities` was enforced by the API but **the admin plan editor never sent the field**, so every plan edit wrote `[]` and silently stripped AI, broadcasts, offers and invoices from every seller on that plan. Fixed with a capability picker fed by the API's own vocabulary, plus an "Unlocks" column.
- `GET /subscription` now returns `capabilities` and `ordersUsed`; the seller app gates on it — locked nav items, upgrade screens instead of 403 toasts, inline locks on offers, the reply assistant and invoice generation.
- `GET /subscription` was being read as a bare object while the API wraps it: the billing page showed a blank plan and "Invalid Date", and the trial banner never rendered at all. Fixed.

**Buyer path**
- Pincode **serviceability is now called at address entry** — checking / delivers / undeliverable, COD hidden where the courier will not collect, flow blocked on a confirmed non-serviceable pincode. An aggregator outage never blocks a sale.
- One `ShareActions` control (copy · QR · WhatsApp) across order links, the storefront and per-product sharing. The storefront link is a first-class card on Links and in Settings.

**Seller app**
- Send/resend COD confirmation button (the endpoint existed with no UI).
- Insights reads `GET /insights` — real best sellers, COD-risk buyers with open COD orders, month-on-month repeat and RTO movement, and the hour the seller's own buyers order in (previously hardcoded advice).
- Low-stock strip on Products from the endpoint that had no surface.
- Password reset had no page — the emailed link 404'd. Added at `/reset-password`; renewal emails now link `/app/billing`.

**Platform**
- Contact form posts to `POST /api/v1/contact` instead of opening a `mailto:` — leads stored (`contact_messages`, migration `0011`), mailed to `ADMIN_EMAIL`, counted on the admin overview, worked from the Requests page.
- Meta OAuth connect for Instagram and WhatsApp, with manual token entry kept as fallback.
- The admin announcement bar is rendered on the marketing site (it was editable but displayed nowhere).

**Verification:** `gofmt`, `go build`, `go vet`, `go test ./...` (new `internal/web` tests cover head injection, escaping, noindex routes, asset handling, boot behaviour), `tsc --noEmit`, `eslint src`, `vite build` — all pass. Those tests caught a real cross-platform bug: `filepath.Clean` rewrites URL paths with backslashes on Windows, breaking every route match; it uses `path.Clean` now.

**Not verified live:** Docker was not running, so the DB-backed meta paths (`/s/…`, `/l/…`), the contact round trip and the OAuth exchange were not exercised against a live stack. One `docker compose up -d` run before release covers the first two; OAuth additionally needs an approved Meta app.

### 2026-07-25 — First live run
Stack run end to end (React → Vite proxy → Go API → Postgres + Redis), every surface exercised. Verified: migrations, marketing content round-trip, live pricing, seller login with seeded data, storefront browse with reseller/SKU hidden from buyers, pincode validation, buyer OTP → COD order → stock drawdown → seller board, image upload, AI draft → order confirm without an LLM, graceful AI failure with no key, order state-machine guards, registration + trial.

**Two boot-blocking bugs found and fixed** (the code had never been started before): a Go 1.22 router pattern conflict that panicked at startup, and buyer WhatsApp track/confirm links pointing at API paths instead of frontend pages. A payment double-side-effect race was closed at the same time.

### 2026-07-25 — Messaging automation
Automated Instagram + WhatsApp DM capture built and verified locally: webhook verify handshake, signature check (200 valid / 401 forged), channel connect, a signed DM creating a conversation and inbox entry, the debounce loop parsing once and failing gracefully with no LLM key.
