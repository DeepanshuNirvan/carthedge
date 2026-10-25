# What to do next: Instagram and WhatsApp, fully automatic

Written 10 October 2026. This is the to-do list. The background, prices and sources are in [WHATSAPP-INSTAGRAM-GO-LIVE.md](WHATSAPP-INSTAGRAM-GO-LIVE.md) (checked 4 Oct 2026). What was already clicked in Meta is in [META-SETUP-STATUS.md](META-SETUP-STATUS.md). I re-checked Meta's App Review and Tech Provider pages today and nothing has changed since 4 Oct.

**Where things stand**

| | Code | Meta setup | What a real seller gets today |
|---|---|---|---|
| Instagram | Done: login, token refresh, webhooks, the DM assistant, deauthorize and data-deletion callbacks | Business verification passed (1 Oct). Not done yet: become a Tech Provider, publish the app, URLs, webhook, testers, App Review | Nothing yet. Only test accounts can connect until App Review approves the app |
| WhatsApp | Phase 1 done: CartHedge's own number sends codes, order updates and seller alerts | Phase 1 Meta steps (number plus 3 templates) not done. Phase 2 (sellers' own numbers) not started | The seller replies by hand from their WhatsApp Business app |

**IDs you will need:** Meta app `1701370170936187` · Instagram app `1761433421775292` · Business portfolio `1253149296869307` · YCloud partner app `2892949377516980` (confirm with YCloud).

---

## Step 0: blocks both channels (do it first, about a day)

Meta reviewers open your URLs and your webhook. If any of these is missing, App Review fails.

1. **Domain.** Point `carthedge.in` at Render: Render → `carthedge-app` → Settings → Custom Domains → Add `carthedge.in` and `www.carthedge.in`. Copy the DNS records into your domain registrar. Wait for the green "Certificate issued".
2. **Render environment** (Render → Environment): set `PUBLIC_BASE_URL=https://carthedge.in`, `META_OAUTH_REDIRECT_URL=https://carthedge.in/oauth/meta/callback` and `META_GRAPH_VERSION=v25.0`. Save, then redeploy.
3. **A paid, always-on server.** Render → `carthedge-app` → Settings → Instance type → **Starter** or above. On the free plan the server sleeps, so Meta's webhooks hit a cold server and the assistant stops running.
4. **A paid AI key.** Add `OPENAI_API_KEY` with `AI_PROVIDER=openai`, or turn on billing for the Gemini key. The free Gemini tier allows 20 requests a day, which is about 7 buyer messages.
5. **Check these open in a private browser window:** `https://carthedge.in/privacy`, `/terms` and `/healthz`.
6. **Two-factor authentication for everyone in the business portfolio:** business.facebook.com → ⚙ Settings → **Security Center** → Two-factor authentication → **Required for everyone**. Meta requires this for Tech Providers.

---

## Part 1: Instagram (every seller connects their own Instagram)

**Yes, you must become a Tech Provider.** Your app will serve Instagram accounts you do not own, and that needs **Advanced Access**. Advanced Access needs App Review, and App Review is only available to Tech Providers. It is free and needs no partner. The same click also opens the WhatsApp path.

### 1.1 Become a Tech Provider (in review since Oct 2026)

Meta moved this step. It is no longer a button on the Dashboard: it is **Review → Verification → Access verification** ("Verify that your business is a Tech Provider"). On 11 Oct 2026 CartHedge's shows **In review** (Meta answers in about 5 business days and may email for documents). Business verification on the same page shows **Verified**. Nothing to click until Meta replies.
3. Optional but it helps the reviewer: left menu **Use cases** → remove the use cases you don't need (Marketing API, Threads, Ads, Audience Network and the rest). Keep only **Instagram API**, **Connect with customers through WhatsApp** and **Facebook Login for Business**. Use the ⋯ menu on each card, then **Remove**.

### 1.2 App settings (10 minutes)

**App settings → Basic:**

| Field | Value |
|---|---|
| App icon | 1024 × 1024 PNG (`frontend/public/` has the logo exports) |
| Privacy policy URL | `https://carthedge.in/privacy` |
| Terms of service URL | `https://carthedge.in/terms` |
| App domains | `carthedge.in` |
| User data deletion | Choose "Data deletion instructions URL": `https://carthedge.in/data-deletion` (the callback URL goes in the Instagram login settings, 1.3) |
| Category | **Business and pages** |
| Contact email | your support email |

Click **Save changes**.

### 1.3 Instagram product settings (15 minutes)

Left menu **Use cases** → **Instagram API** → **Customize** → **API setup with Instagram login**.

1. **Fix the app name typo** (`CarthHedge-IG`): at the top of this page click **Sync app name**.
2. **"3. Set up Instagram business login"** → **Business login settings**:
   ```
   OAuth redirect URIs:         https://carthedge.in/oauth/meta/callback
   Deauthorize callback URL:    https://carthedge.in/webhooks/meta/deauthorize
   Data deletion request URL:   https://carthedge.in/webhooks/meta/data-deletion
   ```
   Click **Save**.
3. **"2. Configure webhooks"**:
   ```
   Callback URL:   https://carthedge.in/webhooks/meta
   Verify token:   (the value of META_VERIFY_TOKEN on Render)
   ```
   Click **Verify and save**. Then, in the fields list below it, turn on **messages**. Leave **comments** off until comment-to-DM is built.

### 1.4 Publish the app (2 minutes)

At the top of the app dashboard, switch **App Mode: Development → Live**. If Meta refuses, it lists what is missing, usually a field from 1.2. Meta only sends webhooks to live apps.

### 1.5 Test with your own accounts (30 minutes)

Before approval, only people with a role on the app can connect.

1. **App roles → Roles → Add People → Instagram Tester** → type the Instagram username (it must be a Business or Creator account) → Add.
2. On that Instagram account (on the web): **Settings → Website permissions → Apps and websites → Tester invites → Accept**.
3. In the Instagram app on that account: **Settings → Messages and story replies → Message controls → Connected tools → Allow access to messages: On**.
4. Log in to `carthedge.in/app` as a test seller → **Settings → Channels → Connect Instagram** → approve.
5. From a second phone, DM the tester account ("hi, price of the pink kurti?"). The assistant should reply within about 15 seconds, and the chat should appear in the AI desk Inbox.
6. This test also counts as Meta's "at least one successful API call per permission" rule.

### 1.6 App Review (1 hour to submit, then 3 to 10 working days)

**Use cases → Instagram API → Customize → API setup with Instagram login** → the **Complete app review** section → click the chevron → **Continue to app review**. You land on **App Review → Requests** → **Edit**.

1. **Permissions to request (Advanced Access):** `instagram_business_basic` and `instagram_business_manage_messages`. Earlier this app was told to request `instagram_business_manage_comments` together with them. Meta rejects apps that ask for permissions they don't use. CartHedge does not use comments yet, so either:
   - drop `manage_comments` if the form allows it (best), **or**
   - have me build comment-to-DM first (the panel asked for it for Kabir and Tanya; about 2 days), then request all three.
2. **Verification details:** platform **Web**. Give the reviewer:
   - a test seller login on `carthedge.in` (make a fresh one, not the seed demo, and keep it in a password manager, not in a document);
   - plain steps: "Log in → Settings → Channels → Connect Instagram → approve → send a DM to @yourtester from any account → see the reply and the order draft in AI desk → Inbox".
3. **One screencast per permission.** Record the screen without cuts, keep the UI in English, add captions in English if anything is in Hindi, and say what each button does:
   - **instagram_business_basic:** click Connect Instagram → Meta's consent screen → back in CartHedge showing the connected username → Disconnect.
   - **instagram_business_manage_messages:** a DM arrives from a second phone (show the phone) → CartHedge's Inbox shows it → the assistant's reply arrives on the phone → the order summary → "haan" → the order appears on the board → the status update arrives back in the chat.
4. **Usage description** (paste, then edit as needed):
   > CartHedge is order-management software for Indian Instagram sellers. With the seller's permission through Instagram Login, we receive messages sent to the seller's professional account, reply to product, price and delivery questions using only the seller's own catalog, collect order details, and send order status updates in the same chat within Meta's 24-hour window. Sellers can pause the assistant per chat, take over at any time, or disconnect.
5. Tick the allowed-usage boxes → **Submit for review**.
6. If the dashboard later shows **Access verification**, complete it. It is a short business-details form.

### 1.7 After approval

- Any seller can connect. There is no per-message cost on Instagram.
- Remove the tester-only messaging from any onboarding copy.
- Watch Render logs for `inbound for unknown channel` during the first week. Seeing it means a seller's webhook subscription failed.
- Automatic replies only go out inside 24 hours of the buyer's last message. The 7-day human-agent tag is for a real person only. The code already follows both rules; don't change that.

---

## Part 2: WhatsApp (the seller's own number, fully automatic)

### 2.1 The method: two ways to pay, one popup (built 11 Oct 2026)

Every seller keeps their **own number** and the WhatsApp Business app (Embedded Signup v4 with Coexistence). At **Connect WhatsApp** they pick who pays Meta:

| Option | Seller | CartHedge | Needs |
|---|---|---|---|
| **Meta bills you** | Adds a card in Meta Business. First 1,000 replies a month free, then about ₹0.12 each | Pays nothing to Meta; sends through Meta's Cloud API with the seller's token | WhatsApp App Review + `META_WA_CONFIG_ID` |
| **CartHedge pays Meta** | No card, no Meta bill | Pays Meta through YCloud's credit line; sends through YCloud | Also the YCloud partner solution (`META_WA_SOLUTION_ID` + `YCLOUD_API_KEY`) and a plan with capability **CartHedge-paid WhatsApp** (`waManaged`) |

One WhatsApp per seller. Switching option = Disconnect, then Connect again (Meta never removes a credit line from an account, so "CartHedge pays" needs a fresh account in the popup). With only the first option configured, Settings skips the choice and opens Meta's popup straight away. Sellers who connect nothing stay on **assisted** WhatsApp (they reply from their app; codes and order updates come from CartHedge's number).

The "CartHedge pays" route in detail (the cheapest way for CartHedge to carry Meta's bill):

| What the seller does | What CartHedge does |
|---|---|
| Clicks **Connect WhatsApp**, logs in with Facebook in Meta's popup, types their number, taps **Connect** in their WhatsApp Business app. About 2 minutes. | Gets the account, binds it to YCloud with one API call, and creates the order templates. The assistant starts on the next buyer message. |
| Keeps the **same number and the WhatsApp Business app** on their phone. Chats sync both ways. | Pauses the assistant on any chat where the seller typed in the app. |
| **Adds no card and pays no Meta bill.** Pays only the CartHedge plan. | Pays Meta at cost through YCloud's credit line. YCloud adds no markup. |

Why this route and not the others (full comparison in GO-LIVE §3):

| Route | Seller effort | CartHedge cost per seller per month | Verdict |
|---|---|---|---|
| **YCloud joint solution** | No card, keeps the app | ≈ ₹15 small / ₹650 busy (Meta's charges only) | **Do this** |
| Gupshup joint solution | Same | ≈ ₹150 / ₹1,360 (about $0.001 per message on top) | Backup. Its API is in Meta's own format, so it needs the least code |
| Tech Provider alone | Seller adds their own card in Meta | ₹0 | Offered as the "Meta bills you" option, for sellers who prefer it |
| Resell AiSensy, Interakt or Wati | Separate signup | ₹1,500+ | Rejected: costs more than the plan |

**Covered by the new plans.**
- Meta gives the first **1,000 service replies per number per month for free**. That covers Starter's 300 AI replies and most of Growth's.
- The plan doc prices "WhatsApp on your own number" at **+₹299/mo on Starter and Growth, included on Pro**.
- Broadcasts (₹0.86 each to Meta) come from a prepaid wallet with a visible 15% fee.

### 2.2 Business side with YCloud (owner, 2 to 5 days)

1. ycloud.com/tech-partner → **Become a partner** → choose **Technical Development Partner**, free plan → submit. Their team replies within a business day.
2. Register a YCloud account with the same email and send it to them. They switch on partner access.
3. **Get these answers in writing before going further** (GO-LIVE §3):
   - zero markup on the free plan, including marketing messages;
   - the "10 planned customers" rule (show your pilot list);
   - where messages are stored;
   - a GST-usable invoice (reverse charge);
   - auto top-up or a low-balance alert;
   - support response times.
   - If any answer is bad, use Gupshup instead (partner app `340384197887925`; the same steps below).
4. YCloud console → **Billing** → top up about $50 by card → turn on the **low-balance alert**. **At zero balance every seller's WhatsApp stops.**
5. YCloud console → **Developers → API keys** → create a key. It goes into Render as `YCLOUD_API_KEY`.

### 2.3 Meta side (owner, about 1 hour of clicks, then 3 to 10 days of review)

All of this is in developers.facebook.com/apps → **CartHedge**.

1. **Add WhatsApp:** **Use cases → Add use case → Connect with customers through WhatsApp** (skip this if it is already listed).
2. **Tech Provider onboarding:** on the WhatsApp use case click **Customize** (pencil) → left menu **Tech Provider onboarding**. Step 1, Verification, already shows as done.
3. At the bottom of the page click **Onboard with a Solution Partner** (not "without a partner") → **Start onboarding** → accept the terms.
4. **Create a partner solution** (WhatsApp → **Partner Solutions** → **Create**):
   - Name: `CartHedge YCloud`
   - Partner app ID: `2892949377516980`
   - **Send messages and make calls: "Only my partner"**. YCloud requires this, and it can't be changed later.
   - **Submit.** The status shows Pending until YCloud accepts it, then Active. **Copy the Solution ID** (it becomes `META_WA_SOLUTION_ID`).
5. **App Review for WhatsApp.** On the same Tech Provider onboarding page, step 2:
   - Request **Advanced access** for `whatsapp_business_messaging` and `whatsapp_business_management`.
   - **Video 1, sending a message:** WhatsApp → **API Setup** → pick the test number → copy the cURL → run it in a terminal while recording the screen and the phone receiving the message.
   - **Video 2, creating a template:** record yourself in **WhatsApp Manager** (business.facebook.com/wa/manage) → Message templates → **Create template** → Utility → submit.
   - Meta accepts both of these recordings, so you can submit **before** I write the code.
   - Description: copy the paragraph in GO-LIVE §5 step 2 → **Begin App Review**.
6. **Embedded Signup configuration:** left menu **Facebook Login for Business → Configurations → Create configuration**:
   - Name `CartHedge WhatsApp signup`, Login variation **WhatsApp Embedded Signup**, product **WhatsApp** → Create.
   - **Copy the Configuration ID** (it becomes `META_WA_CONFIG_ID`).
   - Then **Facebook Login for Business → Settings → Allowed domains for the JavaScript SDK**: add `https://carthedge.in`.
   - Only v4 works. Meta switches off v2 and v3 on **15 Oct 2026**. We never built those, so nothing breaks.
7. **Webhooks for WhatsApp:** WhatsApp → **Configuration**:
   - callback `https://carthedge.in/webhooks/meta` and the same verify token as Instagram → **Verify and save**;
   - subscribe `messages`, `smb_message_echoes`, `history`, `smb_app_state_sync`, `account_update`, `message_template_status_update` and `partner_solutions`.
8. **CartHedge's own number (phase 1, still to do):** follow GO-LIVE "Phase 1, owner steps":
   - a new SIM or virtual number;
   - a card in WhatsApp Manager billing;
   - 3 templates (`carthedge_code`, `order_update`, `seller_alert`);
   - a system-user token;
   - `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_TOKEN` on Render.
   This number keeps sending checkout codes and alerts for sellers who haven't connected WhatsApp.

### 2.4 Code (me, about 10 working days; can start now in parallel)

Built 11 Oct 2026 (dormant until the env vars below are set): items 1 and 2 except the history sync, item 3's bind and send, item 4's echo pause, item 5's one message per turn, and the billing choice. Buyer messages for both options arrive on `/webhooks/meta` in Meta's format, because CartHedge's app subscribes to each seller's account at signup (confirm with YCloud that this works under "Only my partner"; if not, item 3 also needs YCloud's inbound webhook).

| # | Build | Size |
|---|---|---|
| 1 | **Connect WhatsApp button** with Embedded Signup v4: Facebook JS SDK, `FB.login` with `config_id`, `solutionID` and `featureType: 'whatsapp_business_app_onboarding'`; read `waba_id` and `phone_number_id` from the popup; post them to a new `POST /api/v1/channels/whatsapp/embedded` | 1 day |
| 2 | **Onboarding on the server:** exchange the code for a token, call `subscribed_apps`, then for Coexistence sync contacts and history within 24 hours (`smb_app_data`), or `register` a fresh number | 1 day |
| 3 | **YCloud adapter**, all in one file: `smb/bind` after signup, send through YCloud's `/v2/whatsapp/messages`, and turn YCloud webhooks into the same internal message, so the assistant code doesn't change | 2 to 3 days |
| 4 | **Echoes and account events:** pause the assistant for 12 hours when the seller types in the app; alert the seller if the number is disconnected or banned | ½ day |
| 5 | **One message per assistant turn on WhatsApp** (each part is billable) plus the typing indicator | 1 hour |
| 6 | **Order templates in each seller's account**, created on connect: order confirmed, shipped with tracking, delivered, COD confirm, payment link. Buyer updates then come from the seller's number instead of CartHedge's | 1½ days |
| 7 | **Broadcasts as marketing templates** with a "Stop promotions" button, sent only to buyers who said yes (consent is already recorded), paid from a prepaid wallet | 1 to 2 days |
| 8 | **Metering:** count delivered messages by category from webhooks; an add-on flag for "WhatsApp on own number"; a usage bar on Billing; an admin cost view; an admin alert when the YCloud balance runs low | 2 days |

Items 1 to 5 are enough for a **pilot** where the assistant only answers buyers who message first. That needs no templates.

**Switch-on, once WhatsApp App Review is approved** (the code is already in):
1. Render: `WHATSAPP_SELLER_CHANNEL=on` and `META_WA_CONFIG_ID`. That alone turns on "Meta bills you".
2. For "CartHedge pays" too: `META_WA_SOLUTION_ID` and `YCLOUD_API_KEY`, then Admin → Plans → tick **CartHedge-paid WhatsApp** on the plans that include it (the pricing plan says Pro, or a ₹299 add-on).
3. Facebook Login for Business → Settings → Allowed domains for the JavaScript SDK must list `https://carthedge.in`, or the popup refuses to open.
4. Settings shows **Connect WhatsApp** by itself.

Still to build after the pilot: history and contact sync (`smb_app_data`, must run within 24 h of signup, so it waits until CartHedge can import what it returns), `account_update` alerts, the typing indicator, items 6 to 8.

### 2.5 What to tell sellers (put on the Connect screen)

- You need the WhatsApp Business app, version **2.24.17 or newer**, and a Facebook login. You don't need a card or a Facebook Page.
- In Meta's popup choose **"Connect your existing WhatsApp Business app"**. If asked, **create a new** WhatsApp account rather than picking an old one that already has a card on it. Otherwise YCloud can't attach its credit line.
- You will see "YCloud" named in Meta's screens: "YCloud is our WhatsApp partner. Neither Meta nor YCloud will charge you."
- Open the WhatsApp Business app at least **once every 14 days**, or the link drops.
- Broadcast lists inside the app become read-only. Use CartHedge Broadcasts instead (they track consent and include stop links).

### 2.6 Go live

1. **Pilot:** 5 to 10 friendly sellers. This also meets YCloud's "10 planned customers" rule. Watch the replies, the echo pauses and the YCloud balance for a week.
2. **Open to everyone.** Meta lets a Tech Provider onboard up to **200 new sellers in any rolling 7 days**.
3. Keep the panel's promise in writing: if WhatsApp on a seller's own number isn't live within 90 days of them paying, they get one month free (PRICING-PLAN §8).

---

## The order to do it in

| Week | Owner (Meta, accounts, money) | Code |
|---|---|---|
| 1 | Step 0 (domain, paid Render, AI key, 2FA) · Instagram 1.1 to 1.6 submitted · YCloud application | WhatsApp items 1, 2 and 5 |
| 2 | YCloud answers and top-up · partner solution created and accepted · WhatsApp App Review submitted · Embedded Signup config · webhooks · CartHedge's own number and templates | Items 3, 4 and 6 |
| 3 | Instagram approved → open Instagram to all sellers · WhatsApp pilot with 5 to 10 sellers | Items 7 and 8, fixes from the pilot |
| 4 | WhatsApp approved → open to all (200 per week) | Admin delivery-health view |

## Sources (checked 10 Oct 2026)

- Meta, [App Review for Instagram API](https://developers.facebook.com/docs/instagram-platform/app-review): Tech Providers serving other businesses need Advanced Access through App Review; submission path (API setup with Instagram login → Complete app review → App Review → Requests); one screencast per permission, English UI or captions; at least one successful API call per permission.
- Meta, [Get started for Tech Providers](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-tech-providers): Use cases → Customize → Tech Provider onboarding, the two App Review videos (cURL and WhatsApp Manager are accepted), Advanced access to both WhatsApp permissions, "Onboard with a Solution Partner".
- Meta, [Multi-Partner Solutions](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/multi-partner-solutions/): Partner Solutions panel, solution ID in Embedded Signup, `account_update` webhooks.
- YCloud, [Technical Development Partner onboarding](https://helpdocs.ycloud.com/partner-center/english-en-2/ji-shu-kai-fa-huo-ban) and [YCloud vs Twilio](https://ycloud.com/vs-twilio) ($0 markup claim; confirm it in writing).
- Everything else (prices, Coexistence rules, v2/v3 shutdown, partner comparison) is listed at the end of [WHATSAPP-INSTAGRAM-GO-LIVE.md](WHATSAPP-INSTAGRAM-GO-LIVE.md).
