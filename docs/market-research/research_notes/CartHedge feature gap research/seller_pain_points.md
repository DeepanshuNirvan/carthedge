# Pain points and unmet needs of Indian Instagram/WhatsApp sellers (2025–2026), and what CartHedge should build

Research date: 11 Oct 2026. Scope: real-world evidence that confirms, refutes or adds to the simulated-panel backlog in `docs/market-research/FEEDBACK.md` and the open items in `docs/FEATURE-GAPS.md`.

**Read this first: source limits.** Reddit could not be reached at all (WebSearch, WebFetch and the in-app browser all refuse reddit.com), and Quora/YouTube/LinkedIn turned up nothing usable. So the "real seller voice" in these notes comes from: (a) Indian merchants' dated reviews on the Shopify App Store, (b) Indian court cases and news (MediaNama, Karnataka GST coverage), (c) seller quotes in Meta's own India announcement (picked by Meta), and (d) industry and vendor data. Most RTO, COD and AOV numbers come from vendors (GoKwik, Shipway, Unicommerce, ClickPost) that sell into this market. Survey data and anecdote are labelled throughout. There is no independent 2025–26 survey of Indian DM sellers.

## 1. What do Indian social sellers complain about most, and how bad is each problem?

### Takeaway
The best-evidenced and most expensive pains are (1) COD returns-to-origin (RTO) and fake COD orders, (2) courier failures after dispatch (fake failed-delivery reports, weight disputes, slow COD payouts, tracking that never updates, support that doesn't answer), and (3) checking payments by hand against UPI screenshots. After these come reply load and missed DMs, platform risk (Meta disabling accounts with no human review), and a new fear of tax notices based on UPI data. Meta's free-to-set-up "Business AI" in the WhatsApp Business app (announced May 2026) now covers the basic "price?"/FAQ auto-reply, so CartHedge has to win on what comes after the reply: the order, the payment, COD risk and the courier.

### Cited Findings

**COD returns (RTO) and fake orders — industry/vendor data**
- COD RTO was 26% in FY25, against under 2% for prepaid (Shipway ShipNotes, vendor data) — [Angadi Labs benchmark compilation](https://www.angadilabs.com/blog/india-fashion-ecommerce-benchmarks)
- COD return rate was about 24% vs about 10% for prepaid in full-year 2024. FY23 was 20.9% vs 5.8% (Unicommerce, vendor) — [Angadi Labs](https://www.angadilabs.com/blog/india-fashion-ecommerce-benchmarks)
- Festive quarter, FY2026: COD return rate about 58% vs under 15% for prepaid (Unicommerce India D2C Report, vendor) — [Angadi Labs](https://www.angadilabs.com/blog/india-fashion-ecommerce-benchmarks)
- Industry-average RTO is about 20–25%, rising to about 40% in fashion and footwear. A ₹1,000 COD order that bounces loses an estimated ₹200–250 (GoKwik, undated, vendor) — [Angadi Labs](https://www.angadilabs.com/blog/india-fashion-ecommerce-benchmarks)
- GoKwik's Vineeta Vora: with prepaid orders "the RTO percentage remains relatively low. But COD can push the RTO rate to 30-40%" — [Inc42](https://inc42.com/features/early-stage-d2c-brands-can-scale-faster-and-profitably-with-kwik-cod-app-on-shopify-gokwiks-vineeta-vora/)
- At a 2024 TechSparks panel, Sanil Jain (The Better Shop) said COD RTO is nearly five times prepaid, averaging around 15–20%. Delhivery's Nikhil Vij suggested small COD handling charges to "gauge customer intent" (2024, from search summary; the page returned 403 on fetch) — [YourStory](https://yourstory.com/2024/03/d2c-expert-strategies-reducing-returns)
- A courier aggregator's guide for Instagram sellers names the RTO causes as addresses typed into DMs (missing landmarks, wrong pincodes), unconfirmed COD intent, buyers not at home, and "some delivery executives mark NDRs without genuinely attempting delivery". Quote: "Packing and shipping an unconfirmed COD order is betting your forward freight and product cost on a DM conversation." (dated 10-07-2026, vendor) — [iCarry](https://www.icarry.in/pages/blog/instagram-shipping-guide-cut-rto-social-sellers.html)

**Fake COD orders — Indian merchants' own words (anecdote, Shopify App Store reviews)**
- "Very useful in preventing fake COD orders." … "The app uses both Call & WhatsApp to confirm COD orders." (14 Cosmic Secrets, 13 Feb 2024) — [Shopify App Store: Hillteck Verify COD](https://apps.shopify.com/reviews/1311627)
- A store owner said most fake orders stopped once buyers had to pay 10% upfront to place a COD order. Another said OTP plus phone confirmation for COD let them avoid fake orders and spend less on ads and shipping (from a search summary of several COD-app review pages; merchants are not named and the exact page is not pinned; likely this one) — [Shopify App Store reviews](https://apps.shopify.com/reviews/686349)
- One reviewer called a COD-verification app "one of the most needed app for Indian Sellers" because it cuts "Not so Serious and False Orders" (from a search summary; exact page not pinned; likely this one) — [Shopify App Store reviews](https://apps.shopify.com/reviews/798126)

**Courier failures after dispatch — Indian merchants' own words (anecdote, Shopify App Store, 1-star reviews of Shiprocket)**
- "The invoiced weight shown on shipments is often less, but a higher amount is deducted from the wallet" (Akshay Gems, 9 Jan 2026) — [Shopify App Store: Shiprocket reviews](https://apps.shopify.com/shiprocket/reviews?ratings%5B%5D=1&page=2)
- "we're now seeing fake weight disputes being raised, even for products with standard, verified packaging" (Mak Power India, 5 Nov 2025) — same source
- "3 delivery attempts were marked failed, but no call was received by the customer even once." (Spiru Swastha, 25 Dec 2025) — same source
- "Even RTO didn't reach us, every time a ticket is raised for our issue but no satisfactory outcome." (Ruvya Farm, 3 Nov 2025) — same source
- "Shiprocket's delivery date/status doesn't update properly." (Inksane Prints, 16 Jan 2026) — same source
- "The ticket was closed without a resolution." (Masakali.com, Jun 2026) and "when questioned they ghost you completely." (LilSupernova, Jun 2026) — same source
- Competitor blogs put COD payouts at about D+8 working days or "8–10+ days", which hurts cash flow. They also say weight disputes arrive a month late, after sellers have lost their packing records. These are competitor claims, not verified — [Capterra/Trustpilot/competitor summaries via search](https://www.capterra.com/p/159386/Shiprocket/reviews/); [Trustpilot Shiprocket](https://www.trustpilot.com/review/www.shiprocket.in?page=6)

**Payment verification and fake UPI screenshots**
- Edited or generated "payment successful" screenshots, and fake UPI apps, target small shops and individual sellers. The only real proof is money in the seller's own account, matched by UTR (vendor and fraud-education guides) — [PhonePe Business](https://business.phonepe.com/articles/fake-upi-payment-scams-how-to-identify-and-prevent-fraud); [Cashfree](https://www.cashfree.com/blog/fake-payment-screenshot-scams/)
- A LocalCircles survey (June 2025, as reported) found 1 in 5 UPI-using families had faced UPI fraud at least once in three years. This is about UPI fraud in general, not screenshot fraud. Found in a search summary and not verified at the primary source — [Whalesbook summary](https://www.whalesbook.com/news/English/tech/Fake-UPI-Scams-Trick-Merchants-Costing-Millions-with-Fake-Proof/69e8a6cdbca97ee1069f7d22)
- In DM selling, order details are scattered: "The item is in one message, the address in another, and the payment screenshot in a third." Sellers "search chat history to answer 'has this shipped yet?'" (vendor) — [smolbusiness.in](https://smolbusiness.in/order-management-instagram-sellers)

**Reply load and missed DMs**
- Kantar (2025, cited by Meta): 91% of online adults in India chat with a business every week — [Meta newsroom, May 2026](https://about.fb.com/news/2026/05/introducing-business-ai-on-whatsapp-for-small-businesses-in-india/)
- A seller in Meta's announcement (The Purple Sunset, Gunveen Kaur) handled 60–70 queries a day and says the AI helps "close 6-7 orders daily directly through queries handled by the AI". Soil Concept's Tuba Siddiqui: "I just uploaded our product catalog and documents, and the AI learned the details and tone of my business." Meta chose these case studies — [Meta newsroom](https://about.fb.com/news/2026/05/introducing-business-ai-on-whatsapp-for-small-businesses-in-india/)
- **Competitive fact:** Meta's Business AI, inside the free WhatsApp Business app, "answers customer queries 24/7, recommends products, captures leads, books appointments", answers FAQs on "pricing, discounts, and shipping", "works in all native Indian languages", and lets the owner take over. UPI payments in chat are "coming soon". It was rolling out "over the coming weeks" from May 2026 to eligible Indian SMBs. Pricing is not stated, and Instagram is not mentioned — [Meta newsroom](https://about.fb.com/news/2026/05/introducing-business-ai-on-whatsapp-for-small-businesses-in-india/)
- "DM for price": a buyer commenting on Indian influencer-promoted shops wrote that sellers who don't list prices waste "the seller or the buyer's time" and make them "wary of the seller's credibility" (one India-specific comment; the other evidence is non-Indian forums) — [Lavs Mohan Substack comments](https://lavsmohan.substack.com/p/how-influencers-make-us-buy-stuff/comments)

**Platform risk: Meta disabling business accounts (anecdote and court records)**
- MediaNama (23 Sep 2026): a D2C founder lost his Business Manager, ad accounts, linked Instagram assets, pixels and campaigns when Meta flagged his personal account. He estimated losses above ₹10 lakh and said the business "has effectively been shut". Other quotes: "Decision is final. Not open for review" and "No human explanation. No chance to provide evidence." Four businesses or creators took Meta to court in 2026, and Blink Digital's suit claims ₹1,158 crore. Meta does not publish how many Indian businesses it disables — [MediaNama](https://www.medianama.com/2026/09/223-meta-disabled-business-manager-accounts-india/)
- WhatsApp banned over 9.7 million Indian accounts in February 2025 for ToS violations, 1.4 million of them before any user report. There is no breakdown for business accounts — [Deccan Herald/PTI](https://www.deccanherald.com/amp/story/business%2Fcompanies%2Fwhatsapp-bans-over-97-million-accounts-in-india-during-feb-3472242)
- Vendor guides say WhatsApp messaging limits moved from per-number to per-Business-Portfolio in Oct 2025. Unverified portfolios start at 250 business-initiated messages per 24h, and Business-app broadcast lists cap at 256 contacts (vendor, not Meta docs) — [Chatarmin](https://chatarmin.com/en/blog/whats-app-messaging-limits); [Chakra](https://chakrahq.com/article/whatsapp-business-account-restricted-fix)

**Tax fear (news, July 2025)**
- Karnataka's Commercial Taxes Department sent GST notices to small traders based on total UPI receipts. A Haveri vegetable vendor was asked for ₹29 lakh after ₹1.63 crore in UPI credits over four years. Traders objected that personal transfers and exempt goods were counted as taxable turnover, and many went "cash only" — [Angel One](https://www.angelone.in/news/economy/upi-gst-notices-in-karnataka-worry-small-traders); [The News Minute](https://www.thenewsminute.com/amp/story/karnataka/karnataka-how-a-vegetable-vendors-gst-notice-triggered-a-statewide-upi-boycott); [ETV Bharat](https://www.etvbharat.com/en/!bharat/from-digital-to-cash-karnataka-small-traders-avoid-upi-payments-amid-gst-crackdown-enn25072002295)
- Officers asked for purchase bills and bank statements going back years, records most small businesses do not keep (search summary of the coverage above) — [The South First](https://thesouthfirst.com/news/gst-bhagya-thanks-to-upi-karnataka-vendors-reject-tax-notices-that-defy-all-logic)

**Ad spend that can't be traced to sales (vendor evidence only)**
- Click-to-WhatsApp ads are credited when a conversation starts, not when a sale happens. Purchase attribution needs the click ID (ctwa_clid) and Meta's Conversions API for Business Messaging. Blip counts conversions per conversation session within 90 days — [Blip help](https://help.blip.ai/hc/en-us/articles/12914940940055-How-to-use-Click-Tracker-to-determine-which-Click-to-WhatsApp-ad-is-best-for-your-business); [Gupshup CTWA launch, CXOToday](https://cxotoday.com/press-release/gupshup-launches-an-end-to-end-platform-for-ads-that-click-to-whatsapp-with-full-funnel-attribution-and-ai-powered-optimization/)

**Return fraud (vendor evidence)**
- Swap fraud (a different item comes back) and empty-box disputes are hard to win because the seller "cannot show what was inside the box". The suggested fix is a packing video tied to the order ID, plus weighing returns on arrival (vendor) — [Trackvid: empty box](https://trackvid.in/blogs/empty-box-return-scam-ecommerce-india.html); [Trackvid: swap fraud](https://trackvid.in/blogs/swap-fraud-ecommerce-returns-india.html)
- Meesho sellers protested after logistics partners were given authority over refund claims. They allege returns come back "tampered with or contain the wrong items" (analysis piece; these are sellers' allegations) — [LinkedIn Pulse](https://www.linkedin.com/pulse/sellers-legal-notice-underscores-meeshos-troubles-post-burn-era)

### Inferences

**Ranked pain list.** Rank = how often it shows up in the evidence × money lost per incident. Status: "Exists" means CartHedge ships it today (per FEATURE-GAPS.md); "Open" names the gap ID.

| # | Pain | Evidence strength | Severity | Feature that solves it | CartHedge status |
|---|------|------------------|----------|------------------------|------------------|
| 1 | COD RTO and fake COD orders | Strong (multiple vendor datasets, merchant reviews) | Very high: ₹200–250 lost per ₹1,000 bounced order; COD RTO 26% vs prepaid <2% | COD confirmation (exists); prepaid discount/COD fee (exists, 3.5); **partial-advance COD (10% or ₹30–50 token, adjusted against the bill)**; **block COD for risky buyers (3.7 open)**; **non-serviceable/COD-blocked pincodes (3.6 open)**; address quality check (landmark + pincode validation) at capture | Partly |
| 2 | Courier failures: fake failed-delivery (NDR) reports, weight disputes, slow COD payouts, tracking that doesn't update, support that doesn't answer | Strong for a seller-voice signal (8 dated 1-star reviews from Indian merchants, Nov 2025–Jun 2026) | High: wallet deductions, lost RTO parcels, cash locked 8–10 days | **Courier status sync (3.4 open)**; **failed-delivery workflow**: when the courier reports a failed attempt, WhatsApp the buyer "did the courier call you? reschedule / change address", and give the seller proof to dispute fake attempts; **packed-weight + photo record per order** to contest weight disputes; **COD payout tracker** (expected vs received per AWB) | Open |
| 3 | Checking payments by hand / fake UPI screenshots | Medium (fraud guides, payment-company content; no seller survey) | High per incident (goods shipped unpaid) | Payments confirmed by gateway webhook (exists for own-Razorpay); for direct UPI claims, **UTR entry + match against the seller's statement**, and an explicit "screenshot is not proof" rule in the AI and the seller UI | Partly (UPI claims are settled manually) |
| 4 | Reply load / missed night DMs / "price?" | Medium-strong (Kantar 91% weekly chat; Meta case studies) | Medium: lost sales, not lost money | AI DM replies (exists). **Note:** Meta's own Business AI now does basic FAQ/price answers inside the free WhatsApp Business app, so an AI that only replies is no longer a reason to pay | Exists, now commoditising |
| 5 | Order details scattered across chats / "where is my order?" messages | Medium (vendor guides) | Medium: time sink | Order board + buyer tracking page (exist); **proactive dispatch and out-for-delivery messages**, which depend on 3.4 | Partly |
| 6 | Account disabled or hacked, all buyers lost | Medium (court cases, MediaNama 2026; scale unknown) | Catastrophic but rare | **Own the customer list**: storefront link + opted-in buyer contacts + one-click export (exists in part, 5.2); "if Instagram goes down, message your buyers here" fallback; 2FA prompts | Partly; not marketed |
| 7 | GST/tax-notice fear from UPI data | Medium (Karnataka, July 2025; one state, big news) | High fear, low frequency | **Turnover vs GST-threshold tracker** on the seller dashboard; business-only payment rail and an exportable sales ledger (orders, invoices, refunds) to show as evidence of real taxable turnover | GST invoices exist; tracker open |
| 8 | Buyers don't trust the seller, so they won't pay upfront or order at all | Strong at market level (see section 5) | High: caps conversion and forces COD | **Verified-seller badge** (GSTIN/phone check), public policy page (exists), reviews (6.4 open), UPI-on-delivery messaging | Partly |
| 9 | Return fraud (swap, empty box) | Weak-medium (vendor, Meesho allegations) | High for jewellery/electronics | **Packing-video/photo evidence tied to order code**; return photos (exist); weigh-on-receipt field | Partly |
| 10 | Ad spend with no link to sales | Weak (vendor only) | Medium for sellers who run ads | **Tag each chat/order with its ad source** (IG/CTWA referral, ctwa_clid) and report orders and revenue per ad; optionally send purchases back via Conversions API | Open |
| 11 | WhatsApp broadcast limits and bans | Medium (ban counts, vendor limit guides) | Medium | Consent-based broadcasts (exists); quality-rating monitor and send throttling | Partly |

- Pains 1, 2 and 3 are all about money leaking after the chat, and that is CartHedge's lane (order + payment + COD + courier). The evidence points CartHedge's roadmap away from smarter replies and toward closing the loop after dispatch: courier sync, failed-delivery handling, payout reconciliation, risk blocking.
- Meta's May 2026 Business AI weakens the "AI replies in the buyer's language" headline. CartHedge should lead with what Meta's tool doesn't do: Instagram, structured order capture, COD risk, courier, GST invoices and returns. It should also make sure its WhatsApp own-number flow (FEEDBACK must-have #1) coexists with, and doesn't fight, the native Business AI.

### Gaps
- No real Reddit, Quora or YouTube seller threads could be read (reddit.com is blocked for every tool in this environment). Frequency ranking leans on vendor content and app-store reviews, not a seller survey.
- No source found for the share of DM time spent on "price?" questions, or for hours per day spent replying.
- A widely repeated vendor claim that checking UPI screenshots by hand takes "3.3 hours per 100 orders" and that fake screenshots are the "#1 fraud vector for Instagram sellers" could not be traced to a specific page. ordermatrix.in returned 404, and smolbusiness.in doesn't contain it. Do not use it.
- No data on how many Indian Instagram seller accounts are disabled or hacked each year.
- The ad-attribution pain rests only on vendor content; no Indian seller testimony was found.

## 2. How do sellers run operations today, and where does it break?

### Takeaway
The typical setup is a WhatsApp Business catalogue or Instagram DMs, payment by UPI link or screenshot, a courier aggregator (Shiprocket and similar), and records kept in chats and memory. It breaks when payments have to be checked, at address capture, after dispatch, and whenever two inboxes have to be reconciled. Storefront builders made for small sellers (Dukaan's small-merchant focus, Khatabook MyStore, OkCredit OkShop) pivoted away or shut down. That suggests small sellers don't move to a website, so the tool has to live inside the chat.

### Cited Findings
- Typical home-seller flow: the customer replies with an order in chat, the seller confirms availability, shares a payment link, and delivers the next day (illustrative 2026 vendor scenario) — [Zyfoo](https://www.zyfoo.tech/whatsapp-commerce-india-smb/)
- A Better India profile of a hamper seller: most buyers order over Instagram DMs and WhatsApp and pay by Google Pay or Paytm. She gets 4–5 Instagram queries a day and not every one converts (about four years old, so pre-2025) — [The Better India](https://thebetterindia.com/309477/pakistan-india-women-entrepreneurs-building-social-media-business-marketing-on-facebook-instagram/)
- Shiprocket said 30% of its transactions are "manually initiated", mainly through chat on social apps (Outlook Business, about 2024, pre-2025) — [Outlook Business](https://www.outlookbusiness.com/corporate/shiprocket-bets-big-on-whatsapp-to-enhance-e-commerce-experience-report)
- Sacra's Shiprocket profile says 70–80% of Shiprocket's demand comes from Meta platforms. This is a single profile claim with no primary source — [Sacra](https://sacra.com/c/shiprocket/)
- Unicommerce lists the operational failures of social sellers: orders spread across chats and platforms, COD RTO with reverse-logistics cost and blocked inventory, unsynced stock across Instagram/WhatsApp/marketplaces causing overselling, slow replies, and overpromised delivery dates (vendor, 2026) — [Unicommerce](https://unicommerce.com/blog/social-commerce-india/)
- Dukaan moved its focus from small merchants/kiranas to D2C brands and enterprises, with layoffs in 2022–23. Khatabook (MyStore) and OkCredit (OkShop) stopped their storefront products — [BW Disrupt](https://www.bwdisrupt.com/article/retailtech-startup-dukaan-laysoff-around-57-employees-report-469781); [Saison Capital, Medium (403 on fetch; claim from search summary)](https://medium.com/saison-capital/the-shuttering-of-digital-storefronts-ba0f3145a6c5)
- Courier aggregators can auto-start a return after 2–3 failed attempts, so failed-delivery reports have to be reviewed every day (vendor) — [iCarry](https://www.icarry.in/pages/blog/instagram-shipping-guide-cut-rto-social-sellers.html)
- Under the courier's policy, weight disputes can be auto-accepted if the seller misses the response deadline (competitor-blog claim, not verified) — [Capterra summary via search](https://www.capterra.com/p/159386/Shiprocket/reviews/)

### Inferences
- Where it breaks, in order: (1) address and COD intent at capture, (2) checking the payment, (3) everything after the courier takes the parcel. CartHedge covers (1) and most of (2). (3) is the biggest open hole (FEATURE-GAPS 3.4, 3.6, 3.7).
- The storefront-builder shutdowns support CartHedge's "chat first, storefront as checkout" design, and argue against marketing the storefront as the main product.
- Selling the same stock on Instagram and WhatsApp is a real complaint (Unicommerce), and it supports keeping one stock count across both inboxes and the storefront. CartHedge's single catalogue already does this, so it can say so in marketing.

### Gaps
- No 2025–26 data on what share of DM sellers use Google Sheets, notebooks or WhatsApp labels.
- No real-world evidence on Dukaan or Shiprocket churn reasons beyond app reviews.

## 3. What does the scale data say? (sellers, COD share, RTO, AOV, chat share)

### Takeaway
India's e-retail market was $65–66B GMV in 2025, with 290–300M shoppers. The seller base tripled over 2020–25, and Tier 2+ sellers grew about 4x. About 850M Indians use chat/social media, but two-thirds of them don't shop online yet. COD is still about half of orders even at festive peaks (higher across the year and in Tier 3), and COD's RTO is roughly 10x prepaid. No reliable count of Instagram/WhatsApp sellers exists.

### Cited Findings
- E-retail GMV was $65–66B in 2025 (19–21% CAGR), with 290–300M shoppers. Gen Z is 40–45% of shoppers and leans on "influencer-led trend discovery on social media". Tier 2+ drove about 50% of incremental orders in 2025 — [Bain & Flipkart, How India Shops Online 2026 (PDF)](https://storage.googleapis.com/flipkart-stories-media/How_India_Shops_Online_2026_060094273e/How_India_Shops_Online_2026_060094273e.pdf)
- E-retail sellers grew about 3x over 2020–25 and Tier 2+ sellers about 4x (transacting seller base) — [Bain & Flipkart 2026](https://storage.googleapis.com/flipkart-stories-media/How_India_Shops_Online_2026_060094273e/How_India_Shops_Online_2026_060094273e.pdf)
- About 850M chat/social media users (WhatsApp MAU, Jan–Nov 2025 basis). "2 in 3 chat/social media users are not shopping online yet." About 75% of chat users are in Tier 2+ cities (2025; PDF text extraction is slightly ambiguous) — [Bain & Flipkart 2026](https://storage.googleapis.com/flipkart-stories-media/How_India_Shops_Online_2026_060094273e/How_India_Shops_Online_2026_060094273e.pdf)
- The share of COD users paying by UPI on delivery rose 40% in 2025 vs 2020. Tier 2+ AOV (excluding mobiles) is about 0.9x other cities — [Bain & Flipkart 2026](https://storage.googleapis.com/flipkart-stories-media/How_India_Shops_Online_2026_060094273e/How_India_Shops_Online_2026_060094273e.pdf)
- COD share: more than 65% of Indian e-commerce transactions (IIMA survey, Feb 2024, pre-2025, cited by Inc42) — [Inc42](https://inc42.com/features/early-stage-d2c-brands-can-scale-faster-and-profitably-with-kwik-cod-app-on-shopify-gokwiks-vineeta-vora/). Festive Diwali 2025: 47.58% COD vs 52.42% prepaid (prepaid was 37.44% a year earlier; GoKwik, vendor) — [Angadi Labs](https://www.angadilabs.com/blog/india-fashion-ecommerce-benchmarks). The festive figure understates the full-year COD share.
- RTO: COD 26% vs prepaid under 2% (Shipway FY25); 20–25% average, up to about 40% in fashion/footwear (GoKwik) — [Angadi Labs](https://www.angadilabs.com/blog/india-fashion-ecommerce-benchmarks). Shiprocket's own claim is that it brings RTO from about 25% down to about 15% — [Sacra](https://sacra.com/c/shiprocket/)
- AOV: D2C festive 2024 ₹1,869; non-festive Tier-1 ₹1,309 (GoKwik Q4 FY25); new-age D2C fashion ₹1,586 vs conventional fashion ₹1,854 (ClickPost FY2026) — [Angadi Labs](https://www.angadilabs.com/blog/india-fashion-ecommerce-benchmarks)
- Social commerce market size of $29.27B in 2025, forecast at $143.86B by 2030, and apparel at a 31.57% share (Mordor Intelligence model estimates, via vendor blog) — [Unicommerce](https://unicommerce.com/blog/social-commerce-india/); [GoKwik blog](https://www.gokwik.co/blog/ecommerce-growth-statistics)
- Kantar 2025: 91% of online adults in India chat with a business weekly — [Meta newsroom](https://about.fb.com/news/2026/05/introducing-business-ai-on-whatsapp-for-small-businesses-in-india/)
- Meesho, the largest Indian social-commerce marketplace: "45 out of 100 orders go back" (analysis piece) — [LinkedIn Pulse](https://www.linkedin.com/pulse/sellers-legal-notice-underscores-meeshos-troubles-post-burn-era)

### Inferences
- A fair planning assumption for a CartHedge seller is: AOV ₹800–1,900 (lower for Tier 2+ and resellers), 40–65% COD, and COD RTO of 20–30% (higher in fashion). That makes every percentage point of COD moved to prepaid worth real money, which is the strongest ROI story CartHedge can tell.
- Bain's "2 in 3 chat users don't shop online" is the market-level case for building trust: the next buyers are already on WhatsApp but don't buy.

### Gaps
- No credible count of Indian Instagram/WhatsApp sellers. Figures such as "80% of sellers use WhatsApp Business" ([HiDM](https://hidm.in/social-media-selling-whatsapp-facebook-instagram-2025-trends-tools-seller-insights/)) and "15 million Meesho resellers" are unsourced.
- No data on the share of orders that arrive by DM vs website for small sellers. The only proxy is Shiprocket's 30% "manually initiated" (pre-2025).
- Redseer, KPMG and Nasscom 2025 social-commerce reports did not surface. Bain's 2025 edition PDF was not parsed; only the 2026 edition was.
- No social-commerce-specific RTO dataset. All RTO figures are for D2C/Shopify-style stores.

## 4. What does each category need?

### Takeaway
Fashion: size problems cause over 40% of returns, so the exchange flow matters more than a refund flow. Food: FSSAI registration is legally needed even for Instagram/WhatsApp orders, and advance payment is the standard defence against cancellations. Jewellery: the risk is high-value COD and swap/empty-box disputes. Resellers: margins are thin (15–40%) and return rates are high, but no direct evidence on blind shipping was found. Handmade: no evidence found.

### Cited Findings
- **Fashion:** "more than 40% of items are returned due to size issues" in apparel and footwear (Return Prime, Aug 2024, vendor). Fashion/footwear returns run 30–35% — [India Retailing](https://www.indiaretailing.com/2024/08/18/brands-could-lose-20-30-billion-in-revenue-to-returns-by-2025-report). Apparel return rate is 25–40% (Unicommerce, undated) — [Angadi Labs](https://www.angadilabs.com/blog/india-fashion-ecommerce-benchmarks). Plus-size returns are driven by "improper clothing fit" (NIFT study, 2025) — [JTATM](https://jtatm.textiles.ncsu.edu/index.php/JTATM/article/view/20763)
- **Food/cakes:** guides agree every home baker needs at least FSSAI Basic Registration before selling, "even for orders taken on WhatsApp or Instagram" (about ₹100/yr via FoSCoS; turnover ceilings differ between sources) — [ComplyLocal](https://complylocal.com/blog/fssai-registration-home-based-food-business/); [ClearlyComply](https://clearlycomply.org/blog/fssai-license-home-based-food-business/). Taking 50–100% advance on custom orders is recommended because "it removes almost all cancellations" (community site, unsourced claim) — [Bakeyy](https://bakeyy.com/blogs/bakeyy-blogs/how-to-start-home-bakery-india-2026). The Karnataka State Association of Bakeries objected to UPI-based GST notices — [The News Minute](https://www.thenewsminute.com/amp/story/karnataka/karnataka-how-a-vegetable-vendors-gst-notice-triggered-a-statewide-upi-boycott)
- **Jewellery and high-value goods:** swap fraud (a look-alike item returned) and empty-box claims; the defence is order-linked packing video (vendor) — [Trackvid](https://trackvid.in/blogs/swap-fraud-ecommerce-returns-india.html). An Indian gem seller complained of weight-dispute deductions (Akshay Gems, Jan 2026) — [Shopify App Store](https://apps.shopify.com/shiprocket/reviews?ratings%5B%5D=1&page=2)
- **Resellers:** Meesho's margins are often 15–40% (dropshipping guide, vendor) — [Unicommerce dropshipping](https://unicommerce.com/blog/dropshipping-suppliers-india/). Meesho's model grew out of homemakers reselling local supplies over WhatsApp — [Crosstalking VC](https://crosstalkingvc.substack.com/p/socializing-indian-commerce-the-soonicorn)

### Inferences
- Fashion: make the *exchange* path (size swap, no refund) the default answer to "fit nahi hua", and give sellers a size recommendation built from the size chart plus the buyer's past orders. Both build on 1.1 and 4.3, which already exist.
- Food: FEEDBACK's FSSAI-on-invoice, delivery date/slot, advance + balance, and daily capacity items are consistent with the regulatory and community evidence. FSSAI on the invoice has a legal basis, so it is the cheapest item to ship.
- Jewellery: COD ceiling (exists) + prepaid-only above a seller-set value + a packing-photo/video field on the order.
- Resellers: margin-aware pricing (cost price → margin, 4.4 open) has indirect support. Blind dropship slips remain unvalidated by real evidence.

### Gaps
- No real evidence found for cakes' delivery-slot pain, handmade made-to-order lead times, sneaker drops, or blind shipping. These rest only on the simulated panel.
- No category-level RTO data for jewellery or food.

## 5. What makes buyers distrust Instagram/WhatsApp shops and hold back from ordering?

### Takeaway
Shopping fraud is the most common scam Indians report, and messaging apps and social media are the main channels for it. Fake Instagram boutiques (copied photos, prepay-only, surprise "GST/customs" fees) set the background distrust that every honest DM seller pays for in COD demand and lost conversions.

### Cited Findings
- GSMA report: 33% of Indian scam victims reported online shopping fraud, the top category. Messaging apps were involved in 42% of scams and social media in 37% (news summary; methodology not checked) — [NewsBytes](https://www.newsbytesapp.com/news/india/gsma-report-online-shopping-fraud-most-common-scam-in-india/tldr)
- LocalCircles poll (~26,000 responses): 31% had bought via Facebook/Instagram/WhatsApp, 46% reported fraudulent activity, and 85% want these platforms under e-commerce rules. **Dated 16 Dec 2019, so old** — [LocalCircles](https://www.localcircles.com/a/press/page/ecommerce-on-social-media)
- Fake Instagram boutiques copy real brands' photos, run Meta ads, push "prepay only", and use a "GST or customs" trap after payment. There is no formal dispute mechanism inside Instagram (practitioner guide) — [RTI Wiki](https://righttoinformation.wiki/instagram-store-scam-india)
- Kaspersky (Nov 2025, 15 countries incl. India): 62% of shoppers protect themselves by verifying the seller is genuine — [Kaspersky](https://www.kaspersky.co.uk/about/press-releases/with-60-of-online-shoppers-relying-on-their-vigilance-to-spot-a-scam-sales-get-risky-heres-how-to-stay-safe)
- Bain 2026: only one-third of chat/social media users shop online, "well below global benchmarks" — [Bain & Flipkart 2026](https://storage.googleapis.com/flipkart-stories-media/How_India_Shops_Online_2026_060094273e/How_India_Shops_Online_2026_060094273e.pdf)

### Inferences
- Buyer distrust and seller COD pain are the same problem seen from two sides: buyers insist on COD because they fear scams, and COD brings the RTO. A buyer-visible trust layer (verified-seller badge backed by GSTIN/phone, public policies, order tracking, reviews, "pay by UPI at the door") is the lever that cuts both.
- FEEDBACK's worry that "free links could let scam pages pose as verified sellers" is real, given how common the fake-boutique pattern is. The badge has to be earned (GSTIN or KYC'd Razorpay account), not handed out with signup.

### Gaps
- No 2025–26 India-only survey on Instagram-shop trust or refund fears specifically.
- No data on how much a trust badge or reviews lift conversion for Indian DM sellers.

## 6. How does the real-world evidence map to the FEEDBACK.md backlog?

### Takeaway
Real evidence most strongly supports the COD/prepaid items (prepaid nudge, small COD token adjusted against the bill), the seller verification badge, FSSAI on invoices and size exchanges. It adds four themes the panel missed: courier after-dispatch failures, payment verification by UTR, account-ban resilience, and GST-threshold anxiety. Meta's free Business AI makes "WhatsApp auto-replies on the seller's own number" more urgent, but less of a selling point on its own.

### Cited Findings
- **Confirmed:** prepaid nudge / COD fee. COD RTO is 26% vs under 2% for prepaid — [Angadi Labs](https://www.angadilabs.com/blog/india-fashion-ecommerce-benchmarks). Delhivery suggests small COD charges to test intent — [YourStory](https://yourstory.com/2024/03/d2c-expert-strategies-reducing-returns)
- **Confirmed:** a small upfront COD token works. A merchant reports that most fake orders stopped after requiring 10% upfront on COD — [Shopify App Store reviews](https://apps.shopify.com/reviews/686349)
- **Confirmed:** seller verification badge and legal identity. Fake-boutique scams are common, and 62% of shoppers verify sellers — [RTI Wiki](https://righttoinformation.wiki/instagram-store-scam-india); [Kaspersky](https://www.kaspersky.co.uk/about/press-releases/with-60-of-online-shoppers-relying-on-their-vigilance-to-spot-a-scam-sales-get-risky-heres-how-to-stay-safe)
- **Confirmed:** FSSAI for food sellers is a legal requirement even for social sales — [ComplyLocal](https://complylocal.com/blog/fssai-registration-home-based-food-business/)
- **Confirmed:** size exchanges in fashion; size causes over 40% of returns — [India Retailing](https://www.indiaretailing.com/2024/08/18/brands-could-lose-20-30-billion-in-revenue-to-returns-by-2025-report)
- **Changes the picture:** WhatsApp AI on the seller's own number. Meta now offers native Business AI in the WhatsApp Business app for Indian SMBs (May 2026), with UPI in chat coming — [Meta newsroom](https://about.fb.com/news/2026/05/introducing-business-ai-on-whatsapp-for-small-businesses-in-india/)
- **New: courier after-dispatch** (fake failed-delivery reports, weight disputes, RTO not returned, tracking not updating) — [Shopify App Store: Shiprocket 1-star](https://apps.shopify.com/shiprocket/reviews?ratings%5B%5D=1&page=2)
- **New: account-ban resilience** — [MediaNama](https://www.medianama.com/2026/09/223-meta-disabled-business-manager-accounts-india/)
- **New: GST notices based on UPI data** — [Angel One](https://www.angelone.in/news/economy/upi-gst-notices-in-karnataka-worry-small-traders)
- **New: payment checked by UTR, not screenshot** — [PhonePe Business](https://business.phonepe.com/articles/fake-upi-payment-scams-how-to-identify-and-prevent-fraud)

### Inferences
**Recommended build order, drawn from the real evidence (top = highest evidence × severity):**
1. **Post-dispatch loop:** courier status sync (3.4) → automatic shipped/delivered/RTO, dispatch and out-for-delivery WhatsApp to the buyer, a failed-delivery workflow where the buyer confirms whether the courier really called and can reschedule or fix the address, and a COD payout tracker.
2. **COD risk controls:** COD-blocked/non-serviceable pincodes (3.6), block COD for risk-flagged buyers (3.7), partial-advance COD token adjusted against the bill, address-quality check at capture.
3. **Payment truth:** UTR capture + matching for direct-UPI orders. Make "screenshot is not payment" the default in the AI and the order board.
4. **Trust layer for buyers:** an earned verified badge (GSTIN/KYC), reviews (6.4), and "pay by UPI at the door" messaging.
5. **Seller safety net:** buyer-list export and "your store keeps working if Instagram bans you" positioning; a turnover-vs-GST-threshold tracker and a downloadable sales ledger.
6. **Category packs:** FSSAI on invoice; advance + balance with delivery date for cakes; packing-photo/video evidence for jewellery; exchange-first flow for fashion.
7. **Ad-source tagging** per chat/order (lower evidence; add when sellers with ad spend ask).
- Panel items with **no real-world evidence found in this pass** (not refuted, just unverified): Tally/GSTR-1 export, agency partner program, Shopify sync/API, wholesale tiers, blind dropship slips, Gujarati/Bangla/Tamil dashboards, 30-day trial, 12-month price lock.

### Gaps
- No real-world evidence was gathered on SaaS pricing objections (surprise bills, trial length), on staff logins/roles, or on demand for regional-language dashboards. These remain panel-only.
- Whether Meta's Business AI is free, its eligibility rules, and its actual India rollout status as of Oct 2026 are unknown (the announcement gives no pricing). Worth checking directly before repositioning.
