# WhatsApp automation, Instagram go-live and production checklist

Written 4 October 2026. Plain English. Every Meta fact here was checked on Meta's own pages that day (links at the end). Meta changes these rules often; when this file and Meta disagree, Meta wins.

Related files: [META-SETUP-STATUS.md](META-SETUP-STATUS.md) (what was clicked in Meta so far), [INTEGRATIONS.md](INTEGRATIONS.md) (every outside service and its env vars), [PRODUCTION.md](PRODUCTION.md) (the whole handbook), [COMPLIANCE.md](COMPLIANCE.md) (data, consent, payments).

---

## 1. The short answer

**Can CartHedge be the provider, so a seller clicks "Connect WhatsApp" and the assistant starts answering, just like Instagram?** Yes. Meta calls this being a **Tech Provider**. It is free to become one, and most of the hard code already exists in this repo. What is left is one onboarding button (Meta's "Embedded Signup"), message templates, and a few hours of Meta paperwork.

**Can CartHedge pay Meta, so sellers pay only their CartHedge plan and never add a card?** Yes, but not as a plain Tech Provider. Meta's rule: only a **Solution Partner** has a credit line it can attach to a seller's WhatsApp account; a Tech Provider's sellers must add their own payment method. So CartHedge joins Meta's **Multi-Partner Solution** program with an existing Solution Partner. Every seller onboarded through CartHedge's signup is billed to that partner's credit line, and the partner bills CartHedge once. **Recommended partner: YCloud** (no fee on top of Meta, free to join, documented support for keeping the seller's WhatsApp Business app). **Backup: Gupshup** (Indian, biggest, simplest code, about ₹0.09 per message). The full comparison is in section 3 and the exact steps in section 4A.

**What it costs (CartHedge pays everything):**

| Who | Pays what |
|---|---|
| A seller | Only the CartHedge plan. No card, no Meta bill, no second invoice. |
| CartHedge | Meta's list rates for its sellers' messages (the first **1,000 assistant replies a month per seller are free**, then ₹0.115; order updates ₹0.115; offers ₹0.8631) plus 18% GST, plus the AI (LLM tokens). With YCloud there is **no partner fee** (card top-ups in USD, so expect your bank's ~3.5% forex charge). With Gupshup add about $0.001 ≈ ₹0.09 per message, incoming included. Section 4 has per-seller numbers and how to price plans so this is covered. |

**Two changes from 1 October 2026 that matter** (Meta pricing page, updated 30 Sep 2026):

1. Replies inside the 24-hour window ("service messages", which is what the AI assistant sends) are **charged again** after 1,000 free per number per month. They had been free since November 2024.
2. Utility templates sent *inside* the 24-hour window are **charged too**. They had been free since July 2025.

So a small seller costs CartHedge roughly ₹15 a month in WhatsApp fees and a busy one roughly ₹650 through YCloud (₹150 and ₹1,360 through Gupshup; section 4). Plans need a WhatsApp allowance and offer credits so a heavy seller can never cost more than they pay.

**Order of work:**

1. Production basics first (section 8). Real domain, a paid always-on server, database in the same region, paid AI key. Without these, nothing below works reliably.
2. Instagram: become a Tech Provider, publish, set the URLs, App Review (section 7). Code is done.
3. WhatsApp phase 1 (now): CartHedge's own number and three templates ("Phase 1" below, about an hour of Meta clicks). Sellers reply from their own WhatsApp Business app.
4. Pilot with 5 to 10 sellers, then open up.
5. WhatsApp phase 2 (when about 10 paying sellers ask for auto-replies): YCloud's partner programme and the joint solution (section 4A), Tech Provider App Review for WhatsApp and the Embedded Signup configuration (section 5), then the code in section 6 (about two weeks).

---

## Phase 1 (live in code since 4 Oct 2026): Instagram automatic, WhatsApp assisted

Owner decision, 4 Oct 2026: launch without sellers connecting WhatsApp. CartHedge is still a Tech Provider (Instagram needs it), but requests no WhatsApp permissions, signs no partner and builds no WhatsApp onboarding yet. Everything below phase 2 in this file stays the plan for later.

**What a seller gets now**

| | Instagram | WhatsApp |
|---|---|---|
| Buyer messages | The assistant answers on its own | The seller answers by hand in their WhatsApp Business app (free) |
| Chat to order | Automatic draft | Paste the chat on the AI desk, approve the draft |
| Buyers reaching the seller | DMs | "Chat on WhatsApp" buttons on the store, product and checkout pages |
| Telling the buyer about the order | On the Instagram chat, else CartHedge's number | One tap in the order drawer opens WhatsApp with the update typed in; CartHedge's number also sends it |
| Offers (broadcasts) | Drafts only | Drafts only. The yes/no to offers keeps being recorded, so the audience is ready on day one |
| Abandoned-checkout reminder | Seller nudges from Orders → Abandoned checkouts | Same |
| Back in stock | The seller gets one alert listing the waiting buyers' numbers | Same |

Settings → Channels shows WhatsApp as "You reply from your WhatsApp Business app · Auto-replies soon" with a link to the AI desk. The WhatsApp connect link and the manual token form are refused by the API (409).

**What CartHedge's own number sends.** Meta delivers only approved templates to people who have not messaged that number first, and Meta classes offers, cart reminders and back-in-stock notes as marketing. So CartHedge's number sends exactly three templates, all one-to-one and never marketing:

| Template name | Category | What | Who |
|---|---|---|---|
| `carthedge_code` | Authentication | One-time codes: buyer checkout, seller signup | Buyer, seller |
| `order_update` | Utility | Order placed, COD confirm link, payment received, packed, shipped (courier), delivered, cancelled, address changed, return and refund updates | Buyer, when the order did not come from an Instagram chat |
| `seller_alert` | Utility | New order, return request, cancellation, address change, UPI claim, chat needs a person, back-in-stock waitlist | Seller, if WhatsApp alerts are on |

Offers never leave from CartHedge's number: that would break Meta's opt-in rule (buyers said yes to the shop, not to CartHedge), and complaints would lower the number's quality rating and stop everyone's codes.

**Owner steps in Meta (about an hour, then template review: minutes to a day).** No App Review is needed for CartHedge's own number; standard access covers your own business.

1. WhatsApp Manager (business.facebook.com/wa/manage) in CartHedge's business portfolio → **Phone numbers → Add phone number**: a number not on any WhatsApp app (a new SIM or a virtual number). Display name **CartHedge**. Verify by SMS or call.
2. **Billing**: add CartHedge's card in WhatsApp Manager → Payment settings (Billing Hub). Without it Meta stops delivery after the free allowance.
3. **Message templates → Create**, three times, language **English** (code `en`, not "English (US)"), names exactly as below:
   - `carthedge_code`: category **Authentication**, code delivery **Copy code**, tick "Add security recommendation", expiry **5 minutes**. Meta writes the text itself.
   - `order_update`: category **Utility**. Body:
     ```
     Order update from {{1}}:

     {{2}}

     Sent by CartHedge for the shop you ordered from.
     ```
     Samples: {{1}} `Rangrez Studio`, {{2}} `Your order CH-AB12 is on the way! Courier: Delhivery, tracking id 1234567. Track: https://carthedge.in/o/CH-AB12`
   - `seller_alert`: category **Utility**. Body:
     ```
     CartHedge alert: {{1}}

     {{2}}

     Open it here: {{3}}

     You get these because WhatsApp alerts are on in your CartHedge settings.
     ```
     Samples: {{1}} `New order CH-AB12 · ₹1,499`, {{2}} `Priya ordered 2 items from your storefront, cash on delivery.`, {{3}} `https://carthedge.in/app/orders`
4. Business settings → **Users → System users → Add** (admin) → **Assign assets**: the Meta app and the WhatsApp account, full control → **Generate token**, expiry **Never**, permissions `whatsapp_business_messaging` and `whatsapp_business_management`.
5. Copy the **phone number ID** (WhatsApp Manager → Phone numbers, or App dashboard → WhatsApp → API Setup).
6. Render → Environment: set `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_TOKEN`; **delete** the old `WHATSAPP_API_URL` and `WHATSAPP_API_TOKEN`; leave `WHATSAPP_SELLER_CHANNEL` unset. Redeploy.
7. Check: sign up a test seller with your own mobile. The code arrives on WhatsApp from "CartHedge" with a Copy code button. Render logs show a `notify failed` line naming the template and Meta's error code if a template is missing or not approved yet.

Until step 6 is done, production sends nothing (codes are never written to logs): a buyer who typed an email gets the code by email, anyone else sees "codes cannot be sent right now". Development keeps printing messages to the console.

**What it costs CartHedge**: ₹0.115 + GST per message (authentication and utility). A storefront order is about 4 to 5 messages (code, placed or COD confirm, shipped, delivered, sometimes paid) ≈ ₹0.60 + GST. Orders from an Instagram chat are told on that chat, free. Seller alerts cost the same per message; web push and email alerts are free, so suggest sellers keep WhatsApp alerts for what is urgent.

**Turning on phase 2 (sellers connect their own WhatsApp).** The code is split so this is additive:

1. Do sections 4A and 5 (partner, WhatsApp App Review, Embedded Signup configuration).
2. Build section 6 items 1 to 5 and 7 to 10.
3. In `cmd/server/main.go`, call `notifier.SetOffers(fn)` with a sender that posts a marketing template from the seller's own WhatsApp account and returns `notify.ErrOffersOff` for a seller with none connected. Broadcasts (send and schedule), cart reminders and back-in-stock switch over by themselves (`internal/notify/whatsapp.go`, `broadcast`, `order.RemindAbandoned`, `product.notifyWaitlist`).
4. Add "buyer said yes to offers" and "seller has WhatsApp connected" to the claim query in `order.RemindAbandoned` (Meta: marketing needs an opt-in).
5. Set `WHATSAPP_SELLER_CHANNEL=on`. Settings shows Connect WhatsApp again and the copy changes by itself; the API accepts WhatsApp connections.

---

## 2. How it fits together

```
 Seller's WhatsApp Business app ──(Coexistence: same number, both work)──┐
                                                                         │
 Buyer ──WhatsApp──► Meta Cloud API ──webhook──► /webhooks/meta (CartHedge, one URL for every seller)
                                                     │
                                                     ├─ find seller by phone_number_id (channel_connections)
                                                     ├─ STOP / START  → consent record + confirmation
                                                     └─ DM assistant (same as Instagram): understand → check catalog
                                                        in Go → reply in buyer's language → summary → order
 CartHedge ──Graph API with the seller's token──► Meta ──► buyer
            (free-form inside 24 h; templates outside it)
```

- **Each seller brings their own number and their own WhatsApp account.** CartHedge never owns sellers' numbers. The partner's credit line is attached to each seller's account, so Meta bills the partner and the partner bills CartHedge. If a seller leaves, their number goes with them.
- **Sending goes through the partner.** Both YCloud and Gupshup require the joint solution's "send messages" permission set to **"Only my partner"**, so CartHedge sends text and templates through the partner's API and receives buyer messages from the partner's webhook (Gupshup forwards them in Meta's own format; YCloud uses its own format). CartHedge's own app still manages templates and phone settings.
- **One webhook for everyone.** Meta sends every seller's messages to the same URL. CartHedge routes by the phone number id. This is already built and tested for Instagram and WhatsApp payloads (`internal/messaging`).
- **The assistant is channel-agnostic.** The per-turn sales assistant (`internal/ai` + `internal/messaging/agent.go`) already treats `whatsapp` and `instagram` the same way. Nothing new is needed for "the bot answers once WhatsApp is connected".
- **Coexistence** lets the seller keep using the WhatsApp Business app on their phone on the same number. Chats sync both ways, and messages the seller types in the app arrive as "echoes", so CartHedge pauses the assistant on that chat (the same rule already used for Instagram).

### Sellers who only sell on WhatsApp

Nothing about CartHedge requires Instagram. A WhatsApp-only seller signs up, adds products, connects WhatsApp, and gets the assistant, the order board, links, the storefront, checkout, invoices and broadcasts. Instagram is just a second channel feeding the same order board.

---

## 3. Tech Provider, partner, or BSP: which route

| Route | Who pays Meta | Extra cost | Verdict |
|---|---|---|---|
| Tech Provider alone | **Each seller** (Meta's rule: Tech Providers have no credit line; sellers add their own card) | None | Rejected: sellers would pay twice (plan + Meta) |
| **Tech Provider + Solution Partner (Multi-Partner Solution)** | **CartHedge**, through the partner's credit line | Depends on the partner (table below). YCloud: none | **Recommended now (with YCloud; Gupshup as backup).** Sellers never see Meta |
| CartHedge becomes a Solution Partner | **CartHedge**, through its own Meta credit line | None beyond Meta's rates | **Much later, maybe never.** Meta lists Solution Partner as by application through its Business Partner form and calls it "a lengthy process" (contracts, credit approval). With a zero-fee partner there is little to save |
| Resell a BSP's product (AiSensy, Interakt, Wati) | The BSP, billed to CartHedge or the seller | ₹1,500 to ₹9,000 per seller per month in subscriptions | Rejected: too expensive for ₹499–₹999 plans |

### Which partner (checked 4 Oct 2026)

What the seller sees is the same with every partner below: Meta's signup popup inside CartHedge, keep their WhatsApp Business app, no card. The partners differ in what CartHedge pays and how much code is needed.

Partner fee per seller per month, before GST, on top of Meta's charges (which are the same everywhere). Small seller = 1,300 messages in and out; busy = 6,700 (section 4):

| Partner | Fee model | Small | Busy | Keep the WhatsApp Business app (Coexistence) for partners | Code | Verdict |
|---|---|---|---|---|---|---|
| **YCloud** | **Zero markup**, free "Tech Partner" plan (a $300/month plan only adds a partner manager). Prepaid USD balance by card | **₹0** | **₹0** | Yes, documented: signup with `solutionID` + `featureType`, then their `smb/bind` call | Own API and webhook format (about 1 extra day) | **Use this.** Cheapest by far; staying on it forever costs nothing |
| Gupshup | About $0.001 per message, incoming included; 6% extra on marketing outside MM Lite. Prepaid USD wallet (Stripe) | ≈ ₹117 | ≈ ₹603 | Yes | **Smallest:** "passthrough" API and webhooks in Meta's own format, so today's Cloud API code mostly just changes base URL | **Backup.** Indian, largest Indian partner, award-winning |
| Exotel | About ₹0.06 per message reported for direct customers; partner rates not published | ≈ ₹42–78 | ≈ ₹222–402 | Not documented | Not documented | Ask for a quote only if YCloud fails checks |
| Twilio | $0.005 per message, incoming included | ≈ ₹585 | ≈ ₹3,015 | Limited; its partner solution can't be added to accounts made through Twilio's own signup | Twilio API only | Rejected: 5× Gupshup |
| 360dialog | €250–1,000 a month platform + €15–49 per number; 7% on marketing outside MM Lite; 4% card fee | ≈ ₹1,500–5,000 per number | same | Yes | Own API | Rejected: per-number fee kills small sellers |
| Interakt, AiSensy, Wati | Partner programmes exist; rates on request; their retail plans are ₹1,500+ a month | ? | ? | Varies | Own API | Not worth chasing |

At 1,000 small sellers that is **₹0 (YCloud) vs ≈ ₹1.2 lakh a month (Gupshup) vs ≈ ₹5.9 lakh (Twilio)**.

**Before signing with YCloud, get in writing:**
1. Zero markup applies to CartHedge's partner account on the free plan, and whether any surcharge applies to marketing messages (use their MM Lite route if one exists).
2. Their entry rule: "at least 10 customers planning to use" WhatsApp. Show the pilot list.
3. Where messages are stored and processed (for the privacy policy; India's DPDP Act allows transfers abroad unless the government blocks a country).
4. An invoice that works for GST. Paying a foreign company means reverse-charge GST (claimable if CartHedge is GST-registered).
5. Auto top-up or a low-balance alert. **At zero balance every seller's WhatsApp stops.**
6. Support response time, and how Meta escalations work.

If any answer is bad, go with Gupshup. Steps are almost the same (section 4A).

Three things to know before choosing a partner:
- **A credit line attached to a seller's WhatsApp account stays there.** Meta does not let anyone remove it (Coexistence accounts included). To switch partners, the seller connects again, which gives them a new WhatsApp account on the new partner. Their number moves with them, and CartHedge recreates their templates automatically. So switching later is one click per seller, not a disaster. Keep all partner-specific code in one file so a switch is a config change for new sellers.
- **Two partners at once is allowed.** One Meta app can have several partner solutions. Create the YCloud one first; add a Gupshup one later only if needed, and pick which one new sellers use with `META_WA_SOLUTION_ID`.
- **Sellers who used another provider before** may still have that provider's credit line on their account, and Meta shows them an error in signup. They must detach from the old provider first (Meta has a guide for this).

**Onboarding limit.** After business verification, App Review and access verification, a Tech Provider can onboard up to **200 new sellers in any rolling 7 days** (per Twilio's Tech Provider guide). That is plenty for launch.

---

## 4. Costs in detail

### Meta's India rates

Meta's INR rate card, effective 1 October 2026, per *delivered* message, before 18% GST:

| Category | When CartHedge sends it | Rate |
|---|---|---|
| Service (non-template reply) | The assistant's or seller's replies inside 24 h of the buyer's last message | **₹0.115**, but the first **1,000 per phone number per month are free** |
| Utility (template) | Order confirmed / shipped / delivered, COD confirmation, payment link, after 24 h or (since 1 Oct 2026) inside it too | **₹0.115** |
| Authentication (template) | One-time codes (buyer OTP) | **₹0.115** |
| Marketing (template) | Broadcasts, back-in-stock offers | **₹0.8631** |
| Meta Business Agent | Meta's own AI agent. CartHedge does **not** use it | $2 per 1M tokens (about ₹3.5 to ₹4.5 per message) |

Always free:
- Messages from buyers to the seller.
- Everything in a **free entry point window**: a buyer who taps a Click-to-WhatsApp ad or a Facebook Page button opens a window (up to 7 days per Meta's page) in which marketing, utility, authentication and service messages are free.
- Messages the seller sends by hand from the WhatsApp Business app. Coexistence keeps the app free.

**A payment method is mandatory on every seller's account.** From 1 October 2026 Meta stops delivering service replies beyond the free 1,000 on an account without one. In the joint solution the partner's credit line *is* that payment method, attached automatically when the seller finishes signup. The seller is never asked for a card.

### What one seller costs CartHedge in a month

Meta's rates plus 18% GST. YCloud adds no fee, but top-ups are a USD card payment (about 3.5% bank forex charge). Gupshup adds about $0.001 ≈ ₹0.09 per message, incoming included, and 6% on marketing outside MM Lite:

| Seller | Bot replies | Buyer messages in | Order updates | Broadcast | Meta | **Total via YCloud** | Total via Gupshup |
|---|---|---|---|---|---|---|---|
| Small: 60 chats | 600 (free) | 600 | 100 | none | ₹11.50 | **≈ ₹15** | ≈ ₹150 |
| Busy: 300 chats | 3,000 (2,000 billable) | 3,000 | 400 | 300 opted-in buyers | ₹230 + ₹46 + ₹259 = ₹535 | **≈ ₹650** | ≈ ₹1,360 |

Almost all of a busy seller's cost is Meta's: billable assistant replies past the free 1,000, and offers at ₹0.8631 each.

### Pricing it into plans, so CartHedge never loses money

Because CartHedge pays, each plan needs limits (they are enforced in code, section 6, item 8):

| Plan | Suggested WhatsApp allowance per month | Above it |
|---|---|---|
| Starter | 1,000 assistant replies + 200 order updates | Assistant keeps replying; seller is told they are near the limit and offered the next plan |
| Growth | 3,000 replies + 1,000 updates + 300 offer messages | Offer messages need prepaid **offer credits** |
| Pro | 8,000 replies + 3,000 updates + 1,000 offer messages | Same |

**Offer credits** (broadcasts): sold in packs at about ₹1.25 per message (Meta ₹0.8631 + forex ≈ ₹0.89, plus GST ≈ ₹1.05, plus margin; ₹1.30 if on Gupshup). A broadcast never sends more messages than the seller has credits for. Offers are the only message type expensive enough to need this.

Track the real cost per seller from WhatsApp's delivery webhooks (each delivered message says whether it was billable and its category). Show it to admins next to the AI cost per seller (Admin → AI usage already does this for AI).

### What CartHedge pays

- **AI tokens:** about 2 to 3 model calls per buyer turn. With `gpt-4.1-mini` that is well under ₹0.10 per turn. Budget it in the plan price. The Gemini key in `.env` is free tier: 20 requests a day, unusable for production.
- **Sellers' WhatsApp messages:** through the partner, as above.
- **CartHedge's own number** (only if used): buyer OTP is an authentication template at ₹0.115 and seller alerts are utility at ₹0.115. To keep this near zero, send the buyer's checkout OTP from the **seller's** connected number (the buyer sees the shop's name, better for trust), and send seller alerts by web push and email (already built, free), with WhatsApp only as an opt-in extra.

### Cost levers already worth building

- **One message per assistant turn on WhatsApp.** The assistant splits replies into up to 3 short messages so it feels human (good on Instagram, which is free). On WhatsApp every part is a billable message once a seller is past the free 1,000 (and with Gupshup every part carries its fee). Join the parts into one message for the `whatsapp` channel. It is a one-line change in `messaging.deliver`.
- **Answer inside the window.** Order confirmations sent while the buyer is still chatting go as normal service replies (counted in the free 1,000), not as utility templates. The code already does this: `order.TellBuyer` uses the chat first.

---

## 4A. How CartHedge pays Meta: exact steps (joint solution with YCloud)

What this sets up: CartHedge's Meta app (Tech Provider) + YCloud's Meta app (Solution Partner) form one **partner solution**. CartHedge's signup button carries the solution's id. A seller who finishes it gets a WhatsApp account with **YCloud's credit line already attached** (no card asked). CartHedge tells YCloud about the new account with one API call. Messages go through YCloud, Meta bills YCloud, and YCloud takes it from CartHedge's prepaid balance. Steps are from YCloud's partner docs; the Gupshup differences are at the end.

**A. With YCloud (business side, a few days)**
1. Apply on YCloud's partner page (ycloud.com/tech-partner) as a **Technical Development Partner**, free plan, and register a YCloud account.
2. Get the six answers listed in section 3 in writing.
3. Top up the balance by card (start with about $50 ≈ ₹4,500) and turn on the low-balance alert. At zero balance every seller's WhatsApp stops.
4. In YCloud → Developers, create the **API key** CartHedge's server will use (env `YCLOUD_API_KEY`).

**B. In Meta (CartHedge's app, about an hour plus review time)**
1. App dashboard → **Use cases → WhatsApp → Customize → Tech Provider onboarding**. At the bottom choose **Onboard with a Solution Partner** (not "without a partner"). Click **Start onboarding** to accept the Tech Provider terms.
2. **Partner Solutions → Create a partner solution:**
   - Name: `CartHedge YCloud`
   - Partner app ID: **2892949377516980** (YCloud's app, from YCloud's partner docs; confirm with YCloud)
   - **"Send messages and make calls" permission: "Only my partner"** (YCloud's rule; this cannot be changed later)
   - Submit. Status shows **Pending** until YCloud accepts, then **Active**. Copy the **Solution ID**.
3. Business verification: already passed. Finish **App Review** (section 5, step 2): YCloud asks for the same two videos, sending a message and creating a template, which you can record using YCloud's console. Then **access verification** if the panel asks for it, and set the app to **Live**.
4. Webhooks (App dashboard → WhatsApp → Configuration): subscribe **`account_update`** and **`partner_solutions`**. `account_update` with event `PARTNER_ADDED` confirms a seller finished signup (it carries `waba_id`, `owner_business_id`, `solution_id`).

**C. In CartHedge (code, section 6)**
- The Embedded Signup launch passes the solution: `extras: { setup: { solutionID: '<SOLUTION_ID>' }, featureType: 'whatsapp_business_app_onboarding' }`. Without the id the seller gets no credit line and Meta asks *them* for a card.
- After signup the page gets `waba_id` and `phone_number_id`. The server calls YCloud: `POST https://api.ycloud.com/v2/whatsapp/businessAccounts/{wabaId}/smb/bind` for a seller keeping their WhatsApp Business app, or `.../tp/bind` for a fresh number, with header `X-API-Key`. YCloud's docs warn that picking an **existing** WhatsApp account that already has a card can stop YCloud from attaching its credit line, so the Connect screen says "create new" when asked.
- Messages go out with `POST /v2/whatsapp/messages` and come in on YCloud's webhook (event `whatsapp.inbound_message.received`).
- The seller sees both "CartHedge" and "YCloud" named in Meta's signup screens. The Connect screen says: "YCloud is our WhatsApp partner; you will not be charged by Meta or YCloud."

**D. Limits that still apply**
- Up to **200 new sellers per rolling week** for a Tech Provider in a solution.
- Everything in section 5, step 6 (sending limits, quality rating).

**If you go with Gupshup instead:** same Meta steps, but in B2 use partner app ID **340384197887925**, name `CartHedge Gupshup OD` (no special characters) and "Only my partner". Then in the Gupshup partner portal → Settings → **Add new solution** → enter the Solution ID, and link each seller's Gupshup app to your partner id **before** it goes live. Send and receive with Gupshup's **passthrough API** (`/partner/app/{appId}/v3/message`, Meta's own message and webhook format), which is the smallest code change. Gupshup's wallet is USD, topped up by Stripe ($10 minimum, alert at $5).

**Later: your own credit line.** Only if volume ever makes it worth it, apply to Meta's Business Partner programme as a Solution Partner. With YCloud at zero markup the saving would be small, so this is not on the plan.

---

## 5. WhatsApp: exact steps in Meta (owner clicks)

Do these in this order. Each step says why.

### Step 0: before anything (once)

- [ ] Production basics from section 8: live domain over HTTPS, paid always-on server, privacy and terms pages live. Meta checks these URLs.
- [x] Business verification: **passed 1 Oct 2026** (portfolio `1253149296869307`).
- [ ] Two-factor authentication **on for everyone** in the business portfolio (Business settings → Security Center). Required for Tech Provider.

### Step 1: add WhatsApp to the Meta app

1. developers.facebook.com → your app (`1701370170936187`) → **Use cases** → add **"Connect with customers through WhatsApp"** if it is not there.
2. Open it (pencil icon) → **Customize** → left menu **Tech Provider onboarding**.
3. Step 1 there (verification) should already show as done. Choose **Onboard with a Solution Partner** and create the partner solution (section 4A, B).

### Step 2: App Review for WhatsApp

Requested permissions: **advanced access** to `whatsapp_business_messaging` (send for sellers) and `whatsapp_business_management` (manage sellers' accounts and templates). Without the second, calls on accounts you do not own fail with error 200.

1. **App settings → Basic:** app icon (1024 × 1024), privacy policy URL `https://carthedge.in/privacy`, terms `https://carthedge.in/terms`, data-deletion URL, category **Business and pages**, contact email.
2. **Two videos** (screen recordings, no cuts):
   - **Video 1, send a message:** a message sent from CartHedge, or from the **API Setup** page's cURL with your test number, arriving in the WhatsApp app on a phone.
   - **Video 2, create a template:** a message template being created. Recording yourself doing it in **WhatsApp Manager** is accepted.
   Meta's own page says the cURL and WhatsApp Manager versions are fine, so you can submit these **before** writing the section 6 code.
3. For each permission write one plain sentence:
   > CartHedge is order-management software for Indian online sellers. With the seller's authorisation through Embedded Signup we receive their customers' WhatsApp messages, answer product and order questions from the seller's catalog, and send order updates and seller-approved templates from the seller's own number. Sellers can disconnect at any time.
4. **Begin App Review.** Expect 3 to 10 working days and plan for one round of questions.

### Step 3: Embedded Signup configuration (v4)

Meta deprecates Embedded Signup **v2 and v3 on 15 October 2026**. Build only v4.

1. App dashboard → **Facebook Login for Business** → **Configurations** → **Create configuration**.
2. Login variation: **WhatsApp Embedded Signup**. Products: **WhatsApp** (v4 picks the needed permissions and assets from this).
3. Save. Copy the **Configuration ID** → it becomes a new env var `META_WA_CONFIG_ID`. The partner Solution ID becomes `META_WA_SOLUTION_ID`; both go into the signup launch.
4. **Facebook Login for Business → Settings → Allowed domains for the JavaScript SDK:** `https://carthedge.in` (and the Render URL while testing).

### Step 4: webhooks for WhatsApp

App dashboard → **WhatsApp → Configuration**:

```
Callback URL:  https://carthedge.in/webhooks/meta          (already built, same URL as Instagram)
Verify token:  value of META_VERIFY_TOKEN
```

Subscribe these fields:

| Field | Why |
|---|---|
| `messages` | Buyer messages and delivery statuses. The assistant runs on these. |
| `smb_message_echoes` | Messages the seller types in the WhatsApp Business app (Coexistence). CartHedge pauses the assistant on that chat. |
| `history`, `smb_app_state_sync` | One-time chat history and contact sync right after a Coexistence seller connects |
| `account_update` | Seller disconnected, number banned or restricted, Coexistence link dropped. CartHedge alerts the seller. |
| `message_template_status_update` | A seller's template was approved, rejected or paused |

### Step 5: CartHedge's own WhatsApp number

Already needed in phase 1 for codes, order updates and seller alerts. The exact steps and template texts are in "Phase 1" near the top of this file.

### Step 6: limits to know

- **Sending limits** (business-started messages, that is templates to buyers who have not written in 24 h): new accounts start at **250 unique buyers a day**, then 2,000 → 10,000 → 100,000 → unlimited as quality and volume grow. Since October 2025 the limit is per **business portfolio** (each seller's own), not per number. Replies to buyers who wrote in are not limited.
- **Quality rating:** buyers blocking or reporting a seller lowers it, and a low rating pauses templates. This is why broadcasts go only to buyers who said yes, and why every offer has a stop link (built, see COMPLIANCE.md).
- **Coexistence numbers send at most 20 messages per second.** Fine for this segment.

---

## 6. WhatsApp: code still to build

### Already built and tested

| Piece | Where |
|---|---|
| Webhook verify + HMAC signature (two app secrets) + parsing WhatsApp payloads | `messaging/handler.go`, `messaging/client.go` |
| Route inbound by `phone_number_id`, conversation threads, dedupe by message id | `messaging/service.go` |
| DM sales assistant (per-turn, catalog-grounded, multilingual), order placement from chat, 24 h window rules | `ai/`, `messaging/agent.go` |
| Sending text on WhatsApp via `/{phone_number_id}/messages` | `messaging/client.go` |
| OAuth-dialog connect: token → WABA from granular scopes → phone numbers → `subscribed_apps` | `messaging/oauth.go` (`exchangeWhatsApp`) |
| STOP / START keywords → consent record + confirmation reply | `messaging/service.go` (`answerKeyword`), `customer/consent.go` |
| Consent-gated broadcasts with a per-buyer stop link, seller rules acceptance | `broadcast/`, `customer/consent.go` |
| Product options and stock the assistant answers from ("pink M", "which sizes?") | `product/options.go`, `ai/cart.go` |

### To build, in order

| # | Work | Why | Size |
|---|---|---|---|
| 1 | **Embedded Signup v4 button.** Settings → "Connect WhatsApp" loads the Facebook JS SDK, calls `FB.login({config_id, response_type: 'code', override_default_response_type: true, extras: {setup: {solutionID}, featureType: 'whatsapp_business_app_onboarding'}})` and listens for the `WA_EMBEDDED_SIGNUP` message event (`waba_id`, `phone_number_id`). Posts `{code, wabaId, phoneNumberId}` to a new `POST /api/v1/channels/whatsapp/embedded`. | The current connect uses a plain OAuth redirect, which cannot run Embedded Signup or Coexistence | 1 day |
| 2 | **Server side of onboarding:** exchange the code (no redirect URI) for the business token; `POST /{waba_id}/subscribed_apps`; for **new numbers** `POST /{phone_number_id}/register` with a 6-digit PIN; for **Coexistence** skip register and, within 24 h, call `POST /{phone_number_id}/smb_app_data` twice (`smb_app_state_sync`, then `history`). Reuse `exchangeWhatsApp` and `ConnectChannel`. | Without register a new number cannot send; without sync inside 24 h the seller has to onboard again | 1 day |
| 3 | **Echoes and account events:** treat `smb_message_echoes` like Instagram echoes (seller typed → pause assistant 12 h); on `account_update` (disconnected, banned) mark the channel `error` and alert the seller. | Coexistence. The assistant must never talk over the seller | ½ day |
| 4 | **Templates per seller:** on connect, create CartHedge's standard utility templates in the seller's WABA (order confirmed, packed/shipped with tracking, delivered, COD confirm with link, payment link); store their status from `message_template_status_update`. Add a `SendTemplate` next to `Send` in `messaging/client.go`. | Anything outside the 24 h window must be a template | 1 day |
| 5 | **Buyer notifications from the seller's number:** `order.TellBuyer` → chat inside 24 h (already) → else the seller's utility template → else CartHedge's number. | Buyer sees the shop, not "CartHedge"; billing lands on the seller | ½ day |
| 6 | ~~Rework the platform notifier~~ **Done 4 Oct 2026** (phase 1): `notify.WhatsApp` sends the three approved templates from CartHedge's number through the Cloud API; offers go through the `notify.SetOffers` seam. Closes the code side of **OPS-1**. | | done |
| 7 | **Partner adapter (YCloud):** after signup call YCloud's `smb/bind` (or `tp/bind` for a fresh number); send text and templates with YCloud's `/v2/whatsapp/messages`; parse YCloud's inbound and status webhooks into the same internal message the Meta parser produces, so the assistant code does not change. All YCloud specifics live in one file in `messaging/`. Confirm with YCloud whether its bind call also does the Coexistence history sync of item 2. | In the joint solution only the partner may send, and billing lands on CartHedge's balance | 2 to 3 days |
| 8 | **Broadcasts through the seller's WABA:** seller writes the offer → submitted as a **marketing template** with a "Stop promotions" quick-reply button (the STOP handler already understands it) → send when approved; record per-buyer delivery from status webhooks; pause when the quality rating is low. | Free text cannot reach buyers outside 24 h | 1 to 2 days |
| 9 | **One message per turn on WhatsApp** (see section 4) and WhatsApp's typing indicator when a turn starts. | Cost, and it feels human | 1 hour |
| 10 | **Usage metering and plan allowances:** count each seller's delivered messages by category from status webhooks (billable flag, category) per month; plan limits for replies, updates and offer messages (`plans` gets a `limits` document next to `capabilities`); offer credits bought from Billing; warn at 80%, stop broadcasts at the limit; admin view of WhatsApp cost per seller next to AI cost; wallet low-balance alert to admin. | CartHedge pays, so no seller may cost more than they pay | 2 days |

About **10 working days** in total, with tests. Items 1 to 3, 7 and 9 are enough for a pilot where the assistant only answers buyers who write in, which needs no templates at all.

### What the seller sees (target flow)

1. CartHedge → Settings → Channels → **Connect WhatsApp**.
2. Meta's popup: log in with Facebook → pick or create their business portfolio → **"Connect your existing WhatsApp Business app"** → type the number → open the WhatsApp Business app → tap **Connect** on Meta's message → choose whether to share chat history → paste the code.
3. Back in CartHedge: "Connected ✓, syncing your chats (keep WhatsApp open)". The assistant starts on the next buyer message.
4. Nothing to pay or add: the partner's credit line is attached during signup. Settings shows this month's WhatsApp usage against the plan allowance.
5. Two Coexistence rules to tell sellers: open the WhatsApp Business app at least once every **14 days** or the link drops (partner documentation), and the app's **broadcast lists become read-only**. CartHedge Broadcasts replace them, with consent tracking and stop links.

Requirements on the seller's side: WhatsApp Business app version **2.24.17 or newer** and a Facebook login. No card, no Facebook Page.

---

## 7. Instagram: next steps

The code is complete and live: Instagram Login, long-lived token refresh, webhooks, the DM assistant, deauthorize and data-deletion callbacks. What is left is Meta paperwork.

**Do you have to be a Tech Provider for Instagram too?** Yes. Your app dashboard already says "Become a Tech Provider to submit to App Review and request access to user data and data from other businesses." It is the same free step as for WhatsApp; doing it once covers both. It needs the verified business (done) and two-factor authentication on.

Steps, in order:

1. **Become a Tech Provider:** app dashboard → bottom of the page → *Become a Tech Provider*. This is the click META-SETUP-STATUS.md flagged as needing your yes. It is free and only declares that the app serves other businesses.
2. **Publish the app:** App settings → Basic: icon, privacy, terms, data-deletion URLs, category. Then switch the app to **Live**. Meta delivers webhooks only to published apps.
3. **Instagram → API setup with Instagram login → Business login settings:**
   ```
   OAuth redirect URI:         https://carthedge.in/oauth/meta/callback
   Deauthorize callback URL:   https://carthedge.in/webhooks/meta/deauthorize
   Data deletion request URL:  https://carthedge.in/webhooks/meta/data-deletion
   ```
4. **Instagram webhooks:** callback `https://carthedge.in/webhooks/meta`, verify token = `META_VERIFY_TOKEN`, subscribe **`messages`**.
5. **Test accounts:** App roles → Instagram Testers → add 1 to 3 seller accounts (Business or Creator, not Personal). Each must turn on Instagram app → Settings → Messages and story replies → Connected tools → **Allow access to messages**.
6. **App Review:** request **advanced access** for `instagram_business_basic`, `instagram_business_manage_messages` and `instagram_business_manage_comments` together (Meta asked for all three together on this app). Include one uncut screen recording: log in to CartHedge → Connect Instagram → Meta's permission screen → back to "Connected" → a DM from a second phone appears and the assistant replies → Disconnect. Give the reviewer a working test seller login.
7. **After approval:** onboard sellers. There is no per-message charge on Instagram.

Rules the code already follows, kept here so they stay true:
- Automated replies only inside 24 h of the buyer's last message. The human-agent tag (7 days) is for a real person only, never the assistant.
- Tokens last 60 days. The server renews them a week early and shows "Reconnect" if renewal fails.
- Store `user_id` from `/me` (not `id`). Each account calls `/me/subscribed_apps`.

---

## 8. Production readiness ("full proof") checklist

Ordered by what breaks first.

### Must fix before real sellers

| # | Item | Why it matters | How |
|---|---|---|---|
| 1 | **Always-on paid server** | Render's free plan sleeps when idle. The assistant loop, broadcast scheduler, reminders and token refresh all run inside the server, so on free they simply stop, and Meta's webhooks hit a cold start. | Render Starter or above, one instance. The code assumes one instance (the per-chat lock is in-process; a note in `messaging/service.go` says how to move it to Redis before running two). |
| 2 | **Database in the same region as the server** | Render is in Singapore and Neon is in us-east-2: about 200 to 300 ms per query. A product save with options took 4.6 s in testing; checkouts take seconds. | Move Neon to **AWS ap-southeast-1 (Singapore)** (new project → `pg_dump`/restore, or Neon's region migration), or move Render next to the database. Singapore suits Indian users. |
| 3 | **Real domain** | Meta, Razorpay and buyers all see the URL. | Point `carthedge.in` at Render; update `PUBLIC_BASE_URL`, `META_OAUTH_REDIRECT_URL` and the Meta URLs (META-SETUP-STATUS.md section 8A). |
| 4 | **Paid AI key** | The Gemini key is free tier (20 requests a day). | OpenAI `gpt-4.1-mini` as lead (`AI_PROVIDER=openai`), Gemini with billing as failover. Confirm API data is not used for training (the privacy policy says so). |
| 5 | **OTP and messages delivered (OPS-1)** | Buyers cannot verify at checkout, and sellers get no WhatsApp alerts. | Section 6, item 6 (or an SMS provider with DLT registration, INTEGRATIONS.md section 3). Until then OTPs are only written to the server log. |
| 6 | **Payments live** | | Razorpay live keys; webhook subscribed to `subscription.*` and `payment.captured`; `RAZORPAY_WEBHOOK_SECRET` set. |
| 7 | **Admin account** | The seed admin `admin@carthedge.in / Admin@123` exists in every database (BUG-001). | Change the password in Admin → Account on production now. |
| 8 | **Secrets** | The GitHub repo was public (META-SETUP-STATUS.md). | Confirm no `.env` or keys were ever committed (`git log -p -- '*.env*'`); rotate anything that was. Rotate `JWT_SECRET` and `ENCRYPTION_KEY` only with a plan (rotating `ENCRYPTION_KEY` makes stored channel tokens and Razorpay secrets unreadable). |
| 9 | **Legal** | | A lawyer reviews privacy, terms and the consent wording (COMPLIANCE.md); add a grievance contact; confirm which label fields (MRP, origin, maker) apply to fashion and handmade sellers. |

### Should do in the first month

| Item | How |
|---|---|
| Error tracking | Sentry (free tier). Report panics and 5xx from `middleware.Recover`. |
| Uptime alert | UptimeRobot (free) on `/healthz` every 5 minutes. |
| Backups | Neon point-in-time restore on a paid plan, plus a weekly `pg_dump` to object storage. |
| Images | `STORAGE_DRIVER=s3` (Cloudflare R2 has no egress fees). Local disk on Render is wiped on every deploy. |
| Leftover QA data | Delete the "QA Plan v3" plans and QA sellers from the production database (they show on pricing). |
| Delivery health | Admin view of failed sends and template rejections (FEATURE-GAPS 8.4), fed by WhatsApp status webhooks. |
| Admin hardening | Separate admin logins, two-factor authentication, audit log (FEATURE-GAPS 8.3). |

### Already proven in testing (no action)

- Concurrency: 40 buyers racing for 25 pieces gave exactly 25 orders; per-combination stock holds under a race (6 buyers, 5 pieces → 5 orders); coupon caps, refunds and invoice numbering are race-safe (`docs/qa/QA-TRACKER.md`).
- Webhook signatures, OAuth state replay protection, encrypted tokens, tenant isolation (including a fixed cross-store variant overwrite, BUG-060).
- Rate-limit counters can no longer get stuck forever (BUG-059).
- Migrations are additive and run once under an advisory lock, so a deploy never breaks the running version.

---

## 9. Suggested timeline

| Week | Owner (Meta and accounts) | Code |
|---|---|---|
| 1 | Paid Render, Neon in Singapore, `carthedge.in`, OpenAI key, two-factor authentication in the portfolio, **Become a Tech Provider**, publish app, Instagram URLs and webhook, Instagram App Review submitted | Section 6 items 1–3 and 9 (Embedded Signup v4, onboarding, echoes, one message per turn) |
| 2 | YCloud partner sign-up, written answers + balance, joint solution created and accepted (section 4A), WhatsApp App Review submitted, Embedded Signup configuration, WhatsApp webhook fields | Items 4–7 (templates, notifications from the seller's number, OTP rework, YCloud adapter) and item 10 (metering, allowances) |
| 3 | Pilot: 5 to 10 friendly sellers on Instagram and WhatsApp | Item 8 (broadcast templates), fixes from the pilot |
| 4 | Open sign-ups (WhatsApp onboarding limit 200 sellers per 7 days) | Admin delivery-health view |

---

## Sources (checked 4 Oct 2026)

- Meta, [Pricing on the WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) (updated 30 Sep 2026): per-message pricing, free tier of 1,000 service messages per number, free entry point window, INR rate card (India: marketing ₹0.8631, utility, authentication and service ₹0.115).
- Meta, [Upcoming pricing updates for Meta Business Agent, service and utility messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages) (updated 28 Sep 2026): service messages charged from 1 Oct 2026, utility templates inside the window charged from 1 Oct 2026, payment method required.
- Meta, [Become a Tech Provider](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-tech-providers) (updated 20 Aug 2026): verification, App Review videos, advanced access to both WhatsApp permissions, client billing.
- Meta, [Onboard WhatsApp Business app users](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users/) (updated 26 Jun 2026): Coexistence, `featureType`, webhook fields, 24 h sync, 20 messages per second, app features that change, Embedded Signup v2/v3 deprecation on 15 Oct 2026.
- Meta, [Partners overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/overview) (updated 21 May 2026): Solution Partners have credit lines; Tech Providers do not, and their clients add their own payment method; Multi-Partner Solutions let a Tech Provider use a Solution Partner's credit line.
- Meta, [Multi-Partner Solutions](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/multi-partner-solutions) (updated 12 Aug 2026): creating and accepting a solution, `solutionID` in Embedded Signup, billing on the Solution Partner's credit line, 200 new clients per week, `account_update` / `partner_solutions` webhooks.
- Meta, [Get started as a Solution Partner](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-solution-partners): what becoming one involves.
- Gupshup partner docs, [Solution Partners & Tech Providers](https://partner-docs.gupshup.io/docs/what-is-sp-tp) and [Get Solution ID from Meta](https://partner-docs.gupshup.io/docs/get-solution-id-from-meta): joint solution steps, partner app id 340384197887925, "Only my partner" send permission, registering the solution on Gupshup.
- Gupshup ISV pricing as reported by [getmacha.com](https://www.getmacha.com/blog/gupshup-ai-complete-guide) and [codingclave.com](https://codingclave.com/blog/gupshup-whatsapp-pricing-india-2026) (about $0.001 per message, Meta at cost, 6% on non-MM-Lite marketing); confirm with Gupshup. Other partner prices: [360dialog partner pricing](https://docs.360dialog.com/partner/get-started/pricing), [Twilio Tech Provider FAQ](https://www.twilio.com/docs/whatsapp/isv/tech-provider-program/faq).
- [Twilio Tech Provider program guide](https://www.twilio.com/docs/whatsapp/isv/tech-provider-program/integration-guide): onboarding limit of 200 new customers per rolling 7 days; partner solution not addable to accounts from Twilio's own signup. [Twilio WhatsApp pricing](https://www.twilio.com/en-us/whatsapp/pricing): $0.005 per message, incoming and outgoing.
- YCloud partner docs: [Technical Development Partner onboarding](https://helpdocs.ycloud.com/partner-center/english-en-2/ji-shu-kai-fa-huo-ban/ji-shu-kai-fa-huo-ban-ru-men) (partner app id 2892949377516980, "Only my partner", billing on the partner balance), [pricing and payment](https://helpdocs.ycloud.com/partner-center/english-en-2/ji-shu-kai-fa-huo-ban/ji-shu-kai-fa-huo-ban-jia-ge-ji-fei-he-fu-kuan-fang-shi) (no markup, USD, card, prepaid, channels stop at zero balance), [Embedded Signup](https://helpdocs.ycloud.com/partner-center/english-en-2/ji-shu-kai-fa-huo-ban/embedded-signup) (`solutionID`, Coexistence, `smb/bind` / `tp/bind`), [Tech Partner programme](https://www.ycloud.com/tech-partner) (free plan or $300/month), [partner overview](https://helpdocs.ycloud.com/partner-center/english-en-2) (10 planned customers). Reviews: [Trustpilot 3.5/5, 20 reviews](https://uk.trustpilot.com/review/www.ycloud.com).
- Gupshup: [passthrough APIs](https://partner-docs.gupshup.io/docs/whatsapp-passthrough-apis-for-partners) (Meta format in and out), [wallet](https://partner-docs.gupshup.io/docs/commissions) (USD, Stripe or Ebanx, $10 minimum, alert at $5), [Coexistence for partners](https://partner-docs.gupshup.io/docs/copy-of-co-existence-closed-beta-phase).
- [360dialog Tech Provider programme](https://docs.360dialog.com/partner/get-started/tech-provider-program) (partner-paid or direct-paid billing, "Only my partner"). [Exotel ISV guide](https://support.exotel.com/support/solutions/articles/3000126550-get-started-for-meta-tech-providers-with-exotel-for-whatsapp-isv-) (credit line shared, fees not published); Exotel's ₹0.06 fee as reported by [aisensy.com](https://m.aisensy.com/blog/whatsapp-api-providers/).
- Credit lines cannot be removed or moved, Coexistence accounts included, so switching partners means a new WhatsApp account: [HighLevel](https://help.gohighlevel.com/support/solutions/articles/155000008156-whatsapp-credit-line-management), [respond.io](https://respond.io/help/whatsapp/whatsapp-coexistence). Solution Partner is by application: [WhatsApp Business, Become a Partner](https://whatsappbusiness.com/partners/become-a-partner/).
- [EngageLab: 1 Oct 2026 pricing changes](https://www.engagelab.com/blog/whatsapp-business-api-pricing): confirms the 1,000 free service messages, utility charged inside the window, and India billing moving to INR by 31 Dec 2026.
- [360dialog: Coexistence](https://docs.360dialog.com/docs/resources/phone-numbers/coexistence) and [UnifyPort: Embedded Signup v4 migration](https://www.unifyport.ai/blog/whatsapp-embedded-signup-v4-coexistence-migration/): 14-day app-open rule, v4 configuration.
- [AiSensy: WhatsApp messaging limits 2026](https://m.aisensy.com/blog/whatsapp-message-limits-guide/): 250 → 2,000 → 10,000 → 100,000 → unlimited, portfolio-level since October 2025.
