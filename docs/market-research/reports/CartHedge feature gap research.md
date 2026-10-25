# Build where Meta's free agent stops

CartHedge's next features should stop the money sellers lose after a buyer says yes: courier failures, COD returns and unverified payments. It should also fill a short list of gaps that competitors treat as standard: comment-to-DM, voice notes, screenshot matching and ad attribution. The reason is that Meta now gives away the part CartHedge used to lead with. Meta's Business AI went live in the free WhatsApp Business app in India in May 2026, and its Business Agent launched in June, free to start with paid tiers promised later. "AI that answers DMs in the buyer's language" is no longer something a small seller pays for. The order desk, COD/RTO control, GST paperwork and the courier loop still are. Four deadline items come before any growth work. First, CartHedge must support WhatsApp business-scoped user IDs before the own-number launch, because its webhook parser keys every WhatsApp buyer on the phone field that Meta now leaves out for buyers who use usernames. Second, it must ship the Consumer Protection (E-Commerce) Amendment changes before they take effect on 1 Jan 2027; the 30-day lowest-price rule applies to the storefront's struck-through compare-at prices. Third, it needs DPDP breach, log and notice plumbing by 13 May 2027, with the cheap parts done by 13 Nov 2026 in case the government brings the date forward. Fourth, it must require an FSSAI licence from food sellers, which the rules already demand today. After those, the growth order runs in four steps. The first is the WhatsApp launch, together with voice-note and screenshot understanding, comment-to-DM and an in-chat prepaid nudge. The second is the after-dispatch loop: courier sync, failed-delivery chats, address checks and COD-remittance reconciliation. The third is the paid-tier features the panel demanded: staff roles with a CA seat, GSTR-1/Tally export and a team inbox. The fourth is trust and retention. Almost everything costs paise per use; only AI image and video generation needs credits. Of 37 recommended items, 17 are new, 3 extend existing backlog items and 17 are already in [FEEDBACK.md](../FEEDBACK.md) or [FEATURE-GAPS.md](../../FEATURE-GAPS.md). The evidence has one big weakness. No independent survey of Indian DM sellers exists, Reddit could not be reached, and most impact figures come from vendors. The strongest signals are therefore Meta's own documentation, regulators, and Indian merchants' dated app-store complaints. The simulated panel produces hypotheses, not customer data.

## Meta's free agent moves the fight past the reply

Meta has turned the core of CartHedge's pitch into a free feature. **Business AI on WhatsApp was announced for Indian small businesses on 14 May 2026.** Sellers set it up from the Tools tab of the free WhatsApp Business app. It answers questions on products, pricing, discounts and shipping from the business's catalog and profile, recommends products, captures leads, and lets the owner take over any chat. Meta says it works in all native Indian languages, lists in-chat UPI payments as coming soon, and gives no price ([Meta Newsroom](https://about.fb.com/news/2026/05/introducing-business-ai-on-whatsapp-for-small-businesses-in-india/)). **Meta Business Agent followed on 3 June 2026.** It is free to switch on, Meta says tiered pricing will arrive "within months", and Meta claims more than a million businesses already run it. An enterprise version connects to Shopify and Zendesk ([TechWire Asia](https://techwireasia.com/2026/06/meta-business-agent-whatsapp-southeast-asia/); [WhatsApp Business blog](https://whatsappbusiness.com/blog/introducing-meta-business-agent-ai/)). The India launch at WhatsApp's Mumbai summit in July reportedly added summaries of missed conversations (search summary of [UNI India](https://www.uniindia.com/whatsapp-unveils-meta-business-agent-for-businesses-in-india/business-economy/news/3902347.html)). Businesses calling the agent through the API pay about **4–5 US cents (about ₹4–5) per message from 1 Aug 2026** ([Meta developer docs](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages)). CartHedge's own model puts an AI turn at about ₹0.11–0.21 ([cost model](../research_notes/CartHedge%20pricing%20market%20research/cost_to_serve_model.md)). So CartHedge is far cheaper than Meta's API agent per reply. For a seller on the free app, though, the ceiling price for replies is zero.

The strategic consequence is to move the pitch from "AI replies to DMs" to **"AI that runs the order after the reply"**. Meta's announcement covers answering, recommending and lead capture. It says nothing of order capture with code-checked totals, a storefront and checkout, COD confirmation or RTO control, GST invoices and credit notes, courier handoff, or returns, and CartHedge already has all of these. One competitor's review also lists no team inbox, API, webhooks or lead export in the free agent ([Hyperleap](https://hyperleap.ai/blog/meta-business-agent-india-launch-what-it-means), a competitor blog, so weak evidence). Independent critics call its handling of mixed-language chat unproven and its checkout unclear ([TechWire Asia](https://techwireasia.com/2026/06/meta-business-agent-whatsapp-southeast-asia/)). In practice the AI's job becomes this: turn whatever the buyer sends (a voice note, a screenshot, a comment) into a structured order, confirm COD or switch it to prepaid, raise the invoice, hand the parcel to the courier, and rescue it if delivery fails.

The strongest counter-argument is that Meta can close part of this gap quickly. In-chat UPI is announced. India already has native WhatsApp `order_details` "review and pay" messages and `order_status` updates ([360dialog docs](https://docs.360dialog.com/partner/messaging/payments-india-only/receive-whatsapp-payments-via-payment-links)). The enterprise agent already talks to Shopify. "The AI closes the sale in chat" is therefore an edge that will fade. The lasting edges are the ones Meta is unlikely to build for a seller who pays it nothing:

- GST paperwork
- COD and RTO economics
- the courier dispute loop
- one stock count across Instagram, WhatsApp and the storefront
- buyer money landing in the seller's own Razorpay with no cut

Instagram coverage is a near-term edge, because sources disagree on whether Business Agent runs on Instagram yet ([Hyperleap](https://hyperleap.ai/blog/meta-business-agent-india-launch-what-it-means)). Meta's pricing decision cuts both ways. A paid small-business tier gives CartHedge's AI allowance a ceiling to price under. A permanently free agent caps reply pricing at zero, so CartHedge's AI allowance has to be justified by orders captured and RTOs avoided, not by replies sent.

Four practical rules follow. The own-number WhatsApp launch is still the biggest conversion lever on the simulated panel: **6 of 8 "maybe" votes depend on it** ([VOTE-RESULTS.md](../VOTE-RESULTS.md)). It is now table stakes, though, so launch messaging should lead with what happens after the reply. CartHedge must also coexist with the native Business AI on Coexistence numbers. Whether both can answer on one number is unverified, so onboarding needs an explicit "turn off Business AI" step and a test with Meta or YCloud. Image and voice understanding are visible differentiators, because Meta's announcement mentions neither. Finally, Meta gives missed-chat summaries away free, so a daily seller summary has become table stakes rather than a premium extra.

## Four deadlines outrank every growth feature

These items are not bets. Each either breaks something or creates legal exposure on a known date, and none of them belongs behind a plan tier.

| Item | Date | What it requires | CartHedge today | Fix | Effort | Backlog |
|---|---|---|---|---|---|---|
| WhatsApp business-scoped user IDs (BSUIDs) and usernames | Already in webhooks since Apr 2026; usernames rolling out through 2026; must be done before the own-number launch | Accept messages that carry no phone number; send by BSUID; auth templates cannot go to a BSUID | Parser keys WhatsApp buyers only on `from`; reads no `user_id` | Store the BSUID on conversations and customers, send by BSUID, use "Share Contact Info" before drafting a COD order, keep the phone at storefront checkout | S–M | NEW |
| Consumer Protection (E-Commerce) Amendment Rules 2026 | In force 1 Jan 2027 | "Was" price must be the lowest price of the past 30 days; grievance officer details; seller name on the invoice as large as the platform's; best-before; GSTIN/MSME display; yearly dark-pattern self-audit and certificate | Storefront strikes through a compare-at price with a % off; policy page shows legal name and GSTIN, no grievance officer; no best-before field | Price-history table, or strike through only the MRP; legal block per store; invoice template check; checkout audit | M | Mostly NEW (legal identity is in FEEDBACK) |
| DPDP Rules 2025 | Main duties 13 May 2027; 13 Nov 2026 if the proposed pull-forward is notified | 72-hour breach report; processing logs kept at least 1 year; itemised notice; grievances resolved within 90 days | Seller export/delete and buyer erase done; lawyer review open | Breach runbook, processor terms, log retention, notice covering AI processing of DMs, grievance tracker | M | Mostly NEW (FG 5.2 done) |
| FSSAI e-commerce advisory | In force since Dec 2024 | No food listing without a displayed FSSAI licence; at least 30% or 45 days of shelf life at delivery | No FSSAI field anywhere in the code | Require an FSSAI number for food stores, show it on the storefront and invoices, and have the AI refuse unlicensed food listings | S | FEEDBACK |

**The BSUID change is the most urgent, because it breaks the feature the panel wants most.** Meta began adding business-scoped user IDs to every WhatsApp webhook in early April 2026. Businesses could claim usernames from 29 June, and sending to a BSUID has worked since July. When a buyer adopts a username, the phone number in `from` and `wa_id` is left out unless that business number exchanged a message or call with them in the past 30 days, or the buyer is in the business's contact book. Meta says BSUID support "is required" and warns that integrations without it may be unable to process messages. It gives no hard date ([Meta: Business-scoped user IDs](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids)). Meta's authentication templates (one-tap, zero-tap and copy-code) cannot be sent to a BSUID, so CartHedge's phone-OTP checkout must keep asking for a phone. The AI should send the fixed "Share Contact Info" button before drafting a COD order. CartHedge's [webhook parser](../../../backend/internal/messaging/client.go) sets the buyer key to `m.From` and reads no `user_id` or `from_user_id`. A username-only buyer would therefore arrive with an empty buyer ID, which can be neither stored nor replied to. The [webhook tests](../../../backend/internal/messaging/webhook_test.go) only cover payloads that include a phone number. Meta keeps phone data for at most 30 days, so a returning buyer can also look like a new thread, and matching customers across Instagram, WhatsApp and the storefront will need a BSUID-to-phone map. How YCloud's partner webhook carries BSUIDs has not been checked. That check belongs on the launch checklist.

**The Consumer Protection amendment lands in under three months.** It was notified on 9 Sep 2026 and takes effect on 1 Jan 2027 ([AZB & Partners](https://www.azbpartners.com/bank/rethinking-e-commerce-compliance-key-changes-under-the-consumer-protection-e-commerce-amendment-rules-2026/); [LiveLaw](https://www.livelaw.in/consumer-cases/government-amends-e-commerce-rules-to-strengthen-consumer-protection-550184)). Its main duties are:

- **any price cut must show the lowest price of the previous 30 days as the "prior price"**
- clearly labelled sponsored listings
- the seller's name on invoices in the same font size as the platform's name
- **a yearly dark-pattern self-audit with a compliance certificate on display**
- mandatory tie-up with the National Consumer Helpline
- the complainant receives a copy of the complaint as recorded
- sellers' country of origin, best-before date, return, refund, warranty and delivery terms, and GSTIN or MSME number shown

The 2020 baseline still applies on top: a named grievance officer who acknowledges complaints within 48 hours and resolves them within a month ([IndiaLaw](https://www.indialaw.in/blog/civil/consumer-protection-e-commerce-rules/)). In the code, the [storefront product card](../../../frontend/src/store-front/storefront/ProductCard.tsx) strikes through the MRP, or a seller-entered compare-at price when there is no MRP, and shows a percentage discount. The 30-day rule is aimed at exactly that pattern. The cheapest compliant option is to strike through only the MRP, which is the legal reference price under the Legal Metrology rules, until a price-history table exists. The [store policies page](../../../frontend/src/store-front/policies/StorePoliciesPage.tsx) already shows the legal name and GSTIN but has no grievance officer, and the code has no best-before field. One open legal question decides how much applies to CartHedge itself. A seller selling its own stock looks like an inventory e-commerce entity. CartHedge, hosting many storefronts on carthedge.in, could be argued to be a marketplace entity, especially if it ever adds discovery across sellers. A lawyer should answer this before December. The same grievance and customer-care fields are what Meta requires from Indian businesses before they can send WhatsApp product messages ([360dialog](https://docs.360dialog.com/partner/commerce-and-payments/products-and-catalogs/india-businesses-compliance-for-commerce)), so one settings form can serve the law, Meta and buyer trust.

**DPDP has a firm date and a possible earlier one.** The Rules were notified on 13–14 Nov 2025. Consent-manager registration opens after 12 months, which affects licensed intermediaries, not CartHedge. Notice, consent, security safeguards, breach reporting and data-principal rights apply after 18 months, around **13 May 2027** ([Hogan Lovells](https://www.hoganlovells.com/en/publications/indias-digital-personal-data-protection-act-2023-brought-into-force-); [AMS Shardul](https://www.amsshardul.com/insight/enforcement-of-the-dpdp-act-and-notification-of-the-dpdp-rules/)). MeitY sought comments on shortening that window to 12 months, reportedly aimed at Significant Data Fiduciaries. No notification making it law was found ([SS Rana](https://ssrana.in/articles/meity-plans-to-cut-short-dpdp-compliance-timeline-and-notify-cross-border-restrictions-for-sdfs/)). The obligations are:

- notify the Data Protection Board within **72 hours** of a breach, with fines of up to ₹200 crore for failing to notify and up to ₹250 crore for weak safeguards ([King Stubb & Kasiva](https://ksandk.com/md/data-protection-and-data-privacy/dpdp-data-breach-notification-timeline/))
- keep processing logs for at least one year
- resolve grievances within 90 days

CartHedge is mostly a processor for its sellers' buyers and a fiduciary for its own sellers' data. The breach runbook, the processor terms in the seller agreement and the log-retention settings are a few days of paperwork and configuration. Doing them before 13 Nov 2026 is cheap insurance against the earlier date.

**FSSAI is not a future deadline; it applies now.** FSSAI's December 2024 advisory bars e-commerce food businesses from listing any seller that does not display a valid FSSAI licence or registration. It also requires at least 30% or 45 days of shelf life at delivery ([FSSAI advisory](https://fssai.gov.in/upload/advisories/2024/12/674efa161d756Adobe%20Scan%203%20Dec%202024.pdf)). The code has no FSSAI field, and the panel's food sellers asked for one on invoices.

Three smaller dates belong on the same calendar. Indian WhatsApp business accounts reportedly must move to INR billing by 31 Dec 2026, or delivery stops ([Monty Mobile](https://montymobile.com/blogs/whatsapp-business-api-pricing-in-india-inr-rates-gst-and-the-2026-currency-migration-deadline/), search summary only; check with YCloud). The configured Gemini 3.6 Flash failover doubles in price on 1 Jan 2027 ([Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)); the switch to Flash-Lite is already in FEEDBACK's cost list. Meta's paid Business Agent tiers are due "within months" and will reset the reply-price ceiling when they arrive.

## Sellers lose money after dispatch, not in the inbox

The best-evidenced and costliest pains all happen after the chat ends. **COD orders returned to origin at 26% in FY25 against under 2% for prepaid. COD return rates reached about 58% in the FY2026 festive quarter. A bounced ₹1,000 COD order costs a seller roughly ₹200–250** ([Angadi Labs](https://www.angadilabs.com/blog/india-fashion-ecommerce-benchmarks), compiling Shipway, Unicommerce and GoKwik). These are vendor figures from D2C brands. DM-first micro-sellers are probably worse off, but no data on them was found. Indian merchants reviewing COD-confirmation apps credit them with stopping fake orders ([Shopify App Store: Hillteck Verify COD](https://apps.shopify.com/reviews/1311627)). One merchant reports that asking for 10% upfront on COD stopped most fake orders (search summary of [Shopify App Store reviews](https://apps.shopify.com/reviews/686349)). The panel's buyer accepts a ₹30–50 token only if it is taken off the bill and refunded automatically ([FEEDBACK.md](../FEEDBACK.md)). For a 500-order seller with half the orders on COD, cutting COD RTO by five points avoids about 12 returns, worth roughly **₹2,500–3,100 a month, about twice Growth's ₹1,299**. That is the strongest ROI story CartHedge can tell.

Courier failures are the theme the simulated panel missed entirely, and they have the most real seller testimony. Eight dated one-star reviews of Shiprocket by Indian merchants, from November 2025 to June 2026, describe:

- weight disputes deducted from wallets
- RTO parcels that never came back
- tracking that never updates
- tickets closed without a fix
- failed delivery attempts marked when, as one seller put it, "no call was received by the customer even once"

([Shopify App Store: Shiprocket reviews](https://apps.shopify.com/shiprocket/reviews?ratings%5B%5D=1&page=2)). COD payouts run on a D+8 cycle, and early payout costs 0.49–0.99% ([Shiprocket support](https://support.shiprocket.in/support/solutions/articles/43000463560)). Aggregators can trigger a return automatically after two or three failed attempts, so failed-delivery reports need same-day action ([iCarry](https://www.icarry.in/pages/blog/instagram-shipping-guide-cut-rto-social-sellers.html)). CartHedge creates the Shiprocket shipment but marks delivered and RTO by hand (FG 3.4). Every after-dispatch fix waits on that sync.

Payment verification is the third leak. Edited "payment successful" screenshots and fake UPI apps target small sellers, and the only real proof is money in the seller's account matched by UTR ([PhonePe Business](https://business.phonepe.com/articles/fake-upi-payment-scams-how-to-identify-and-prevent-fraud)). CartHedge already records the UTR a buyer submits after a direct UPI payment ([payment service](../../../backend/internal/payment/service.go)), but the seller still checks it by hand against their bank. Matching against an uploaded statement would close the loop. So would making "a screenshot is not payment" the AI's default stance.

Below these sit second-tier pains, each with a cheap answer:

- **Reply load is real but becoming a commodity.** Kantar finds 91% of online Indian adults chat with a business every week ([Meta Newsroom](https://about.fb.com/news/2026/05/introducing-business-ai-on-whatsapp-for-small-businesses-in-india/)), but Meta now handles the basic questions for free.
- **Account bans are rare but catastrophic.** One D2C founder estimated losses above ₹10 lakh when Meta disabled his Business Manager, and four businesses sued Meta in 2026 ([MediaNama](https://www.medianama.com/2026/09/223-meta-disabled-business-manager-accounts-india/)). That argues for marketing the fact that a CartHedge store and buyer list survive an Instagram ban; the export already exists.
- **Tax fear is spreading.** Karnataka sent GST notices to small traders based on total UPI receipts in July 2025 ([Angel One](https://www.angelone.in/news/economy/upi-gst-notices-in-karnataka-worry-small-traders)). Shipping goods to another state requires GST registration from the first rupee ([TaxGuru](https://taxguru.in/goods-and-service-tax/applicability-gst-registration-india-faq.html)). A dashboard tracker comparing turnover with the GST threshold, plus a warning before inter-state shipping without a GSTIN, is cheap reassurance.
- **Buyer distrust drives COD demand.** Online shopping fraud is the scam Indians report most, messaging apps are involved in 42% of scams ([NewsBytes on GSMA](https://www.newsbytesapp.com/news/india/gsma-report-online-shopping-fraud-most-common-scam-in-india/tldr)), and two in three chat users in India do not yet shop online ([Bain & Flipkart](https://storage.googleapis.com/flipkart-stories-media/How_India_Shops_Online_2026_060094273e/How_India_Shops_Online_2026_060094273e.pdf)). An earned verified badge and reviews address this.
- **Size causes more than 40% of fashion returns** ([India Retailing](https://www.indiaretailing.com/2024/08/18/brands-could-lose-20-30-billion-in-revenue-to-returns-by-2025-report)), which favours making exchange, not refund, the default.

### How much weight each source deserves

| Evidence type | What it covers here | Weight |
|---|---|---|
| Primary platform and legal sources | Meta developer docs, the FSSAI advisory, the RBI direction, law-firm summaries of notified rules | High on what is required or possible; silent on demand |
| Indian sellers' own words | Dated Shopify App Store reviews (Shiprocket, COD apps), MediaNama ban reporting, Karnataka GST coverage | Real but small and self-selected; shows which pains exist, not how common they are |
| Industry and vendor data | RTO and COD rates, prepaid-nudge and RTO-cut claims (Razorpay, Shiprocket), loyalty and photo-review case studies | Directional only; produced by companies selling the fix; no control groups |
| Competitor coverage | How many of about 13 chat tools and the storefront and billing apps ship a feature, and at what tier | Good for spotting table stakes; says nothing about value |
| Simulated panel | 16 personas in FEEDBACK.md and VOTE-RESULTS.md | Hypotheses, not customers |

Some recommended items rest on the panel alone, with no real-world evidence found: Tally/GSTR-1 export, Shopify sync and an API, wholesale tiers, blind dropship slips, regional-language dashboards, delivery slots with daily capacity, and the agency programme. They stay on the list because competitors or billing apps treat them as standard, or because a named panel deal depends on them. They should be checked in seller interviews before large builds. CartHedge can also produce the India data that is missing everywhere. Its webhook logs can count voice and image messages per seller. A 10% holdout can measure the prepaid nudge, and the courier sync can measure how many failed deliveries a chat rescues.

## Competitors give away comment-to-DM and charge for teams

Across about 13 Indian chat-commerce tools, these features count as table stakes:

| Feature | Tools that ship it |
|---|---|
| Comment-to-DM (including Instagram-only tools) | ~12 |
| Shared inbox | ~11 |
| AI agent | ~11 |
| Broadcasts | ~10 |
| Shopify integration | ~10 |
| Flow builder | ~9 |
| Click-to-WhatsApp (CTWA) ad attribution | ~7 |
| WhatsApp catalog messages | ~7 |
| API and webhooks | ~7 |

CartHedge lacks comment-to-DM, ad attribution, a multi-agent inbox, native catalog and cart messages, an API and webhooks, and Shopify sync. **Comment-to-DM is the most conspicuous gap because it costs nothing elsewhere.** BotSpace's free plan includes Instagram comment, story-mention, Reels and Live automation, plus CTWA, catalogs, payments and WhatsApp Flows ([BotSpace pricing](https://www.bot.space/pricing)). Instagram-only tools sell comment-to-DM for ₹99–399 a month ([UnlockDM](https://www.tryunlockdm.com/blog/instagram-dm-automation-india-2026)). Without it, CartHedge looks like an incomplete Instagram tool rather than a different kind of tool.

Competitors put their first paywall on AI, roles and drip sequences, not on inbox basics:

- **Gallabox** reserves AI agents on WhatsApp and Instagram, CTWA Conversions API attribution, drip sequences, roles and round-robin for its Essential plan at ₹5,599–6,999 a month ([Gallabox pricing](https://gallabox.com/pricing)).
- **WATI** gates roles and operator assignment at Pro ([WATI pricing](https://www.wati.io/pricing/)); its INR price for Pro is ₹7,999.
- **Zoko** includes COD double-confirmation, COD-to-prepaid conversion, review collection and reorder flows on every plan, and its order-taking AI charges 3% of order value ([Zoko pricing](https://www.zoko.io/pricing)).
- **Voice AI and multiple numbers** sit in the top tier everywhere.

The lesson for CartHedge's tiers is that features free elsewhere belong in every plan, and team features carry the price. At ₹1,299, a Growth plan with three role-based logins undercuts the cheapest published chat-tool tier with roles (Gallabox Essential at ₹5,599) by about ₹4,300 a month.

The D2C tier and the logistics majors now advertise CartHedge's after-chat loop:

- **DoubleTick's e-commerce page** comes close to matching it feature for feature: live stock checks, in-thread pay links with the ad set attached to the order, COD verification with a prepaid incentive, address repair, courier tracking and returns with photos in the thread, back-in-stock alerts and loyalty. Its RTO and cart-recovery figures are labelled "illustrative ranges" ([DoubleTick](https://doubletick.io/industries/ecommerce-d2c-retail)).
- **Shiprocket's April 2026 changelog** added address-quality warnings at order creation, AI address alerts during failed-delivery handling, WhatsApp milestone updates to buyers, and freight recovery on eligible RTOs ([Shiprocket](https://www.shiprocket.in/blog/product-highlights-from-april-2026/)). It also listed an Instagram DM chatbot in October 2025 (search summary of [Shiprocket](https://www.shiprocket.in/blog/product-highlights-from-october-2025/amp)).

These suites sell to Shopify and WooCommerce brands, priced by quote or per order. GoKwik's Shopify COD app is no longer listed on the Shopify App Store ([Shopify App Store](https://apps.shopify.com/kwikcheckout)). The small-seller band CartHedge targets is left to small apps. CartHedge's remaining edges are the bundled storefront and checkout, GST invoices, money settling in the seller's own Razorpay, and INR pricing for small sellers.

**Image and voice understanding is where CartHedge can still lead the market.** Among the chat tools checked, only AiSensy claims to handle images and voice, and Meta's announcement mentions neither ([AiSensy](https://m.aisensy.com/blog/ai-agents-customer-support)). CartHedge's parser drops voice notes entirely; its test asserts that audio "has nothing to read". Photos reach the AI only as "[sent a photo]" plus the caption, and a photo without a caption is dropped ([client.go](../../../backend/internal/messaging/client.go)). In 2022 about 83% of Indian image searches started from screenshots and 72% were for fashion ([ViSenze](https://www.visenze.com/resource-centre/visual-search-the-hidden-influencer-for-online-shoppers-in-india/), vendor data). That makes the "ye wala" screenshot a core order intent that CartHedge ignores today.

Both features are cheap to run:

- **Voice.** Sarvam's speech-to-text costs ₹30 an hour, about **₹0.25 per 30-second note** ([Sarvam pricing](https://docs.sarvam.ai/api-reference-docs/pricing)). OpenAI's gpt-4o-mini-transcribe costs $0.003 a minute, about ₹0.14 per note ([OpenAI pricing](https://developers.openai.com/api/docs/pricing)). One opaque, anonymised benchmark found India-built models at about 8% word error rate on Hindi against 20–25% for global models ([Caller Digital](https://caller.digital/blog/india-voice-ai-accuracy-global-models-fail-indian-languages)). Testing on 50 real seller notes should decide the vendor.
- **Screenshots.** A screenshot-matching turn costs about **₹0.15–0.35 in total** on Gemini 2.5 Flash-Lite ($0.10/$0.40 per million tokens) or gpt-4.1-mini ([Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)). Avoid the 3.x Flash tier, whose price doubles in January.

Meta's own APIs make most of these gaps cheap to build:

- **Comment-to-DM.** A private reply is allowed once per comment, within seven days on posts and Reels and only during the broadcast on Live ([Meta: private replies](https://developers.facebook.com/docs/instagram-platform/private-replies/)). Each account can send 750 an hour ([Meta: rate limits](https://developers.facebook.com/docs/messenger-platform/overview/rate-limiting)). Comment webhooks need Advanced Access and a public account ([Meta: webhooks](https://developers.facebook.com/docs/instagram-platform/webhooks)). CartHedge's App Review already requests `instagram_business_manage_comments` ([go-live doc](../../WHATSAPP-INSTAGRAM-GO-LIVE.md)), but the planned screen recording shows only DMs, so a comment-to-DM clip should be added before submission.
- **Product cards.** Carousels of up to 10 cards can stand in for Instagram Shopping, whose in-app checkout never launched in India ([Meta: generic template](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/generic-template)).
- **Ad attribution.** CTWA ads carry a `ctwa_clid` click ID on the first message ([Meta: CTWA](https://developers.facebook.com/documentation/business-messaging/whatsapp/ctwa/welcome-message-sequences.md)). Meta's Conversions API for Business Messaging accepts events such as `OrderCreated`, `Purchase` and `OrderDelivered` from both WhatsApp and Instagram ([Meta: CAPI](https://developers.facebook.com/docs/marketing-api/conversions-api/business-messaging)). The backend parses no referral field today.
- **Payments.** WhatsApp Payments in India supports deep integration with Razorpay once the seller authorises the link ([Meta: Payments India](https://developers.facebook.com/docs/whatsapp/cloud-api/payments-api/payments-in)).
- **Broadcasts.** Adding `marketing_messages_lite` to Embedded Signup's features at launch avoids re-onboarding sellers later for the Marketing Messages API ([Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/marketing-messages/onboard-business-customers.md)).

Two limits close doors. The Groups API does not work on WhatsApp Business app (Coexistence) numbers, so VIP or drop groups are impossible ([Meta: Groups](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups.md)). WhatsApp Flows do not render on WhatsApp Web, so any Flow needs a link fallback ([Meta: Flows](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides)).

Storefront, billing and logistics apps add a second gap list:

- **Partial COD as a percentage**, offered by Razorpay Magic Checkout ([Razorpay](https://razorpay.com/blog/partial-payments-partial-cod/)).
- **Store credit and gift cards**, included on every Shopify plan ([Shopify India](https://www.shopify.com/in/pricing)).
- **Photo-to-listing in Hinglish**, which Amazon India's Seller Assistant gives sellers free ([About Amazon India](https://www.aboutamazon.in/news/small-business/amazon-seller-assistant-ai-tool-india)).
- **Staff roles.** Dukaan uses an admin, manager and staff split, where staff see only orders and delivery ([Dukaan help](https://dukaan.help.center/article/5014-how-to-create-a-staff-account-in-dukaan)).
- **A CA seat.** myBillBook includes a free accountant login on its cheapest tier ([Accountune](https://www.accountune.com/mybillbook-alternatives)).

E-invoicing and e-way bills look standard in billing apps but can wait. E-invoicing applies only to B2B supplies at ₹5 crore or more of annual turnover, and e-way bills only to consignments above ₹50,000 ([GimBooks](https://www.gimbooks.com/blog/5-crore-e-invoice-turnover-rule-2026/amp/); [eChai](https://echai.ventures/d2c/d2c-gst-multistate/e-invoicing-e-way-bill-thresholds)).

## A five-phase build order, priced and tiered

The order below ranks items by deadline first. After that it weighs evidence strength × how much money the item saves or makes × how much existing code it reuses. Effort ratings come from the research notes: S is under a week, M is one to three weeks and L is over a month, for one developer. Only the messaging items were checked against the code. Costs are per use or per seller-month, ex-GST, at ₹96 to the dollar. WhatsApp utility and service messages cost ₹0.115 and marketing messages ₹0.8631 plus GST, about ₹1.02 ([Meta pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)); Instagram messages cost nothing. Tiers follow [PRICING-PLAN v2](../PRICING-PLAN.md): Free, Starter ₹499, Growth ₹1,299, Pro ₹2,999 and Brand ₹5,999. "Starter+" means Starter and every plan above it. In the backlog column, FB means FEEDBACK.md and FG means FEATURE-GAPS.md.

| # | Feature | Evidence (type, strength) | Effort | Cost to serve | Tier | Backlog |
|---|---|---|---|---|---|---|
| **0** | **Deadline items, Oct–Dec 2026** | | | | | |
| 0.1 | WhatsApp BSUID and username support; "Share Contact Info" before COD drafts | Meta docs + code; strong | S–M | ₹0 | All (platform) | NEW |
| 0.2 | Consumer Protection 2027 pack: price history or MRP-only strike, grievance and customer-care block, best-before, invoice name size, complaint tracker, dark-pattern audit | Notified rules; strong | M | ₹0 | All | Mostly NEW (legal identity in FB) |
| 0.3 | DPDP pack: breach runbook and 72-hour report, processor terms, 1-year logs, notice covering AI on DMs, 90-day grievance tracker | Notified rules; strong | M | Log storage | All | Mostly NEW (FG 5.2 done) |
| 0.4 | FSSAI number required for food stores, on storefront and invoices | FSSAI advisory; strong | S | ₹0 | All | FB |
| **1** | **WhatsApp launch window, Oct–Nov 2026** | | | | | |
| 1.1 | Own-number WhatsApp go-live with the Marketing Messages flag, typing indicator, frequency caps and quality monitor | Panel (6 of 8 maybes) + Meta docs | S (built) | Meta rate from wallet + 15% fee | ₹299 add-on on Starter/Growth; included on Pro+ | FB must-have |
| 1.2 | Voice-note understanding: transcribe into the same agent, show the transcript, fall back below a confidence threshold | Meesho and vendor data, opaque ASR benchmark; medium. Code drops audio | S–M | ₹0.14–0.25 per 30 s note | Starter+ (counts as an AI reply) | NEW |
| 1.3 | Screenshot and photo matching ("ye wala") with a 2–3 product confirm carousel | 2022 vendor data; medium. Code drops captionless photos | M | ₹0.15–0.35 per turn | Starter+ | NEW |
| 1.4 | Comment-to-DM on posts, Reels, ads and Live, feeding the AI and order flow | ~12 tools at ₹0–399; strong market. Panel | M | Meta ₹0; ₹0.1–0.3 per AI follow-up | Free (keyword → fixed DM); AI follow-up Starter+ | FB Important |
| 1.5 | In-chat prepaid nudge; partial COD as % or ₹ with balance due, taken off the bill | Vendor RTO data + merchant reviews; strong–medium | S | ₹0.115 per WhatsApp message, ₹0 on Instagram | Starter+ | FB Important (extends FG 3.5) |
| 1.6 | AI says it is the shop's assistant at thread start, after long gaps and on handoff; a "regulars" list it never auto-replies to | Meta policy + panel | S | ₹0 | All | FB must-have (partly built) |
| **2** | **After-dispatch loop, Dec 2026–Feb 2027** | | | | | |
| 2.1 | Courier status sync: automatic shipped/delivered/RTO and milestone messages on the buyer's chat | Merchant reviews; strong | M | ₹0.115 per WhatsApp milestone, ₹0 on Instagram | Starter+ | FG 3.4 |
| 2.2 | Failed-delivery chat: buyer confirms whether the courier called, reschedules or fixes the address; seller gets proof for disputes | 8 dated merchant reviews; strong | M | ₹0.115 per outreach | Growth+ | NEW |
| 2.3 | RTO controls: address-quality check, blocked and non-serviceable pincodes, COD block for risky and repeat-COD buyers, prepaid-only above a set value | Vendor data, and Shiprocket ships it; strong | S–M | ₹0 | Pincodes Starter+; risk blocks Growth+, or ₹2 per COD order as an add-on below Growth | FG 3.6, 3.7; address check NEW |
| 2.4 | Credit note when a COD parcel is refused (RTO) | Panel CA + GST logic | S | ₹0 | All paid | FB must-have |
| 2.5 | COD remittance reconciliation, plus weight-dispute evidence (packed weight and photo per order) | Merchant reviews; strong | M | ₹0 + photo storage | Growth+ | NEW |
| 2.6 | UTR matching against an uploaded statement; "a screenshot is not payment" as default in the AI and on the board | Payment-company guides; medium | S–M | ₹0 | Starter+ | NEW (UTR capture exists) |
| **3** | **Paid-tier features, Jan–Mar 2027** | | | | | |
| 3.1 | Staff roles (admin, manager, packer) plus a free read-only CA seat | Panel; competitors charge ₹5.6k–8k | M | ₹0 | 3 logins Growth, 10 Pro, unlimited Brand; CA seat on all paid plans | FG 5.6, FB; CA seat NEW |
| 3.2 | GSTR-1 export, Tally voucher export, invoice series that continues from the seller's old app | Panel only; standard in billing apps | S–M | ₹0 | All paid | FB must-have |
| 3.3 | Team inbox: internal notes, quick replies, awaiting-reply flags; then assignment | ~11 tools; market | M | ₹0 | Notes and quick replies Growth; assignment Pro+ | FG 2.9; assignment NEW |
| 3.4 | Daily WhatsApp summary: missed chats, unconfirmed COD, restock hints | Meta gives summaries free; no lift data | S | Under ₹10 per seller-month | Starter+ | NEW |
| 3.5 | Photo → product draft, including "forward photos on WhatsApp" | Amazon India free; ~80% acceptance globally (vendor) | S | ₹0.03–0.14 per product | All (activation lever) | NEW (replaces FG 4.5 IG import) |
| 3.6 | Ad attribution: ad source on every chat and order, revenue per ad, Conversions API events back to Meta | Meta capability strong; demand weak (vendor only) | M | ₹0 | Per-ad report Growth; Conversions API Pro+ | NEW |
| 3.7 | Shipping fee by weight slab and zone | Panel; top-tier feature at Shopify and Dukaan | S–M | ₹0 | Starter+ | FB Important |
| 3.8 | Turnover vs GST-threshold tracker; warning before inter-state shipping without a GSTIN | News + law; medium | S | ₹0 | All | NEW |
| **4** | **Trust and retention, Mar–Jun 2027** | | | | | |
| 4.1 | Earned verified-seller badge (GSTIN, or PAN plus address) | Scam data + panel buyer; medium | S–M | Verification API fee (unknown) | All paid | FB Important |
| 4.2 | Post-delivery photo reviews on the storefront, quotable by the AI | One vendor A/B test (+18%); medium–weak | M | ₹0.115–1.02 per request | Growth+ | FG 6.4 |
| 4.3 | Exchange-first flow for size problems, with size suggestions | Vendor: over 40% of fashion returns are size; medium | S | ₹0 | All paid | NEW (extends FG 1.1) |
| 4.4 | Store credit (refund as credit) and gift cards on the coupon rails | Vendor; weak | S–M | ₹0 | Growth+ | NEW |
| 4.5 | Reorder and win-back reminders with a holdout group and frequency caps | Playbooks only; weak | S–M | ≈₹1.02 per marketing message, from wallet | Growth+ | NEW |
| 4.6 | Made-to-order pack: delivery date and slot, daily capacity, advance plus balance | Panel + community advice | M | ₹0 | Growth+ | FB Important |
| 4.7 | Wholesale price tiers and blind dropship slips | Panel only | S–M | ₹0 | Pro+ | FB Important |
| 4.8 | Drop/spike mode: stock hold timer, queue, waitlist | Panel | M | AI load on drop days | ₹1,999 per drop week, add-on | FB Important |
| 4.9 | Hindi dashboard, then Gujarati, Bangla and Tamil | Survey (to verify) + panel | M | Translation QA | All | FB Important; FG 7.5 |
| **5** | **Brand tier, when D2C demand justifies it** | | | | | |
| 5.1 | Seller API, outbound webhooks, Shopify/WooCommerce sync, Google Sheets | ~7–10 tools; market. Panel | L | ₹0 | Brand | FB Important |
| 5.2 | Agency multi-client login and partner revenue share | Panel | M–L | ₹0 | Brand / Partner | FB Important |
| 5.3 | Native WhatsApp catalog sync, multi-product messages, `order_details` payment through the seller's Razorpay | Meta primitives; Meta is pushing in-chat UPI | L | Meta and payment fees unknown | Pro+ | NEW |
| 5.4 | Creator and affiliate links, referral codes, with a commission ledger settled off-platform | Wishlink scale (vendor) | M | ₹0 | Pro+ | NEW |

Phases 0 and 1 add up to roughly 11–12 developer-weeks against the 11 weeks left in 2026. Something will slip, so the sequence matters:

1. BSUID support, then the WhatsApp launch, voice notes, the prepaid nudge, AI disclosure and FSSAI.
2. Comment-to-DM. Kabir asked for it within 60 days.
3. The Consumer Protection pack, finished by mid-December.
4. Screenshot matching.
5. The paperwork half of the DPDP pack, before 13 November.

Phase 2 comes before the paid-tier features because it has the strongest real seller evidence of anything in this research. It also makes Growth's price easy to defend, since avoided RTOs pay for the plan.

The tiers follow five rules taken from the evidence:

1. **Features competitors give away go in every plan with that channel:** comment-to-DM, product cards, ad-source tagging and reading voice and images. Gating them makes CartHedge look incomplete. The Free tier gets keyword comment replies and photo-to-listing, which acquire and activate sellers at about ₹0.
2. **Reading voice and images costs paise, so it sits inside any plan with AI**, and each transcribed note or matched screenshot counts as one AI reply against the existing allowance. No new paywall is needed.
3. **Growth becomes the RTO plan.** Failed-delivery chats, risk blocks, remittance reconciliation, reviews and retention live there, matching v2's description of Growth as the plan for "boutiques and RTO-heavy sellers".
4. **Team depth and scale go to Pro and Brand:** assignment, 10+ logins, Conversions API, wholesale and dropship, the API, Shopify and multi-store.
5. **Compliance is never gated.** Only AI image and video generation, at about ₹1.6–6.4 per image and ₹38 or more per eight-second clip ([Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)), needs credits rather than inclusion.

### What to skip, and the one model never to build

Several features are standard somewhere but wrong for this segment now:

| Feature | Why skip it now |
|---|---|
| Voice-AI calls and multiple numbers | Top-tier ₹13.5k+ features everywhere |
| Loyalty points | Every case study is vendor-published with no control group |
| AI reels and virtual try-on | Too costly per clip; Google already offers try-on free in India |
| AI lifestyle product images | Risk misrepresenting colour and fabric, which drives returns |
| Price suggestions | No market price data to base them on |
| ONDC | Integration is large and buyer overlap is weak |
| Meesho-style reseller network | Pulls buyers away from the seller's own chat |
| Full native app | A Trusted Web Activity wrapper gives Play Store presence for S–M effort later |
| E-invoicing and e-way bills | Apply only to B2B at ₹5 crore+ turnover or consignments over ₹50,000 |
| WhatsApp groups | Impossible on Coexistence numbers |

The model never to build is a "CartHedge Pay" wallet that collects buyer money and settles it to sellers. Under GST, 0.5% TCS applies only when the e-commerce operator collects the payment ([GST Council FAQ](https://www.gstcouncil.gov.in/sites/default/files/2024-02/faqs_tcs.pdf); [TaxGarden](https://taxgarden.in/blog/gst-on-ecommerce-operators-tcs-section-52-india-2026)). Income-tax TDS of 0.1% falls on the operator that pays sellers ([TaxGuru](https://taxguru.in/income-tax/section-194-o-amendment-lower-tds-rate-e-commerce-payments.html)). RBI's 2025 Master Direction requires any non-bank that pools merchant funds to hold an authorisation with ₹15 crore net worth, rising to ₹25 crore, and to keep an escrow account. It also bars payment aggregators from running marketplaces ([IndiaCorpLaw](https://indiacorplaw.in/2025/10/09/decoding-rbis-overhaul-of-the-payment-aggregator-directions/)). Money going straight to the seller's own Razorpay is a product promise and also CartHedge's regulatory shield. One related caveat: an SMS OTP fallback for buyers with only a username needs DLT registration, and TRAI blocks SMS containing URLs that have not been whitelisted ([TRAI](https://trai.gov.in/sites/default/files/Direction_20082024.pdf)).

## Conclusion

This research changes what CartHedge's AI is for. It is no longer mainly a replier; it is the system at both ends of the shipment. Before dispatch, it turns messy input (voice notes, screenshots, comments) into a verified, prepaid-leaning order. After dispatch, it runs the failed-delivery chat, the remittance check and the exchange. Meta can match "answers in Hinglish" for free. It has no reason to match "rescued your parcel and filed the credit note". Compliance work also does double duty. The grievance officer, customer-care block and legal identity that the 2027 rules require are the same fields Meta demands before WhatsApp product messages, the same details Razorpay asks for at activation, and the basis of the verified badge buyers want. Built once, those fields serve as legal cover, platform access and trust marketing.

The biggest remaining risk is evidence, not engineering. Almost every impact number here was produced by a company selling the fix. CartHedge can measure real effects directly: the share of voice and image messages, a prepaid-nudge holdout, the failed-delivery rescue rate and COD RTO per seller. That would give it the only real dataset on Indian DM sellers within a quarter, which is better marketing than any vendor claim. The signal to watch is Meta. If in-chat UPI and order tracking reach the free WhatsApp Business app, CartHedge's claim that the AI closes the sale narrows further. The after-dispatch loop, GST and Instagram would then be its whole moat, so the build order above puts them first.
