# Panelist 05: Arjun Menon, Dew Theory (Bengaluru, D2C skincare, upper mid-market)

## Profile

- **Who:** Arjun Menon, 31. Co-founder of Dew Theory, a D2C skincare brand. Based in Bengaluru, small office in Indiranagar. His co-founder Karthik handles formulations and product; Arjun runs growth, ops and every tool vendor.
- **Business in numbers:** Shopify store, about 2,500 orders a month, average order ₹899, so roughly ₹22.5 lakh GMV a month. 70% prepaid (about 1,750 orders), 30% COD (about 750).
- **Stack today:** Shopify, GoKwik checkout (also does COD risk), Shiprocket for shipping, Interakt for WhatsApp, Limechat for AI support, a Klaviyo-like tool for email, a returns app, a reviews app.
- **Team:** 4 people in ops and support, roughly ₹1.1 to ₹1.3 lakh a month in salaries together. Two of them touch Instagram DMs for a couple of hours a day, from the Instagram app on their phones.
- **Tool spend (excluding salaries and freight):** about ₹55,000 to ₹58,000 a month. Detail is in answer 6.
- **Instagram DMs:** about 8% of orders, so about 200 orders and about ₹1.8 lakh GMV a month. His own rough read of the inbox: around 1,400 DM conversations a month, first reply takes a few hours in the day and nothing goes out after 10 pm. He knows it is leaking sales but has never measured how much.
- **How he thinks:** Analytical, spreadsheet first. Converts every tool to cost per order and share of GMV. Cares about Shopify sync, APIs and webhooks, team seats with roles, data export, uptime and SLAs. Skeptical of all-in-one tools aimed at small sellers because every one he has tried got replaced within a year. Speaks crisp English with occasional "boss", "yaar", "scene hai".
- **Where CartHedge sits for him:** at best a DM add-on beside Shopify, never a replacement for his stack.

## Round 1

### Stage 1. Cold first impression (Instagram sponsored post)

I'm scrolling at night, I follow a bunch of D2C founders so the algorithm knows who I am. "Every DM answered. Every order closed in the chat." My first thought: another Instagram DM automation, same family as ManyChat or Interakt's Instagram flows, now with "AI" stuck on it. The "approve with a tap" line says this is pitched at a one-person seller who keeps a notebook, not at a brand with a team.

Would I tap? Yes, but as a researcher, not as a buyer. DMs are my known leak, so I'd open it, and I'd do it on a laptop the next morning, not start a trial from the phone at 11 pm. I would not give it my Instagram login on day one.

What I'd suspect: unknown brand, no logo I recognise, no founder face. "Real catalog" which catalog, mine is in Shopify? "In their language" fine, but skincare is claim-sensitive, one wrong line about acne and I have a problem. "No card" is normal.

What I'd need next: does it connect to Shopify, who built it, a price, a customer with my kind of volume, and what the AI is not allowed to say.

### Stage 2. Looking around

What I did, roughly ten minutes:

- **Searched for the brand name plus reviews.** Nothing specific to CartHedge came up, no G2, no Trustpilot, no founder write-ups. Only generic roundups of DM tools. For a ₹2,000 tool I'd shrug at that. For something that will talk to my customers, it's a flag. I'd also ask two D2C founder friends on WhatsApp whether anyone has heard of it.
- **Alternatives I know and what they cost.** Interakt, which I already pay for: Instagram only plan around ₹999 a month, Growth around ₹2,799, Advanced around ₹3,799, WhatsApp message charges on top, and Instagram DMs and comments carry no per message charge. See [Interakt pricing in India](https://blog.campaignhq.co/interakt-pricing-india-2026) and [Techjockey's listing](https://www.techjockey.com/detail/interakt). ManyChat is USD only, about $15 to $29 a month at the entry tiers, roughly ₹1,250 and up, no UPI. See the [INR roundup](https://www.tryunlockdm.com/blog/instagram-dm-automation-india-2026). These are blog figures, I'd confirm on the vendor sites before any decision. Limechat I know from my own invoice. I'd also ask my Limechat account manager whether they can take Instagram DMs, because adding a channel to a vendor I already have beats adding a vendor.
- **Meta and WhatsApp charges.** One roundup puts Indian rates at about ₹0.86 per marketing message and about ₹0.115 per utility message, plus 18% GST, and says service replies beyond the first 1,000 a month per number get billed from 1 October 2026. See [MyOperator's 2026 guide](https://myoperator.com/blog/whatsapp-business-api-pricing-india-2026). I'd verify on Meta's own page. My worry here is practical: if CartHedge sends order updates from its own number, who pays Meta's fee, and do I want customers getting messages from a number that isn't Dew Theory's?
- **Worries before signing up.** Does it touch Shopify, what happens to my customers' chat data, which LLM, where is it hosted, is there an SLA, what if Meta flags my Instagram account.

### Stage 3. After reading product.txt and marketing.ts

What stands out:

- **Good, and better than I expected.** Official Instagram API with webhook signature checks, tokens encrypted. The AI never computes the price, the order summary is calculated in code. Handover rules for complaints and bargaining, a human reply from the Instagram app pauses the bot on that chat, a practice chat to test replies, export of all data, DPDP-style delete. The people who wrote this have thought about what goes wrong.
- **Shopify does not appear anywhere in either file.** Nor do API, webhooks, team seats, roles, audit log, uptime, SLA, status page, data residency or the name of the model. Login is one email and password per business. That is a boutique product, and it shows.
- **Most of the product is a second back office I'd never use.** Kanban board, storefront, share links, GST invoices, returns module, COD confirmation, Razorpay checkout, packing slips, reseller pricing, broadcasts. Shopify, GoKwik, Shiprocket, Interakt, Klaviyo and my returns app already do all of it. The "one plan replaces the DM chatbot, the store builder, the Google Form, the invoice app, the Excel sheet, the order notebook" line describes a business I haven't been since 2021.
- **The proof is empty.** The testimonials in marketing.ts are flagged in the code comments as seeded placeholders, and the RTO calculator assumes refusals fall to about 8%. Honest of the founder to hide them, but it means there are zero customers on record, and RTO is a boutique COD story. My COD slice is already handled by GoKwik.
- **Live versus coming.** Live: the Instagram assistant, order capture, summary, auto-confirm switch, handover, alerts. Coming: WhatsApp on your own number, comment-to-DM, live selling, photo and story matching. The two I'd care about are comment-to-DM and photo matching, and both are not built.
- **What confused me.** (1) The ad says "you approve with a tap", but the Pro plan replies automatically, so what I approve is the order draft, not the reply. (2) Growth gets "AI order capture, connected chats become ready order drafts" while only Pro gets "automatic DM replies". So on Growth who answers the DM? (3) Does a mirrored Shopify order count against the order quota? (4) Buyers are sent to a carthedge.in order link and pay through a separate Razorpay, not my Shopify and GoKwik checkout.

### Stage 4. Interview

**1. In your words, what does it do? What confused you?**
It's an AI that answers Instagram DMs in the buyer's language from your catalog, collects item, size, address and payment into a structured order, shows the buyer an exact summary, and gives the seller a ready order to approve, plus a back office around it. Confusion points are listed in Stage 3: which plan actually replies, what counts as an order, why the buyer leaves my checkout for carthedge.in, and where my Shopify catalog and orders fit. I also could not tell whether the 15 day trial includes Pro features.

**2. Top 3 things that excite you, ranked.**
1. **Instant, catalog grounded replies with an order captured in chat.** DMs are about 200 orders and ₹1.8 lakh a month for me, with a slow and uneven response. If the first reply comes in seconds at 11 pm and the AI collects the address, I expect a double digit lift on that slice. It only counts if the catalog comes from Shopify.
2. **The control design.** Price and totals computed in code, never by the model, handover for complaints and bargaining, human reply pauses the bot, practice chat, draft by default. In skincare, where one wrong claim becomes a problem, that is exactly what I need before I trust it.
3. **Comment-to-DM and story or photo matching when they ship.** Our ads get "price?" and "oily skin ke liye hai?" comments all day. ManyChat-style comment-to-DM feeding a grounded assistant would be real value. It is not live, so I'm not paying for it yet.

**3. Top 3 doubts, fears or deal-breakers.**
1. **No Shopify sync and no team model.** Two sources of truth for orders, inventory and customers across a 4 person team is a deal-breaker, not a preference. One login per business with no roles also fails my basic access control rules.
2. **A wrong claim on my brand's behalf.** A reply that says a serum "cures acne" or is "safe in pregnancy", or mixes actives it shouldn't. I need guardrails I control, an approved knowledge base, and drafts a human sends on sensitive topics.
3. **Reliability and trust of a very young vendor.** No uptime history, no SLA, no status page, unnamed model, unknown hosting region, no customers I can call. On a sale day my DM volume goes up about 5x, and I need to know what the bot does when CartHedge or Meta is down.

**4. Features missing that you'd need.**
- Two way Shopify sync: products, variants, stock, prices and discount codes read in; DM orders created in Shopify with a tag like "source: IG DM"; order and tracking status read back so "order kahan hai" works for all my orders, not just CartHedge ones. **Must have before I pay.**
- Handoff to my own checkout (Shopify and GoKwik link) instead of carthedge.in links. **Must have.**
- Team seats with roles (owner, admin, agent, read-only), shared inbox with assignment, internal notes, who handled what, audit log, 2FA. **Must have** (5 seats minimum).
- Agent assist mode: AI drafts the reply, a human taps send, switchable per topic or category, plus a blocklist of claims and automatic handover for pregnancy, allergy, medical or "reaction" messages. **Must have.**
- Knowledge base beyond the catalog: ingredients, routines, concern to product mapping, FAQs, past support macros, ingested from Shopify metafields and uploads. **Must have** (basic version).
- Public REST API and signed webhooks (conversation started, handover, order drafted, message events), scoped keys, documentation. **Must have** on the plan I'd use.
- Exports: conversations, orders and AI decisions with handover reasons, as CSV or JSON on demand or via API, a signed DPA, and a clear statement of the model provider and data region. **Must have.**
- DM funnel reporting: first response time, conversations to orders, revenue attributed, AI resolved versus handed over. **Must have.** Meta Conversions API push for DM orders: **nice later.**
- Published status page, uptime target in writing, support response times, and a fallback (away message, queue) when the AI is down. **Must have** before I run all DM traffic through it, not for a pilot.
- Comment-to-DM and story reply handling. **Nice later**, but it decides whether I'm still a customer in six months.
- Custom domain or white label order pages, remove CartHedge branding. **Nice later.**
- Routine builder (suggests cleanser, serum and sunscreen together) for upsell. **Nice later.**

**5. Features you'd never use.**
Kanban order board, storefront, share links and QR, custom links, reseller pricing, GST invoices and credit notes, returns and exchange flow, COD confirmation and the RTO meter, packing slips and pick lists, CartHedge phone-OTP checkout, own-Razorpay payments, broadcasts, back-in-stock waitlists, dropped checkout reminders, customer ledger, and WhatsApp automation on my own number (Interakt owns my WhatsApp Business number, I'm not moving it). Courier booking and COD protection overlap with Shiprocket and GoKwik.

**6. What you spend today, and how you like to pay.**
Tools, rough monthly, before GST:

| Tool | ₹ per month |
|---|---|
| Shopify plan and paid apps (reviews, returns, subscriptions, upsell) | 14,000 |
| GoKwik fixed fees | 6,000 |
| Interakt (plan about ₹2,800 plus WhatsApp message charges) | 11,000 |
| Limechat (AI support) | 14,000 |
| Klaviyo-like email and CRM | 9,000 |
| Analytics, attribution, dashboards, misc | 3,500 |
| **Total** | **about 57,500** |

Shiprocket freight is a per shipment cost, not counted here. Salaries for the 4 person team are about ₹1.1 to ₹1.3 lakh a month on top.

Payment: company credit card on autopay each month, with a GST invoice in our company name and GSTIN so we claim input credit. For annual, NEFT against an invoice, only after a pilot. I don't pay vendors on a personal UPI.

**7. Price sensitivity**, for the plan I'd really need (DM assistant, Shopify sync, 5 seats, API, a real support contact), in ₹ per month before GST:
- (a) So cheap I'd doubt it: below ₹1,500. At that price I assume nobody is staffing support or a status page.
- (b) A bargain: ₹3,000 to ₹5,000.
- (c) Getting expensive but I'd still pay: ₹8,000 to ₹12,000, as long as the DM funnel report shows lift. My own math: 200 DM orders a month at about ₹500 contribution each, a 20% lift is about ₹20,000 a month, plus some support hours saved. I'd discount the uplift heavily until I see it.
- (d) Too expensive: above ₹15,000 for what is a DM add-on. At that point I add a human agent or use ManyChat plus Interakt.

**8. React to the current price list.**
- **Fit:** Pro at ₹1,999 is the only plan with automatic replies, and it comes with a quota of 2,000 orders when my DM channel is about 200. So the one feature I'd pay for is sitting behind a volume I'd never use. If I ran all 2,500 orders through it, Pro plus 500 overage orders at ₹2 is about ₹2,999, but I wouldn't, Shopify stays my order system. And I'd resent paying ₹2 an order for a Shopify order the AI never touched, so the definition of an "order" must be DM originated orders only.
- **Would I pay after the trial?** Not straight away. I'd want a 30 to 45 day paid pilot at about ₹2,000 to ₹3,000 on one Instagram account in draft-only mode, then decide.
- **What makes me upgrade:** DM share growing, comment-to-DM shipping, more seats, API access, an SLA.
- **What makes me leave:** one bad claim to a customer, downtime on a sale day, no Shopify sync by month three, the cost per conversation creeping up, a Meta flag on my account, or data I can't export.
- **Which fee model:** flat fee with a clear included volume and a capped overage, because finance can forecast it. Per order is fine only if "order" is unambiguous. A percent of sales never: at ₹22.5 lakh GMV, 1% is ₹22,500 a month and it taxes my growth. For AI agents I know some vendors charge per resolved conversation, around a dollar, though I haven't re-checked it. That might be fairer than quotas but it's less predictable.
- **One more thing:** ₹1,999 for Pro makes me think this product isn't priced for a brand like mine. A real vendor selling SLA and seats would charge more, and I'd trust it more.

**9. Free plan or free trial? How long? Annual discount?**
A free trial, not a free plan. A free plan adds a vendor my team pokes at without any commitment. 15 days with no card is fine to look around, but DM conversion needs a month of real traffic to read, so I'd ask for 30 days, with a Shopify sandbox and draft only mode. Annual: I'd take it at 15% to 20% off, but only after a pilot and with a pro-rata refund clause. Before a pilot I'd want 25%, and I'd still say no.

**10. Add-ons you'd actually pay for** (₹ per month, before GST, unless stated):
- Extra staff seats beyond the first three: about ₹300 to ₹400 per seat.
- API and webhook access, if it isn't in the plan: ₹1,500.
- Two way Shopify sync, if it is not in the plan: ₹1,500 to ₹2,000. For me it is table stakes, so I'd expect it included.
- Priority support with a named contact, 1 hour response in working hours and an uptime SLA with credits: ₹4,000 to ₹6,000.
- More AI conversations beyond a fair use cap: about ₹500 per extra 1,000 conversations.
- Remove branding and custom domain for order pages: ₹1,000 to ₹1,500.
- Done-for-you setup: skincare tone, knowledge base built from my Shopify data and support macros, guardrail list, test chats and two weeks of monitoring: one time ₹15,000 to ₹25,000. Cheaper than my team's time.
- Would not pay: WhatsApp message packs (Interakt), auto replies on my own WhatsApp number, courier booking, COD or RTO protection.

**11. Who else influences the decision, and what they'd ask.**
- **Karthik, co-founder (formulations):** what will it say about ingredients, pregnancy and reactions, who is liable if it says something wrong.
- **Our head of customer support:** can the team work from one inbox, what does the handover look like, can I see what the AI said and turn it off per chat, will it make my team's job disappear or better.
- **Our CA and finance person:** is there a GST invoice on our GSTIN, who is the legal entity, TDS, refund terms.
- **Our freelance Shopify developer:** API docs, auth, rate limits, webhook signing, is there a Shopify app or a custom app, where is data processed.

**12. One sentence you'd say to a friend about CartHedge right now.**
"Smart DM assistant with careful guardrails, but it's built for boutiques with an order notebook; until it syncs with Shopify and has team seats and an API, it's a toy for a brand like ours, so check back after comment-to-DM ships."

## Round 2 notes

- **What I now believe:** The 10 pm instant reply is the real product, and most of this group (Ritu, Farheen, Shabnam, Lakshmi) will pay only ₹500 to ₹1,000, so one price list cannot serve them and a brand like mine. I'd split it: a boutique plan, plus a Brand plan with Shopify sync, 5 seats with roles, API and a draft-reply mode. Without Shopify sync I still pay nothing and won't pilot.
- **Pricing stance:** Brand plan ₹3,000 to ₹5,000 a month is a bargain, ₹8,000 to ₹12,000 acceptable once the DM funnel report shows lift, above ₹15,000 too much. Flat fee with included volume plus capped, per-order overage on DM-originated orders only. Overage must never make a smaller plan cost more than the next plan up (Hiren's ₹2,749 trap). Need an 80% usage alert and a hard-cap switch, since overage currently goes into the next autopay charge (Vikram's fear). WhatsApp costs passed through at cost from a prepaid wallet, no markup, auto-pause at zero. Agencies get paid for setup (₹15,000 to ₹25,000 one time), not recurring commission on Brand plans.
- **New fears and ideas:** What the bot does when Meta throttles API sends at a sale-day spike (5x DMs): need a queue plus an away message. Also still want an uptime SLA and a status page.
- **Agree with:** Tanya (cheap price signals no SLA, drop volume is unproven), Vikram (silent overage hikes kill trust), Hiren on overage design but not on "per order never", Rohit on partner demos (asked if he'd build my knowledge base).
- **Disagree with:** Hiren's flat-only absolutism, and the group's pull toward ₹499 to ₹999 as if it were the only market.

## Round 3 notes

- **Concrete plan:** Brand plan ₹4,499 flat, Shopify sync, 5 seats, API, 1,000 DM orders included, ₹2 per order above 1,200 capped monthly, hard stop in Razorpay mandate. Shopify Sync plan for resellers at ₹1,999, 1,500 orders, ₹1 per extra capped ₹1,000. Boutique plan ₹499 to ₹799 covers Ritu and Farheen; same platform, one price list serves all if quota logic matches the business.
- **What makes me pay:** Shopify sync shipped and proven on existing data. What makes me leave: overage without a hard cap, any claim the bot makes that our CA must audit, or Shopify sync pushed to year two roadmap.
- **Disagree still:** Tanya thinks her drop needs ₹12,000, I think it is a different product (200 concurrent chats, ₹8,000 plus on-call per hour). Rohit wants setup commission plus recurring 25-30%; I want one-time setup fee for agencies, zero recurring on the Brand plan because it is pure SaaS margin. Prepaid wallet for WhatsApp is non-negotiable, no prepaid pack markup as Shabnam fears.

## Round 4 vote

- **Vote: none, unless Shopify sync ships on day one.** The safeguards (hard caps, alerts, order definition) are solid, but CartHedge stays a boutique product without Shopify sync. Two sources of truth across my Shopify, GoKwik, Shiprocket and team breaks ops. Brand/Partner at custom pricing without explicit Shopify sync is a roadmap gamble I won't take.
- **Deal-maker: Shopify sync (orders, inventory, discounts, two-way) with API docs and 5 seats at ₹4,499 flat.** That is a bargain. Without it, Interakt plus Shopify is my stack. Fairness: 4/5 because the plan design is good, but it is not built for brands like mine.
