# Meta App Review — CartHedge (Tech Provider)

App `1701370170936187` · submission `1701370237602847` · prepared 24 Oct 2026.

## 1. What we request (and why only these)

| Permission | Used by | Keep? |
|---|---|---|
| `instagram_business_basic` | IG login → `/me?fields=user_id,username` (`messaging/oauth.go`) | ✅ (dependency of manage_messages) |
| `instagram_business_manage_messages` | IG DM webhook + Send API (`messaging/client.go`) | ✅ |
| `whatsapp_business_messaging` | Seller WA send/receive, `/register` | ✅ (Tech Provider) |
| `whatsapp_business_management` | Embedded Signup: `phone_numbers`, `subscribed_apps` | ✅ (Tech Provider) |
| `instagram_business_content_publish`, `instagram_business_manage_comments`, `instagram_basic`, `instagram_manage_comments` | nothing in code | ❌ removed 24 Oct |

Meta rejects submissions that request permissions the app does not use, and Instagram-Login
and Facebook-Login permissions (`instagram_basic`, `instagram_manage_*`) cannot be mixed.

## 2. Allowed usage — description texts (paste as is)

### instagram_business_basic

> CartHedge (https://carthedge.in) is an order-management tool for small Indian sellers who sell through Instagram DMs. A seller connects their Instagram professional account from Settings → Connected channels → Instagram → Connect Instagram, which runs Instagram Business Login. We use instagram_business_basic only to read the connected account's user_id and username. The user_id routes incoming messaging webhooks to the correct seller's CartHedge workspace; the username is shown on the Instagram channel card ("Connected · @username") so the seller can confirm the right account is linked. We do not read media, followers or insights. This permission is requested as a required dependency of instagram_business_manage_messages.
>
> How to test: 1) Open https://carthedge.in/app/login and sign in with the test seller account given in Reviewer instructions. 2) In the left sidebar open Settings → Store tab → "Connected channels" card → Instagram → Connect → Connect Instagram. 3) Log in to your Instagram professional account and approve the permissions. 4) You return to Settings and the Instagram card shows "Connected · @<your username>".

### instagram_business_manage_messages

> Sellers on CartHedge take orders in Instagram DMs. After a seller connects their Instagram professional account, CartHedge subscribes that account to the messages webhook. When a buyer sends a DM, the conversation appears in the seller's AI order desk (sidebar → AI Desk → Inbox, tagged "Instagram"). CartHedge's assistant answers the buyer through the Instagram Send API using only the seller's own catalogue, prices and stock (size, colour, price, delivery questions) and builds an order draft (item, size, address, payment) that the seller approves with one tap. The seller can open any conversation, read the full thread, pause the assistant for that chat ("Pause AI"), and type and send their own reply from CartHedge. Messages are only sent in reply to a buyer who wrote first, inside Instagram's 24-hour standard messaging window; CartHedge never sends unsolicited or promotional DMs. Without this permission CartHedge cannot receive or answer DMs, which is the core of the product.
>
> How to test: 1) Complete the instagram_business_basic steps to connect your Instagram professional account. 2) From a different Instagram account, send a DM to the connected account, e.g. "Hi, is the pink kurti available in size M?". 3) In CartHedge open AI Desk — the conversation appears in the Inbox within a few seconds. 4) Click it: the thread opens with the assistant's reply, which also arrives in the buyer's Instagram app. 5) Type a message in "Reply on instagram…" and click Send — it arrives in the buyer's Instagram app. 6) Click "Pause AI" to stop automatic replies for that chat.

### whatsapp_business_messaging

> CartHedge is a Tech Provider for small Indian sellers. A seller connects their WhatsApp Business Account to CartHedge through Embedded Signup (Settings → Connected channels → WhatsApp). CartHedge then uses whatsapp_business_messaging to (a) register the seller's phone number on the Cloud API, (b) receive buyer messages through webhooks and show them in the seller's AI order desk, and (c) send replies to the buyer from the seller's number — answers about the seller's products, prices and stock, and order confirmations — only after the buyer has messaged the seller (customer-initiated, within the 24-hour customer service window). Order status updates outside the window use approved utility templates and are sent only to buyers who placed an order. This lets a seller answer WhatsApp order enquiries quickly without copy-pasting between WhatsApp and their order sheet.
>
> The attached screencast shows a message sent through the WhatsApp Cloud API (API Setup) and received in the WhatsApp client, as accepted for Tech Provider review.

### whatsapp_business_management

> When a seller completes Embedded Signup in CartHedge, we use whatsapp_business_management to access the WhatsApp Business Account the seller shared with us: read its phone numbers (to show which number is connected and to send from it), subscribe CartHedge to the WABA's webhooks (subscribed_apps) so buyer messages reach the seller's AI order desk, and manage the message templates the seller uses for order updates (order confirmed, shipped, delivered). We only access WABAs a seller has explicitly shared with CartHedge through Embedded Signup, and only for that seller's messaging.
>
> The attached screencast shows a message template being created in WhatsApp Manager, as accepted for Tech Provider review.

## 3. Screencasts to record (4 videos, MP4, English UI, ≤ 2–3 min each)

Record with Windows **Snipping Tool → Record** (`Win + Shift + R`) or Xbox Game Bar (`Win + Alt + R`).
Before recording: browser zoom 100 %, close other tabs, log out of CartHedge, have a second
Instagram account on your phone (the "buyer"). Narration not needed; slow down, pause 2 s on
each result. Videos 1 + 2 can be one recording uploaded to both permissions.

**Video 1 — instagram_business_basic** (must include the OAuth screen)
1. `https://carthedge.in/app/login` → log in as the test seller.
2. Sidebar → Settings → Store tab → Connected channels → Instagram → **Connect** → **Connect Instagram**.
3. Instagram login page appears (show the URL bar: `instagram.com/oauth/authorize…`). Log in to the seller's IG professional account.
4. Permission screen: pause on it so both permissions are readable → **Allow**.
5. Back in Settings: zoom on "Connected · @username". Stop.

**Video 2 — instagram_business_manage_messages** (continue from video 1, or start already connected)
1. Show phone (or IG web in a second window) logged in as the **buyer** account. DM the seller: "Hi, is the pink kurti available in size M?"
2. Switch to CartHedge → sidebar **AI Desk** → the new chat appears in Inbox tagged *Instagram*.
3. Click it → thread opens with the assistant's reply.
4. Switch to buyer's Instagram → show the reply arrived.
5. Back in CartHedge: type "Thanks! Please share your address and pincode." → **Send**.
6. Buyer's Instagram → reply arrived. Optional: click **Pause AI** to show seller control. Stop.

**Video 3 — whatsapp_business_messaging** (Meta-accepted shortcut; also creates the required test API call)
1. developers.facebook.com → CartHedge app → **WhatsApp → API Setup**.
2. Pick the test number in *From*, your own phone in *To* (verify it if asked).
3. Click **Send message** (or run the shown cURL in a terminal).
4. Show your phone's WhatsApp receiving "Hello World". Stop.

**Video 4 — whatsapp_business_management** (Meta-accepted shortcut)
1. business.facebook.com → **WhatsApp Manager → Message templates → Create template**.
2. Category *Utility* → name `order_shipped` → language English → body
   `Hi {{1}}, your order {{2}} from {{3}} has been shipped. Track it here: {{4}} Thank you for shopping with us.` → add samples
   (body must not start or end with a variable).
3. **Submit** → show the template listed as *In review / Active*. Stop.

After videos 3–4: the review form must show "1 of 1 API call(s)" for both WhatsApp
permissions — can take up to 24 h to update. Submit only after both turn green.

## 4. Data handling answers

- **Data processors:** Yes — Render (hosting + database), Redis host, Google (Gemini API —
  DM text is sent to generate replies), YCloud (only for sellers on "CartHedge pays" WhatsApp).
  ⚠ Owner to confirm the exact DB / Redis provider names before submitting.
- **Responsible entity:** owner's legal name or registered business name; country **India**.
- **National security requests in past 12 months:** No.

## 5. Reviewer instructions

> Website: https://carthedge.in/app/login (web only).
> Test seller login: (entered by owner in the credentials field — do not paste in docs).
> 1) Log in. 2) Settings → Connected channels → Instagram → Connect Instagram, and log in with your own Instagram professional account. 3) The card shows "Connected · @username" (instagram_business_basic). 4) DM that account from another Instagram account; open AI Desk to see the conversation, the assistant's reply, and send your own reply with "Reply on instagram…" (instagram_business_manage_messages). WhatsApp permissions are demonstrated with the API Setup and WhatsApp Manager recordings accepted for Tech Providers.

## 6. Before pressing Submit

- [ ] App settings: icon 1024×1024, privacy URL `https://carthedge.in/privacy`, category, contact email.
- [ ] Verification step green (business verified; Tech Provider access verification).
- [ ] 4 videos uploaded, "agree" boxes ticked.
- [ ] WhatsApp API-call counters show 1/1.
- [ ] Data handling + Reviewer instructions filled.
