# CartHedge — manual test checklist

Things automation could not do (real Meta accounts, real phones, third-party payment iframes, real inboxes). Everything else is covered and recorded in [QA-TRACKER.md](QA-TRACKER.md). Run these on the deployed build after the fixes ship. Tick and date each line.

## Before you start (owner actions from the QA pass)

- [ ] Change the seed admin password (`admin@carthedge.in`) in admin → Account. **BUG-001**
- [ ] Change the demo seller password (`demo@carthedge.in`) or move the @carthedgeofficial Instagram connection to a real account. **BUG-002**
- [ ] Deactivate the three "QA Plan v3" plans in admin → Plans. **BUG-007**
- [ ] Rotate every secret that was pasted into chat: OpenAI key, Razorpay key secret + webhook secret, Meta app secret + IG app secret, Neon DB password, `JWT_SECRET` (logs everyone out), Mailtrap password. Do **not** rotate `ENCRYPTION_KEY` without re-encrypting stored Razorpay secrets and channel tokens.
- [ ] Decide OTP delivery (OPS-1): until a WhatsApp/SMS provider is configured, signup and buyer OTPs only reach the server log.
- [ ] Optional cleanup: QA data from this pass is prefixed `qa-` (stores `qa-*`, emails `qa.*@example.com`, phones `9000xxxxxx`); test subscription payments show in admin revenue/MRR.
- [ ] Admin → Site content → **Invoice identity**: enter CartHedge's legal name, GSTIN, address and billing email. Until then subscription invoices are issued without GST (as an unregistered supplier).
- [ ] Razorpay dashboard → Webhooks: subscribe the existing webhook to all `subscription.*` events (`authenticated`, `activated`, `charged`, `pending`, `halted`, `resumed`, `cancelled`, `completed`) as well as `payment.captured` (autopay renewals are booked from these).

## 1. Instagram (real account, needs Meta app live + tester added)

- [ ] Settings → Connected channels → Instagram → Connect: Instagram login opens, consent screen lists messaging permissions, you land back on `/app/settings?connected=instagram` and the channel shows connected with your @handle.
- [ ] Cancel the consent screen: you land back on Settings with a readable reason, nothing connected.
- [ ] From a second (buyer) Instagram account DM the shop "pink kurti hai? M size" — the inbox shows the chat within ~10 s, the buyer sees "seen" + typing, then a reply in the buyer's language using real catalog prices.
- [ ] Continue the chat with name, phone, address, COD → the buyer gets the order summary card; reply "haan" → with auto-confirm OFF a draft appears on the AI desk; Confirm → buyer gets order code + tracking link in the same chat.
- [ ] Turn auto-confirm ON and repeat: order is placed directly, buyer gets the confirmation in chat.
- [ ] Reply to a buyer yourself from the Instagram app → the thread shows it as *seller* and the assistant stays quiet on that chat.
- [ ] Ask the bot "refund chahiye / kisi insaan se baat karao" → chat moves to "needs you", assistant paused, owner alert arrives (once OPS-1 is solved).
- [ ] Send a story reply / photo / shared post → the chat shows "[replying to your story] …" etc. and the assistant handles it sensibly.
- [ ] Mark an order shipped → buyer gets the status message in the Instagram chat (within 24 h of their last message).
- [ ] Remove the app from Instagram settings (Settings → Apps and websites) → the channel disappears from CartHedge (deauthorize callback).
- [ ] Request data deletion from Facebook → callback returns a status URL; `/data-deletion?code=…` opens.
- [ ] After ~53 days, confirm the Instagram token auto-renews (channel stays connected past 60 days).

## 2. WhatsApp (code verified with signed simulated webhooks; real number not connected yet)

- [ ] Connect via the Facebook Embedded Signup button: WABA + phone number are discovered, webhook subscription succeeds, channel shows the verified name.
- [ ] Repeat the Instagram chat flow above on WhatsApp (text, image with caption, quick-reply button).
- [ ] Voice notes / location / stickers are currently **ignored** (no reply) — decide if a "[sent a voice note]" marker is wanted.
- [ ] Order status messages after 24 h fall back to the WhatsApp rail (needs OPS-1 provider + approved templates for business-initiated messages).

## 3. Payments (Razorpay test mode first, then one tiny live payment)

- [ ] Billing → Subscribe → complete Razorpay **test** checkout with `success@razorpay` (UPI) or a Razorpay test card → plan switches, ends-at +30 days, admin → Payments shows it paid. (The checkout iframe does not accept automated typing, so this step was not automated; the verify/webhook logic is fully tested with signed payloads.)
- [ ] Close the Razorpay modal mid-way → "Payment not completed" toast, nothing activated.
- [ ] Configure the Razorpay webhook in the dashboard (`/webhooks/razorpay`, event `payment.captured`, secret = `RAZORPAY_WEBHOOK_SECRET`) and confirm a delivery shows 200.
- [ ] Seller with their own Razorpay keys: buyer pays a link/store order by card/UPI in test mode → order auto-confirms, buyer sees "Payment received".
- [ ] Buyer pays and closes the tab before returning (OPS-3): check whether the order stays unpaid in CartHedge while Razorpay shows captured.
- [ ] UPI-only seller: on a real phone tap "Open GPay / PhonePe / Paytm" — the app opens with amount + reference filled; scan the QR from a second phone.
- [ ] COD token: seller sets ₹50 token, buyer pays the token → order shows token paid + COD confirmed.

## 4. Messages and email (need OPS-1 + a verified Mailtrap sending domain)

- [ ] Signup OTP and buyer OTP arrive on the phone within seconds; resend timer works; 5 wrong codes lock the code.
- [ ] Welcome email, password-reset email (link works once, expires after 30 min), renewal reminder (3 days before), plan-ended email.
- [ ] Contact form and custom-plan request emails reach `ADMIN_EMAIL`.
- [ ] Broadcast to a segment is actually delivered (today the sent count is fake while WhatsApp is unconfigured).

## 5. Devices and in-app browsers

- [ ] Open a share link and the storefront inside the **Instagram** and **WhatsApp** in-app browsers on a mid-range Android and an iPhone: page loads fast, checkout completes, keyboard does not zoom inputs, back button behaves.
- [ ] Link previews: paste a storefront link, a product link and a checkout link into WhatsApp/Instagram — title, price and image show.
- [ ] Seller app on a phone: bottom tab bar, order drawer, product form and settings are usable one-handed; dark and light themes.
- [ ] Print an invoice (Invoices → open → Print) on a real printer/PDF.

## 6. Features from the 3 Oct build (real devices / real money)

- [ ] **Device notifications:** Settings → Account → This device → Turn on, on Chrome (Android and desktop) and on an iPhone with CartHedge added to the home screen (iOS only allows web push for installed apps). "Send a test" arrives; a real order from another phone arrives with the app closed, and tapping it opens that order.
- [ ] **Autopay:** Billing → Turn on autopay → approve the mandate in Razorpay (test card or UPI AutoPay) → Billing shows "Autopay on". After the first charge, Billing history lists the CartHedge GST invoice and it prints cleanly. Cancel renewal → Razorpay shows the subscription cancelled.
- [ ] **Refund through Razorpay:** on a store where the seller has their own Razorpay keys, a captured test payment → cancel the order → Pay the pending refund → Razorpay shows the refund and the order shows it processed with the Razorpay reference.
- [ ] **Alerts and reminders on WhatsApp/email** (after OPS-1): a new order, a return request, a buyer cancellation and a dropped-checkout reminder (1–24 h after a buyer verifies their number without ordering) actually arrive.
- [ ] **Printing:** packing slips (one per page, QR scans to the order page), the pick list and a GST invoice with CGST/SGST and one with IGST on a real printer and as PDF.
- [ ] **Store policies page** on the live domain (`/s/<store>/policies`) is what you give Razorpay/Meta as the refund, shipping, terms and contact pages; check it reads right for a store with full policies filled in.
- [ ] **Account deletion:** delete a throwaway seller account → logging in shows the restore screen → restore works. (The 30-day purge runs in the hourly job; check one purged test account after 30 days.)
- [ ] **Buyer self-service on a phone:** from the order page cancel an unshipped order, change an address, and raise an exchange with a photo taken on the phone camera.

## 7. Production deploy checks (Render)

- [ ] After deploy, from two different networks hit `/api/v1/auth/login` repeatedly → each network is limited separately (confirms Render passes `CF-Connecting-IP`; if every client shares one limit, tell me).
- [ ] Watch the logs through one deploy: no duplicate AI replies or COD nudges while old and new instances overlap.
- [ ] `/robots.txt`, `/sitemap.xml`, `/privacy`, `/terms`, `/data-deletion` return 200 on the live domain (Meta app review needs them).
- [ ] **Speed:** the Neon database is in AWS us-east-2 (Ohio). Check the Render service's region — if it is not Ohio (US East), every query crosses continents (~200 ms each, pages take seconds). Move the Render service to Ohio, or the database to the Render region; this matters more than any code change.

## 8. Product options and WhatsApp offers (4 Oct build)

- [ ] **STOP / START on a real WhatsApp number** (after WhatsApp is connected, see `docs/WHATSAPP-INSTAGRAM-GO-LIVE.md`): from a buyer phone send "STOP" to the seller's number → a confirmation arrives, the assistant does not reply, the customer drawer shows "Stopped, replied on WhatsApp". Send "START" → subscribed again. Send "Stop promotions" (the quick-reply button on marketing templates) → stopped.
- [ ] **A real broadcast** to a buyer who ticked the offers box: it arrives once, the store link opens the store, and the stop link at the bottom opens the stop page in the WhatsApp in-app browser and works with one tap.
- [ ] **Option photos inside Instagram/WhatsApp in-app browsers** on a mid-range Android: picking a colour swaps the gallery to that colour's photos without lag; the swatch chips are readable in both themes.
- [ ] **Label details on a real listing:** a lawyer confirms which of MRP, country of origin and maker/packer/importer apply to fashion and handmade sellers, and the product page wording ("MRP ₹X, inclusive of all taxes", "Made or packed by") is acceptable.
- [ ] **Consent wording:** a lawyer reviews "Send me offers and new arrivals from <store> on WhatsApp. I can stop them any time." and the Broadcasts section of the terms.
