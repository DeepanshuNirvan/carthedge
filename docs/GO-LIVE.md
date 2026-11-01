# CartHedge — Go-live checklist

_Written 25 Oct 2026 after a full pre-launch pass: code audit, security/VAPT review, payments and autopay review, every E2E suite re-run against an isolated database, the DM assistant evaluated on the production model, and a UI sweep of every route on desktop and phone._

This file has two halves:

- **Part A — what you must do by hand**, in the order to do it. Code cannot do these: they need your accounts, money, dashboards or a lawyer.
- **Part B — what was checked and fixed in code**, so you know what is already safe.

Tick the boxes as you go. Items marked **🔴 today** are live problems on `carthedge.in` right now, not launch prep.

---

## Part A — Manual steps

### A0. 🔴 Do today (live exposure on carthedge.in)

These were confirmed against the live database on 25 Oct 2026 (read-only checks).

- [ ] **🔴 Change the admin password.** `admin@carthedge.in / Admin@123` still logs in to the admin console. The password is printed in `backend/README.md` and in migration `0006_admin.sql`, so anyone who has seen the repo can run your platform: suspend sellers, change plans, read every business.
  - Fastest, right now: log in at `https://carthedge.in/admin/login` → **Account** → change password.
  - After you deploy this code, production refuses `Admin@123` outright (see B2). If you have not changed it by then, set it in the Neon SQL editor:
    ```sql
    update admins set password_hash = crypt('YOUR-NEW-LONG-PASSWORD', gen_salt('bf', 10))
    where email = 'admin@carthedge.in';
    ```
  - Use a password manager; 16+ random characters.
- [ ] **🔴 Change the demo seller password.** `demo@carthedge.in / Demo@123` still logs in, and `demo-store` holds the real **@carthedgeofficial** Instagram connection. Anyone can read your brand's DMs and reply as you.
  ```sql
  update businesses set password_hash = crypt('YOUR-NEW-LONG-PASSWORD', gen_salt('bf', 10))
  where email = 'demo@carthedge.in';
  ```
  Decide what `demo-store` is: if it stays your public showcase, keep it but with the new password; if not, connect @carthedgeofficial to a real store and disconnect it here (Settings → Connected channels).
- [ ] **🔴 Take the QA plans off the public pricing page.** `https://carthedge.in/api/v1/plans` currently lists three **"QA Plan v3" at ₹849** next to Starter/Growth/Pro. Visitors see them.
  ```sql
  update plans set active = false where code like 'qa%';
  ```
  (Or Admin → Plans → untick Active on each QA plan.)
- [ ] **🔴 Clean the demo store's products.** `/s/demo-store` (which is in your sitemap) shows three **"Test Kurti QA v2"** products with the description "qa item" and no photo.
  ```sql
  update products set active = false
  where business_id = '10000000-0000-0000-0000-000000000001' and (name ilike '%qa%' or description ilike 'qa item%');
  ```
- [ ] **🔴 Remove the QA test businesses.** 102 of the 105 businesses in production are QA accounts (`qa-…` store codes, `qa.…@example.com`). Their stores are in `sitemap.xml`, so Google is being fed ~200 junk URLs, and they inflate the admin numbers. Schedule them through the app's own deletion path (the purge job removes 20 every 15 minutes, children first, exactly like a seller deleting their account):
  ```sql
  -- preview first
  select count(*) from businesses where (code like 'qa-%' or email like 'qa.%@example.com') and status <> 'purged';
  -- then
  update businesses set status = 'deleted', deleted_at = now() - interval '31 days'
  where (code like 'qa-%' or email like 'qa.%@example.com') and status <> 'purged';
  ```
  Also look at `moboseller` and `moboseller-at9f` (your own tests?) and remove them from Admin if they are not real.
- [ ] **🔴 Resume your own Instagram test chat.** The chat you tested the "pink chikankari kurti" bug on is paused for 100 years (you pressed Pause in the AI desk after the bad reply). AI desk → that chat → **Resume assistant**, otherwise the assistant never answers that account again.
- [ ] **🔴 Rotate every secret that was ever pasted into a chat or a file outside Render** (QA tracker OPS-2): OpenAI key, Gemini key, Razorpay test keys + webhook secret, Meta app secrets, Neon DB password, Upstash password, JWT secret, Mailtrap SMTP password. Put the new values only in Render's environment. Rotating `JWT_SECRET` signs everyone out (fine before launch) and breaks old broadcast stop links (none sent yet). **Never rotate `ENCRYPTION_KEY`** without re-encrypting stored seller tokens — see A1.
- [ ] **Deploy.** The live site is running an older build than the repo (its security headers have no `connect.facebook.net`, which the repo added on 11 Oct). Push and check Render's deploy log; if auto-deploy is off or the build failed, fix that first. Read A1 before you deploy this version.

### A1. Before deploying this version (new boot checks)

This version refuses to start in production with unsafe settings — on purpose. Set these in **Render → Environment** first, or the deploy will fail with a clear message in the log.

- [ ] `APP_ENV=production` (it is; HSTS is on).
- [ ] `JWT_SECRET` — **at least 32 characters** (boot fails otherwise). Generate: `openssl rand -hex 32`.
- [ ] `RAZORPAY_WEBHOOK_SECRET` — **required whenever `RAZORPAY_KEY_ID` is set** (boot fails otherwise). Without it, autopay renewals and any subscription payment whose browser closed early are never recorded: the seller pays and the plan does not extend.
- [ ] `CORS_ORIGINS=https://carthedge.in`. (If it is still `*`, production now narrows it to `PUBLIC_BASE_URL` automatically. The SPA is same-origin, so nothing else needs it.)
- [ ] `PUBLIC_BASE_URL=https://carthedge.in` (no trailing slash). It builds every buyer link, reset link, OG tag and the sitemap.
- [ ] `ENCRYPTION_KEY` — 64 hex chars. **Back it up in your password manager.** Losing or rotating it locks every seller's stored Razorpay secret and Instagram token.
- [ ] `LOG_LEVEL=info`.
- [ ] `TRIAL_DAYS=30` and `TRIAL_PLAN_CODE=pro` (the site copy says "30 days free"; keep them in sync).
- [ ] The Dockerfile now builds on **Go 1.27, Node 22 and Alpine 3.22** and runs as a **non-root user** (see B6). Render must use the **Docker** runtime with this Dockerfile. If you ever attach a Render Disk for uploads, mount it at `/app/uploads` — but use R2 instead (A6).
- [ ] Render health check path: `/healthz`.

### A2. Payments — Razorpay live mode (CartHedge's own account)

CartHedge's account bills sellers for plans. Buyer money goes to each seller's own Razorpay/UPI and never touches you.

- [ ] Complete Razorpay **KYC / activation** for your business. Razorpay checks your website before activating: it needs a live **Privacy Policy, Terms, Refund/Cancellation policy, Contact page with an address, and pricing**. You have Privacy/Terms/Contact; add a **refund & cancellation section for CartHedge subscriptions** to the Terms (what happens if a seller cancels mid-month, overage billing), and put a **postal address** on the Contact page (Admin → Site content → contact address is empty today).
- [ ] Switch to **live keys**: `RAZORPAY_KEY_ID=rzp_live_…`, `RAZORPAY_KEY_SECRET=…`.
- [ ] Razorpay Dashboard → **Webhooks** → add `https://carthedge.in/webhooks/razorpay`, set a secret (same value as `RAZORPAY_WEBHOOK_SECRET`), and tick these events:
  `payment.captured`, `subscription.authenticated`, `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.cancelled`, `subscription.completed`, `subscription.resumed`.
- [ ] Razorpay Dashboard → Settings → **Payment capture = Automatic**. (The app treats a verified checkout as paid; manual capture would leave authorised payments that auto-refund after 5 days.)
- [ ] Enable **Subscriptions** and **UPI AutoPay / e-mandate** on the account (Razorpay activates these separately).
- [ ] Admin → Site content → **Billing identity**: CartHedge's legal name, GSTIN, address and state. Without it every subscription invoice is issued by "CartHedge" with no GSTIN. Get **GST registration** first if you charge GST (plan prices are treated as GST-inclusive at 18%, SAC 998314).
- [ ] **Live money test** (do it yourself, it is a real payment): buy Starter with your own card/UPI from a fresh seller account → check the plan extends 30 days, the invoice appears under Billing, the payment shows in Admin → Payments. Then turn on autopay, check the mandate in Razorpay, and refund the test payment from the Razorpay dashboard.
- [ ] The admin revenue numbers currently include **Razorpay test-mode payments** from QA (63 paid subscription rows). After going live, judge MRR from live payments only.
- [ ] Seller education (put it in onboarding/FAQ): **sellers must use live keys** in Settings → Payments, and **must never mark a UPI claim "paid" until the money shows in their bank app** — a UTR can be typed by anyone (see A10).

### A3. WhatsApp — the launch blocker for OTP

Without this, **nobody can sign up** (seller signup needs a mobile code) **and buyers cannot check out** unless they type an email. In production the app never logs codes; it answers "codes cannot be sent right now".

Full steps: [WHATSAPP-INSTAGRAM-GO-LIVE.md](WHATSAPP-INSTAGRAM-GO-LIVE.md) → "Phase 1". Summary:

- [ ] Add CartHedge's own WhatsApp number to the Meta app (a number not used in the WhatsApp app), verify it, set the display name.
- [ ] Create and get approved the three templates, **names and placeholder order exactly**: `carthedge_code` (Authentication, copy-code button), `order_update` (Utility: `Order update from {{1}}: {{2}}`), `seller_alert` (Utility: `CartHedge alert: {{1}} / {{2}} / Open it here: {{3}}`), language `en`.
- [ ] Create a **System User** token with `whatsapp_business_messaging` (never-expiring), add a payment method to the WhatsApp account (auth/utility messages are charged: about ₹0.115 each in India).
- [ ] Render env: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN` (both or neither — boot checks). Leave `WHATSAPP_SELLER_CHANNEL` off until Phase 2.
- [ ] Test: sign up a seller with your own phone; place a buyer order on your store; check the code and the order update arrive.

### A4. Instagram — Meta app review

The DM assistant code is done; Meta's approvals are not. Until the app is reviewed, only accounts added as **testers** can connect.

- [ ] Finish **Access verification / Tech Provider** (Review → Verification), then **publish** the app (needs the 1024×1024 icon, privacy URL `https://carthedge.in/privacy`, category, data-deletion URL `https://carthedge.in/data-deletion`).
- [ ] Remove the ~21 permissions from unused use cases from the App Review draft; request only `instagram_business_basic`, `instagram_business_manage_messages`, `instagram_business_manage_comments`.
- [ ] Instagram → API setup with Instagram Login: redirect URL `https://carthedge.in/oauth/meta/callback` (= `META_OAUTH_REDIRECT_URL`), webhook `https://carthedge.in/webhooks/meta` with `META_VERIFY_TOKEN`, subscribe to `messages`.
- [ ] Deauthorize callback `https://carthedge.in/webhooks/meta/deauthorize`, data-deletion callback `https://carthedge.in/webhooks/meta/data-deletion`.
- [ ] Record the review screencast: seller connects Instagram → buyer DMs → assistant replies → order summary → "haan" → draft on the AI desk → seller confirms.
- [ ] Fix the Instagram app name typo `CarthHedge-IG` ("Sync app name").
- [ ] Graph API: the code defaults to **v25.0**; v21 stops working on 21 Jan 2027 — make sure Render does not pin an old `META_GRAPH_VERSION`.

### A5. AI — paid key and spend caps

- [ ] The key in `backend/.env` is **Gemini free tier**: 5 requests/minute, ~20/day. During this pass it returned `503 high demand` and `429 quota exceeded` within minutes. On that key the assistant would go silent after a handful of buyers. **Production needs a paid key.**
- [ ] Set `AI_PROVIDER=openai`, `OPENAI_API_KEY=…` (paid), `OPENAI_MODEL=gpt-4.1-mini` — this model passed all 18 assistant scenarios in this pass (B4). Keep a **paid** Gemini key as failover (`GEMINI_API_KEY`, `GEMINI_MODEL`, optional `GEMINI_FALLBACK_MODEL`).
- [ ] Set a **monthly hard spend limit** and an email alert on both provider dashboards. The app also caps per seller (60 parses/min, 40 assistant messages per chat per hour), but the provider limit is the real ceiling.
- [ ] Watch Admin → Overview → "AI spend by seller" for the first weeks.

### A6. Product images — move off local disk

- [ ] Render's disk is wiped on every deploy: with `STORAGE_DRIVER=local`, **every photo a seller uploads disappears at the next deploy**. Before the first real seller:
  - Cloudflare R2 → create a bucket, enable public access (r2.dev URL or a custom domain like `img.carthedge.in`), create an API token with Object Read & Write.
  - Render env: `STORAGE_DRIVER=s3`, `S3_BUCKET=…`, `S3_REGION=auto`, `S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`, `S3_PUBLIC_URL=https://img.carthedge.in` (or the r2.dev URL), `AWS_ACCESS_KEY_ID=…`, `AWS_SECRET_ACCESS_KEY=…`.
  - Test: upload a product photo, redeploy, check it still loads.

### A7. Email

- [ ] Verify `carthedge.in` with your provider (Mailtrap/Brevo/Resend/Zoho ZeptoMail): add **SPF, DKIM and a DMARC** record (`v=DMARC1; p=quarantine; rua=mailto:…`).
- [ ] `SMTP_HOST`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM=CartHedge <hello@carthedge.in>`, `ADMIN_EMAIL` (where enquiries and custom-plan requests go).
- [ ] Without SMTP in production, password-reset, welcome and alert emails now fail cleanly instead of being written to the log (B2). Test "Forgot password" end to end after setting it.
- [ ] Replace `carthedgeofficial@gmail.com` on the site with a domain address (Admin → Site content → contact) — a gmail support address reads as unofficial to sellers and to Razorpay/Meta reviewers.

### A8. Hosting, database, network

- [ ] **Render: a paid instance, exactly one.** A free instance sleeps after 15 minutes: Meta and Razorpay webhooks time out on cold start, and the background jobs (COD nudges, trial expiry, autopay overage, account purge, DM follow-ups) stop while it sleeps. Keep **1 instance**: the jobs claim work atomically, but the DM assistant's "one turn per chat" guard is in-process.
- [ ] **Neon**: paid plan with **point-in-time restore**; use the **pooled** connection string with `sslmode=require`; do one **test restore** to a branch before launch so you know it works.
- [ ] **Redis (Upstash)**: a plan with persistence; it holds sessions, OTPs and rate limits. If it is down the server will not boot.
- [ ] **Cloudflare** in front of `carthedge.in` (proxied, orange cloud): SSL mode Full (strict), "Always use HTTPS", Bot Fight Mode, a rate-limit rule on `/p/*/otp`, `/api/v1/auth/*` and `/api/v1/contact`. The app trusts only the `CF-Connecting-IP` header for client IPs — do not put any other proxy in front that lets clients set it.
- [ ] **www**: `www.carthedge.in` does not resolve today. Add `www` (CNAME) and a 301 redirect to `https://carthedge.in` — people type it, and Google treats it as a separate site.
- [ ] Uptime monitor (UptimeRobot / Better Stack) on `https://carthedge.in/healthz`, alert to your phone.
- [ ] Error alerting: Render log alerts on `"level":"ERROR"`, or ship logs to Better Stack/Grafana. The useful ones: `channel send failed`, `dm turn failed`, `subscription webhook failed`, `notify failed`, `billing step failed`.
- [ ] Turn on **2FA** on every account that can touch production: GitHub, Render, Neon, Upstash, Cloudflare, Razorpay, Meta Business, Google (Search Console), domain registrar, OpenAI/Gemini.
- [ ] Make sure the **GitHub repo is private**, and that `temp.env.test` and `backend/.env*` were never committed: `git log --all --oneline -- temp.env.test backend/.env` should print nothing. If anything prints, those secrets are compromised — rotate them (A0).

### A9. Legal and compliance (India)

- [ ] Have a lawyer review **Privacy Policy** and **Terms** (QA BUG-056 updated the text; it was never reviewed).
- [ ] Add to the Terms: the **overage line** ("orders above your plan's included quota are billed at the plan's per-order rate on your next renewal"), subscription refund/cancellation, and a **prohibited goods** list (counterfeits, weapons, drugs, adult content) with your right to suspend a store.
- [ ] Name a **Grievance Officer** with name, email and response time on the Contact/Privacy page (IT Rules 2021; DPDP Act).
- [ ] Company/entity details on the site footer or Contact page (legal name, address).
- [ ] DPDP Act: the data export, buyer erase and account deletion features exist (Settings → Account, Customers → Erase); make sure support knows to use them for requests.

### A10. Scams and abuse — what the product does, what you must do

| Scam | What the product already does | What you must do |
|---|---|---|
| **Fake seller takes prepaid money and never ships** | Every new store must verify a mobile by OTP; store links cannot contain "carthedge"; admin can suspend a store instantly (storefront + API stop). The buyer badge now says only **"Mobile verified"** — until 25 Oct it said "Verified seller" on every store (B3). | Watch new stores in Admin → Businesses for the first weeks. Add a "Report this store" email to the store policies page/footer. A real **KYC-verified badge** (PAN/GST checked by your team, stored per business) is a good next feature; do not reintroduce "Verified seller" until it exists. |
| **Buyer sends a fake UTR for a UPI order** | A UPI claim never marks an order paid: it shows as "claimed" until the seller approves it. | Tell sellers in onboarding: approve only after the money is visible in your bank app. |
| **Fake COD orders / refusers** | Buyer OTP before any order, COD re-confirmation link, optional ₹50–100 token, repeat refusers flagged in the customer ledger. | Encourage sellers to turn on the COD token for flagged buyers. |
| **OTP pumping** (bots requesting codes to burn your WhatsApp credits) | Codes only for existing active stores; 10 sends / 10 min per IP; 5 per hour per phone per store; signup OTP 5 / 10 min per IP. | Add the Cloudflare rate-limit rule (A8) and a daily spend alert in WhatsApp Manager. |
| **Trial farming** | Unique verified mobile, canonical email (gmail dots/+tags), unique WhatsApp/Instagram, 3 trials per IP per day, a deleted account's phone cannot get a second trial. | None now; if it becomes real, require autopay at trial start. |
| **Password guessing on sellers/admin** | Per-IP limits plus a new **per-account** lock: 10 wrong passwords in 15 minutes locks that email (B2). | Use a long admin password and 2FA everywhere (A8). |
| **Phishing look-alike stores** | Reserved words and "carthedge" blocked in store codes. | Report impersonation to Meta when you see it. |

### A11. SEO and getting found

Honest expectation first: nobody can promise the #1 Google result for a broad phrase like "auto social media business manager" — big tools (Meta Business Suite, Wati, Interakt, DM automation apps) have years of content and links. What is in your control is (1) a technically perfect site, done in this pass (B5), and (2) content and links aimed at specific phrases your buyers actually type, which takes weeks to months.

- [ ] **Google Search Console**: add the `carthedge.in` domain property (DNS TXT), submit `https://carthedge.in/sitemap.xml`, request indexing of `/`. Re-submit after the QA purge (A0) so the junk store URLs drop out.
- [ ] **Bing Webmaster Tools**: import from Search Console (also feeds ChatGPT/Copilot search).
- [ ] Check the home page in Google's **Rich Results Test** — it now carries Organization, WebSite, SoftwareApplication (with your INR plan prices) and FAQPage data.
- [ ] Update **Admin → Site content**: the announcement bar still says the seed text "CartHedge is an order-management tool for small Indian businesses", the tagline is the old "AI order desk", the FAQs are the July seed wording, and the stats are seed figures. Real words here are what the home page, its structured data and its no-JavaScript version all show.
- [ ] Testimonials: the seed quotes are hidden on purpose. Add real ones (name, business, permission) as soon as your first sellers agree.
- [ ] Target phrases for guide pages / posts (one page per intent, written for Indian sellers): "Instagram DM auto reply for business", "how to take orders on Instagram", "WhatsApp order management for small business", "reduce COD returns / RTO", "Instagram shop link in bio India", "Hinglish chatbot for Instagram sellers". The site has no blog route yet — a `/guides/...` section is the single biggest SEO lever left (it needs a new route and sitemap entries).
- [ ] Links: Product Hunt launch, SaaS directories (G2, Capterra, SaaSworthy, Indian startup directories), your Instagram/LinkedIn/YouTube profiles linking to `carthedge.in` (add their URLs in Site content → social; they feed `sameAs` in the structured data), a Google Business Profile, guest posts in seller communities.
- [ ] Every seller storefront is indexable and links back via "Powered by CartHedge" — real sellers with real products are SEO for you too.

### A12. Launch-day smoke test (real phone, real money, ~45 minutes)

Do this on production after A0–A8, on your phone, inside the Instagram app where possible.

1. Sign up a new seller with your own mobile → code arrives on WhatsApp → trial starts → welcome email arrives.
2. Settings → Payments: add **live** Razorpay keys (your own) and a UPI ID. Settings → Connected channels → Connect Instagram.
3. Add one product with two sizes and a photo (photo survives a redeploy — A6).
4. From another Instagram account, DM "hi, do you have the <product>?" → reply in ~10 s, in your language, no "owner will reply". Order it in the chat → summary → "haan" → draft on the AI desk → Confirm → buyer gets the order link in the chat.
5. Open the storefront link in the Instagram in-app browser → buy with **COD** → buyer code by WhatsApp → COD confirmation link arrives → confirm → order moves on the board.
6. Buy with **UPI/card ₹1–10 live** → paid → tracking page shows paid → refund it from the order (Razorpay refund appears in your Razorpay dashboard).
7. Ship → buyer gets "on the way" on WhatsApp/chat; Delivered → invoice.
8. Buyer tracking page → cancel/address change/return asks for a code first.
9. Billing → pay for Starter (live) → plan extends, invoice appears → refund from Razorpay.
10. Forgot password → email arrives → reset → other devices are signed out.
11. Admin: log in with the new password, view the new business, open "View as seller", suspend → storefront shows paused → activate.

### A13. After launch

- [ ] Daily for two weeks: Admin overview, Render errors, AI spend, WhatsApp spend, new stores (A10).
- [ ] Weekly: Neon backups present; Razorpay settlements reconcile with Admin → Payments.
- [ ] Before adding a second Render instance: the in-process DM "busy" guard needs a Redis lock (see `messaging/service.go`), the jobs already claim atomically.
- [ ] Buyer payments have no webhook safety net (QA OPS-3): if a buyer closes the tab after paying but before the page reports back, the order stays unpaid in CartHedge although the seller has the money. Sellers see it in Razorpay. A reconcile job using the seller's keys is the fix when volume justifies it.
- [ ] Book an **external penetration test** once real sellers are live (B7 lists what was covered internally).

---

## Part B — What was checked and fixed in code (25 Oct 2026)

Nothing was committed — review the diff and commit yourself.

### B1. The "needs you" bug (Instagram: "hi, is the rose chikankari kurti available?")

**What happened** (read from the production chat, read-only): your test chat with @carthedgeofficial started on 1 Oct. On 2 Oct you asked "price kam nahi ho sakta?" — a bargaining request. On 25 Oct, 22 days later, you asked if the kurti was available. A chat had no session boundary, so the assistant read the whole 3-week-old thread plus a stale cart (a cushion cover, your old name and Noida address). The understanding step saw the old bargaining and flagged a handoff; the handoff writer then said "I'll check with the owner about the price". Simple question, wrong answer.

**Fixes** (`backend/internal/messaging/service.go`, `backend/internal/ai/agent.go`):
- A buyer who writes after **72 hours of silence starts a fresh conversation**: the assistant reads only from that message on, with an empty cart. Chats waiting on you (a pending draft or a handoff) keep their state.
- The handoff rule now tells the model to judge **only the buyer's newest messages** — something already answered earlier is not a reason.
- A model answering `"none"` where the prompt asks for an empty handoff no longer hands the chat over.
- Two more assistant bugs found by the full evaluation and fixed: after an order was placed, "order kab tak aayega?" re-added the old item and asked for its size again (a status question now never changes the cart); and the assistant once told a buyer "confirm kar diya hai" while details were still missing (it may no longer say an order is confirmed — only the order system does).

**Proof**: all **18 assistant scenarios pass on `gpt-4.1-mini`** (your production model), including a replay of this exact chat; and an end-to-end test through signed WhatsApp webhooks: a message after 4 quiet days resets the chat and is answered without handoff, a chat quiet for 1 hour keeps its cart, a handed-off chat stays with you (8/8).

### B2. Security fixes

| Finding | Severity | Fix |
|---|---|---|
| Seed admin/demo passwords work in production | Critical | Production refuses `admin@carthedge.in / Admin@123` and `demo@carthedge.in / Demo@123` with a clear message; the admin can no longer set `Admin@123` again. (You still must change them — A0.) |
| No per-account brute-force limit (only per IP) | High | 10 wrong passwords in 15 min locks that email for sellers and admin; a password reset clears it. |
| Admin password change left old admin sessions valid for 24 h | High | Changing the admin password signs out every other admin session; the current one gets a fresh token. |
| Any API route accepted the login token in the URL (`?accessToken=`) | Medium | Only the live event stream accepts it; elsewhere tokens in URLs leak into history and logs. |
| Production without SMTP wrote email bodies — **password-reset links** — into the logs | High | Production now refuses to "send" without SMTP and never logs the body. |
| Seller-typed names could inject email headers (line breaks in a subject) | Medium | Subjects are sanitised; `Date` and `MIME-Version` headers added (deliverability). |
| Unsafe production config could boot silently | Medium | Boot fails on a short `JWT_SECRET` or Razorpay keys without a webhook secret; wildcard CORS is narrowed to the site's own origin. |
| 17 reachable known vulnerabilities (`govulncheck`) incl. **pgx SQL-injection advisory GO-2026-5004**, jwt, go-redis, x/text, AWS SDK | High | Modules upgraded to fixed versions (pgx 5.9.2, jwt 5.2.2, go-redis 9.7.3, x/text 0.41, AWS SDK current). The remaining 11 are in the Go standard library and are fixed by building with Go ≥ 1.27.3 — the Dockerfile now uses `golang:1.27-alpine` (it was on Go 1.23, which no longer gets security fixes). |
| Container ran as root on end-of-life Alpine 3.20 / Node 20 build | Low | Alpine 3.22, Node 22, non-root user, stripped binary. |
| Admin login link advertised in the public footer | Low | Removed (staff use `/admin/login` directly). |
| Meta webhook handshake echoed text with a sniffable content type | Low | Served as `text/plain`. |
| Frontend `react-router` advisory (open redirect via backslash) | Low | Not exploitable here (no navigation to user-supplied paths); non-breaking `npm audit fix` applied. `zod` 3 → 4 advisory is client-side only and needs a breaking upgrade — left for later. |

### B3. Scam fix: the "Verified seller" badge

Every storefront and checkout link showed "Verified seller" / "Verified seller on CartHedge" — the flag was hard-coded `true` for every store. A fraudulent store got CartHedge's trust badge for free. It now says **"Mobile verified"** (and "Seller's mobile verified by CartHedge" in the checkout trust strip), shown only when the seller's mobile actually passed OTP — the one thing CartHedge checks.

### B4. Payments and autopay review

Read end to end: buyer checkout (Razorpay order → signature verify → atomic pending→paid flip), UPI claims (never auto-paid), subscription checkout + verify + webhook (one shared activation inside the paying transaction, replay-safe), autopay (mandate start, first charge, `subscription.charged` idempotent per Razorpay payment id, halted/cancelled handling, overage add-on the day before renewal), refunds (receipt-tagged, 4xx-only decline, race-tested). No new bugs found; the E2E billing, refund and race suites pass (B7). The manual items are in A2.

### B5. SEO (technical) — done

- Title and description now lead with what people search: *"CartHedge — AI DM Auto-Reply & Order Desk for Instagram Sellers"*, matching the product (the old one led with "drafts the order" and RTO).
- Home page structured data: **Organization** (logo, contact point, social profiles), **WebSite**, **SoftwareApplication** with live INR plan prices, **FAQPage** from your live site FAQs — validated as JSON.
- A `<noscript>` version of the landing (headline, what it does, FAQs, links) for crawlers and AI search bots that do not run JavaScript; browsers with JavaScript never show it.
- `robots` meta allows large image previews and full snippets on public pages; private pages stay `noindex`.
- Sitemap: real `lastmod` dates (from product updates) instead of "today" on every URL; empty stores (no products) left out; Privacy and Terms added.
- `lang="en-IN"`; the client-side title matches the server one; the duplicate, mismatched client FAQ data removed.
- Already correct and kept: server-rendered meta + Product/Store JSON-LD per storefront and product, 404s for unknown URLs, canonical URLs, OG/Twitter cards, HTTPS redirect.

### B6. UI review (impeccable critique + CDP sweep)

- 33 routes (marketing, storefront, product, link checkout, tracking, 12 seller pages, 7 admin pages, 404) at **1440×900 and 390×844**: **no horizontal overflow anywhere**, no JS exceptions, no console errors. Design detector: 0 findings. Critique score 29/40 ("Good"); the archived report is in `.impeccable/critique/`.
- Fixed: storefront sort menu was 12 px on phones (iOS zooms the page when a buyer taps it) → 16 px; policy-page contact links were 24 px tall → 48 px tap targets; dashboard RTO meter drew a full red bar while still "Measuring" → empty track until there is enough data.
- Left alone on purpose (would not clearly improve): Settings' copy/QR/share icons (they have labels for screen readers and tooltips), the sales chart's spikes on sparse days, the app's older bracketed font sizes.

### B7. Tests run

| Suite | Result |
|---|---|
| `go vet`, `go test ./...` (incl. new tests: config production guards, SEO home page, SSE token route, status-question cart) | pass |
| `tsc --noEmit`, `eslint src`, `vite build` | pass |
| DM assistant eval on gpt-4.1-mini | 18/18 |
| E2E against an isolated Postgres (nothing touched production): auth 69/69, catalog 83/83, checkout 78/78, billing 63/63, misc 22/22, settings/checkout 71/71, returns/GST 54/54, account/billing 52/52, options/consent 54/54, assisted WhatsApp 14/15*, expired plans 12/12, race 12/12, stress 6/6, DM session 8/8 | pass |
| Security probes on the live build: default creds refused, per-account lock after 10 tries across rotating IPs, URL token refused, foreign-origin CORS refused, CSP/HSTS/COOP headers present | pass |
| Secret scan of the production JS bundle; source maps | none found |

\* The one miss is a test-timing artifact: the local database is ~100× faster than Neon, so the buyer's OTP template landed inside the suite's 500 ms look-back window. Every message sent was an approved template.

Not testable from here (needs your accounts/devices): real WhatsApp delivery, real Instagram DMs on Meta's side, a live Razorpay charge and mandate, real email delivery, Cloudflare/DNS, Render deploy. They are all in A12.
