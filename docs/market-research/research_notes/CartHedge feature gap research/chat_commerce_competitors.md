# Chat-commerce / DM-automation competitors: feature inventory and CartHedge gaps (Oct 2026)

Research date: 11 Oct 2026. Builds on `research_notes/CartHedge pricing market research/chat_automation_competitors.md` (4 Oct 2026), which already holds plan prices, Meta fee pass-through and AI pricing; those are referenced, not re-researched. Also builds on `docs/FEATURE-GAPS.md` and `docs/market-research/FEEDBACK.md`: gap IDs from those files are cross-referenced as [FG x.y] and [FB].

Source quality notes:
- Official pricing/feature pages fetched: WATI, Gallabox, AiSensy, BotSpace, Spur, Zoko, DoubleTick (e-commerce page), Meta Newsroom, 360dialog docs. Interakt, ManyChat, CNBC, Quartz and Deccan Herald returned 403; those rely on secondary sources.
- Several sources are competitor blogs (BotSpace, Spur, UnlockDM, Hyperleap, Retentionly). They are marked [competitor blog].
- "Search summary" means the fact came from a search engine's summary of the page and the page itself was not opened.
- Reddit threads (r/IndianEntrepreneur etc.) were not reachable through search in two attempts, and no YouTube comparisons were collected.
- CartHedge's own state was checked against the code where it mattered: `backend/internal/messaging/client.go`, `frontend/src/app/aiDesk/AiDeskPage.tsx`, `backend/internal/broadcast/service.go`.

## Q1. What does each tool ship for Instagram + WhatsApp commerce in 2026?

### Takeaway
Every Indian BSP now ships the same core: a shared team inbox, broadcasts with retargeting, a WhatsApp catalog, click-to-WhatsApp (CTWA) ad attribution, a no-code flow builder, API/webhooks, Shopify, and an AI agent priced as an add-on or credits. On Instagram, comment-to-DM and story automation are universal. The D2C tier (DoubleTick, Zoko, Bik, KwikEngage) adds the commerce layer: COD confirmation, COD-to-prepaid, cart-in-chat, pay links, order tracking and voice AI. The biggest 2026 change is Meta itself. Business AI went live in the free WhatsApp Business app in India in May 2026, and Meta Business Agent launched globally in June. Both are catalog-grounded, multilingual sales agents, with UPI pay-in-chat "starting soon".

### Cited Findings

**Meta (first-party), the most important new entrant**
- **Business AI on WhatsApp (India):**
  - Announced 14 May 2026 (updated 26 May), rolling out "over the coming weeks" to eligible small businesses that meet unspecified "certain criteria". — [Meta Newsroom](https://about.fb.com/news/2026/05/introducing-business-ai-on-whatsapp-for-small-businesses-in-india/)
  - Set up from the Tools tab of the WhatsApp Business app, with no third-party tools. "Available in all native languages in India." — [Meta Newsroom](https://about.fb.com/news/2026/05/introducing-business-ai-on-whatsapp-for-small-businesses-in-india/)
  - Answers questions about products, services, pricing, discounts and shipping from the business profile and catalog. It recommends products, helps close sales, captures leads and books appointments. — [Meta Newsroom](https://about.fb.com/news/2026/05/introducing-business-ai-on-whatsapp-for-small-businesses-in-india/)
  - The owner can take over any chat, adjust behaviour or switch it off. — [Meta Newsroom](https://about.fb.com/news/2026/05/introducing-business-ai-on-whatsapp-for-small-businesses-in-india/)
  - UPI payments inside the chat are marked "Starting soon", not live. The post gives no pricing. — [Meta Newsroom](https://about.fb.com/news/2026/05/introducing-business-ai-on-whatsapp-for-small-businesses-in-india/)
  - Testimonials cite 6 to 7 orders/day handled by the AI and +40% sales. These are company-supplied anecdotes. — [Meta Newsroom](https://about.fb.com/news/2026/05/introducing-business-ai-on-whatsapp-for-small-businesses-in-india/)
- **Meta Business Agent (global):**
  - Launched 3 Jun 2026 at Conversations (London) after about two years of pilots that included India and Mexico. — [TechWire Asia](https://techwireasia.com/2026/06/meta-business-agent-whatsapp-southeast-asia/)
  - It answers product questions, suggests alternatives, vets buyers, completes the sale and hands off to a human. — [TechWire Asia](https://techwireasia.com/2026/06/meta-business-agent-whatsapp-southeast-asia/)
  - Free to switch on now. Tiered pricing by business size is due "within months". Small merchants will get it inside paid WhatsApp Business Premium levels, and enterprises will pay on usage. Meta claims more than 1M businesses run it. — [TechWire Asia](https://techwireasia.com/2026/06/meta-business-agent-whatsapp-southeast-asia/)
  - The enterprise "Business Agent Platform" connects to Shopify, Zendesk and Shopee. — [TechWire Asia](https://techwireasia.com/2026/06/meta-business-agent-whatsapp-southeast-asia/)
  - Channels conflict: TechWire Asia says WhatsApp, Messenger and Instagram. — [TechWire Asia](https://techwireasia.com/2026/06/meta-business-agent-whatsapp-southeast-asia/). Hyperleap says WhatsApp and Messenger now, with Instagram "announced", no date. — [Hyperleap, competitor blog](https://hyperleap.ai/blog/meta-business-agent-india-launch-what-it-means)
- **India launch of Business Agent, July 2026:**
  - Launched at WhatsApp's Business Summit in Mumbai (7 to 8 Jul 2026), alongside the Business Agent Platform for large enterprises. — search summary of [UNI India](https://www.uniindia.com/whatsapp-unveils-meta-business-agent-for-businesses-in-india/business-economy/news/3902347.html)
  - Adds "summaries of missed conversations and customer insights" for the business. — search summary of [UNI India](https://www.uniindia.com/whatsapp-unveils-meta-business-agent-for-businesses-in-india/business-economy/news/3902347.html)
  - Not confirmed: a secondary blog says token billing for Business Agent starts 1 Aug 2026. — search summary of [VaniAgent](https://vaniagent.com/resources/blog/whatsapp-business-ai-pricing-india)
- **What the free self-serve agent lacks** (per a competitor's assessment): a website channel, CRM connections, webhooks or API, a shared team inbox, and lead export. — [Hyperleap, competitor blog](https://hyperleap.ai/blog/meta-business-agent-india-launch-what-it-means)
- **Native WhatsApp commerce primitives (India only)** that BSPs build on:
  - Single-product, multi-product and product-detail catalog messages, from which the buyer builds a cart and sends an order. — [360dialog docs](https://docs.360dialog.com/partner/messaging/payments-india-only/receive-whatsapp-payments-via-payment-links)
  - An `order_details` interactive message with a "review_and_pay" action, paid by UPI or a gateway payment link (cards, wallets, UPI apps). — [360dialog docs](https://docs.360dialog.com/partner/messaging/payments-india-only/receive-whatsapp-payments-via-payment-links)
  - `order_status` updates: pending → processing → partially-shipped → shipped → completed / canceled. — [360dialog docs](https://docs.360dialog.com/partner/messaging/payments-india-only/receive-whatsapp-payments-via-payment-links)
  - Constraints: INR only, Indian numbers only, and the business must be in Meta's medium or high tier for direct Payment Gateway access. — [360dialog docs](https://docs.360dialog.com/partner/messaging/payments-india-only/receive-whatsapp-payments-via-payment-links)

**WATI** (prices from the 4 Oct notes: Growth ₹4,999, Pro ₹7,999, Business ₹13,999 per month)

| Feature | Growth | Pro | Business |
|---|---|---|---|
| Users | 3, hard cap | 5 | 5 |
| Inbox assignment | Manual | Operator assignment | Advanced assignment rules |
| Role-based access | – | Yes | Yes |
| Chatbot builder (automation triggers) | 1,000 | 2,000 | 5,000 |
| WhatsApp Catalog | Yes | Yes | Yes |
| Shopify campaigns | Basic | Advanced | "Complete Shopify commerce" |
| Broadcasts | 15k/mo | Unlimited | Unlimited |
| Retargeting | Abandoned-cart and order templates | Buyer-data campaigns | Buyer-data campaigns |
| Analytics | Basic | Advanced | ROI insights |
| Integrations | 2 | 5 (incl. HubSpot) | Unlimited |
| Sales pipeline | – | Yes | Yes |
| Multiple numbers | – | – | Yes, as a paid add-on |
| AI agents | 1, 2k credits | 2, 5k credits | Unlimited, 20k credits, voice AI, external agents |

  - Contact APIs and webhooks are in every plan. Instagram and CTWA are sold as separate products, outside the plan table. No WhatsApp Flows, payments or CSAT appear in the table. — [WATI pricing](https://www.wati.io/pricing/)

**Gallabox** (quarterly billing: Basic ₹2,999 / Essential ₹6,999 / Advanced ₹16,999; annual billing: ₹2,399 / ₹5,599 / ₹13,599)

| Feature | Basic | Essential | Advanced | Enterprise |
|---|---|---|---|---|
| Users | 3, hard cap | 6 (extra ₹1,200/mo) | 10 (extra ₹1,500/mo) | Custom |
| Roles | Owner only | Member / admin / owner | Custom roles | Custom + advanced controls |
| Teams, round-robin within teams | – | Up to 5 | Up to 10 | Unlimited |
| Active chatbot flows | 5 | 20 | 100 | Unlimited |
| WhatsApp Flows forms | Basic | Basic | Dynamic | Dynamic |
| Catalog and payments | Yes | Yes | Yes | Yes |
| Instagram comment intents | Basic | Basic | Custom | Custom |
| AI agents on WhatsApp + Instagram | – | Yes | Yes | Yes |
| CTWA | Basic labelling | CAPI + ads attribution + analytics | Same | Same |
| Drip sequences | None | 10 | 100 | Unlimited |
| Broadcast contacts/mo | 10K | 500K | 1M | Unlimited |
| AI credits | 500 | 2,000 | 8,000, plus AI voice on WhatsApp and phone | Custom |
| Extra channels at ₹1,200/mo each | – | Up to 3 | Up to 10 | Unlimited |

  - Basic also includes integrations with Shopify, Razorpay, Cashfree, Stripe, Shiprocket, Shipway, Zoho Books, Calendly, Shopflo and generic webhooks. — [Gallabox pricing](https://gallabox.com/pricing)
  - Agent-performance analytics is "Coming soon". No CSAT/NPS is listed. — [Gallabox pricing](https://gallabox.com/pricing)

**AiSensy** (base plans unlimited users with a 200-agent fair-use cap; marketing ₹1.09/msg)
- The **chatbot builder add-on** costs ₹2,500/mo. It includes keyword, template, QR and Meta-ads triggers, cart management, catalog sharing and a Shopify chatbot. — [AiSensy pricing](https://aisensy.com/pricing)
- The **AI Agent add-on** costs ₹1,350/mo for 1,000 AI messages, with a knowledge base, long-term memory and tool calling. — [AiSensy pricing](https://aisensy.com/pricing)
- Also on the page: collect payments via UPI and card, Razorpay payment notifications, "WhatsApp Forms", CTWA ads with an Ads Manager product, broadcasting with retargeting, developer and webhook APIs, and integrations with Shopify, WebEngage, LeadSquared and Integrately. — [AiSensy pricing](https://aisensy.com/pricing)

**BotSpace** (Pune; Free ₹0 with 1 seat; Pro from ₹999/mo for 500 engaged contacts, 5 seats)
- **The free plan already includes:** shared inbox, analytics, ad-conversion tracking, broadcasts, drip campaigns, WhatsApp Flows, catalogs, payments, CTWA, Instagram comment automation, Instagram DM automation, story-mention reply, Reels automation, Live automation, click-to-Instagram ads, and integrations (HubSpot, Shopify, Zoho CRM, Google Sheets, Razorpay, "2,000+ tools"). — [BotSpace pricing](https://www.bot.space/pricing)
- **Pro adds:** macros, overview reports, APIs and webhooks, the Rex AI agent at ₹10 per resolution, AI copilot/assist/summarise/translate, and AI-generated CSAT and sentiment. — [BotSpace pricing](https://www.bot.space/pricing)
- **Premium adds:** roles and permissions, and teams. — [BotSpace pricing](https://www.bot.space/pricing)
- Extra channel ₹750/mo. AI Insights is listed at both ₹8,800/mo and ₹1,999/mo; the page contradicts itself. — [BotSpace pricing](https://www.bot.space/pricing)

**Interakt** (Haptik/Jio)
- Shopify app features:
  - Catalog sharing in chat.
  - Abandoned-cart reminders with a checkout link.
  - COD double-confirmation "to reduce RTO".
  - Order, shipment and cancellation confirmations.
  - Instagram automation from the Growth plan.
  - Chatbots: basic on Growth, advanced on Advanced. AI agents for sales, FAQ and lead qualification on Premier.
  - Shopify app pricing: $21 / $41 / $51 / $99 per month, with a 14-day trial. — [Shopify App Store](https://apps.shopify.com/interakt-marketing)
- Catalog sync from Shopify, WooCommerce or Excel, a "Checkout bot flow", payment reminders and native WhatsApp payments. — search summary of [interakt.shop](https://interakt.shop/?p=28958)
- "AI Concierge" auto-pilots WhatsApp campaigns. — search summary of [Microsoft Marketplace](https://marketplace.microsoft.com/en-us/product/haptik.interakt)

**DoubleTick** (no free trial; Starter about ₹2,500/mo and Pro about ₹3,500/mo per 4 Oct notes [3P]). The e-commerce page lists:
- **Catalog:** catalog and inventory sync covering variants and stock, with the agent checking stock live. Out-of-stock items turn into back-in-stock signups.
- **Selling in chat:** browse, filter and compare in chat. The agent confirms variant and quantity, then sends an in-thread pay link. Ad campaign, ad set and creative stay attached to the conversation and the order.
- **COD:** COD verification, with unconfirmed orders held. The agent offers a prepaid incentive at the COD-confirmation step.
- **Recovery:** cart reminder 30 minutes after abandonment.
- **Address repair:** fixes PIN codes, missing flat numbers and unusable landmarks before shipping.
- **After the order:** courier-API tracking pushed into the thread, same-day conversations on failed attempts or delays, and returns/exchanges with photos, pickup slots and exchange sizes in the thread.
- **Retention:** replenishment reminders, win-back sequences, drop and early-access campaigns, variant back-in-stock alerts, and loyalty points/tiers/referrals in chat.
- **Team tools:** mobile app (iOS/Android), multi-store routing by PIN code, Bot Studio, Agent Studio, and AI Co-pilot (one-tap suggested replies, flags chats awaiting reply).
- **Analytics:** conversation intelligence (summaries, complaint clustering).
- **Governance:** opt-in source and timestamp, per-customer frequency caps, quiet hours, per-template block tracking with auto-pause, and a sender-health dashboard.
- Its stats ("30 to 50% less RTO on COD orders that pass a confirmation step", "20 to 30% of abandoned carts recovered") are labelled "illustrative ranges", not measured results. — [DoubleTick e-commerce page](https://doubletick.io/industries/ecommerce-d2c-retail)
- AI image recognition: a buyer sends a product photo and it is added to the cart. — search summary of [Capterra listing](https://www.capterra.com.au/software/1040748/double-tick)
- Review sites also list multi-number campaigns and role-based access. — search summary of [G2](https://ai.g2.com/product/doubletick-io)

**Zoko** (Shopify-first, USD; "every feature is in every plan", only volume differs)
- **Every plan:** broadcasts, WhatsApp Catalog, CTWA, auto-distribute chats, quick replies, tags and segments, pop-up campaigns, detailed analytics, API and webhooks. WhatsApp calling minutes are included (500 to 4,000). — [Zoko pricing](https://www.zoko.io/pricing)
- **Free "essential flows":** abandoned-checkout recovery, review collection, COD double-confirm, **COD-to-prepaid conversion**, reorder reminders, upsells and order notifications. — [Zoko pricing](https://www.zoko.io/pricing)
- **Premium flows ($5.99/mo each):** CSAT, Judge.me review sync, pop-up coupons, Instagram auto-replies, COD reconfirmation with auto-cancel, and third-party checkout recovery. — [Zoko pricing](https://www.zoko.io/pricing)
- **AI agents:** Guru (FAQ), Wismo (order tracking) and **Sello**, which "takes orders in chat and collects payment" for 3% of order value. — [Zoko pricing](https://www.zoko.io/pricing)

**Spur** (USD, annual-billing prices)
- AI Acquire $12 (1 seat, 3 flows on Instagram/Facebook only, click-to-DM Instagram ads). AI Start $31 (2 seats, 25 flows across WhatsApp/Instagram/Facebook, CTWA, Shopify). AI Accelerate $127 (5 seats, 2 WhatsApp channels, Custom AI Actions such as order tracking, webhook trigger and HTTP request). AI Max $399. — [Spur pricing](https://www.spurnow.com/pricing)
- Add-ons: extra user $15/mo, extra WhatsApp channel $29/mo, AI credits $12 per 1,000. — [Spur pricing](https://www.spurnow.com/pricing)

**Bik.ai** (sales-led; no public price)
- **August 2026 update:**
  - A Campaign AI Sales Agent picks up WhatsApp campaign replies using that campaign's offer and products.
  - The AI spam filter now covers Instagram post and Reel comments. Recent buyers bypass it.
  - Escalation controls: intent categories, per-channel trigger phrases, a cap on AI messages, and always-on rules for "asked for a human" and negative sentiment.
  - "Enrichment handover": the AI collects missing info and passes a structured ticket to a human.
  - AI voice cart-recovery calls, now reaching address-less abandoners.
  - Order tracking enriched from any REST API. — [Bik/Manifest product update, Aug 2026](https://blog.getmanifest.ai/bik-product-update-august26/)
- The Instagram bot covers DMs, post and Reel comments, story mentions, ad replies and cart recovery. The WhatsApp bot covers product browsing, cart creation and checkout. — search summary of [SoftwareOne listing](https://platform.softwareone.com/product/instagram-chatbot/PCP-0572-2047)
- Shopify app: abandoned cart, upsell, cross-sell, welcome and web-store event triggers. — search summary of [Shopify App Store](https://apps.shopify.com/bik-marketing)

**GoKwik KwikEngage**
- Cart recovery, order updates and COD-to-prepaid conversion on WhatsApp, with "instant checkouts completed directly inside WhatsApp" and a GenAI bot claiming 80% automation. — search summary of [Shopify App Store](https://apps.shopify.com/kwikengage?locale=pl)
- A competitor says it is "basic keyword-based chatbot only" and requires the GoKwik stack (KwikPass, KwikCheckout, KwikCOD). — search summary of [Spur, competitor](https://www.spurnow.com/en/compare/kwikengage-alternative)

**LimeChat**
- Enterprise chat and voice AI agents "deployed in 2 weeks". The agent app pools WhatsApp, Instagram, Messenger, web and email. The bot handles order-tracking queries. Returns rely on a third-party (Saara) integration. — search summary of [LimeChat](https://limechat.ai/) and [LimeChat Agent app](https://apps.apple.com/la/app/limechat-agent/id1579651271)
- Claims "20+ Indian languages". — search summary of [Bitscale directory](https://bitscale.ai/directory/limechat)

**ManyChat**
- "AI Replies" answers DMs and comments from a knowledge library of up to 250k characters. "AI Comments" auto-replies to Instagram comments in the creator's style, with approval before sending. — search summary of [eesel.ai review](https://www.eesel.ai/es/blog/manychat-analisis)
- Story-reply triggers can be limited to a specific story. — search summary of [Chatimize](https://chatimize.com/instagram-story-replies/)
- Channels: Instagram, Messenger, WhatsApp, SMS, Telegram, email, plus TikTok DMs (added 2025). — search summary of [Featurebase review](https://www.featurebase.app/blog/manychat-review)

**Indian Instagram-only DM tools** (UnlockDM post of 14 Jun 2026 [competitor blog])
- Comment-to-DM is in essentially every tool. Keyword triggers "incl. Hinglish" (ReplyKaro), follow-gates (ReplyKaro, UnlockDM, Hypello), story automation (CreatorFlow), giveaway/referral leaderboards and winner picker (UnlockDM, ManyChat), and email capture (UnlockDM). Prices run ₹99 to about ₹1,577/mo. — [UnlockDM](https://www.tryunlockdm.com/blog/instagram-dm-automation-india-2026)
- InstantDM: comment-to-DM link funnel, free tier of 1,500 automations/mo, $12/mo paid. — search summary of [Shopify App Store](https://apps.shopify.com/instantdm)

### Inferences
- Meta's free in-app Business AI is the closest thing to CartHedge's core promise: catalog-grounded replies in Indian languages that close sales. It is already rolling out in India and UPI-in-chat is next. Its stated gaps match where CartHedge is strong: no order desk, storefront, COD/RTO tooling, invoices or courier handoff, and (per a competitor) no team inbox, API or webhooks. CartHedge's pitch has to move from "AI replies to DMs" toward "AI that runs the order after the reply".
- The D2C tier (DoubleTick, Zoko, Bik, KwikEngage) now markets most of CartHedge's after-chat loop: COD confirm, prepaid nudge, returns in thread, tracking, and back-in-stock. DoubleTick's e-commerce page is a near feature-for-feature overlap. CartHedge's remaining edges are the bundled storefront and checkout, GST invoices, money settling in the seller's own Razorpay, and small-seller INR pricing.

### Gaps
- Interakt's and ManyChat's own feature and pricing pages could not be fetched (403). WATI's Instagram and CTWA product details were not opened.
- The exact list of languages Meta Business AI supports, its India pricing, and whether UPI-in-chat has shipped as of Oct 2026 could not be confirmed.
- No hands-on test of any tool. Feature presence is per vendor pages and listings.

## Q2. Table stakes vs differentiators

### Takeaway
Table stakes (in about 9 to 12 of the ~13 tools): shared inbox, broadcasts with segments, WhatsApp catalog messages, CTWA attribution, flow builder, API/webhooks, Shopify, an AI agent, and, on Instagram, comment-to-DM plus story/mention replies. Common at mid tier (5 to 8 tools): roles/permissions, auto-assignment, quick replies/macros, drip sequences, abandoned cart, COD confirmation, pay links in chat, WhatsApp Flows forms, Google Sheets/Zapier. Differentiators (1 to 3 tools): COD-to-prepaid automation, voice AI, image-to-product, address repair, CSAT/review collection, campaign-reply AI, comment spam filter, loyalty in chat, sender-health governance, WhatsApp calling, missed-chat summaries.

### Cited Findings
Counts are from the vendor evidence in Q1. ✓ means listed on the vendor page or listing; "–" means not found, which may not mean absent.

| Feature | Seen at | Count | CartHedge today |
|---|---|---|---|
| Shared team inbox | WATI, Gallabox, BotSpace (free), Interakt, DoubleTick, Zoko, Spur, Bik helpdesk, LimeChat, ManyChat (inbox seats), AiSensy (unlimited users) | ~11 | Single-operator inbox with manual reply and per-chat AI pause ([AiDeskPage.tsx](../../../../frontend/src/app/aiDesk/AiDeskPage.tsx)). No assignment. |
| Broadcasts + retargeting/segments | All BSPs (WATI, Gallabox, AiSensy, BotSpace, Zoko, Spur, DoubleTick, Interakt) | ~10 | Consent-gated broadcasts, drafts or scheduled ([broadcast/service.go](../../../../backend/internal/broadcast/service.go)). WhatsApp template sending is not live [FG 6.3]. |
| WhatsApp catalog / product messages | WATI, Gallabox, AiSensy, BotSpace, Interakt, Zoko, DoubleTick ([360dialog](https://docs.360dialog.com/partner/messaging/payments-india-only/receive-whatsapp-payments-via-payment-links) primitives) | ~7 (every WA BSP) | No Meta catalog sync or native product/cart messages. Uses share links instead. |
| CTWA ads attribution | Gallabox (CAPI + attribution from Essential), AiSensy, BotSpace, Zoko, Spur (Start+), DoubleTick, WATI (separate product) | ~7 | None. |
| Instagram comment-to-DM | Gallabox, BotSpace, Bik, Interakt (IG automation), Spur, ManyChat, all Indian IG tools ([UnlockDM](https://www.tryunlockdm.com/blog/instagram-dm-automation-india-2026)) | ~12 incl. IG tools | None. No comment webhook in [messaging/client.go](../../../../backend/internal/messaging/client.go) [FB: comment-to-DM]. |
| Story mention/reply automation | BotSpace, Bik, ManyChat, CreatorFlow | ~4+ | Partial: story replies, mentions, shared posts and photos reach the AI as annotated context ([messaging/client.go](../../../../backend/internal/messaging/client.go)). No configurable story-specific trigger. |
| Reels/Live comment automation | BotSpace (Reels, Live), Bik (Reel comments), ManyChat (Reel replies) | 3 | None. |
| No-code flow builder | WATI, Gallabox, AiSensy (add-on), BotSpace, Spur, DoubleTick, LimeChat, ManyChat, Zoko (flows) | ~9 | None (AI-only by design). |
| API + webhooks | WATI (all plans), Gallabox (all), AiSensy, BotSpace (Pro), Zoko (all), Spur, DoubleTick | ~7 | No seller-facing API or outbound webhooks [FB: API]. |
| Shopify integration | WATI ($4.99 add-on per 4 Oct notes), Gallabox, AiSensy, BotSpace, Interakt, DoubleTick, Zoko, Spur, Bik, KwikEngage | ~10 | None (own storefront instead) [FB: Shopify sync]. |
| AI agent | All except basic IG tools | ~11 | Yes; core product. |
| Roles/permissions | WATI Pro, Gallabox Essential, BotSpace Premium, DoubleTick | 4+ | None [FG 5.6]. |
| Auto-assignment / round-robin | WATI Pro/Business, Gallabox Essential, Zoko | 3+ | None. |
| Quick replies / macros | Zoko (all), BotSpace Pro | 2+ | None [FG 2.9]. |
| Drip sequences | Gallabox (Essential, 10), BotSpace (free), DoubleTick (win-back, replenishment), Bik journeys | 4 | None. Only a single dropped-checkout reminder. |
| Abandoned cart recovery | WATI, Interakt, Zoko, DoubleTick, Bik, KwikEngage | 6 | Yes (one reminder). |
| COD confirmation | Interakt, Zoko, DoubleTick, KwikEngage | 4 | Yes. |
| Pay link / pay in chat | Gallabox, AiSensy, BotSpace, Interakt (native WA pay), DoubleTick, Zoko Sello | 6 | Prepaid link in chat, yes. No native WhatsApp `order_details` "review and pay". |
| WhatsApp Flows forms | Gallabox, BotSpace, AiSensy ("WhatsApp Forms") | 3 | None. |
| Multi-number / multi-channel | WATI Business, Gallabox (₹1,200/channel), Spur (2 to 3 WA channels), BotSpace (₹750/channel), DoubleTick | 5 | One IG + one WA per seller (inferred from settings; not verified). |
| Mobile agent app | DoubleTick, LimeChat Agent, ManyChat | 3 | Web app + web push only. |
| COD-to-prepaid automation | Zoko (free flow), DoubleTick (incentive at COD confirm), KwikEngage | 3 | Partial: checkout-level online-payment discount [FG 3.5]. No in-DM prepaid nudge [FB]. |
| CSAT / review collection | BotSpace (AI CSAT, Pro), Zoko (review flow free; CSAT premium; Judge.me) | 2 | None [FG 6.4]. |
| Voice AI (calls) | WATI Business, Gallabox Advanced, Bik (cart-recovery calls), LimeChat, DoubleTick (voice campaigns) | 5, top tiers only | None. |
| Image-to-product match | DoubleTick (Capterra) | 1 | AI sees only "[sent a photo]", not the image ([messaging/client.go](../../../../backend/internal/messaging/client.go)). |
| Address repair before ship | DoubleTick | 1 | None found in this pass. |
| AI picks up broadcast replies with campaign context | Bik | 1 | Not verified. |
| Comment spam filter | Bik | 1 | n/a (no comments). |
| Loyalty/referral in chat | DoubleTick | 1 | None. |
| Sender health, frequency caps, quiet hours | DoubleTick | 1 | Consent and opt-out built [FG 6.3]. No frequency caps or quality dashboard found. |
| Missed-chat summaries + customer insights | Meta Business Agent (search summary) | 1 | Insights page exists. No conversation summaries. |
| Sales pipeline / CRM | WATI Pro+ | 1 | Customer ledger only. |
| WhatsApp voice calling | Zoko (minutes in plan) | 1 | None. |
| Giveaway / follow-gate / referral leaderboard | UnlockDM, ReplyKaro, Hypello, ManyChat | 4 IG tools | None. |

### Inferences
- What CartHedge lacks among table stakes: comment-to-DM, CTWA attribution, a multi-agent inbox, native WhatsApp catalog/cart messages, API/webhooks and Shopify. Comment-to-DM is the most conspicuous because it is free elsewhere. Its absence will read as "incomplete Instagram tool", not "different tool".
- A visual flow builder is table stakes for BSPs, but CartHedge's AI-first approach can stand in for most flows. The specific flows sellers expect still need a home: comment keyword → DM, COD confirm, review request, reorder reminder. Configurable AI "playbooks" may be enough without a canvas. This is an inference, not tested with sellers.

### Gaps
- Feature presence for Interakt, LimeChat, KwikEngage and Bik is partly from third-party listings, so counts carry noise.
- Not checked whether WATI's separate Instagram product includes comment-to-DM.

## Q3. Where each feature sits by price tier (INR where available)

### Takeaway
At Indian BSPs, the first paywall is usually AI, roles and drip sequences, not inbox or broadcasts. BotSpace gives Instagram comment/story/Live automation, catalogs, payments, Flows and CTWA free. Gallabox gates AI agents, CTWA CAPI attribution and drip sequences at Essential (₹5,599 to ₹6,999/mo). WATI gates roles and auto-assignment at Pro (₹7,999). Voice AI and multi-number sit at the top tier everywhere.

### Cited Findings
- **Free tier (BotSpace):** inbox, broadcasts, drip, WhatsApp Flows, catalogs, payments, CTWA, Instagram comment/DM/story-mention/Reels/Live automation, Google Sheets/Shopify/Razorpay integrations. Pro (₹999/mo for 500 engaged contacts; ₹1,600 for 2,500) adds API, AI agent (₹10/resolution) and CSAT. Premium (custom) adds roles. — [BotSpace pricing](https://www.bot.space/pricing)
- **Gallabox Basic (₹2,399 to ₹2,999):** catalog, payments, basic Flows, basic Instagram comment intents, basic CTWA labelling, 5 bots, Shopify/Razorpay/Shiprocket. **Essential (₹5,599 to ₹6,999):** AI agents on WhatsApp + Instagram, CTWA CAPI + attribution, 10 drip sequences, member/admin roles, round-robin. **Advanced (₹13,599 to ₹16,999):** dynamic Flows, custom comment intents, AI voice, custom roles. — [Gallabox pricing](https://gallabox.com/pricing)
- **WATI Growth (₹4,999):** catalog, chatbot builder, abandoned-cart retargeting, APIs/webhooks, manual assignment, 1 AI agent. **Pro (₹7,999):** roles, operator assignment, advanced Shopify, pipeline. **Business (₹13,999):** multi-number (paid add-on), voice AI, unlimited agents. — [WATI pricing](https://www.wati.io/pricing/); INR from [4 Oct notes](../CartHedge%20pricing%20market%20research/chat_automation_competitors.md)
- **AiSensy:** cart, catalog sharing, keyword/ad triggers and the Shopify bot are in the ₹2,500/mo chatbot add-on. The AI agent is a ₹1,350/mo add-on. — [AiSensy pricing](https://aisensy.com/pricing)
- **Zoko:** all commerce flows (COD confirm, COD-to-prepaid, reviews, reorder) are free on every plan from $49.99. Instagram auto-replies and CSAT are $5.99 premium flows plus a $9.99 Instagram channel fee. Sello order-taking AI costs $24.99/mo + 3% of order value. — [Zoko pricing](https://www.zoko.io/pricing)
- **Spur:** CTWA from AI Start ($31/mo annual). Custom AI actions (order tracking) and webhooks from AI Accelerate ($127). — [Spur pricing](https://www.spurnow.com/pricing)
- **Interakt:** Instagram automation from Growth; AI agents only on Premier ($99/mo on the Shopify listing). — [Shopify App Store](https://apps.shopify.com/interakt-marketing)
- **Meta Business AI / Business Agent:** free now in the WhatsApp Business app. Paid tiers via WhatsApp Business Premium are coming. — [TechWire Asia](https://techwireasia.com/2026/06/meta-business-agent-whatsapp-southeast-asia/)
- **Instagram-only tools:** comment-to-DM ₹0 to ₹399/mo (ReplyKaro ₹99, QuickDM ₹399; Zorcha core free since Aug 2026 per 4 Oct notes). — [UnlockDM](https://www.tryunlockdm.com/blog/instagram-dm-automation-india-2026)

### Inferences
- Comment-to-DM, story replies, catalog messages and CTWA tracking are effectively ₹0 features in this market. CartHedge should include them in every plan, not use them as upsells.
- Roles/staff seats are monetised at ₹5,600 to ₹8,000/mo tiers by competitors. CartHedge can include basic roles cheaply and undercut on a feature its panel listed as "must have before paying" [FB].
- Voice AI and multi-number are top-tier (₹13.5k+) features and are not relevant to CartHedge's small-seller tier.

### Gaps
- Interakt and DoubleTick have no official per-feature INR tier tables (403 on Interakt; DoubleTick does not render its table).
- Prices for Bik, LimeChat and KwikEngage are not public.

## Q4. What reviews praise and complain about

### Takeaway
Praise centres on easy setup, abandoned-cart and COD-confirmation automations, and (for Interakt) responsive support. Complaints centre on support quality, automation reliability (Interakt messages failing; WATI bots routing to the wrong person), template-category confusion, and total cost versus headline price. Review samples are small, and Reddit/Play Store/YouTube evidence was not reached.

### Cited Findings
- **G2:**
  - AiSensy 4.4/5 (116 reviews). Top cons: "Poor Customer Support" (3) and "Poor Response" (3). — search summary of [G2 compare](https://www.g2.com/compare/aisensy-vs-haptik-interakt)
  - Interakt 4.5/5 (68 reviews). Cons: "Poor Customer Support" (2). — search summary of [G2 compare](https://www.g2.com/compare/aisensy-vs-haptik-interakt)
  - Reviewers rate AiSensy easier to use and Interakt better on ongoing support. — search summary of [G2 compare](https://www.g2.com/compare/aisensy-vs-haptik-interakt)
- **Interakt, Shopify App Store:** 4.2/5 from 230 reviews, with 20% one-star. Praise covers setup, abandoned-cart and COD-confirmation automations, broadcasts and support (Aug 2026: "the support team is prompt, knowledgeable"). — [Shopify App Store](https://apps.shopify.com/interakt-marketing)
  - Complaints quoted in a review roundup: "abandoned cart messages never work", order confirmations failing about 30% of the time and shipping confirmations about 10%. — search summary of [Dupple review](https://dupple.com/reviews/interakt)
- **WATI, Capterra:**
  - "sometimes when we trigger chatbot it goes to wrong person".
  - Confusion over whether to file templates as Marketing or Utility.
  - The UI is split: "very bad. Difficult to find options" vs "great UI".
  - Pricing is "the thing I like least". — search summary of [Capterra WATI p4/p5](https://capterra.com/p/204314/WATI/reviews/?page=5)
- **AiSensy, Capterra:** "pricing is not suitable for startup business" (n=5 sample). — search summary of [Capterra AiSensy](https://www.capterra.co.uk/software/1022328/aisensy)
- **From the 4 Oct notes:** WATI bills about 5x headline once fees and add-ons are added, cancellation is hard, and support is slow. Interakt template rejections are unverified. — [4 Oct notes](../CartHedge%20pricing%20market%20research/chat_automation_competitors.md)
- **Indian Instagram creators:**
  - USD-only billing (2 to 3.5% forex fee plus 18% GST) is a stated barrier.
  - ManyChat's Mar 2026 free-tier cut (1,000 to 25 contacts) is a grievance. — [UnlockDM, competitor blog](https://www.tryunlockdm.com/blog/instagram-dm-automation-india-2026)
- **Meta Business Agent critiques:**
  - Language performance with code-switching is unproven.
  - The checkout gap leaves payment completion unclear.
  - Paid gating may create a "two-tier market" that hurts small merchants. — [TechWire Asia](https://techwireasia.com/2026/06/meta-business-agent-whatsapp-southeast-asia/)

### Inferences
- Reliability of transactional messages (order confirmations, cart reminders) is a real complaint about the incumbents. CartHedge's per-send delivery visibility (FG 8.4 "delivery health", still open) doubles as a competitive claim.
- Meta's agent is weakest exactly where CartHedge is designed to be strong: Hinglish code-switching, checkout and payment completion. That is a positioning hook, but it is perishable.

### Gaps
- No Reddit (r/IndianEntrepreneur, r/smallbusinessindia), Play Store or YouTube comparison evidence was collected; two Reddit-targeted searches returned nothing.
- Individual G2/Capterra reviews were not opened; complaint frequencies are tiny samples.

## Q5. Gap inventory: features competitors ship that CartHedge does not (with commonality, tier, demand)

### Takeaway
Ranked by (commonality × seller-demand evidence × fit with CartHedge's "chat is the shop" principle), the top gaps not already in FEATURE-GAPS.md are:
1. Instagram comment-to-DM, plus Reel/Live comment triggers.
2. CTWA / click-to-Instagram ad attribution to orders.
3. Native WhatsApp catalog and `order_details` review-and-pay.
4. A multi-agent inbox with assignment and quick replies.
5. Seller API, webhooks and Shopify/Sheets.
6. Image-to-product matching in the AI.
7. Address repair before dispatch.
8. Drip and lifecycle sequences (reorder, win-back).
9. Review/CSAT collection.
10. An AI that picks up broadcast replies with the campaign's context.

### Cited Findings
| # | Missing in CartHedge | Who ships it | How common | Tier at competitors | Demand evidence | Already in backlog? |
|---|---|---|---|---|---|---|
| 1 | **Comment-to-DM** (keyword on post/Reel/Live → DM with product/link), plus comment AI replies and a comment spam filter | Gallabox, BotSpace (free), Bik, Spur, Interakt, ManyChat (AI Comments), ReplyKaro (₹99), InstantDM, Zorcha (free) — [BotSpace](https://www.bot.space/pricing), [Gallabox](https://gallabox.com/pricing), [UnlockDM](https://www.tryunlockdm.com/blog/instagram-dm-automation-india-2026), [Bik](https://blog.getmanifest.ai/bik-product-update-august26/) | Universal on IG | Free to ₹399 | Panel: Kabir and Tanya ([FEEDBACK.md](../../FEEDBACK.md), simulated personas). Every IG tool leads with it. | FB "Important"; not in FEATURE-GAPS |
| 2 | **Ad attribution**: CTWA and click-to-IG-DM ads tied to conversation → order → revenue; Meta CAPI conversions | Gallabox Essential (CAPI), BotSpace (free), Spur, Zoko, DoubleTick (ad set/creative on order), AiSensy — [Gallabox](https://gallabox.com/pricing), [DoubleTick](https://doubletick.io/industries/ecommerce-d2c-retail) | ~7 tools | Free (BotSpace) to ₹5,599+ (Gallabox) | CTWA opens a free 72-hour messaging window ([Meta docs, via 4 Oct notes](https://developers.facebook.com/docs/whatsapp/pricing)), a cost lever for WhatsApp AI replies | No |
| 3 | **Native WhatsApp catalog sync + product/multi-product messages + `order_details` review-and-pay + `order_status`** | Every WA BSP. Primitives in [360dialog docs](https://docs.360dialog.com/partner/messaging/payments-india-only/receive-whatsapp-payments-via-payment-links). Interakt native WA payments (search summary) | ~7 | Base plans | Meta is pushing UPI-in-chat for Business AI ([Meta Newsroom](https://about.fb.com/news/2026/05/introducing-business-ai-on-whatsapp-for-small-businesses-in-india/)) | No (WA go-live doc covers templates only) |
| 4 | **Team inbox**: assignment/round-robin, internal notes, quick replies/macros, "awaiting reply" flags, suggested replies | WATI Pro, Gallabox Essential, Zoko, BotSpace Pro, DoubleTick Co-pilot | ~11 have an inbox; 4 to 5 have assignment | ₹5,600 to ₹8,000 tier for assignment and roles | Panel "staff logins with roles" is a must-have ([FEEDBACK.md](../../FEEDBACK.md)) | Partly: FG 2.9 (quick replies), FG 5.6 (roles). Assignment not listed. |
| 5 | **Seller API + outbound webhooks; Shopify/WooCommerce, Google Sheets, Zapier/Pabbly** | WATI, Gallabox, BotSpace, Zoko, Spur, DoubleTick, AiSensy (Integrately) | ~7 to 10 | Base (WATI, Gallabox, Zoko) to Pro (BotSpace) | Arjun (D2C) in [FEEDBACK.md](../../FEEDBACK.md) | FB "Important" |
| 6 | **Image-to-product**: buyer sends a screenshot or photo, and the AI identifies the catalog item and variant | DoubleTick (search summary of [Capterra](https://www.capterra.com.au/software/1040748/double-tick)) | 1 | n/a | CartHedge's own code notes "ye wala chahiye" photo and story replies as common order intents, but passes only "[sent a photo]" ([messaging/client.go](../../../../backend/internal/messaging/client.go)) | No |
| 7 | **Address repair** before ship: AI asks to fix PIN, flat number or landmark; pairs with RTO check | DoubleTick ([page](https://doubletick.io/industries/ecommerce-d2c-retail)) | 1 | n/a | Bad addresses and PINs are a top RTO cause per [FG 3.6](../../../FEATURE-GAPS.md) | Adjacent to FG 3.6 (pincode rules) |
| 8 | **Drip / lifecycle sequences**: reorder or replenishment reminders, win-back, post-delivery upsell, welcome series | Gallabox Essential (10), BotSpace (free), Zoko (free reorder flow), DoubleTick, Bik journeys | 4 to 5 | Free to ₹5,599 | Food/consumable sellers (Lakshmi persona) are the fit (inferred) | No (only the dropped-checkout reminder exists) |
| 9 | **Review / CSAT collection after delivery** (WhatsApp ask → storefront reviews) | Zoko (free review flow; CSAT premium), BotSpace (AI CSAT, Pro) | 2 | Free to Pro | — | FG 6.4 (P2) |
| 10 | **AI picks up broadcast replies with that campaign's offer and products** | Bik ([Aug 2026](https://blog.getmanifest.ai/bik-product-update-august26/)) | 1 | Sales-led | — | No; natural once broadcasts send |
| 11 | **COD-to-prepaid nudge inside the chat / at COD confirmation** | Zoko (free flow), DoubleTick, KwikEngage | 3 | Free (Zoko) | Panel "prepaid nudge in the DM" ([FEEDBACK.md](../../FEEDBACK.md)) | FB; checkout discount exists (FG 3.5) |
| 12 | **Courier delivery-exception conversations** (failed attempt → same-day chat) | DoubleTick | 1 | n/a | Ties to RTO reduction | Depends on FG 3.4 (courier sync, open) |
| 13 | **WhatsApp Flows forms** (native in-chat forms for address, size or lead capture) | Gallabox, BotSpace (free), AiSensy | 3 | Free to Advanced | — | No |
| 14 | **Story-specific / Reel / Live triggers and giveaway or follow-gate mechanics** | BotSpace, ManyChat, UnlockDM, ReplyKaro | 4+ | Free to ₹699/campaign | Drop/spike mode for Kabir and Tanya ([FEEDBACK.md](../../FEEDBACK.md)) | Partly (FB drop mode) |
| 15 | **Mobile agent app** (native, not PWA) | DoubleTick, LimeChat, ManyChat | 3 | — | Product principle "phone first" ([PRODUCT.md](../../../../PRODUCT.md)) | No; CartHedge is PWA + web push |
| 16 | **Multi-number / extra channels** | WATI Business, Gallabox (₹1,200/channel), BotSpace (₹750), Spur ($29) | 5 | Top tier or add-on | Agencies (Rohit persona) and multi-brand sellers | Adjacent to FB agency program |
| 17 | **Sender-health dashboard, per-buyer frequency caps, quiet hours for marketing** | DoubleTick | 1 | — | Protects the seller's own number once WhatsApp is live | Partly (consent done, FG 6.3) |
| 18 | **Escalation rules on negative sentiment + AI message cap + structured handover ticket** | Bik ([Aug 2026](https://blog.getmanifest.ai/bik-product-update-august26/)) | 1 | — | Panel AI-risk worry: "rude reply to a regular" ([FEEDBACK.md](../../FEEDBACK.md)) | Partly (FG 2.6 handoff topics/amount done) |
| 19 | **Missed-conversation summaries / daily digest** | Meta Business Agent (search summary of [UNI India](https://www.uniindia.com/whatsapp-unveils-meta-business-agent-for-businesses-in-india/business-economy/news/3902347.html)), DoubleTick conversation summaries | 2 | Free (Meta) | Night-DM sellers wake up to a backlog (inferred) | No |
| 20 | **Voice AI** (cart-recovery or COD-confirmation calls) and WhatsApp calling | Bik, WATI Business, Gallabox Advanced, LimeChat, Zoko (calling minutes) | 5 | Top tier only | — | No; poor fit for small-seller pricing (inference) |
| 21 | **Loyalty points / referral links in chat** | DoubleTick | 1 | — | — | No |

### Inferences
- **Build first (cheap, expected, on-principle):**
  - #1 comment-to-DM routed into the existing AI and order flow. CartHedge's twist: the DM opens a conversation that closes the order, not just a link.
  - #6 image-to-product, using a vision model on story or photo DMs already captured.
  - #7 address repair at order-summary time.
  - #11 an in-DM prepaid nudge, reusing the existing checkout discount.
  - All four reuse code paths CartHedge already has.
- **Build with WhatsApp go-live:** #3 native catalog and review-and-pay; #2 CTWA attribution, because the 72-hour free window lowers per-reply Meta cost; #17 sender health. These compete directly with Meta's own upcoming UPI-in-chat.
- **Monetisable tier features:** #4 assignment/roles and #5 API/Shopify are what competitors charge ₹5.6k to ₹8k for. They fit a CartHedge "Team/D2C" tier.
- **Skip for now:** voice AI (#20), multi-number (#16) and loyalty (#21). These are top-tier or enterprise features, outside the small-seller segment.
- **Strategic risk:** Meta Business AI is free, in-app and catalog-grounded, so "AI replies in your language" alone will stop being a reason to pay. The durable gaps to defend are the post-reply ones competitors and Meta lack together: storefront + checkout, GST invoices, COD/RTO tooling, returns and the seller-owned Razorpay. CartHedge already has all of these.

### Gaps
- No direct seller-demand data (surveys, Reddit threads, review counts) for individual features like comment-to-DM or CTWA attribution. Demand evidence here is vendor positioning plus simulated panel personas, which are not real customers.
- Not verified: whether Meta's in-app Business AI and a third-party Cloud API agent can coexist on the same number (relevant to CartHedge's Coexistence plan).
- Instagram Graph API constraints for comment-to-DM (private replies, the 7-day comment window, rate limits) were not researched in this pass.
