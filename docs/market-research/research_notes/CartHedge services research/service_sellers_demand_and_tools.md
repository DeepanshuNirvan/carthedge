# Service sellers on Instagram and WhatsApp: demand, tools and rules (Nov 2026)

Research date: 16 Nov 2026. Question from the owner: many businesses on Instagram and WhatsApp sell a service (bookings, events, packages, trips, transport) and not a product. Should CartHedge cater to them, and what does the outside world say about how?

This file holds the evidence. The decision and the architecture are in `docs/superpowers/specs/2026-11-16-services-support-design.md`.

Source quality notes:
- Everything here came from web search summaries on 15–16 Nov 2026. No page was opened and read in full, so each line is "search summary of" its source.
- Most demand numbers come from vendor and marketing blogs. They are marked [vendor blog] and are directional only.
- No search found a breakdown of Indian WhatsApp or Instagram businesses by products versus services. That number does not appear to be published.
- Builds on `research_notes/CartHedge feature gap research/chat_commerce_competitors.md` and `meta_platform_and_compliance.md` (11 Oct 2026), which already cover Meta Business AI, BSP feature sets and WhatsApp Flows.

## Q1. Is there real demand from service sellers?

### Takeaway
Yes, but it cannot be sized from public data. The signals are indirect and they agree: Meta built lead capture and appointment booking into its own India launch, every Indian BSP sells a lead-qualification agent aimed at travel, real estate, clinics and services, and service providers describe the same pain product sellers do (enquiries arrive in DMs while they are busy, and a slow reply loses the client).

### Cited findings
- Meta's Business AI for small businesses in India (launched 7 May 2026) is described as answering queries 24/7 and being able to "capture leads, book appointments, and drive sales". Services are in Meta's own framing of the small-business use case, next to products. — [Business Today](https://www.businesstoday.in/technology/story/whatsapp-launches-ai-powered-customer-support-for-small-businesses-in-india-upi-payments-coming-soon-530313-2026-05-07), [Meta Newsroom](https://about.fb.com/news/2026/05/introducing-business-ai-on-whatsapp-for-small-businesses-in-india/amp/), [Free Press Journal](https://www.freepressjournal.in/tech/whatsapp-launches-business-ai-for-247-sme-customer-support-in-india)
- A Deccan Herald piece (July 2026) says the Meta Business Agent in India can book appointments and qualify leads. The same piece carries a date error about the Instagram rollout, so treat its detail with caution. — [Deccan Herald](https://www.deccanherald.com/technology/artificial-intelligence/whatsapp-gets-gen-ai-powered-meta-business-agent-for-small-enterprise-owners-in-india-4065355)
- A claim attributed to the Travel Agents Federation of India: more than 70% of domestic travel enquiries now arrive through WhatsApp or social media. Not verified against the original survey. — [CampaignHQ, vendor blog](https://blog.campaignhq.co/whatsapp-for-tour-operators/)
- Makeup artists in India typically put a WhatsApp or DM contact in the bio, and a click-to-chat link is recommended over a form because it removes steps. A slow or missed WhatsApp reply is named as where most bookings are lost; one example is a reply sent six hours late after the lead had already contacted three other artists. — [Kolkata Digital, vendor blog](https://kolkatadigital.in/blog/facebook-ads-strategy-makeup-artists-india/), [Kolkata Digital, vendor blog](https://kolkatadigital.in/blog/digital-marketing-for-makeup-artists/)
- One vendor anecdote: a Mumbai bridal artist could not answer DMs during four-hour appointments; after instant automated replies she reported 42 structured enquiries a week and doubled bookings. Single case, supplied by the vendor. — [SocialGrow, vendor blog](https://socialgrow.app/for/makeup-artists/)
- WhatsApp commercial transactions are said to have grown 3x year on year "particularly among SMBs in retail and services". Unverified. — [Coliflo, vendor blog](https://www.coliflo.com/blog/coliflo-9/whatsapp-business-statistics-2026-adoption-usage-and-trends-975)
- General scale, for context only: roughly 535–550 million WhatsApp users in India and about 1.5 crore businesses; "78% of India's small businesses use WhatsApp for customer communication" is repeated across blogs with a vague "2026 industry survey" attribution. — [Hyperleap](https://hyperleap.ai/blog/whatsapp-statistics-india-2026), [RichAutomate](https://richautomate.in/blog/whatsapp-users-india-2026-statistics), [ZazzyAgent](https://blog.zazzyagent.com/whatsapp-marketing-statistics-india-2026)

### What is missing
- No count of service businesses on Instagram or WhatsApp in India.
- No survey of service providers on what they would pay.
- CartHedge's own simulation panel (`docs/market-research/simulation/personas`) has 16 personas and every seller in it sells a product. There is no service persona to test this against.

## Q2. Does reply speed matter as much for services as for products?

### Takeaway
More, if anything. A service enquiry is a lead that is being sent to several providers at once. The published numbers are old or vendor-supplied, but they all point the same way.

### Cited findings
- The most cited figure: replying within 5 minutes makes a business about 21 times more likely to qualify a lead than replying at 30 minutes. It traces to a 2011 Harvard Business Review study, not to WhatsApp data. — [SetSmart](https://setsmart.io/blog/lead-response-time-statistics), [Hyperleap](https://hyperleap.ai/blog/slow-response-times-cost-businesses)
- A contractor (home services) study: 35–41% conversion when the reply comes within 5 minutes, 13–16% after an hour, and 81% of businesses take longer than 5 minutes. — [CustomerFlows](https://customerflows-website.pages.dev/research/contractor-lead-response-time-study/)
- An unsourced WhatsApp B2C table: 60–70% response rate when the reply lands in 1–5 minutes, 25–35% at 15–60 minutes. Do not quote these numbers. — [Aurora Inbox, vendor blog](https://www.aurorainbox.com/en/2026/05/28/whatsapp-conversion-response-time-2026/)
- Automated reminders are reported to cut appointment no-shows by 30–45% (API benchmarks, not the Business app). — [Coliflo, vendor blog](https://www.coliflo.com/blog/coliflo-9/whatsapp-business-statistics-2026-adoption-usage-and-trends-975)

## Q3. How do existing tools handle a service enquiry in chat?

### Takeaway
They all do the same thing: collect a short, fixed set of requirement fields in the chat, then route the qualified lead to a person. Nobody lets the bot confirm the booking. The fields differ by trade, which is why a seller-defined question list is the general answer and a per-industry schema is not.

### Cited findings
- A travel example (BreakBag, Kolkata): the bot captures destination, dates, group size, budget and trip type, then routes to a consultant. — [BotPenguin case study](https://botpenguin.com/case-studies/customers/breakbag)
- AiSensy sells a ready-made lead-qualification agent that "asks the next logical question instead of the next scripted one" and decides whether a lead is sales-ready. AI messages are metered, with 500 free to test. — [AiSensy](https://aisensy.com/whatsapp-ai-agent-library/lead-qualification-agent), [AiSensy blog](https://m.aisensy.com/blog/qualify-whatsapp-leads-with-ai-agent/)
- AiSensy also lists a travel booking agent, and Gallabox has a travel-agency page. — [AiSensy](https://aisensy.com/whatsapp-ai-agent-library/travel-booking-agent), [Gallabox](https://gallabox.com/industry/travel/travel-agencies/multichannel-messaging)
- Interakt lists a lead-qualification AI agent described as best for real estate, clinics and services. A competitor review says Interakt's chatbot builder is tuned for e-commerce flows and not for general lead qualification or appointment booking. — [Interakt](https://interakt.shop/whatsapp-ai-agents/), [Kraya, competitor blog](https://kraya-blog-platform.vercel.app/interakt-alternatives)
- Wati's flow builder is described as deeper (200-step multi-branch flows) with per-seat caps (3 users on Growth, 5 on Pro). — [Kraya, competitor blog](https://kraya-blog-platform.vercel.app/interakt-alternatives)
- Urban Company, the consumer marketplace, splits its catalog into a booking section for fixed-price services and a non-booking section for variable-price services. That is the same fixed / on-request split proposed for CartHedge. — [Apptunix](https://www.apptunix.com/blog/how-urbanclap-works-business-model)
- Zoca (founded 2024) positions itself as an AI growth platform for local service businesses. Nothing was found on Exly or Topmate in this pass. — [Elevation Capital](https://elevationcapital.com/zoca)
- From the 11 Oct notes: WhatsApp Flows suit slot booking for service sellers (salons, tailors) but do not render on WhatsApp Web, so a link fallback is needed. — `meta_platform_and_compliance.md`

## Q4. How do commerce platforms model "things that are not shipped"?

### Takeaway
One catalog, with a flag on the item that says whether it ships. Nobody runs a second catalog for services.

### Cited findings
- Shopify uses a per-product "This is a physical product" switch. Unticking it marks the item as virtual and checkout stops collecting shipping. The CSV column is "Variant Requires Shipping", so the flag lives on the variant. — [Thrive help](https://help.thrivemetrics.com/en/articles/2580742-shipping), [Shopify Community](https://community.shopify.com/t/selling-digital-product-but-has-shipping-issue/59613)
- Medusa reads a `requires_shipping` property from the variant's inventory item. — [Medusa docs](https://docs.medusajs.com/resources/commerce-modules/product/selling-products/index.html.md)
- Not from these results, from memory and unverified: Shopify's Admin API exposes the same flag as `requiresShipping`, and the WhatsApp Business app catalog lets a business list services as well as products.

## Q5. What rules change when the thing sold is a service?

### Takeaway
Three things: GST on advances, the WhatsApp policy on regulated services, and nothing else of note for a product that only captures enquiries.

### Cited findings
- **GST on advances.** For services, the time of supply is the earlier of the invoice date and the date payment is received, so GST is due when an advance comes in. For goods, Notification 66/2017-Central Tax (15 Nov 2017) removed GST on advances for registered suppliers outside the composition scheme. Section 31(3)(d) of the CGST Act requires a receipt voucher when an advance is received. One taxtmi page reads the notification differently; the official text should be checked. — [Tally](https://tallysolutions.com/gst/when-is-gst-payable-on-advance-payments-rules-for-goods-vs-services/), [GSTZen](https://gstzen.in/a/gst-on-advances-received-for-future-supplies.html), [TaxGuru](https://taxguru.in/goods-and-service-tax/gst-advance-services-tax-payable-work-begins.html), [GST Council flyer](https://gstcouncil.gov.in/sites/default/files/e-version-gst-flyers/Time%20of%20supply%20in%20GST.pdf)
- **SAC codes.** The searches returned nothing on SAC. From general knowledge, unverified here: services are classified under SAC codes (chapter 99, six digits) where goods use HSN. CartHedge's validator already accepts 4, 6 or 8 digits (`shop.ValidHSN`), so a SAC passes today.
- **WhatsApp Business Messaging Policy** (official page last updated 23 Sep 2026). Businesses may not offer commerce experiences for regulated verticals; healthcare guidance says not to use WhatsApp for telemedicine or to send or request health information. Third-party summaries conflict on gambling and say nothing on financial services, and they predate the September update. Read the official page before launch. — [WhatsApp Business policy](https://whatsappbusiness.com/policy/), [Messente](https://support.messente.com/whatsapp-usage-restrictions), [Interakt](https://www.interakt.shop/blog/whatsapp-messaging-policy-for-new-industry)

## What this means for CartHedge
- The demand is real enough to design for and too thinly evidenced to bet the roadmap on. Build the small version, and put two or three service personas through the simulation panel (or talk to five real service sellers) before building paid bookings.
- The market's answer to "what does the bot do with a service enquiry" is settled: answer from the seller's details, collect a few requirement fields, hand a structured lead to a person. CartHedge's turn engine already does the first and the last.
- The requirement fields must be the seller's own list. Travel wants destination, dates, people and budget. An event planner wants date, venue and guests. A transporter wants pickup, drop, date and vehicle. One schema cannot hold all three.
- Meta's free Business AI already does lead capture and appointments inside the WhatsApp Business app. For services, CartHedge's edge is narrower than for products: Instagram DMs, a structured enquiry inbox, the seller's own questions, and an advance-payment link.
