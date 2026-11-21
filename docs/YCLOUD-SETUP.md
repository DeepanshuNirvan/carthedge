# YCloud setup: sellers connect their own WhatsApp, CartHedge pays

Written 15 November 2026. Click by click. YCloud's steps were read on YCloud's own docs that day and Meta's screens were opened in the CartHedge app dashboard that day (links at the end). Both change their screens often; when this file and the screen disagree, the screen wins.

Background and the reasons for this route: [WHATSAPP-INSTAGRAM-GO-LIVE.md](WHATSAPP-INSTAGRAM-GO-LIVE.md) sections 3 and 4A.

---

## Where you stand today (checked in your Meta dashboard, 15 Nov 2026)

| Thing | State |
|---|---|
| Business verification (Carthedge, `1253149296869307`) | **Verified** |
| App published | **Published** |
| App Review: `whatsapp_business_messaging`, `whatsapp_business_management` | **Approved 8 Nov 2026** |
| Tech Provider onboarding for WhatsApp | **Not started.** The page still opens with "Onboard as a Tech Provider → Continue" |
| Partner solution with YCloud | Not created (needs the row above first) |
| Facebook Login for Business → Configurations | **Empty.** No Embedded Signup configuration yet |
| Facebook Login for Business → Settings → Allowed Domains for the JavaScript SDK | Looked empty |
| YCloud account / partner application | Not started |

So the long Meta review is already behind you. What is left is: YCloud approves you, you click through Tech Provider onboarding, YCloud accepts the joint solution, and four values go into Render.

**What you will wait for** (nobody sells a fast lane for these):

1. YCloud reviewing your Tech Partner application. No published time. The free plan's support promise is "reply within 3 business days".
2. YCloud accepting the partner solution you create in Meta. Same team.
3. Meta's **Access Verification**, if the Tech Provider panel asks for it. Usually a few days.

Do Part A first, today. Parts B1 and B4 can be done while you wait.

**How sure each step is.** Every step is marked:

- **[seen]** the screen was opened on 15 Nov 2026 and the labels are copied from it.
- **[docs]** the screen sits behind a login, an approval or a click that cannot be undone, so the labels come from YCloud's or Meta's documentation. Expect small wording differences.

---

## Part A: YCloud account and partner application (about 15 minutes)

1. **[seen]** Open **https://www.ycloud.com/console/#/entry/register**. The page is titled "Create your free account". Fill in:
   - **Work email**: the business email
   - **FirstName**, **LastName**
   - **Password**: at least 8 characters, one lowercase, one uppercase, one number or symbol
   - Tick **I am human** (hCaptcha)
   - Leave **I agree to the Service Terms and Conditions & Privacy Policy** ticked
   - Click **Continue**. No card is asked for.
2. **[docs]** Verify the email if asked, then sign in at **https://www.ycloud.com/console/**.
3. **[docs]** Open **https://www.ycloud.com/console/#/app/partner** (the Tech Partner application page).
4. **[docs]** Click **Become a Tech Partner**. Fill in the form and submit. Useful things to say in it:
   - CartHedge is order-management software for Indian online sellers; sellers connect their own WhatsApp number through Embedded Signup and keep their WhatsApp Business app (coexistence).
   - You use **your own Meta app** (ID `1701370170936187`), business verified, app published, App Review approved for both WhatsApp permissions.
   - You have a pilot list of 10 or more sellers.
5. The result comes to the contact email in the form. When approved, a new menu **Partner → Tech Partner** appears in the YCloud console. That menu appearing is the confirmation.
6. While waiting, write to **service@ycloud.com** (or the console's support ticket) and ask for written answers to these. Do not top up real money before you have them:
   1. Is the markup zero on the **Free** partner plan, including marketing messages?
   2. The Free plan lists **"20 Channels"**. Does that mean at most 20 connected seller numbers? What happens at 21?
   3. Can you issue an invoice usable for Indian GST (reverse charge)?
   4. Is there a low-balance alert or auto top-up?
   5. Where are messages stored and processed?
   6. Under "Only my partner" send permission, does CartHedge's own Meta app still receive the seller's incoming messages on its own webhook after it calls `subscribed_apps`? (CartHedge's code relies on this.)

**The plan choice.** Free: $0, 20 channels, self-service, tickets answered within 3 business days. Tech Partner Service: $300 a month, unlimited channels, a partner manager, Meta escalations. Start on Free. The $300 plan does not make Meta or YCloud approve faster on paper; what it buys is a person to chase things, and the channel cap removed. You will need it (or a different answer to question 2) when you pass 20 connected sellers.

---

## Part B: Meta app dashboard

Open **https://developers.facebook.com/apps/1701370170936187/** signed in as the app admin.

### B1. Become a Tech Provider (5 minutes of clicks)

This is a commitment on the Meta app (it declares the app serves other businesses). It is free.

1. **[seen]** Left menu → **Use cases**.
2. **[seen]** Scroll to **Connect with customers through WhatsApp** (second from the bottom) → the pencil button **Customize** on its right.
3. **[seen]** A page "Customize use case" opens with its own menu: Overview / Basic setup / **Become a Partner** / Other tools. Click **Become a Partner → Become Tech Provider**.
4. **[seen]** A box titled **Onboard as a Tech Provider** opens, listing "Send messages on behalf of your customers" and "Onboard customers from your website". Click the blue **Continue**.
   (The same thing is reachable from **Other tools → Tools → Scale your business → Become a Tech Provider → Continue Onboarding**, which already shows "1. Business verification" ticked and "2. App review".)
5. **[docs]** When asked how you will work, choose **Working with a Solution Partner** (some screens word it "Onboard with a Solution Partner"). Do **not** choose "without a partner": that route makes each seller add their own card.
6. **[docs]** Accept the Tech Provider terms (**Start onboarding**).
7. **[docs]** You land on the **Tech Provider onboarding** panel: a checklist. Business verification and App Review should already show as done. Leave the page open for B2 and B3.

### B2. Create the partner solution

All of B2 and B3 is **[docs]**: these screens only appear after B1's Continue.

Do this after YCloud has approved your partner application (Part A step 5), or they may not recognise the request.

1. In the Tech Provider onboarding panel, open **Partner solutions** (also reachable later at **WhatsApp → Partner Solutions**).
2. Click **Create a partner solution**.
3. Fill in:
   - **Solution name:** `CartHedge` (YCloud asks for your company name; no special characters)
   - **Partner App ID:** `2892949377516980` (YCloud's app, from YCloud's docs on 15 Nov 2026)
   - **Send messages and make calls:** **Only my partner**
4. Read it once more. **The permission cannot be changed later**, and a solution cannot be detached from sellers who signed up through it.
5. Submit. Status shows **Pending**.
6. YCloud reviews it. When they accept, status becomes **Active** and a **Solution ID** appears (YCloud says it is also sent by email or a Business Manager notification).
7. Copy the **Solution ID**. This becomes `META_WA_SOLUTION_ID`.

### B3. Finish the Tech Provider checklist

Back in the Tech Provider onboarding panel, work down whatever is not ticked:

1. **Review app settings** → confirm icon, privacy URL, category are still right → save.
2. **App Review**: already approved on 8 Nov. If the panel still asks for the two videos, it is asking for the same request that was approved; open **Review → App Review** and confirm there is nothing new to submit.
3. **Access Verification** → **Start Verification** → answer the questions about the business → submit. Wait for the result (email and the panel).
4. App mode: already **Live** (Published). Nothing to do.

### B4. Embedded Signup settings (can be done today)

**Allowed domains [seen]**

1. Left menu → **Facebook Login for Business** (click to expand) → **Settings**. The page is titled "Client OAuth settings".
2. Each row has a Yes/No switch. Set to **Yes**: **Client OAuth login**, **Web OAuth login**, **Enforce HTTPS**, **Embedded browser OAuth login**, **Use Strict Mode for redirect URIs**, and further down **Login with the JavaScript SDK**. Leave **Force Web OAuth reauthentication** and **Login from devices** as they are.
3. In the box **Valid OAuth Redirect URIs** (middle of the page): type `https://carthedge.in/` and press Enter (add `https://carthedge-app.onrender.com/` too if sellers still reach the app there).
4. In the box **Allowed Domains for the JavaScript SDK** (under the JavaScript SDK switch): add the same addresses. YCloud's docs say the signup result only comes back to pages whose domain is in **both** boxes.
5. Bottom of the page → **Save Changes**.

**Configuration**

1. **[seen]** Left menu → **Facebook Login for Business → Templates** (or **Configurations → Create from template**; today the Configurations page is empty with two buttons, "Create configuration" and "Create from template").
2. **[seen]** Scroll to the last card, **WhatsApp Embedded Signup Configuration With 60 Expiration Token** ("grants partners full access to business's WhatsApp Business Account with a 60 day expiration token") → **Use template**. Do not pick "WhatsApp Measurement Partner": it is read-only and only works with the retired signup version.
3. **[docs]** Finish the wizard and save.
4. **[docs]** The new configuration now shows under **Configurations** with a **Configuration ID**. Copy it. This becomes `META_WA_CONFIG_ID`.

### B5. Webhook fields

1. **[seen]** Use cases → Connect with customers through WhatsApp → **Customize** → **Basic setup → Step 2. Production setup** → the section **Configure Webhooks**. (Also reachable from **Other tools → Tools → Configuration → Webhooks → Configure webhooks**.)
2. **[seen]** Fill **Callback URL** `https://carthedge.in/webhooks/meta` and **Verify token** = the value of `META_VERIFY_TOKEN` on Render → **Verify and save**. The page already shows a "Remove subscription" button, so a callback may be saved from earlier; if the fields are filled and correct, leave them.
3. **[docs]** In the field list that appears after saving, subscribe: `messages`, `smb_message_echoes`, `account_update`, `message_template_status_update`, and `partner_solutions` if it is listed.

Ignore the other tasks on that page ("Register your WhatsApp phone number", "Add payment to send business-initiated messages", "Send message"): they are for CartHedge's own number, not for sellers.

---

## Part C: Finish in YCloud (after the solution is Active)

All of Part C is **[docs]**: these pages need an approved partner account.

1. YCloud console → **Partner → Tech Partner → Meta Tech Provider** tab.
2. Paste the **Solution ID** into the Solution ID field → **Save**.
3. **Developers → API key** (https://www.ycloud.com/console/#/app/developers/apikey) → create a key → copy it once. This becomes `YCLOUD_API_KEY`. Keep it in the password manager; never paste it in chat or commit it.
4. **Settings → Billing → Recharge** → top up by card (start around $50). Billing is in USD, prepaid.
5. Turn on the low-balance alert if the console has one (ask in Part A question 4). **At zero balance every connected seller's WhatsApp stops.**

No YCloud webhook is needed: CartHedge receives buyer messages on its own Meta webhook.

---

## Part D: Switch CartHedge on

1. Render → the CartHedge service → **Environment**. Set:

   | Variable | Value |
   |---|---|
   | `META_WA_CONFIG_ID` | Configuration ID from B4 |
   | `META_WA_SOLUTION_ID` | Solution ID from B2 |
   | `YCLOUD_API_KEY` | API key from Part C |
   | `WHATSAPP_SELLER_CHANNEL` | `on` |

   `META_WA_SOLUTION_ID` and `YCLOUD_API_KEY` must be set together or the server refuses to start.
2. Save and redeploy.
3. In CartHedge Admin, make sure the plan your test seller is on has the capability **`waManaged`**. Without it the seller is not offered "CartHedge pays".

---

## Part E: Test with one real number

Use a phone that has the **WhatsApp Business app** (version 2.24.17 or newer) on a number that is not CartHedge's own sending number.

1. Log in to CartHedge as a test seller → **Settings → Channels → Connect WhatsApp** → choose the CartHedge-pays option.
2. Meta's popup opens. **Check that it names YCloud** as the partner. If it does not, the Solution ID is not taking effect: stop and recheck B2 and Part D.
3. Log in with Facebook → pick or **create a new** business portfolio and WhatsApp account. Do **not** pick an existing WhatsApp account that already has a card on it: YCloud then cannot attach its credit line.
4. Choose **Connect your existing WhatsApp Business app** → type the number → open the app → tap **Connect** on Meta's message → paste the code.
5. Back in CartHedge the channel shows **Connected**.
6. From a second phone, message the seller's number. The assistant should answer within about 10 seconds.
7. In the seller's WhatsApp Business app, type a reply by hand. The assistant should go quiet on that chat.

If something fails:

| What you see | Meaning |
|---|---|
| Popup says **App not active** | App is in Development mode, or the person is not a tester. The app is Published, so recheck the login used. |
| Popup says **Feature unavailable** | App Review → Permissions and features → request **public_profile** advanced access. |
| CartHedge says the account has no billing attached | An existing WhatsApp account with a card was picked. Reconnect and create a new one. |
| Connected, but the buyer's message never reaches CartHedge | This is the one part never proven: receiving on CartHedge's own webhook when only the partner may send. Check Render logs for `/webhooks/meta`, then ask YCloud (Part A question 6). The fix would be receiving through YCloud's webhook instead, which is new code. |
| Assistant's reply does not arrive | Check the YCloud balance, then Render logs for `ycloud request failed`. |

This path has been built and unit-tested but **never run against real Meta or YCloud**. Expect the first connection to surface something.

---

## If Meta's Tech Provider step stalls: Partner Direct Link

YCloud has a second route called **Partner Direct Link**: sellers sign up on a YCloud-hosted page (your name and logo on it), and **no Meta Tech Provider step, partner solution or Embedded Signup configuration is needed**. It works as soon as YCloud approves the partner application, and it supports coexistence.

The cost: CartHedge's code is built for the own-Meta-app route. Direct Link needs new code (create a link per seller on the server, receive YCloud's `whatsapp.business_account.updated` webhook, and receive buyer messages through YCloud's webhook format). Use it only if Access Verification drags for weeks.

---

## Sources (read 15 Nov 2026)

- YCloud, [Tech Partner guide](https://docs.ycloud.com/en/partner-center/technical-development-partners/getting-started-with-tech-partner): the two integration options.
- YCloud, [Become YCloud Tech Partner](https://docs.ycloud.com/en/partner-center/technical-development-partners/become-ycloud-tech-partner): application page, result by email, Partner → Tech Partner menu.
- YCloud, [Become a Meta Tech Provider](https://docs.ycloud.com/en/partner-center/technical-development-partners/technical-development-partner-onboarding): "Working with a Solution Partner", partner app ID 2892949377516980, "Only my partner", where to paste the Solution ID, billing from the partner balance.
- YCloud, [Embedded signup](https://docs.ycloud.com/en/partner-center/technical-development-partners/embedded-signup): Client OAuth switches, allowed domains, configuration template, `tp/bind` and `smb/bind`, the FAQ errors.
- YCloud, [Pricing, billing and payment](https://docs.ycloud.com/en/partner-center/technical-development-partners/pricing-billing-and-payment-methods-for-technical-development-partners): no markup, USD, card recharge, service stops at zero balance.
- YCloud, [Tech Partner programme](https://www.ycloud.com/tech-partner): Free plan (20 channels, tickets within 3 business days) and the $300/month plan.
- YCloud, [Partner Direct Link](https://docs.ycloud.com/en/partner-center/technical-development-partners/partner-direct-link-tp-lite): hosted signup without Meta partner status.
- Meta app dashboard for app `1701370170936187`: App Review, Verification, Use cases → WhatsApp → Become Tech Provider, Facebook Login for Business pages.
