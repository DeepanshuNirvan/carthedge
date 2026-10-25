# Meta platform capabilities (Instagram + WhatsApp, 2026) and Indian compliance obligations for CartHedge

Research date: 11 Oct 2026. Scope excludes what `docs/WHATSAPP-INSTAGRAM-GO-LIVE.md` and `docs/COMPLIANCE.md` already verify (WhatsApp per-message INR rates, 1 Oct 2026 pricing changes, free entry point window, Coexistence basics, Tech Provider / Solution Partner / YCloud billing, Embedded Signup v4, sending limits, existing consent and payment-data handling). Meta pages often show no "last updated" date. Where a page gave one, it is noted. Third-party (BSP/vendor) sources are labelled as such.

---

## Q1. Instagram API with Instagram Login (2026): what CartHedge could build on

### Takeaway
Comment-to-DM (private replies), Live-comment replies, story-mention capture, ice breakers, a persistent menu and carousel "product cards" (generic templates) can all be built with Instagram Login. Almost all of them need only `instagram_business_basic` plus `instagram_business_manage_comments` or `instagram_business_manage_messages`, and CartHedge is already asking for those in App Review. Meta charges nothing per message. The real limits are 1 private reply per comment within 7 days, 750 private replies per hour per account, and a human-agent tag that requires its own App Review and may not be used for bot replies. Native Instagram checkout does not exist in India. Product tagging may be available, but access is uneven and unconfirmed.

### Cited Findings
**Private replies (comment-to-DM)**
- Endpoint: `POST graph.instagram.com/<API_VERSION>/<IG_ID>/messages` with `recipient.comment_id` and `message.text`. Instagram Login needs an Instagram User token plus `instagram_business_basic` and `instagram_business_manage_comments`. The success response returns the commenter's IGSID and a `message_id`. — [Meta: Send a Private Reply](https://developers.facebook.com/docs/instagram-platform/private-replies/)
- Rules: only **one** private reply per commenter (per comment), sent **within 7 days** of the comment on a post or reel. On Instagram **Live**, replies are possible **only during the broadcast**. A follow-up is allowed only if the person responds, and then only within 24 h of their response. The reply lands in the Inbox if the person follows the account, otherwise in Requests, and it contains a link to the post. — [Meta: Send a Private Reply](https://developers.facebook.com/docs/instagram-platform/private-replies/)
- The search snippet of the same guide says it was "updated Jul 2, 2026" and lists "ads post" among eligible sources. — [Meta: Private replies (search summary)](https://developers.facebook.com/docs/instagram-platform/private-replies/)
- Rate limits: **750 calls/hour per Instagram professional account** for private replies to post and reel comments, and **100 calls/second** for Live-comment private replies, counted as separate budgets. The Conversations API allows 2 calls/s per account. Too many messages to a single thread can be throttled. — [Meta: Messenger Platform rate limits](https://developers.facebook.com/docs/messenger-platform/overview/rate-limiting)
- Send API: Meta's Messenger-API-for-Instagram page gives 300 calls/s for text, links, reactions and stickers and 10/s for audio and video. A third-party analysis says Instagram Login has a lower ceiling of **100 calls/s**. These are **conflicting figures** from two integration paths. — [Meta rate limits](https://developers.facebook.com/docs/messenger-platform/overview/rate-limiting); [bundle.social (third-party), Aug 2026](https://bundle.social/blog/instagram-api-rate-limits)

**Webhooks available with Instagram Login**
- Fields and permissions: `comments` and `live_comments` need `instagram_business_basic` + `instagram_business_manage_comments`. `messages`, `message_reactions`, `messaging_postbacks`, `messaging_referral`, `messaging_seen`, `messaging_optins`, `messaging_handover` and `standby` need `instagram_business_manage_messages`. `@mentions` arrive inside the `comments` notification. **Not available with Instagram Login:** `story_insights`, `messaging_policy_enforcement`, `response_feedback`. — [Meta: Instagram webhooks](https://developers.facebook.com/docs/instagram-platform/webhooks)
- To receive `comments` and `live_comments`, the app must be **Live** with **Advanced Access**, and the professional account must be **public**. Live comment notifications arrive only during the broadcast. Account-level customisation is not supported: subscribing to any field delivers every subscribed field for all accounts. — [Meta: Instagram webhooks](https://developers.facebook.com/docs/instagram-platform/webhooks)
- Caption and comment @mentions: mentions on Stories are not supported there, and no webhook fires if the media belongs to a private account. — [Meta: Mentions (Instagram Login)](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/mentions)

**Story mentions**
- When someone mentions the business in a story, a message referencing the story appears in the business inbox. The webhook flows only if the mentioning account is public, or private but following the business. The story CDN URL must **not be stored or cached**, and once the story expires or is deleted the app should show a placeholder. — [Meta: Story Mention](https://developers.facebook.com/docs/messenger-platform/instagram/features/story-mention)

**Human agent tag**
- The `human_agent` tag allows a human reply **within 7 days** of the user's message. It is meant for cases the 24 h window cannot cover, such as a weekend closure or an issue that takes longer than 24 h. It is listed as a separate "Human Agent" feature alongside the Instagram Login permissions, and users without an app role can only grant features approved through App Review. — [Meta: Instagram Platform overview](https://developers.facebook.com/documentation/instagram-platform/overview)
- The app has 24 h to respond to a user's message, and human-agent responses can be tagged to go outside that window. Where the law requires it, automated chats must disclose that they are automated at the start of a thread, after a long gap, and on handoff from a human. Meta recommends the disclosure even where it is not required. — [Meta: Messaging API (Instagram Login)](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api)

**Messaging UI features**
- Supported message types: text up to 1,000 bytes, images (PNG/JPEG, 8 MB, up to 10 per request), audio, video and PDF up to 25 MB, the heart sticker, reactions, shares of the account's own posts (`MEDIA_SHARE`), and templates. — [Meta: Messaging API (Instagram Login)](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api)
- **Ice breakers:** up to **4 questions**, set per locale through `POST /<IG_ID>/messenger_profile` with `platform: instagram`. Not available on desktop. Needs `instagram_business_basic` + `instagram_business_manage_messages`, plus Advanced Access for accounts the app does not own. A tap arrives as a `messaging_postbacks` event carrying the payload you set. — [Meta: Ice Breakers](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/ice-breakers)
- Ice breakers are shown only once, to first-time users, and only on the mobile app. — [Gupshup docs (BSP)](https://docs.gupshup.io/docs/instagram-features-and-limitations)
- **Persistent menu:** URL and postback buttons only. It cannot be customised per IGSID. `composer_input_disabled` and `webview_height_ratio` are unavailable. Existing conversations see an updated menu only after the person refreshes their inbox. — [Meta: Persistent Menu (Instagram Login)](https://developers.secure.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/persistent-menu/)
- **Generic template (carousel cards):** up to **10 elements**, **3 buttons** each, `postback` and `web_url` buttons only, title (required) and subtitle up to 80 characters, optional `image_url` and `default_action`. Not available on desktop. No dedicated "product template" is documented for Instagram Login. — [Meta: Generic Template](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/generic-template)

**Instagram Shopping in India**
- An Agorapulse support article says that after an API change only 21 countries keep product tagging without Instagram checkout, and India is on that list. Lightspeed lists India among APAC countries that support shoppable links. — [Agorapulse](https://support.agorapulse.com/en/articles/8769636-can-i-tag-products-on-my-post); [Lightspeed](https://x-series-support.lightspeedhq.com/hc/en-us/articles/47317968593307)
- A vendor blog says many Indian business accounts still see "not eligible due to location", and that in-app checkout never launched in India. — [Vizup (vendor, unverified)](https://www.vizupcommerce.com/blog/how-to-add-the-view-shop-button-on-instagram)
- Vendor blogs say Meta began phasing out native Shops checkout from mid-2025, and that tags now send buyers to the merchant's own site. — [Whatmore (vendor), Aug 2026](https://www.whatmore.ai/blog/why-meta-s-instagram-product-tagging-update-matters-and-why-you-still-need-your-own-shoppable-video-storefront/); [Socialkit](https://socialk.it/en/blog/instagram-shopping-guide)
- If a catalog has a country feed or a default country, product tags are visible only in countries where the catalog has prices. — [Meta: Localized catalog for IG product tagging](https://developers.facebook.com/documentation/ads-commerce/catalog/localized-catalog-ig)

### Inferences
- **Comment-to-DM is the cheapest big feature.** CartHedge's App Review already bundles `instagram_business_manage_comments` (GO-LIVE doc §7). The remaining work is to subscribe to `comments` and `live_comments` and send one private reply per comment, for example a keyword ("price", "link") triggering a DM with the product card. That DM opens a conversation, and the existing assistant takes over once the buyer replies, inside the usual 24 h window. Per-account cap: about 750 per hour, effectively 18,000 per day per seller.
- **Live selling is a strong fit for Indian sellers.** `live_comments` plus private replies sent during the stream ("DM me 'M pink'") can drive orders while the Live is running. Nothing can be sent after the Live ends, so this has to work in real time.
- **Story mentions** are feasible as a UGC inbox and thank-you DM. The media must not be stored, so CartHedge can keep only the reference and a placeholder.
- **Product cards in DMs:** the assistant can send generic-template carousels linking to CartHedge storefront product pages, which is a practical stand-in for Instagram Shopping in India. Cards do not render on desktop, so a text fallback is needed.
- **Human agent tag:** this could become a "seller replies by hand in CartHedge's inbox up to 7 days later" feature. It needs separate App Review and must never be used by the bot, which matches CartHedge's existing rule.
- **Disclosure:** the assistant should say it is automated at thread start and on handoff, since Meta requires this where the law does.

### Gaps
- No official Meta page found for Instagram quick-reply limits (often cited as 13) or an Instagram "product template". Unconfirmed.
- Whether story *replies* (as opposed to mentions) carry a specific `story` reply object under Instagram Login was not confirmed from a primary source.
- India eligibility for product tagging and Shops is not confirmed on any Meta help page. Sources conflict.
- No source on whether private replies to **ad** comments count against the same 750/h budget.
- Threads API and Meta Verified for Business (India pricing) were not researched for lack of time. Treat both as open.

---

## Q2. WhatsApp Business Platform (2026): commerce features beyond plain messaging

### Takeaway
Meta offers native catalogs and cart messages (up to 30 products, with orders arriving by webhook), WhatsApp Payments India (an `order_details` "bill" paid through UPI and other methods via Razorpay, PayU, BillDesk or Zaakpay, or UPI Intent through any gateway), Flows (in-chat forms with an optional server endpoint), the Marketing Messages API (formerly MM Lite, now GA, same billing as Cloud API), click-to-WhatsApp welcome sequences, a Calling API, typing indicators, and a Groups API. The Groups API **cannot be used on WhatsApp Business app (Coexistence) numbers**. **Indian businesses must file business compliance info (legal name, customer care, grievance officer) before product messages can be sent.** General-purpose AI chatbots have been banned since 15 Jan 2026, but business sales and support bots like CartHedge's remain allowed.

### Cited Findings
**Catalog / product messages**
- Catalogs connect to a WABA through the Commerce API or Commerce Manager. Message types: catalog message (catalog thumbnail), single-product, **multi-product (up to 30 products in sections)**, product carousel. Buyers can add up to **99 units per item**, with no limit on distinct items. A submitted cart arrives as a webhook with order details. **Businesses based in India must comply with online-selling laws**, and a Business Compliance API retrieves the compliance details for a phone number. — [Meta: Catalogs overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/catalogs-overview.md)
- Meta's docs index also lists pages for unified catalog messages, interactive product carousels, **MPM templates** (multi-product as a template, usable outside 24 h) and commerce settings. — [Meta: WhatsApp docs index](https://developers.facebook.com/documentation/business-messaging/whatsapp/llms.txt)
- India compliance payload (`business_compliance_info`): `entity_name`, `entity_type` (LLP, sole proprietorship, partnership, public/private company, other), `is_registered` (required for partnership or other), `customer_care_details` (email plus phone, required), `grievance_officer_details` (name plus one contact method). Address and licence are also required. **Without this data, single- and multi-product messages cannot be sent.** — [360dialog docs (BSP)](https://docs.360dialog.com/partner/commerce-and-payments/products-and-catalogs/india-businesses-compliance-for-commerce)
- WhatsApp's Commerce Policy bars categories such as weapons, tobacco, alcohol and gambling for Indian sellers. — [Gallabox (BSP)](https://gallabox.com/blog/how-to-comply-with-whatsapp-commerce-policy)

**WhatsApp Payments (India)**
- Buyers pay with any UPI app, or with cards, NetBanking and wallets, after the business sends an `order_details` (invoice) message. A template version of `order_details` is used for payment reminders. `order_status` messages are part of the flow. — [Meta: Payments India overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/payments/payments-in/overview.md)
- **Payment Gateway Deep Integration mode** supports **Razorpay, PayU, BillDesk and Zaakpay**, with other methods, native payment-status webhooks and refunds through WhatsApp APIs. The gateway account owner must authorise linking it to Meta Business Suite. **UPI Intent mode** works with any gateway that supports UPI Intent, but has no native status webhooks, no refunds, and no non-UPI methods (send payment links instead). — [Meta: Payments API India](https://developers.facebook.com/docs/whatsapp/cloud-api/payments-api/payments-in)
- Meta advises against relying only on webhooks and offers a payment lookup API. Razorpay-only `notes` (up to 15 keys, 256 characters each) and a `receipt` field can be passed. — [Meta Payments API India via search summary](https://developers.secure.facebook.com/docs/whatsapp/cloud-api/payments-api/payments-in); [360dialog (BSP)](https://docs.360dialog.com/partner/messaging/payments-india-only/receive-whatsapp-payments-via-payments-gateway)

**WhatsApp Flows**
- A Flow is made of screens and components (text inputs, dropdowns, date pickers, media upload), with an optional endpoint that sends data to the business server to pick the next screen. Encryption and health-monitoring guides apply, and webhooks include endpoint health alerts. Flows can be sent as business-initiated templates or user-initiated interactive messages. Supported on Android 6+ and iOS 12+, **not on WhatsApp Web or companion devices**. States: Draft, Published, Throttled, Blocked, Deprecated. Flows Metrics API deprecated April 2026. Guides page updated 14 May 2026. — [Meta: Flows guides](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides)
- AWS End User Messaging says endpoint Flows are "planned for an upcoming release" on its platform. This is **conflicting**, likely AWS-specific. — [AWS docs](https://docs.aws.eu/social-messaging/latest/userguide/managing-flows-limitations.html)

**Marketing Messages API for WhatsApp (formerly MM Lite)**
- Renamed from "Marketing Messages Lite API" and **generally available** (mirror of Meta docs dated 10 Feb 2026). — [ChatArchitect mirror of Meta docs](https://support.chatarchitect.com/books/meta-whatsapp/page/onboard-business-customers-developer-documentation/revisions/129)
- Marketing traffic goes to `/marketing_messages`, with automatic delivery optimisation, benchmarks, time-to-live, and creative optimisations in testing. It uses "a similar technical schema and the same billing model as Cloud API", and existing numbers and templates carry over. Meta cites an A/B test on ~12 M marketing messages from **Indian advertisers** in January 2025. — [Meta: MM API overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/marketing-messages/overview)
- Onboarding: through WhatsApp Manager, **Embedded Signup (add `marketing_messages_lite` to `features`)**, or the Intent API. Needs advanced `whatsapp_business_messaging` + `whatsapp_business_management`, with `ads_read` optional for the Insights API (conversion metrics). Completion is confirmed by an `account_update` webhook. — [Meta: Onboard business customers to MM API](https://developers.facebook.com/documentation/business-messaging/whatsapp/marketing-messages/onboard-business-customers.md)
- Existing doc note: Gupshup and 360dialog charge 6–7% extra on marketing sent *outside* MM Lite. — (`docs/WHATSAPP-INSTAGRAM-GO-LIVE.md` §3)

**Click-to-WhatsApp (CTWA) ads**
- Welcome message sequences (text, prefilled message, FAQ ice breakers) are created via `/<WABA_ID>/welcome_message_sequences` (needs `whatsapp_business_management`) and attached to the ad through `asset_feed_spec.additional_data.partner_app_welcome_message_flow_id`. The `messages` webhook carries a `referral` object with `source_url`, `source_id` (ad ID), `source_type`, `ctwa_clid`, headline and media. — [Meta: Welcome message sequences](https://developers.facebook.com/documentation/business-messaging/whatsapp/ctwa/welcome-message-sequences.md)

**Calling API**
- All user-initiated calls are free. Business-initiated calls are billed in 6-second pulses by country and volume tier, and need a payment method. — [Meta: Calling pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/calling/pricing/)
- India is listed as supported for business-initiated calls, and the call-permission limits quoted differ between sources: 1 request per 24 h and up to 2 per 7 days, then up to 5 connected calls per 24 h (Infobip), against a 72 h window for one call (Chakra). **Conflicting.** — [Infobip](https://support.infobip.com/docs/whatsapp/whatsapp-business-calling/business-initiated-calling); [Chakra](https://chakrahq.com/article/whatsapp-cloud-api-calling-feature-details/amp/)

**Typing indicator**
- `POST /<PHONE_NUMBER_ID>/messages` with `status: read`, `message_id` and `typing_indicator: {type: text}`. It shows until the reply is sent or for up to **25 seconds**, and it also marks the message read. No cost mentioned. — [Meta: Typing indicators](https://developers.facebook.com/documentation/business-messaging/whatsapp/typing-indicators.md)

**AI policy (Business AI / third-party bots)**
- Under WhatsApp's Terms (updated **15 Jan 2026**), "AI Providers" may offer **general-purpose** assistants only where Meta is legally required to allow it. AI-provider non-template messages were charged in Italy, Brazil and 29 European countries from Feb and Mar 2026; those charges stopped in some markets on 13 May 2026. Billing category `general_purpose_ai` / `AI_BOT`. — [Meta: Pricing for AI providers](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/ai-providers.md)
- Structured business bots (support, bookings, order tracking, sales) remain allowed. Meta decides what the "primary use case" is. — [respond.io (BSP)](https://respond.io/blog/whatsapp-general-purpose-chatbots-ban); [Gulf News](https://gulfnews.com/technology/no-more-chatgpt-and-perplexity-on-whatsapp-meta-bans-major-ai-chatbots-from-2026-1.500316016)

**Groups API**
- Requires an **Official Business Account**. **Not available for WhatsApp Business app phone numbers** (Coexistence) or Multi-solution Conversations numbers. Max **8 participants**, 10,000 groups per number, invite-link only, per-message pricing. No commerce, interactive or auth messages in groups. — [Meta: Groups API](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups.md)

**Pricing conflict to note (not re-researched)**
- An AiSensy post (12 Sep 2026) quotes India service and utility at **₹0.145** with 1,000 free service messages from 1 Oct 2026. The GO-LIVE doc's Meta-verified figure is **₹0.115**, so AiSensy's figure may include its markup. — [AiSensy (BSP)](https://m.aisensy.com/blog/whatsapp-pricing-update-october-2026/)

### Inferences
- **Native catalog and cart in chat** (multi-product messages and cart webhooks feeding CartHedge's order board) is a natural fit, since CartHedge already holds the catalog. It needs a catalog sync to Meta (Commerce API) and **filing India business compliance info per seller WABA during onboarding**. That info is nearly the same data the Consumer Protection Rules require on the storefront (grievance officer, customer care), so one settings form can serve both.
- **WhatsApp Payments with Razorpay deep integration** fits sellers who connect their own Razorpay (COMPLIANCE.md says seller Razorpay keys exist). Each seller would have to authorise linking their gateway in Meta Business Suite. UPI Intent mode fits sellers who only have a UPI ID, but it has no status webhooks, so the existing "buyer reports UPI ref" flow stays. Fees and Tech Provider/Coexistence eligibility are **unknown**, so check with Meta and YCloud.
- **Flows** suit address and size capture, COD confirmation, return requests with photo upload, and slot booking for service sellers (salons, tailors). They do not render on WhatsApp Web, so keep a link fallback.
- **Marketing Messages API** should be the route for broadcasts once sellers connect (GO-LIVE item 8). Add `marketing_messages_lite` to the Embedded Signup `features` from day one to avoid re-onboarding.
- **Typing indicator** costs nothing and is already GO-LIVE item 9.
- **Groups** (VIP and drop groups) are **not possible** for Coexistence sellers. Skip.
- **AI policy:** CartHedge's seller-scoped sales assistant is a business-specific bot, which is allowed. Keep the assistant scoped to the seller's catalog and orders so it never looks like a general-purpose assistant.

### Gaps
- Meta fees (if any) for WhatsApp Payments India, transaction caps, and whether Tech Providers or Coexistence numbers are eligible were not found.
- Flows pricing (assumed to follow the message category) and endpoint latency SLAs were not found.
- Calling API India rates and permission limits were not confirmed on Meta's own pages.
- Whether catalog/cart messages work on Coexistence numbers (the WhatsApp Business app has its own catalog) was not confirmed.
- Official Meta page for the India compliance API was not fetched. The field list comes from 360dialog's mirror.

---

## Q3. BSUIDs and usernames (phone-number-less users): impact on routing by `wa_id`

### Takeaway
This is a **breaking change already live**. Since April 2026 every WhatsApp webhook carries a business-scoped user ID (`user_id`). When a buyer adopts a username, their phone number (`from` / `wa_id`) can be missing unless the seller's number interacted with them in the last 30 days or they are in Meta's contact book. Meta says BSUID support "is required" or messages may become unprocessable. Authentication (OTP) templates cannot go to a BSUID, which affects CartHedge's phone-based OTP checkout.

### Cited Findings
- BSUIDs appeared in webhooks from **early April 2026**. Businesses could reserve and claim usernames from **29 Jun 2026**. **Sending to a BSUID** has been supported since **July 2026**. The `REQUEST_CONTACT_INFO` button has been available since **early July 2026**. Usernames are rolling out gradually to users through 2026. — [Meta: Business-scoped user IDs](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids)
- The phone number is omitted for username users unless, **per business phone number**, there was a message or call either way in the past 30 days, or the user is in the business's contact book. `user_id` always carries the BSUID. `from` can be omitted and the new `from_user_id` carries the BSUID. `username` is included when the user has one. `parent_user_id` is present for portfolios enrolled in parent BSUIDs. — [Meta: BSUIDs](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids)
- A BSUID only works with a business number in the **same portfolio**. **One-tap, zero-tap and copy-code authentication templates cannot be sent to BSUIDs.** Meta hosts a portfolio-scoped contact book that stores phones and BSUIDs for interactions after launch. — [Meta: BSUIDs](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids)
- Meta says BSUID support "is required for all partners and directly-integrated businesses" and for CTWA advertisers, without which you could lose the ability to process messages. No hard deadline is given. — [Meta: BSUIDs](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids)
- Coexistence: `smb_message_echoes` add a `contacts` array (`username`, `wa_id`, `user_id`, `parent_user_id`), and `wa_id` may be omitted. History and `smb_app_state_sync` webhooks gain BSUID fields. Status webhooks always include `recipient_user_id`, and `recipient_id` (phone) may be omitted. In send requests the BSUID goes in dedicated fields, and if both phone and BSUID are given the phone wins. Phone-related data is retained for at most 30 days, so returning users after that may look like new threads. — [Meta: BSUIDs (later part of page)](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids)
- The `REQUEST_CONTACT_INFO` button label cannot be customised (optional text must be exactly "Share Contact Info"). — [Meta: BSUIDs](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids)
- One BSP describes the BSUID format as a 2-letter country code, a dot, and up to 128 alphanumeric characters. — [Kapso (third-party)](https://kapso.ai/blog/whatsapp-bsuid-usernames-2026); [Bird docs](https://docs.bird.com/api/channels-api/supported-channels/programmable-whatsapp/business-scoped-user-ids)

### Inferences
- CartHedge routes inbound messages by seller `phone_number_id`, which is unaffected, but keys **buyers** by phone/`wa_id`. It should store `user_id` (BSUID) on every conversation and customer, accept inbound messages with no `from`, and send by BSUID when no phone is known.
- **Checkout OTP and order linking:** a username-only buyer has no phone to send an auth template to. The assistant should use `REQUEST_CONTACT_INFO` before drafting a COD order, or fall back to email OTP. Customer de-duplication across Instagram, WhatsApp and the storefront needs BSUID ↔ phone mapping.
- BSUIDs are per portfolio. Each seller has their own portfolio under Embedded Signup, so the same buyer has a different BSUID at every seller. That is fine, since CartHedge's customer records are per store.
- The CartHedge-owned number (OTP, `order_update`, `seller_alert`) also needs a phone. Auth templates to BSUIDs are impossible, so storefront checkout must keep collecting phone numbers.

### Gaps
- No firm Meta date by which non-BSUID integrations stop working.
- How the YCloud partner webhook format represents BSUIDs was not checked.

---

## Q4. Conversions API and ads attribution for messaging ads

### Takeaway
Meta's **Conversions API for Business Messaging** accepts order-lifecycle events (`OrderCreated`, `OrderShipped`, `Purchase` and others) from WhatsApp (keyed by `ctwa_clid`), Instagram Direct (keyed by IGSID) and Messenger. Sellers running click-to-WhatsApp or click-to-Instagram-DM ads could then see which ads produced paid orders. The integration needs extra advanced permissions per channel and a Marketing API access tier.

### Cited Findings
- Channels: `messaging_channel` = `whatsapp`, `instagram` or `messenger`. Required on all events: `event_name`, `event_time`, `action_source: business_messaging`, `messaging_channel`, `partner_agent`. WhatsApp also needs `user_data.whatsapp_business_account_id` + `ctwa_clid`. Instagram needs `instagram_business_account_id` + `ig_sid`. — [Meta: CAPI for Business Messaging](https://developers.facebook.com/docs/marketing-api/conversions-api/business-messaging)
- Event names: Purchase, LeadSubmitted, InitiateCheckout, AddToCart, ViewContent, **OrderCreated, OrderShipped, OrderDelivered, OrderCanceled, OrderReturned, CartAbandoned**, QualifiedLead, RatingProvided, ReviewProvided. — [Meta: CAPI for Business Messaging](https://developers.facebook.com/docs/marketing-api/conversions-api/business-messaging)
- Permissions: WhatsApp `whatsapp_business_manage_events` (advanced), Instagram `instagram_manage_events` (advanced), Messenger `page_events`, plus the **Marketing API Access Tier** feature (the page gives conflicting thresholds of 500 or 1,500 calls in 15 days). Create a dataset with `POST /{WABA_ID}/dataset` or `/{IG_USER_ID}/dataset`, then send events to `/{DATASET_ID}/events`. Partners set `partner_agent`. — [Meta: CAPI for Business Messaging](https://developers.facebook.com/docs/marketing-api/conversions-api/business-messaging)
- Apps that already have advanced `whatsapp_business_messaging` are reportedly auto-approved for `whatsapp_business_manage_events`. — [Meta guide via search summary](https://developers.facebook.com/docs/marketing-api/conversions-api/business-messaging)
- The referral is emitted only on the first message after an ad click, so capture `ctwa_clid` once. Meta's attribution window is said to be 7 days from the click. Some events (StartTrial, AddPaymentInfo, Search, SubmitApplication) are rejected for `business_messaging` (subcode 2804066). — [Zernio docs (third-party)](https://docs.zernio.com/platforms/whatsapp/ctwa)

### Inferences
- **"Ad → DM → order" attribution** is a differentiator CartHedge can build with data it already has (an order board with status changes). Store `referral.ctwa_clid` / `source_id` on the conversation when the first message arrives, then post `OrderCreated`, `Purchase` and `OrderDelivered` events.
- On Instagram, the `messaging_referral` webhook is available with Instagram Login (Q1). Instagram CAPI uses the IGSID, which CartHedge already stores.
- Ads attribution is also the commercial case for CTWA ads, which open Meta's free entry window (already covered in the GO-LIVE doc).

### Gaps
- Whether `instagram_manage_events` works with **Instagram Login** tokens or only Facebook Login is not stated.
- Meta's official attribution window for business-messaging events is not confirmed on Meta's page.

---

## Q5. DPDP Act 2023 and DPDP Rules 2025: obligations and deadlines

### Takeaway
The DPDP Rules were notified on 13 or 14 Nov 2025. **Consent Manager registration opens about 13–14 Nov 2026**, which concerns licensed intermediaries, not CartHedge. **Notice, consent, security safeguards, 72-hour breach reporting, children's consent and data-principal rights bite about 13–14 May 2027.** MeitY floated cutting the timeline to 12 months (making it Nov 2026), but no notified amendment was found. Penalties go up to ₹250 crore. CartHedge is mainly a **data processor** for sellers' buyers and a **data fiduciary** for its own sellers' data.

### Cited Findings
- Notified as G.S.R. 846(E), gazette dated 13 Nov 2025, while some sources say published 14 Nov 2025. Rules 1, 2 and 17–21 apply immediately. **Rule 4 (Consent Managers) after 12 months.** **Rules 3, 5–16, 22 and 23 after 18 months (about 13 May 2027).** — [Hogan Lovells](https://www.hoganlovells.com/en/publications/indias-digital-personal-data-protection-act-2023-brought-into-force-); [AMS Shardul](https://www.amsshardul.com/insight/enforcement-of-the-dpdp-act-and-notification-of-the-dpdp-rules/)
- The May 2027 tranche covers notice and consent, breach reporting, reasonable security safeguards, verifiable consent for children and persons with disabilities, SDF duties, data-principal rights and cross-border transfers. Section 43A of the IT Act is repealed. — [AMS Shardul](https://www.amsshardul.com/insight/enforcement-of-the-dpdp-act-and-notification-of-the-dpdp-rules/)
- **Proposal, not law:** MeitY sought comments by 4 Feb 2026 on cutting the 18-month window to 12 months (deadline 13 Nov 2026), reportedly aimed at Significant Data Fiduciaries. No notification confirming it was found. — [SS Rana](https://ssrana.in/articles/meity-plans-to-cut-short-dpdp-compliance-timeline-and-notify-cross-border-restrictions-for-sdfs/); [Storyboard18](https://www.storyboard18.com/digital/meity-seeks-industry-views-on-fast-tracking-dpdp-act-rollout-proposes-12-month-compliance-timeline-88332.htm)
- A DPDP (Removal of Difficulties) Order 2026, dated 5 Oct 2026 and in force 6 Oct 2026, makes textual corrections to Sections 9 and 10 of the Act. It does not change commencement dates. — [India Briefing via search summary](https://www.india-briefing.com/news/dpdp-removal-of-difficulties-order-2026-consent-data-audit-47274.html/)
- **Breach (Rule 7):** notify each affected person "without delay" in plain language (what happened, likely consequences, mitigation, steps they can take, a contact). Send the Board an initial intimation without delay and a **detailed report within 72 hours** of becoming aware. The fiduciary carries the duty, and processor contracts should require prompt escalation. Penalties: up to **₹200 crore** for failing to notify a breach, up to **₹250 crore** for failing to keep reasonable security safeguards. — [King Stubb & Kasiva](https://ksandk.com/md/data-protection-and-data-privacy/dpdp-data-breach-notification-timeline/)
- **Security / logs:** all fiduciaries must keep personal data, traffic data and processing logs **for at least one year**, and processor contracts must include security terms. **Grievances** must be resolved within **90 days**. — [AMS Shardul](https://www.amsshardul.com/insight/enforcement-of-the-dpdp-act-and-notification-of-the-dpdp-rules/)
- **Consent Managers:** Board-registered, India-incorporated, net worth ≥ ₹2 crore, and must keep consent records for 7 years. — [DPDP summaries via search](https://uniqus.com/digital-personal-data-protection-act-timelines/)
- **Third Schedule erasure (3 years of inactivity, 48 h warning before deletion)** applies only to e-commerce entities with **≥ 2 crore registered users in India**, and excludes individual sellers on a marketplace. — [Storyboard18](https://www.storyboard18.com/digital/e-commerce-gaming-and-social-media-giants-can-keep-user-data-for-three-years-after-last-interaction-84202.htm); [KS&K](https://ksandk.com/md/data-protection-and-data-privacy/data-retention-deletion-dpdp-act-india/)
- Children: parental verification relies on an identifiable adult, possibly via a virtual token from an authorised entity. — [AMS Shardul](https://www.amsshardul.com/insight/enforcement-of-the-dpdp-act-and-notification-of-the-dpdp-rules/)

### Inferences
- **Features DPDP implies, all due by May 2027** (or Nov 2026 if the proposal is notified):
  1. A breach-response workflow: an internal incident log, a 72 h Board report template, and a tool that emails or WhatsApps affected sellers and buyers.
  2. Processor terms in the seller agreement, so CartHedge escalates breaches to sellers, who as fiduciaries notify buyers.
  3. **Processing logs kept for at least 1 year.** Check the current log retention on Render and Neon.
  4. A notice at every collection point (checkout already has one), with itemised purposes. Add the AI assistant's processing of DM content.
  5. A grievance or DPO contact and a 90-day resolution tracker.
  6. An age gate or parental-consent handling if sellers target minors.
- CartHedge is far below the 2 crore user mark, so the 3-year erasure schedule does not apply. The general rule applies instead: erase when the purpose ends or consent is withdrawn (COMPLIANCE.md has the 30-day abandoned-checkout purge).
- **Consent manager integration is optional**, not an obligation. It is a possible later integration once registered consent managers exist (after Nov 2026).

### Gaps
- Exact Rule 3 notice contents were not extracted from the gazette text.
- The age threshold for "child" and the verification options were not confirmed from primary text.
- The final status of the MeitY 12-month proposal and whether it covers all fiduciaries or only SDFs is unknown. Re-check before Nov 2026.

---

## Q6. Consumer Protection (E-Commerce) Rules 2020, the 2026 amendment, and dark patterns

### Takeaway
A **new amendment was notified on 9 Sep 2026 and takes effect 1 Jan 2027**. Its main changes: mandatory **yearly dark-pattern self-audits with a displayed compliance certificate**, mandatory National Consumer Helpline integration, "prior price = lowest in the last 30 days" for any discount, labelling of sponsored listings, the seller name on invoices in the same font size as the platform name, and expanded seller disclosures (country of origin, best-before, return/refund/warranty/delivery, GSTIN or MSME number). The 2020 baseline still applies: grievance officer (acknowledge within 48 h, resolve within 1 month), displayed legal identity, and no pre-ticked consent.

### Cited Findings
- **2026 Amendment Rules:** notified **9 Sep 2026** by the Department of Consumer Affairs, in force **1 Jan 2027**. The definition of "e-commerce entity" is unchanged and still excludes sellers on a marketplace. — [AZB & Partners, 18 Sep 2026](https://www.azbpartners.com/bank/rethinking-e-commerce-compliance-key-changes-under-the-consumer-protection-e-commerce-amendment-rules-2026/); [LiveLaw](https://www.livelaw.in/consumer-cases/government-amends-e-commerce-rules-to-strengthen-consumer-protection-550184)
- Duties on all e-commerce entities under the amendment:
  - The grievance officer must give the complainant a copy of the complaint as recorded (Rule 4(5)).
  - Country of origin for imported goods (4(6)).
  - **Mandatory partnership with NCH convergence** (4(7)).
  - No misleading search manipulation (4(11)(c)).
  - **Sponsored listings clearly labelled** (4(12)).
  - **Price cuts must show the prior price = lowest in the 30 days before the cut** (4(13)).
  - **Seller name on invoice in the same font size as the entity's name** (4(14)).
  - **Yearly dark-pattern self-audit plus a prominently displayed compliance certificate** (4(15)).
  
  — [AZB](https://www.azbpartners.com/bank/rethinking-e-commerce-compliance-key-changes-under-the-consumer-protection-e-commerce-amendment-rules-2026/)
- Marketplace entities must list ranking parameters in descending order of significance, display the seller's website and email where available, not use consumer data to favour related sellers without express consent, and not bundle unrelated paid services. — [AZB](https://www.azbpartners.com/bank/rethinking-e-commerce-compliance-key-changes-under-the-consumer-protection-e-commerce-amendment-rules-2026/)
- Sellers must give the platform **country of origin, best-before/use-before, return, refund, exchange, warranty, delivery, return-shipping cost and payment-mode info** (6(5)(d)) and **any Central Government ID such as GSTIN or MSME number** for display (6(5)(j)). Inventory entities add best-before dates (7(1)(a)). — [AZB](https://www.azbpartners.com/bank/rethinking-e-commerce-compliance-key-changes-under-the-consumer-protection-e-commerce-amendment-rules-2026/)
- **2020 baseline:** every e-commerce entity must set up a grievance mechanism and a grievance officer who **acknowledges complaints within 48 hours and resolves them within 1 month**, with the officer's name, contact and designation displayed. It must also display its legal name, HQ and branch addresses, website, and customer-care and grievance contacts. — [IndiaLaw summary](https://www.indialaw.in/blog/civil/consumer-protection-e-commerce-rules/); [Desi Kaanoon](https://desikaanoon.in/analysis-of-consumer-protection-e-commerce-rules-2020)
- **Dark patterns:** the CCPA's 2023 Guidelines list 13 prohibited patterns, including false urgency, basket sneaking, subscription traps and drip pricing. On **5 Jun 2025** the CCPA advised all e-commerce platforms to **self-audit within 3 months** and file self-declarations. Rule 4(9) of the 2020 Rules requires explicit, affirmative consent and bars pre-ticked boxes. — [TaxGuru](https://taxguru.in/corporate-law/ccpa-mandates-e-commerce-self-audits-dark-patterns.html); [IndiaLaw](https://www.indialaw.in/md/blog/civil/ccpas-dark-patterns-mandates-self-audit/); [Morung Express](https://morungexpress.com/ccpa-directs-e-commerce-firms-to-self-audit-within-3-months-to-find-dark-patterns)

### Inferences
- **Who is the "e-commerce entity"?** A seller running a CartHedge storefront that sells its own stock looks like an **inventory e-commerce entity**. CartHedge, as software hosting many sellers' storefronts on carthedge.in, could be argued to be a **marketplace e-commerce entity**, especially if it shows any cross-seller discovery. The test turns on the unchanged definition. **Lawyer question.**
- **Features this implies (most due 1 Jan 2027):**
  1. Storefront "About / legal" block per seller: legal name, address, customer care, grievance officer, GSTIN/MSME.
  2. Per-product country of origin and best-before. MRP, origin and maker already exist per MEMORY; add best-before.
  3. Return, refund, exchange, warranty and delivery policy fields shown before purchase.
  4. Compare-at price validation: struck-through "was" prices must equal the lowest price in the previous 30 days, which needs a price-history table.
  5. Invoices with the seller name at least as large as "CartHedge".
  6. A dark-pattern self-audit of checkout (no pre-ticked boxes, no fake urgency or scarcity counters, no drip-priced COD or shipping fees), with a certificate CartHedge can show and let sellers show.
  7. A complaint tracker that sends the complainant a copy, acknowledges within 48 h and resolves within 1 month.
  8. A "Sponsored" label if CartHedge ever runs paid placement.
- The grievance-officer data overlaps with Meta's India `business_compliance_info` (Q2), so one form can feed both.

### Gaps
- The gazette number and full text of the 2026 Amendment were not read. Details come from AZB's summary.
- How the Rules apply to sellers transacting purely in Instagram or WhatsApp DMs, with no website, is not addressed by any source found.
- What the NCH convergence obligation means operationally for small entities is not covered.

---

## Q7. Product-label obligations: Legal Metrology and FSSAI

### Takeaway
E-commerce listings of pre-packaged goods must show the Legal Metrology Rule 6(1) declarations online: maker, packer or importer name and address, country of origin, generic name, net quantity, manufacture date, best-before, MRP. A **draft rule (Nov 2025) proposes a searchable "country of origin" filter**, reportedly from 1 Jul 2027, but its final status is unconfirmed. Food sellers fall under FSSAI's Dec 2024 e-commerce advisory: **at least 30% or 45 days of shelf life at delivery**, and no listing without a displayed FSSAI licence or registration.

### Cited Findings
- Rule 6(10) of the Legal Metrology (Packaged Commodities) Rules 2011, added by the 2017 amendment and effective 1 Jan 2018, requires e-commerce entities to display the Rule 6(1) declarations: manufacturer, packer or importer name and address, country of origin, common or generic name, net quantity, manufacture date, best-before or use-by, MRP, dimensions and so on. It covers both inventory and marketplace models. — [S.S. Rana](https://ssrana.in/articles/compliances-for-website-e-commerce-website/); [Lakshmikumaran & Sridharan](https://www.lkslaw.com/insights/articles/aiming-greater-transparency-on-sale-of-packaged-commodity-online); [Mondaq/Khaitan](https://admin.mondaq.com/india/commoditiesderivativesstock-exchanges/662702/e-commerce-entities-legal-metrology-packaged-commodities-amendment-rules-2017)
- The draft Legal Metrology (Packaged Commodities) (Second) Amendment Rules 2025 (10 Nov 2025) propose a searchable and sortable country-of-origin filter on e-commerce platforms. One commentary says it applies from 1 Jul 2027. — [Saraf & Partners](https://sarafpartners.com/?p=43283); [search summary of 2026 amendment coverage](https://www.manoramayearbook.in/current-affairs/india/2026/09/11/govt-amends-e-commerce-rules.html)
- FSSAI advisory (Dec 2024): food delivered must have **at least 30% shelf life or 45 days** before expiry. **No e-commerce FBO may list a seller without displaying its valid FSSAI licence or registration.** Online claims must match the physical label. Food and non-food should be delivered separately. — [FSSAI advisory PDF](https://fssai.gov.in/upload/advisories/2024/12/674efa161d756Adobe%20Scan%203%20Dec%202024.pdf); [IndiaLaw](https://indialaw.in/blog/food/fssai-food-safety-e-commerce-impacts); [Lexplosion](https://lexplosion.in/fssai-issues-advisory-for-e-commerce-fbos-to-strengthen-food-safety-ecosystem-prohibits-unregistered-sellers-on-e-commerce-food-platforms/)

### Inferences
- Features:
  1. Per-category required fields: packaged goods get net quantity, manufacture date and best-before. Food sellers get a **mandatory FSSAI licence number shown on the storefront and invoices**, and the assistant and listings refuse food products without one.
  2. Shelf-life checks for food at dispatch.
  3. A storefront filter by country of origin for multi-seller pages, if the 2025 draft is finalised.
- Handmade and unpackaged fashion goods may fall outside "pre-packaged commodity" declarations. COMPLIANCE.md already flags this for a lawyer.

### Gaps
- Final notification status of the 2025 Legal Metrology draft (the country-of-origin filter) was not confirmed.
- No FSSAI e-commerce update after Dec 2024 was found.

---

## Q8. GST: registration, e-invoicing, TCS, and whether CartHedge is an e-commerce operator (ECO)

### Takeaway
CartHedge is likely an "ECO" by the platform definition, but **Section 52 TCS (0.5%) only applies when the ECO collects payment for the supply**. CartHedge's sellers collect directly through their own Razorpay or UPI, so TCS should not apply as long as CartHedge never collects buyer money. Most small sellers are **not affected by e-invoicing**: it is B2B only, at ≥ ₹5 crore aggregate annual turnover. But **any seller shipping goods to another state needs GST registration from the first rupee**. The 2023 relief for unregistered sellers covers only intra-state sales through a TCS-collecting ECO, which CartHedge is not.

### Cited Findings
- **ECO definition:** under CGST s.2(45), anyone who owns, operates or manages a digital platform for e-commerce, whether or not they sell. **s.52 TCS** applies when the ECO collects the consideration for supplies through its platform. Sellers selling their own goods on their own website are outside s.52 (GST Council FAQ). — [Masters India](https://www.mastersindia.co/books/indian-gst-a-comprehensive-guide/e-commerce-and-gst/); [GST Council TCS FAQ](https://www.gstcouncil.gov.in/sites/default/files/2024-02/faqs_tcs.pdf)
- TCS rate cut from 1% to **0.5% from 10 Jul 2024** (Notification 15/2024): 0.25% CGST + 0.25% SGST, or 0.5% IGST. — [TaxGarden](https://taxgarden.in/blog/gst-on-ecommerce-operators-tcs-section-52-india-2026)
- No authority found on whether a SaaS that does not touch funds is an ECO. **Inference only.** — [Grant Thornton (context)](https://www.grantthornton.in/insights/blogs/e-commerce-under-gst-dispelling-the-mist/)
- **Notification 34/2023-CT** (from 1 Oct 2023): unregistered goods suppliers may sell through a **TCS-collecting ECO** if under the state threshold, intra-state only, in one state, with PAN and enrolment. ECOs report these sales in GSTR-8 and collect no TCS (Notification 37/2023). — [Taxmann](https://taxmann.com/post/blog/no-gst-registration-required-for-small-dealers-to-supply-goods-through-ecos-notification); [TaxHeal](https://www.taxheal.com/notifcation-no-34-2023-central-tax-gst-registration-exemption-to-seller-making-supplies-of-goods-through-an-electronic-commerce-operator.html)
- **Inter-state supply of goods requires registration regardless of turnover** (CGST s.24). GTRI has urged extending small-seller relief to inter-state e-commerce, so far without adoption. — [Outlook Business / GTRI](https://www.outlookbusiness.com/news/exempt-small-suppliers-making-inter-state-supplies-on-e-commerce-platforms-from-gst-registration-gtri-news-301848); [TaxGuru FAQ](https://taxguru.in/goods-and-service-tax/applicability-gst-registration-india-faq.html)
- **E-invoicing:** mandatory for **B2B** above ₹5 crore AATO (since 1 Aug 2023). The 30-day IRN reporting limit applies at ≥ ₹10 crore AATO (most sources: from 1 Apr 2025; one says 1 Apr 2026, **conflicting**). B2C invoices need a dynamic QR only above ₹500 crore. B2C e-invoicing is still pilot or proposal. — [StartupTalky](https://startuptalky.com/e-invoice-limit-gst-india-guide/); [Fiscal Requirements](https://www.fiscal-requirements.com/news/3818-indias-gst-e-invoicing-update-30-day-deadline-and-b2c-expansion); [TheMunim](https://themunim.com/govt-makes-gst-e-invoicing-mandatory-for-companies-with-rs-5-crore-sales)

### Inferences
- **Keep money seller-direct.** If CartHedge ever collects buyer payments centrally and settles to sellers (a "CartHedge Pay" wallet), that would trigger s.52 TCS and GSTR-8 filing, income-tax s.194-O / s.393 TDS (Q9), and RBI payment-aggregator authorisation (Q10). This is the strongest regulatory argument for the current seller-own-gateway model.
- **Feature:** an onboarding check that asks "Do you ship outside your state?" and warns that GST registration is required, with bill-of-supply versus tax-invoice logic (already built). Optionally block inter-state shipping for sellers without a GSTIN, or at least warn.
- **E-invoicing (IRN via IRP API)** is a Pro-plan feature for larger D2C sellers with B2B sales above ₹5 crore AATO. It does not matter for the core segment.

### Gaps
- No CBIC clarification or advance ruling found on SaaS storefront builders and ECO status.
- Whether the 30-day IRN limit was extended below ₹10 crore in 2026 is unconfirmed.

---

## Q9. Income-tax s.194-O (now s.393(1) under the Income-tax Act 2025)

### Takeaway
TDS on e-commerce payments falls on the operator that pays or credits sellers. **0.1%** of gross sales since 1 Oct 2024. It reportedly moved to **s.393(1) of the Income-tax Act 2025 from 1 Apr 2026**, which is unconfirmed beyond one blog. **It does not apply to CartHedge while sellers are paid directly by buyers.**

### Cited Findings
- The s.194-O TDS rate was cut from **1% to 0.1% from 1 Oct 2024**, on the gross amount of sales or services facilitated. — [TaxGuru](https://taxguru.in/income-tax/section-194-o-amendment-lower-tds-rate-e-commerce-payments.html); [Taxmann](https://www.taxmann.com/post/blog/tds-on-payment-by-e-commerce-operator-to-participants-section-194-o)
- There is a ₹5 lakh per-year threshold for resident individual and HUF sellers (secondary source). — [Taxmann via search summary](https://www.taxmann.com/post/blog/tds-on-payment-by-e-commerce-operator-to-participants-section-194-o)
- Under the **Income-tax Act 2025, effective 1 Apr 2026**, s.194-O is mapped to **s.393(1) [Table Sl. No. 8(v)]**, filed in Form 26Q. **Single-source, unconfirmed.** — [TDSMan blog, 2026](https://blog.tdsman.com/2026/07/tds-on-e-commerce-transactions-section-3931-194o/)

### Inferences
- No action is needed today. It becomes relevant only if CartHedge starts collecting and settling seller sales (see the Q8 inference).

### Gaps
- Official text of the Income-tax Act 2025 and its rate and threshold for s.393(1) were not checked.

---

## Q10. RBI payment-aggregator rules and TRAI/DLT for SMS

### Takeaway
RBI's **Payment Aggregator Master Direction (15 Sep 2025)** requires authorisation, ₹15 crore net worth rising to ₹25 crore, and escrow for any non-bank that pools and settles merchant funds. It **bars PAs from running marketplaces**. Payment gateways that do not touch funds stay outside it, and so does CartHedge's model of the seller's own Razorpay key. For SMS OTP or alert fallbacks, TRAI requires DLT registration. **URLs and callback numbers in SMS must be whitelisted** (from Sept 2024). Header suffixes (-P, -S, -T, -G) are reportedly appended since May 2025.

### Cited Findings
- **RBI Master Direction on Regulation of Payment Aggregators**, RBI/DPSS/2025-26/141, dated **15 Sep 2025**. It consolidates and supersedes the 2020/2021 PA-PG guidelines and the 2023 cross-border directions, and defines PA-O, PA-P and PA-CB. — [RBI](https://rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12896); [IndiaCorpLaw](https://indiacorplaw.in/2025/10/09/decoding-rbis-overhaul-of-the-payment-aggregator-directions/)
- Non-bank PAs need **₹15 crore net worth at application and ₹25 crore by the end of the 3rd financial year**, must be Companies Act companies, must keep escrow, and must do merchant due diligence under the KYC Direction. — [Lexplosion](https://lexplosion.in/rbi-issues-new-master-directions-to-consolidate-all-regulations-related-to-payment-aggregators-effective-immediately/); [Treelife](https://treelife.in/?p=16415)
- PAs may aggregate funds only for merchants they have a contract with, are **prohibited from running marketplaces**, and **payment gateways stay outside licensing**. Small merchants get proportionate due diligence (contact point verification, PAN, one document, CKYCR first). — [IndiaCorpLaw](https://indiacorplaw.in/2025/10/09/decoding-rbis-overhaul-of-the-payment-aggregator-directions/)
- PA-P applications were due 31 Dec 2025, with wind-down by 28 Feb 2026 for those that did not apply. — [Lexplosion](https://lexplosion.in/rbi-master-direction-2025-compliance-mandate-for-payment-aggregators-and-pa-p-deadline/)
- **TRAI:** from 1 Sep 2024 (direction of 20 Aug 2024), SMS traffic containing **non-whitelisted URLs, APKs, OTT links or callback numbers is blocked**. — [TRAI Direction 20 Aug 2024](https://trai.gov.in/sites/default/files/Direction_20082024.pdf)
- Under the TCCCPR 2025 amendment, operators reportedly add header suffixes **-P (promotional), -S (service), -T (transactional), -G (government)** from 6 May 2025, based on the DLT template type. — [SMS Alert KB (vendor)](https://kb.smsalert.co.in/?p=2270)

### Inferences
- CartHedge stays outside PA regulation as long as funds go **buyer → seller's own gateway or UPI**, and CartHedge only charges sellers for subscriptions (through Razorpay as CartHedge's own merchant). A "managed payments" feature would need partnership with a licensed PA (Razorpay Route or a similar split-settlement product). CartHedge must not hold funds itself.
- An **SMS OTP fallback** (for username-only WhatsApp users, Q3, or WhatsApp outages) needs:
  1. DLT entity registration.
  2. A header.
  3. Transactional and service templates.
  4. **carthedge.in tracking-link URLs whitelisted.**
  
  INTEGRATIONS.md §3 already notes DLT. This adds the URL-whitelisting requirement.

### Gaps
- The TCCCPR 2025 amendment text (header suffixes) was not verified on trai.gov.in.
- The PA Direction's exact escrow settlement timelines and treatment of Razorpay Route-style split payments for platforms were not extracted.
