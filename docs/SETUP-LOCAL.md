# CartHedge — local/test setup with real credentials

_Written 2026-08-09. Companion to [`INTEGRATIONS.md`](./INTEGRATIONS.md), which is the generic checklist. This file is **your** current state: which keys are in, what is still blocked, and exactly what to click next._

---

## 0. Fixed on 2026-08-09

### 0.1 `temp.env.test` was staged in git with live database credentials — resolved

The file held the live Neon Postgres password and the Redis password, and `.gitignore` only listed `.env`. It was removed from the index (`git rm --cached temp.env.test`) and `temp.env.test` added to `.gitignore`. **The file itself is untouched on disk**; it is simply no longer on its way into a commit.

Nothing was ever committed, so history is clean. If you ever do push it, rotate the Neon password (Neon console → Roles → Reset password) and the Redis password — deleting the file in a later commit does not remove it from history.

### 0.2 The server would not boot — migration `0012` — resolved

```
migrations failed  err="migration 0012_identity_and_upi.sql:
ERROR: could not create unique index \"businesses_phone_key\" (SQLSTATE 23505)"
```

Migration `0012` adds four unique keys to `businesses` to stop one person farming multiple 15-day trials. Existing duplicate rows blocked it. **There were two collisions, not one:**

| Collision | Rows | Action taken |
|---|---|---|
| `phone = 8920039064` | `moboseller` (1 order, 2 products) and `swdwq` (0 orders, 0 products, created 13 min later, email `dqwdq@gmail.com`) | **deleted `swdwq`** — empty throwaway row. All `businesses` FKs are `on delete cascade`, so nothing was orphaned |
| `lower(instagram) = qa.boutique` | **five** `qa-boutique-*` QA signups; three of them hold orders and products | kept the oldest (`qa-boutique-28978`) with the handle, **blanked `instagram` on the other four**. The index is `where instagram <> ''`, so blanks do not collide, and no orders were destroyed |

Deleting the four IG duplicates would have thrown away real QA orders for nothing — `instagram` is an optional field, so clearing it costs nothing and satisfies the index. Their previous value was `qa.boutique` in all four cases.

Migration `0012` then applied cleanly and the server boots:

```
level=INFO msg="migration applied" file=0012_identity_and_upi.sql
level=INFO msg="carthedge api listening" port=8080 env=development storage=local aiProvider=gemini
```

The migration file itself was **not** modified. A fresh database has no duplicates, so adding dedup SQL to it would be dead code on every future deploy.

---

## 1. What is now in `backend/.env`

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Neon (unchanged) | |
| `REDIS_URL` | `10.99.99.16:6379/5` (unchanged) | private IP — must be reachable from wherever you run the server |
| `JWT_SECRET` | regenerated | old value `JBKfy78vkb2g8Hiwj8kIP` was too short |
| `ENCRYPTION_KEY` | regenerated, 64 hex | **was 64 zeros.** Encrypts seller Razorpay secrets and Meta tokens at rest |
| `AI_PROVIDER` | `gemini` | only Gemini key present; add `OPENAI_API_KEY` later for automatic failover |
| `GEMINI_API_KEY` | your key | |
| `GEMINI_MODEL` | `gemini-3.6-flash` | **not** `gemini-2.0-flash` — see §1.1 |
| `RAZORPAY_KEY_ID` / `_SECRET` | your `rzp_test_…` pair | test mode |
| `RAZORPAY_WEBHOOK_SECRET` | generated `56a1edb12db0f2759eb33aea3fc9eb46` | must be pasted into the Razorpay dashboard, see §2 |
| `SMTP_USER` | `api` | **not** `apismtp@mailtrap.io` — see §1.2 |
| `SMTP_FROM` | `orders@demomailtrap.co` | `carthedge.in` is not a verified sending domain yet — see §1.2 |
| `SMTP_HOST` / `_PORT` / `_PASS` | Mailtrap live, 587 | STARTTLS; `net/smtp` negotiates it automatically |
| `ADMIN_EMAIL` | `ddnirvan@gmail.com` | receives custom-plan requests and contact-form leads |
| `META_VERIFY_TOKEN` | `carthedge_wh_56a1edb12db0f275` | paste this exact string into the Meta webhook config |
| `META_APP_ID` / `META_APP_SECRET` | **blank** | §3 fills these |
| `WHATSAPP_API_URL` / `_TOKEN` | **blank** | deliberately — OTP codes print to the server console until DLT, see §5 |

> **`ENCRYPTION_KEY` changed — and six rows were affected.** The old value was 64 zeros, so anything encrypted under it stopped decrypting. Checked rather than assumed: five `qa-boutique-*` businesses held a Razorpay secret and one `channel_connections` row held a WhatsApp token. Decrypting them with the old key showed they were all mock values — `qasecret123` and `EAAmocktoken` — so nothing real was lost.
>
> A row that cannot be decrypted is worse than an absent one: those five sellers would have failed at buyer checkout instead of falling back to UPI/COD. They were cleared (`razorpay_key_id`/`razorpay_key_secret` blanked, the fake channel connection deleted), which is the state the code already handles. No re-encryption script was written — re-encrypting mock strings buys nothing.
>
> **Never rotate this key once real sellers exist without re-encrypting those rows first**, and back it up somewhere you will still have it in two years.

### 1.1 Gemini: `gemini-2.0-flash` is dead on newly-issued keys

`/ai/parse` returned `gemini api error (429)`. The provider's own message was the real story:

```
Quota exceeded for metric: …generate_content_free_tier_requests,
limit: 0, model: gemini-2.0-flash
```

`limit: 0` — not "you used up your quota", but "this model has no free-tier quota on this project at all". `gemini-2.5-flash` is worse: `404 … no longer available to new users`. Recently-issued keys only reach the current model generation.

Fixed by moving the model to **`gemini-3.6-flash`** in three places, because the stale value was written in all of them: `backend/.env`, the `GEMINI_MODEL` fallback in [`internal/config/config.go`](../backend/internal/config/config.go), and `backend/.env.example`. Verified working, including JSON mode.

To check what a key can actually reach:

```bash
curl -s https://generativelanguage.googleapis.com/v1beta/models \
  -H "x-goog-api-key: $GEMINI_API_KEY" | grep '"name"'
```

Related fix: [`internal/ai/client.go`](../backend/internal/ai/client.go) threw the provider's response body away and surfaced only `gemini api error (429)`, which is indistinguishable from any other 4xx. It now logs the full body server-side (the seller still sees only the short message). That change immediately paid for itself — the next failure logged `503 … This model is currently experiencing high demand`, which is transient, and the retry succeeded.

**`AI_PROVIDER=gemini` with no OpenAI key means no failover.** A 503 like that is exactly what the failover path exists for. Adding any `OPENAI_API_KEY` — or any OpenAI-compatible endpoint via `OPENAI_BASE_URL` — turns a transient Gemini outage from a failed draft into a slower one.

### 1.2 Mailtrap: wrong username, and an unverified sending domain

Two separate faults, both confirmed against the live server:

| Attempt | Result |
|---|---|
| `SMTP_USER=apismtp@mailtrap.io` | `535 5.7.8 Authentication failed` |
| `SMTP_USER=api` | **AUTH OK** |
| `From: orders@carthedge.in` | `550 5.7.1 Sending from domain carthedge.in is not allowed` |
| `From: …@demomailtrap.co` | **delivered** |

`.env` now uses `SMTP_USER=api` and `SMTP_FROM=orders@demomailtrap.co`. Mailtrap's demo domain only delivers to your own account address, which is fine for development. Switch `SMTP_FROM` back to `orders@carthedge.in` once that domain is verified in Mailtrap with its SPF/DKIM records.

With `SMTP_HOST` blank, every email is logged to the console instead — a complete dev path.

---

## 2. Razorpay webhook while running on localhost

**Razorpay cannot reach `localhost`.** It POSTs from the public internet, so the URL has to resolve publicly.

### The short answer: you do not need it locally

The webhook handler in [`internal/payment/service.go:226`](../backend/internal/payment/service.go#L226) is documented as *"a safety net for missed client-side verifications"*, and that is exactly what it is. The primary path is browser-side:

- **Buyer pays** → frontend calls `POST /p/payments/verify` → `VerifyBuyer` checks the signature and marks the order paid.
- **Seller renews a plan** → `plan.VerifyCheckout` activates the subscription.

The webhook only re-does that work if the browser closed mid-payment. Both flows are fully testable on localhost with no webhook at all. Leave `RAZORPAY_WEBHOOK_SECRET` set — an unset secret makes the endpoint reject everything, which is the correct closed default.

### If you do want to test the webhook path itself

Expose the port with a tunnel. Cloudflare's is free and needs no account:

```bash
cloudflared tunnel --url http://localhost:8080
# → https://random-words-1234.trycloudflare.com
```

or ngrok:

```bash
ngrok http 8080
```

Then, in **Razorpay Dashboard → Settings → Webhooks → Add New Webhook**:

| Field | Value |
|---|---|
| Webhook URL | `https://<your-tunnel>.trycloudflare.com/webhooks/razorpay` |
| Secret | `56a1edb12db0f2759eb33aea3fc9eb46` (must match `RAZORPAY_WEBHOOK_SECRET`) |
| Active events | `payment.captured` |

Make sure you are on the **Test Mode** toggle in the dashboard, since your keys are `rzp_test_…`. Test-mode webhooks are a separate list from live-mode ones.

The tunnel URL changes every restart with the free tier. Update the dashboard each time, or use a named cloudflared tunnel / paid ngrok domain for stability.

In production this becomes `https://carthedge.in/webhooks/razorpay` and you generate a fresh secret.

**Route reference** ([`internal/server/router.go`](../backend/internal/server/router.go#L232)):

| Path | Purpose |
|---|---|
| `POST /webhooks/razorpay` | Razorpay `payment.captured` |
| `GET /webhooks/meta` | Meta webhook verification handshake |
| `POST /webhooks/meta` | inbound Instagram + WhatsApp messages |
| `GET /oauth/meta/callback` | seller one-tap channel connect |

---

## 3. Instagram + WhatsApp — how it works, then step-by-step

### 3.0 Read this before touching the dashboard

#### A. Who owns what

There is **one Meta app in the whole system, and it belongs to you.** Sellers never create an app, never see the App ID, never touch developers.facebook.com. Your app is the software; their accounts are the data it is granted access to.

| | You (CartHedge) | Each seller |
|---|---|---|
| Meta developer app | **owns exactly one** | never sees it |
| App ID / App Secret | in your `.env` | never |
| Webhook URL | one, yours, for every seller | none |
| Instagram account | only for testing (see C) | **their own** — this is the one buyers DM |
| WhatsApp number | only the free test number | **their own** |
| Access token | you hold each seller's, encrypted | granted by clicking "Connect" |

This is the standard platform shape: your app is the *Tech Provider*, sellers are *customers* who authorise it. Same model as a Shopify app or a Zapier integration.

#### B. Do you need a Facebook account? Can't you just use Instagram?

Three separate answers, because the question has three parts:

**You, the developer: yes, one Facebook account.** developers.facebook.com has no Instagram-only login. You cannot create a Meta app with Instagram credentials. It is free, it takes two minutes, you do not need a Facebook Page, and you never post anything on it. It is a login, nothing more. This is unavoidable.

**A seller connecting Instagram: no Facebook needed.** This is why CartHedge uses *Instagram API with Instagram Login*. The seller is sent to `https://www.instagram.com/oauth/authorize` ([`oauth.go:72`](../backend/internal/messaging/oauth.go#L72)) and logs in with their Instagram username and password. No Facebook account, no Facebook Page, no linking. They need only an Instagram **professional** account (Business or Creator), which is a free toggle in the Instagram app.

The older *Instagram API with Facebook Login* did require every seller to have a Facebook Page linked to their Instagram. CartHedge deliberately does not use it.

**A seller connecting WhatsApp: yes, Facebook needed.** The WhatsApp flow goes through `https://www.facebook.com/<version>/dialog/oauth` ([`oauth.go:68`](../backend/internal/messaging/oauth.go#L68)), because a WhatsApp Business Account only exists inside a Meta Business portfolio, which requires a Facebook login. There is no Instagram-only path to the WhatsApp Cloud API. That is Meta's design, not a CartHedge limitation.

#### C. Why your own Instagram gets used right now

Only because the app starts in **Development mode**. In that mode Meta delivers webhook events only for accounts that hold a role on your app (Admin, Developer, or Tester). So to see a single DM arrive during development, the connected account has to be one of yours.

Your Instagram is acting as a **stand-in seller** for testing. It is not part of the product. Once the app is Live (§3.7), you remove that role and your account is never touched again — buyers only ever message the seller's account, and replies are sent with the seller's token, never yours.

If you would rather not use your personal handle: make a second, throwaway Instagram account, switch it to professional, and use that as the test seller.

#### D. How a seller connects — the automated flow

Yes, it is automated. After app review, a seller connects in about fifteen seconds with no copy-paste, no token, no ID. What happens end to end:

```
Seller clicks "Connect Instagram" in Settings → Channels
   │
   ├─ 1. Frontend calls GET /api/v1/channels/instagram/connect-url  (with their JWT)
   │
   ├─ 2. Backend mints a signed state token: {business id, channel, one-time nonce,
   │        10-minute expiry}, stores the nonce in Redis, and returns the
   │        instagram.com/oauth/authorize URL           handler.go:86
   │
   ├─ 3. Browser goes to Instagram. Seller logs in with THEIR Instagram
   │        credentials and approves two permissions:
   │        instagram_business_basic, instagram_business_manage_messages
   │
   ├─ 4. Meta redirects the browser to
   │        GET https://<your-domain>/oauth/meta/callback?code=…&state=…
   │
   ├─ 5. Backend verifies the state signature and burns the one-time nonce
   │        (a replayed link is rejected)                handler.go:134
   │
   ├─ 6. Backend exchanges the code for a short-lived token, upgrades it to a
   │        60-day long-lived token, then calls /me to discover the account id
   │        and @username — the seller never types either      oauth.go:155
   │
   ├─ 7. Token is AES-GCM encrypted with ENCRYPTION_KEY and upserted into
   │        channel_connections (business_id, channel, external_id, status)
   │                                                     service.go:55
   └─ 8. Browser lands back on /app/settings?connected=instagram
```

WhatsApp is the same shape, with a different step 6: the backend reads the granted WhatsApp Business Account out of the token's granular scopes via `debug_token`, lists its phone numbers, and then **subscribes that WABA to your webhook automatically** with `POST /{waba-id}/subscribed_apps` ([`oauth.go:142`](../backend/internal/messaging/oauth.go#L142)). Without that call Meta accepts the connection and silently delivers nothing.

The seller's identity travels inside the signed `state` because the callback arrives as a plain browser redirect with no session attached — that is why it is a JWT and not a query parameter.

Manual entry (`POST /api/v1/channels` with `externalId` + `accessToken`) stays as a fallback for you during development, before OAuth credentials exist. Real sellers never use it.

#### E. How a buyer's DM becomes an order

One webhook URL serves **every seller**. Meta does not call a different URL per seller; routing is your job, and it is done by account ID.

```
Buyer DMs the seller's Instagram / WhatsApp
   │
   ├─ 1. Meta POSTs to https://<your-domain>/webhooks/meta   — same URL for all sellers
   │
   ├─ 2. Signature check: HMAC-SHA256 of the raw body against META_APP_SECRET,
   │        compared to X-Hub-Signature-256                  client.go:34
   │
   ├─ 3. parseWebhook normalises WhatsApp and Instagram into one shape, and
   │        pulls out the routing key:
   │           WhatsApp  → metadata.phone_number_id
   │           Instagram → entry.id (the seller's IG account id)
   │        Echoes of the seller's own outbound messages are dropped.
   │        Story replies, story mentions, shared posts and photos are kept as
   │        annotated text, because on Instagram that is how orders actually start.
   │
   ├─ 4. THE MULTI-TENANT STEP: select business_id from channel_connections
   │        where channel = ? and external_id = ?             service.go:107
   │        That row was written when the seller connected. No match → the message
   │        is logged and dropped.
   │
   ├─ 5. Conversation upserted, message inserted, parse_pending = true,
   │        unread incremented, SSE "messageReceived" pushed to the seller's UI
   │
   ├─ 6. After 12 seconds of quiet (`lull`, service.go:20) a background ticker
   │        batches the whole thread into ONE Gemini call — so a buyer sending six
   │        rapid-fire messages costs one parse, not six
   │
   ├─ 7. An order draft with a confidence score appears in the AI desk;
   │        SSE "draftReady" fires
   │
   ├─ 8. Seller reviews and approves → real order, payment link, tracking page
   │
   └─ 9. Seller replies from the inbox → POST /api/v1/conversations/{id}/reply
            → their token is decrypted → Graph API send, from THEIR account
                                                             service.go:253
```

Nothing here is per-seller configuration on your side. One app, one webhook, one secret; the `channel_connections` table does all the tenancy.

**The 24-hour window applies to both channels.** Free-form replies are allowed only within 24 hours of the buyer's last message. That is fine for order conversations — the buyer just messaged you — but a reply sent two days later needs an approved template on WhatsApp, and is simply not deliverable on Instagram.

#### F. What each seller must actually have

| | Instagram | WhatsApp |
|---|---|---|
| Facebook account | **not needed** | required |
| Account type | professional (free toggle) | WhatsApp Business Account inside a Meta business portfolio |
| Phone number | — | a number **not** registered on normal WhatsApp — they must delete it from the WhatsApp app first |
| Business verification | seller: no. You: yes | seller's portfolio may need it too |
| Per-message cost | none | free inside the 24h window, ~₹0.12–0.15 for utility, ~₹0.70–0.80 for marketing |
| Realistic friction | one toggle, seconds | hours, and most small sellers will not do it |

Be honest with yourself about this: **Instagram is the channel small Indian sellers will actually connect.** WhatsApp Cloud API asks them to give up the number they run their business on. Build and sell Instagram first; treat WhatsApp as the upgrade for sellers big enough to have a second number.

There is also a constraint on your side: onboarding sellers' own WhatsApp Business Accounts through your app properly requires **WhatsApp Embedded Signup**, which needs Meta *Tech Provider* status and Advanced Access. The current OAuth code uses the plain Facebook login dialog, which works for a seller who **already has** a WABA but does not create one for them.

#### G. Two gaps in the current code, worth knowing before real sellers arrive

1. **Instagram tokens expire after 60 days and nothing refreshes them.** [`oauth.go:174`](../backend/internal/messaging/oauth.go#L174) exchanges for a long-lived token, but `channel_connections` has no expiry column and there is no refresh job — the comment says "refreshed on reconnect". As written, every seller silently stops receiving DMs on day 61 until they reconnect. Fix before launch: store the expiry and run `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token` on a weekly ticker for anything inside 30 days of expiry.
2. **A failing token surfaces only as a send error.** There is no `status='expired'` transition and nothing tells the seller to reconnect until they try to reply.

Neither blocks development. Both bite on day 61 of production.

---

### Step-by-step setup

Everything in §3.1–§3.6 is free, needs no documents, and no app review. §3.7 is what you cannot do yet.

Before you start, get a public HTTPS URL, because Meta will not accept a `localhost` webhook either:

```bash
cloudflared tunnel --url http://localhost:8080
```

Set that as `PUBLIC_BASE_URL` in `backend/.env` and restart the server — it is what builds every buyer track link and OAuth redirect.

### 3.1 Create the Meta app → fills `META_APP_ID`, `META_APP_SECRET`

1. Go to **[developers.facebook.com](https://developers.facebook.com)** and log in with a personal Facebook account. There is no separate developer signup; the first app creation converts the account.
2. **My Apps → Create App.**
3. Use case: pick **Other**, then app type **Business**. (The "Business" type is the only one that exposes both the WhatsApp and Instagram products.)
4. Name it `CartHedge`, add a contact email.
5. Attach a **Business Portfolio**. If you have none, Meta creates one inline — a portfolio is free and needs no verification to exist. Verification (§3.7) is a separate, later step.
6. Once created: **App settings → Basic.**
   - Copy **App ID** → `META_APP_ID`
   - Click **Show** next to **App Secret** → `META_APP_SECRET`
   - Set **App Domains** to your tunnel host (e.g. `random-words-1234.trycloudflare.com`).
   - Fill the **Privacy Policy URL** — Meta blocks several settings until it is present. `https://<your-domain>/privacy` is fine.
   - **Save Changes.**

```env
META_APP_ID=1234567890123456
META_APP_SECRET=abcdef0123456789abcdef0123456789
```

### 3.2 Add the WhatsApp product

1. In the left sidebar: **Add Product → WhatsApp → Set up.**
2. You land on **WhatsApp → API Setup**. Meta gives you, at no cost:
   - a **test phone number** that can send messages (it cannot receive from arbitrary numbers),
   - a **temporary access token**, valid 24 hours,
   - a **Phone number ID** and a **WhatsApp Business Account (WABA) ID**.
3. Under **To**, click **Manage phone number list** and add up to **5 recipient numbers** you control. Each gets a verification code by SMS. Only these numbers can receive messages while the app is unverified — this is the constraint that makes dev free.
4. Click **Send message** to confirm the test template arrives on your handset.

Note the **Phone number ID** — it is the `externalId` when connecting the channel in CartHedge (§3.6), not the phone number itself.

The 24-hour token is fine for testing. A permanent one comes from **Business settings → Users → System users → Add → Generate token**, scoped to the app with `whatsapp_business_messaging` + `whatsapp_business_management`.

### 3.3 Add the Instagram product

1. The Instagram account must be **professional**. In the Instagram mobile app: **Settings → Account type and tools → Switch to professional account** → Business or Creator. Free, reversible, takes a minute.
2. In the same Instagram app: **Settings → Messages and story replies → Connected tools → Allow access to messages** — toggle **on**. Without this, Meta accepts your webhook subscription and then never delivers a single DM. This is the most common silent failure.
3. Back in the Meta app dashboard: **Add Product → Instagram → Set up**, then choose **Instagram API with Instagram Login** (not "with Facebook Login" — CartHedge's OAuth code targets `api.instagram.com/oauth/access_token`, see [`internal/messaging/oauth.go:160`](../backend/internal/messaging/oauth.go#L160)).
4. Under **Instagram → API setup with Instagram login**, copy the **Instagram App ID** and **Instagram App Secret**.

```env
META_IG_APP_ID=1234567890123456
META_IG_APP_SECRET=abcdef0123456789abcdef0123456789
```

Leave both blank if you want CartHedge to fall back to `META_APP_ID` / `META_APP_SECRET` — it does that automatically. Fill them only when Instagram Login issues its own separate pair, which the current flow does.

5. Add yourself as a tester: **App roles → Roles → Add People → Instagram Tester**, then accept the invite at **instagram.com → Settings → Website permissions → Tester invites**. Development mode only delivers messages for accounts with a role on the app.

### 3.4 Configure the webhook (both products at once)

1. **Add Product → Webhooks**, or use the *Configuration* tab inside each product.
2. **Callback URL:** `https://<your-tunnel>/webhooks/meta`
3. **Verify token:** `carthedge_wh_56a1edb12db0f275` — already in your `.env` as `META_VERIFY_TOKEN`.
4. Click **Verify and save.** Meta immediately sends `GET /webhooks/meta?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…`; the handler at [`internal/messaging/handler.go:44`](../backend/internal/messaging/handler.go#L44) echoes the challenge back. **Your server must be running and the tunnel up at this moment**, or the save fails.
5. Subscribe to the **`messages`** field — separately on the **WhatsApp Business Account** object *and* on the **Instagram** object. Subscribing on one does not cover the other.
6. For WhatsApp specifically, also confirm under **WhatsApp → Configuration** that the webhook is attached to your WABA.

Inbound POSTs are signature-checked against `META_APP_SECRET` via the `X-Hub-Signature-256` header ([`handler.go:61`](../backend/internal/messaging/handler.go#L61)). A wrong or blank `META_APP_SECRET` produces `401 bad signature` on every delivery — check that first if messages stop arriving.

### 3.5 One-tap seller connect (OAuth) — optional

Without this, sellers paste an account ID and token by hand, which works fine (§3.6). With it, they click one button.

1. **WhatsApp → Configuration → Facebook Login for Business**, and **Instagram → API setup → Business login settings**: add the redirect URI

   ```
   https://<your-tunnel>/oauth/meta/callback
   ```

2. Set the identical string in `.env`:

   ```env
   META_OAUTH_REDIRECT_URL=https://<your-tunnel>/oauth/meta/callback
   ```

   It must match Meta's registered value **character for character**, trailing slash included, or the exchange fails with a redirect-mismatch error.

3. The scopes CartHedge requests are hardcoded at [`internal/messaging/oauth.go:67`](../backend/internal/messaging/oauth.go#L67):
   - WhatsApp: `whatsapp_business_management`, `whatsapp_business_messaging`
   - Instagram: `instagram_business_basic`, `instagram_business_manage_messages`

Blank `META_OAUTH_REDIRECT_URL` disables the button and leaves manual entry only.

### 3.6 Connect a channel inside CartHedge

**UI:** log in as a seller → **Settings → Channels → Connect**.

**API**, if you would rather curl it:

```bash
curl -X POST https://<your-tunnel>/api/v1/channels \
  -H "Authorization: Bearer <seller_jwt>" \
  -H "Content-Type: application/json" \
  -d '{
        "channel": "whatsapp",
        "externalId": "<phone number ID from §3.2>",
        "accessToken": "<access token>",
        "displayName": "CartHedge Test"
      }'
```

`channel` accepts only `whatsapp` or `instagram`. For Instagram, `externalId` is the Instagram **user/account ID**, not the `@handle`. The token is AES-GCM encrypted with `ENCRYPTION_KEY` before it hits the database and is never returned by the API.

Endpoints: `GET /api/v1/channels`, `POST /api/v1/channels`, `DELETE /api/v1/channels/{channel}`, `GET /api/v1/channels/{channel}/connect-url`. All require an active subscription with the AI capability — the 15-day `pro` trial includes it.

**End-to-end check:** DM the connected Instagram account (or WhatsApp test number) from a second handset. The conversation must appear in the AI desk inbox within a few seconds. If it does not, in order: is the tunnel up, did the `messages` subscription get added to the right object, and is Instagram's "Allow access to messages" toggle on.

### 3.7 What you cannot do yet (needs business documents)

Development mode covers everything above. Serving **other people's** sellers requires:

| Requirement | What Meta wants | Time |
|---|---|---|
| **Business verification** | legal entity name, address, and one of: GST certificate, certificate of incorporation, utility bill, bank statement. Plus domain ownership | 2–4 weeks |
| **App review** | a screencast of the seller connect flow, plus a written justification per permission: `whatsapp_business_messaging`, `whatsapp_business_management`, `instagram_business_basic`, `instagram_business_manage_messages` | 1–2 weeks after verification |
| **WhatsApp production number** | a phone number **not currently registered on WhatsApp** (deregister it from the app first), plus display-name review | days |
| **WhatsApp billing** | a payment method on the WhatsApp Business Account | minutes |

Instagram messaging has **no per-message fee**. WhatsApp charges by category: replies inside the buyer-opened 24-hour service window are **free** — which is most of what CartHedge sends — utility messages run ~₹0.12–0.15, and marketing messages ~₹0.70–0.80.

**Never ship unofficial WhatsApp automation** (`whatsapp-web.js`, Baileys and similar). It violates the terms and gets your sellers' numbers banned, which is a much worse outcome for them than not having the feature.

---

## 4. Mandatory vs optional, given your current constraints

| Service | Mandatory? | Blocked without GST/business proof? |
|---|---|---|
| Postgres + Redis | yes | no |
| Razorpay platform account | yes, to bill sellers | test mode works now; live keys need KYC |
| SMS via DLT | yes, for real signups and buyer OTP | yes — see §5 |
| SMTP | practically yes | no |
| Gemini / OpenAI | no | no |
| **Meta app, development mode** | no | **no — do this now** |
| Meta business verification | only to serve other sellers | yes |
| Shiprocket | no | KYC needed, but the feature degrades cleanly |
| Object storage (R2/S3) | no | no |
| Sentry / uptime | no | no |

---

## 5. DLT without GST — the workaround

GST is **not** a hard DLT requirement. The portals want proof the entity exists, and they accept alternatives:

- **Udyam / MSME registration** — free, fully online at [udyamregistration.gov.in](https://udyamregistration.gov.in), roughly ten minutes with Aadhaar + PAN. No GST, no incorporation. This is the realistic unblock, and the same certificate helps with Meta business verification later.
- **Shop & Establishment licence** from your state portal.
- A **current account statement** in the business name.

A proprietorship registers on DLT with owner PAN + Udyam + address proof. Still ~₹5,000–6,000 entity fee and a few working days, then header and template registration on top.

Until that lands, three options, cheapest first:

1. **Leave `WHATSAPP_API_URL` blank.** OTP codes print to the server console. Complete dev and demo path, zero cost, already how your `.env` is set.
2. **Email OTP** instead of SMS for seller signup. Your SMTP is already wired, so this needs no vendor and no paperwork. Best temporary production stand-in.
3. **Fast2SMS "Quick SMS" route** — delivers on *their* DLT-registered header, so no registration of your own. Fine for testing; not acceptable long-term because the sender ID is not yours.
4. **Firebase Phone Auth** — Google carries the DLT burden. No paperwork, but per-verification pricing and it moves phone verification out of your backend.

The send path is one function, `Notifier.WhatsApp` in [`internal/notify/notify.go`](../backend/internal/notify/notify.go). It POSTs `{"to": …, "message": …}` with a bearer token to whatever `WHATSAPP_API_URL` you set, so any provider accepting a JSON POST drops in with no code change.

---

## 6. Do this week

1. Create the Meta app (§3.1). Free, no documents, fills the two blank env vars and unblocks the entire messaging build.
2. Apply for **Udyam** (§5). Free and instant, and it unblocks both DLT and Meta business verification later.
3. Verify `carthedge.in` as a sending domain in Mailtrap so mail comes from your own domain (§1.2).
4. Add any second LLM key so `/ai/parse` survives a Gemini 503 (§1.1).
5. Before real sellers: add Instagram token refresh (§3.0-G) — connections die silently on day 61 without it.

---

## 7. Verification checklist

Everything marked ✅ was run against this machine on 2026-08-09 with the real Neon database and live provider credentials.

| Thing | Status | Evidence |
|---|---|---|
| Migrations | ✅ | `migration applied file=0012_identity_and_upi.sql` |
| Postgres + Redis | ✅ | `GET /healthz` → `{"status":"ok"}` |
| Seller login | ✅ | `demo@carthedge.in` / `Demo@123` returns an access token |
| Gemini order parse | ✅ | Hinglish DM → matched the real catalog product, `variant XL`, `qty 2`, `price 149900`, address split into line/city/pincode |
| Gemini reply assistant | ✅ | `/ai/reply` answered from the seller's actual catalogue |
| Razorpay — platform (billing sellers) | ✅ | `/subscription/checkout` created live test order `order_TNlA518l3ATcDP`, ₹1999 |
| Razorpay — seller rail (buyer → seller) | ✅ | attached the test keys to the demo seller, `/p/orders/{code}/pay` returned `mode: gateway` with a real `razorpayOrderId`; keys then reverted to seed state. Proves encrypt → store → decrypt → call |
| UPI rail | ✅ | `mode: upi` with a correct `upi://pay?am=949.00&pa=demo%40upi&tr=CH-8RSZACEY` intent |
| Meta webhook handshake | ✅ | `GET /webhooks/meta?hub.mode=subscribe&…&hub.challenge=ok123` → `ok123` |
| Webhook signature rejection | ✅ | forged signatures on both `/webhooks/meta` and `/webhooks/razorpay` → `bad signature` |
| SMTP | ✅ | delivered from the Mailtrap demo domain; `carthedge.in` rejected (§1.2) |
| `go vet` / `go test ./...` | ✅ | clean; all 9 packages with tests pass |
| Razorpay webhook round-trip | ⬜ | needs a public tunnel — §2. Not required locally |
| Instagram / WhatsApp inbox | ⬜ | needs the Meta app — §3.1 |
| OTP by SMS | ⬜ | blocked on DLT; the code prints to the server console meanwhile |
