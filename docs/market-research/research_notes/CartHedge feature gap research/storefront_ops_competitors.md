# Commerce and ops features in Indian storefront, checkout, shipping, billing and reseller tools that CartHedge lacks (Oct 2026)

Research date: 11 Oct 2026. Scope is features, not pricing. Pricing for Shopify, Instamojo, Dukaan, Zoho, Shiprocket plans, Razorpay, GoKwik and RTO Score is already in `research_notes/CartHedge pricing market research/storefront_checkout_shipping_competitors.md`. Prices appear here only where they attach to a specific feature. Gaps already listed in `docs/FEATURE-GAPS.md` and `docs/market-research/FEEDBACK.md` are cross-referenced by number, not argued again.

Labels: **[official]** = vendor page, help centre or vendor changelog. **[secondary]** = aggregator, review site, press or competitor blog. **[snippet]** = seen only in a search-result summary; the page itself was not read. **[old]** = dated before 2025.

Caveat on method: most vendor pages render with JavaScript and gave little or nothing to WebFetch (mydukaan.io/features, getswipe.in/pricing, mybillbook.in/pricing, zoho.com/commerce/features). Feature-to-tier mapping for Dukaan, Swipe, myBillBook and Vyapar therefore leans on aggregators (Capterra, SoftwareSuggest, GoodFirms, Accountune), and those disagree with each other.

## Q1. What the main tools offer in 2026 (vendor-by-vendor snapshot)

### Takeaway
The market has split three ways:
- **Logistics-led suites** (Shiprocket, which now brands its checkout and WhatsApp tools "Fastrr") are adding AI address scoring, NDR automation, WhatsApp buyer updates, an Instagram DM chatbot and RTO insurance.
- **Checkout/retention suites** (GoKwik) bundle one-tap login, address prefill, COD risk controls, in-cart upsells, returns with store credit, and AI support. They are sold to brands with sales-quoted pricing.
- **GST billing apps** (Swipe, myBillBook, Vyapar) compete on e-way bills, e-invoices, Tally, price lists, batch/expiry and multi-user at ₹2,000 to ₹7,500 a year, and treat the online store as an add-on.

"Shiprocket Social" does not appear to exist as a product name. The nearest Shiprocket features for social sellers are the Engage 360 Instagram chatbot (Oct 2025) and WhatsApp tools. Bikayi collapsed in 2022, and GoKwik's COD app is no longer listed on the Shopify App Store.

### Cited Findings

**Shiprocket / Fastrr (most active changelog in this space)**
- Shiprocket Checkout has been renamed **Fastrr**, launched as an "AI-native pre-order commerce suite" at SHIVIR 2026 with four parts: Fastrr Checkout, Fastrr Ads, Fastrr Identity and Fastrr Sense. Checkout offers address autofill from the Shiprocket buyer network, AI payment routing and smart COD controls. — [Shiprocket blog: Introducing Fastrr](https://checkout.shiprocket.in/blog/introducing-fastrr-by-shiprocket/); [Devdiscourse](https://www.devdiscourse.com/article/business/3947958-shiprocket-unveils-fastrr-at-shivir-2026); [Digital Terminal](https://digitalterminal.in/solutions/shiprocket-launches-fastrr-an-ai-powered-commerce-suite-to-transform-online-shopping-experiences)
- **Fastrr Ads** measures ad performance against delivered orders instead of attributed conversions. — [Digital Terminal](https://digitalterminal.in/solutions/shiprocket-launches-fastrr-an-ai-powered-commerce-suite-to-transform-online-shopping-experiences) [secondary]
- **Fastrr Checkout [official]:**
  - Claims "95% autofilled addresses", one-click checkout, up to 30% RTO reduction and "100% RTO cost protection".
  - Blocks multiple COD orders from the same buyer and sets COD charges by parameter.
  - Offers payment-mode-specific and COD-to-prepaid discounts, personalised coupons and freebies.
  - Abandoned-cart offers and reminders, plus automatic switching of payment mode when a gateway fails.
  - Works on Shopify, WooCommerce, Magento and custom sites. No public price.
  - Source: [checkout.shiprocket.in](https://checkout.shiprocket.in/)
- **Shiprocket homepage [official]:**
  - 42+ courier partners and 19,000+ pincodes.
  - Courier recommendation engine, shipping rate calculator, "smart NDR redressal", printed shipping labels, multiple pickup locations and "Instant Pick Up".
  - **Fastrr Identify** is a WhatsApp marketing platform (URL slug "engage360").
  - **Quick** hyperlocal delivery "starting at ₹10/km" with no surge fee.
  - Fulfilment from 35 warehouses.
  - Source: [shiprocket.in](https://www.shiprocket.in/)
- **Shiprocket April 2026 changelog [official]:**
  - **AI address alerts during NDR** flag addresses scoring below 30 and prompt a correction before re-attempt.
  - **Address intelligence at order creation** gives real-time warnings on low-quality addresses before dispatch.
  - New "Actionable" and "Full" NDR reports. NDR on the mobile app gets swipe actions, Call Buyer, Act on Shipment and Mark RTO.
  - **Pickup-failure WhatsApp flow**: Reattempt, Escalate (which raises a ticket) or Mark completed.
  - **Smart Orders Notify** sends WhatsApp updates to buyers at confirmation, dispatch, out-for-delivery and delivery.
  - **ShipSure** gives freight recovery on eligible RTOs with automated premiums and refunds.
  - **Smart Orders Auto Secure** insures every shipment above ₹2,500 against loss, theft and damage, with no per-order opt-in.
  - Consolidated COD remittances (received and upcoming), a unified wallet and invoices/DN/CN.
  - Picklist from the New tab, and multi-order search that accepts pasted spreadsheet columns.
  - Source: [Shiprocket product highlights, April 2026](https://www.shiprocket.in/blog/product-highlights-from-april-2026/)
- **Shiprocket October 2025 changelog [snippet]:**
  - An **Engage 360 Instagram chatbot** that "automates customer engagement through direct messages" (Settings → Channel profile → Instagram).
  - A new NDR panel with automatic re-attempts.
  - A WhatsApp pickup-escalation flow for small sellers.
  - Source: [Shiprocket product highlights, October 2025](https://www.shiprocket.in/blog/product-highlights-from-october-2025/amp)
- **Shiprocket Engage (Shopify app) [official]:**
  - WhatsApp order confirmation, address verification and update, COD-to-prepaid conversion, coupon creation and abandoned-cart reminders.
  - ₹2.49 per order. Rated 2.6 from 6 reviews. A Mar 2026 review complains about support; a 2023 review reports "fewer RTOs … less manual calling".
  - Source: [Shopify App Store: Shiprocket Engage](https://apps.shopify.com/shiprocket-engage)
- A Tata Communications case study reports that Shiprocket's WhatsApp order and address verification raised buyer response rate from 30% to 70%. [old, vendor case study] — [Tata Communications](https://tatacommunications.com/hubfs/47271964/TaCO-2024/case-studies/doc/Shiprocket-WhatsApp.pdf)

**GoKwik [official]**
- **Kwik Checkout:** OTP single sign-on, "85%+ address prefills", conditional discounts, and a "Smart COD suite with RTO risk insights and 70+ interventions".
- **Kwik Pass:** identifies anonymous shoppers through a "220Mn+ network".
- **GoKwik Cart:** in-cart discounts, free-gift progress bars and AI upsells.
- **Kwik Engage:** event-based messaging with AI retries, calls and a chatbot, plus an AI support assistant (claims 80%+ of queries automated).
- **Return Prime:** automated return/exchange approval, return labels, exchange and store-credit incentives, and upsell during returns.
- **Kwik Ads:** Meta lookalikes built from verified-buyer signals.
- 20,000+ merchants. No public pricing.
- Source: [gokwik.co](https://www.gokwik.co/)
- The "Kwik COD & Checkout" Shopify app page now says it "is not currently available on the Shopify App Store". — [apps.shopify.com/kwikcheckout](https://apps.shopify.com/kwikcheckout)
- An older localised snapshot of that listing advertised partial COD, conditional COD fees, pincode-level COD, COD OTP and WhatsApp order notifications. Pricing was $9.99 (under 50 orders), $19.99 (51 to 500) or $29.99 (over 500) per month, plus 2.5% on prepaid orders through GoKwik's gateway. [snippet, likely outdated] — [Shopify listing via search](https://apps.shopify.com/kwikcheckout?locale=de)

**Shopify India [official]**
- Every plan includes gift cards, abandoned-checkout recovery, discount codes, customer segmentation, marketing automation, 200+ reports, B2B (up to 3 catalogs), 10 inventory locations and "Sell in AI chats".
- Staff accounts: 0 on Basic, 5 on Grow, 15 on Advanced. Live third-party shipping rates are listed only on Advanced. POS Pro costs ₹7,000/mo per location.
- Source: [Shopify India pricing](https://www.shopify.com/in/pricing)
- Popular Shopify COD add-ons as seen on 11 Oct 2026: **Nex Advanced Cash on Delivery** (COD fees and limits with conditions; 5.0 stars, 141 reviews) and **PenguinCOD: Partial COD & OTP** (partial prepaid on COD, OTP, COD fees and limits; 4.5 stars, 13 reviews; free plan). — ["More apps like this" on Shopify App Store](https://apps.shopify.com/kwikcheckout)
- **WALoops** offers a partial-COD advance to move buyers to online payment, plus WhatsApp abandoned-cart reminders. [snippet] — [Shopify App Store: WALoops](https://apps.shopify.com/waloops)

**Dukaan**
- **Staff accounts with 3 roles [official]:**
  - Admin has full access.
  - Manager has everything except Payments, Accounts and Reports.
  - Staff sees only Orders and Delivery.
  - Invites go by email or mobile. Seat count depends on plan. Web only.
  - Source: [Dukaan help: staff account](https://dukaan.help.center/article/5014-how-to-create-a-staff-account-in-dukaan)
- Multi-warehouse: 2 warehouses on Starter and 5 on Growth according to an aggregator; also "optimized checkouts" and "advanced analytics". [secondary] — [SoftwareSuggest: Dukaan](https://www.softwaresuggest.com/dukaan)
- **Custom shipping rules** are an Enterprise-plan component set up with Dukaan's team, not self-serve. — [SoftwareONE marketplace listing](https://platform.softwareone.com/product/custom-shipping-rules/PCP-2833-8847) [secondary]
- A Unicommerce plugin is available; order split is not allowed. — [Dukaan help: Unicommerce plugin](https://dukaan.help.center/article/5115-how-to-use-the-unicommerce-plugin-on-dukaan) [official]
- Plugin library includes WhatsApp Chat Support, Jivochat, Zendesk Chat and others. Free WhatsApp/SMS order receipts. [secondary, 2026 review] — [Kripesh Adwani: Dukaan review 2026](https://kripeshadwani.com/dukaan-review/)
- An "Order is abandoned" trigger exists for outside WhatsApp tools. No evidence found of native partial COD or native WhatsApp cart recovery. — [Integrately: Dukaan + WhatsApp](https://integrately.com/integrations/dukaan/whatsapp) [secondary]

**Instamojo**
- The store ("mojostore") connects to Shiprocket for shipping. The integration page cites 42+ couriers and 19,000+ pincodes. — [Shiprocket: Instamojo integration](https://www.shiprocket.in/channel-integrations/instamojo/) [official, Shiprocket]
- Digital delivery (courses, templates, ebooks) sits in **Smart Pages**, not in the store. — [PrecisionTech, 28 Jul 2026](https://precisiontech.in/solutions/payment-gateway-integration/instamojo/) [secondary, low quality]

**Swipe (GST billing with a store add-on) [secondary, Capterra; official page did not render]**
- PRO ₹2,999/yr: branding, 14+ invoice templates, online payment collection.
- JET ₹4,199/yr: **e-way bills**, bulk downloads, **multiple price lists**, 2 users.
- RISE ₹5,499/yr: **batch and expiry**, serial/IMEI tracking, **recurring subscriptions**.
- RISE + E-Invoice ₹7,499/yr: one-click e-invoices.
- Biz: base plan plus add-ons. Covers **multiple businesses or branches**, the **online store** and **Shiprocket integration**.
- Source: [Capterra: Swipe pricing](https://www.capterra.com/p/10008988/Swipe/pricing/)
- Swipe's navigation lists Einvoices, Ewaybills, Swipe AI, Online Store, Swipe x Tally, Swipe x Shopify and Swipe APIs. — [getswipe.in](https://www.getswipe.in/pricing) [official, navigation only]

**myBillBook [secondary, prices conflict between sources]**
- Diamond ₹3,490/yr: 1 business, 1 user + 1 CA, Android/iOS/web.
- Platinum ₹3,990/yr: adds desktop, **SMS + WhatsApp marketing (500 messages/yr)**, **staff attendance and payroll**, godown management and **barcode label printing**.
- E-invoicing, POS and multi-user are on Enterprise, from about ₹6,840/yr.
- Sources: [Accountune, citing the pricing page as of Jul 2026](https://www.accountune.com/mybillbook-alternatives) (a competitor); [GoodFirms](https://www.goodfirms.co/software/mybillbook)
- E-way bill generation is listed as a feature. — [SoftwareSuggest](https://www.softwaresuggest.com/mybillbook)

**Vyapar [secondary]**
- Starts at ₹3,399/yr. — [Software Advice](https://www.softwareadvice.com/accounting/vyapar-profile)
- Free mobile tier; desktop ₹3,420/yr; up to ₹9,557/yr for Retail POS. — [Accountune](https://accountune.com/tally-vs-vyapar-vs-accountune) (a competitor)
- Silver plan reportedly caps e-way bills at 10 per month. Export to Tally and import from Tally are listed. The online store supports "Add Custom Domain". — [Vyapar comparison page](https://vyaparapp.in/comparison-with-other-apps?brand=zoho) [official]; [SoftwareSuggest](https://www.softwaresuggest.com/vyapar)

**Zoho Commerce**
- The features page rendered no detail. Pricing (0% transaction fee, Starter ₹99/mo, user and product caps) is in the pricing note. — [Zoho Commerce features](https://www.zoho.com/commerce/features.html)

**Meesho and reseller apps [secondary, low quality]**
- Resellers add a margin on the supplier price, share catalogs on WhatsApp, Instagram and Facebook, and place the order with the end buyer's details. The margin is paid to the reseller's bank account, including on COD orders.
- Sources: [Techleins overview](https://techleins.it.com/?p=11895); [APKMirror changelog](https://www.apkmirror.com/?p=4143380)
- No official 2026 Meesho reseller feature list was found.

**Bikayi**
- Collapsed in 2022 and pivoted to enterprise as "BIK". See the pricing note's citations to [Inc42](https://inc42.com/features/bikayi-crash-sequoia-startup-zilingo-way/).

### Inferences
- Shiprocket is no longer only a courier tool. With the Engage 360 Instagram chatbot, Fastrr Identify (WhatsApp) and Fastrr Checkout, it now overlaps CartHedge's core promise of DM selling plus RTO control. Its tools are aimed at Shopify/Woo brands and are sold per order or by quote.
- GoKwik's Shopify COD app being delisted suggests the low-end "COD app for small Shopify stores" segment is being left to small apps (PenguinCOD, Nex, WALoops). That is the price band and segment CartHedge sells into.
- The billing apps put e-way bills, multi-user, price lists and batch/expiry behind ₹4,000 to ₹7,500/yr tiers. Sellers who already use them for GST will compare CartHedge's GST features with these tiers.

### Gaps
- Dukaan's current plan-to-feature table, and whether it has native partial COD, AI tools or reviews, could not be confirmed. The pages render with JavaScript and the help-centre search returned only staff and Unicommerce articles.
- No 2026 Instamojo feature changelog was found.
- Zoho Commerce India's feature list could not be extracted.
- No official Meesho reseller documentation for 2026 was found.
- Whether Fastrr Checkout or Fastrr Identify are sold to non-Shopify, DM-only sellers is not stated.

## Q2. Shipping and logistics features: what is standard and what CartHedge lacks

### Takeaway
Aggregators treat these as standard: multi-courier recommendation, rate calculator, label printing, pickup, NDR workflows with buyer outreach, early COD remittance, and (new in 2026) AI address-quality scoring and automatic shipment insurance. CartHedge hands an order to Shiprocket but does not sync status back (FEATURE-GAPS 3.4). It has no NDR handling, no address scoring, no COD-remittance reconciliation, no pincode rules (3.6), and no weight-based shipping fee (FEEDBACK).

### Cited Findings

**NDR management**
- Shiprocket's NDR flow notifies the buyer by SMS and IVR. The courier re-attempts the same day or the next day. The buyer can pick a different date or correct the address and phone. Charged pay-as-you-go per order. — [Shiprocket NDR page](https://sr-website.shiprocket.in/ndr-management/) [snippet]
- The Oct 2025 NDR panel added automatic re-attempts and a single NDR trail. In Apr 2026 Shiprocket added AI address alerts during NDR and actionable NDR reports. — [Shiprocket Oct 2025](https://www.shiprocket.in/blog/product-highlights-from-october-2025/amp) [snippet]; [Shiprocket Apr 2026](https://www.shiprocket.in/blog/product-highlights-from-april-2026/) [official]

**Address validation and pincode serviceability**
- "Address intelligence at order creation" shows real-time warnings on low-quality addresses before dispatch. — [Shiprocket Apr 2026](https://www.shiprocket.in/blog/product-highlights-from-april-2026/)
- Fastrr Checkout lists "advanced address filtering". — [checkout.shiprocket.in](https://checkout.shiprocket.in/)
- GoKwik claims 85%+ address prefills; Fastrr claims 95%. — [gokwik.co](https://www.gokwik.co/); [checkout.shiprocket.in](https://checkout.shiprocket.in/)
- An older GoKwik app listing offered selective pincode servicing and pincode-level COD. — [Shopify listing snippet](https://apps.shopify.com/kwikcheckout?locale=de)

**RTO prediction and protection**
- Shiprocket RTO Score costs ₹2.49 per COD order. [old, Apr 2024] — see the pricing note.
- ShipSure gives freight recovery on eligible RTOs. Auto Secure insures shipments above ₹2,500. — [Shiprocket Apr 2026](https://www.shiprocket.in/blog/product-highlights-from-april-2026/)
- Fastrr claims "100% RTO cost protection". — [checkout.shiprocket.in](https://checkout.shiprocket.in/)

**COD remittance**
- Shiprocket's standard cycle is D+8, credited three times a week.
- Early COD costs 0.99% (D+2), 0.69% (D+3) or 0.49% (D+4).
- Instant COD advances up to 70% the day after shipping, for a 5% fee on the advance, to selected sellers only.
- Sources: [Shiprocket support: Early COD](https://support.shiprocket.in/support/solutions/articles/43000463560); [Shiprocket support: Instant COD FAQ](https://support.shiprocket.in/support/solutions/articles/152000000970-instant-cod-faqs) [official, undated]; D+8 confirmed by [ClickPost](https://www.clickpost.ai/alternatives/shiprocket) [competitor]
- The Apr 2026 Finances upgrade shows "consolidated COD remittances (received and upcoming)". — [Shiprocket Apr 2026](https://www.shiprocket.in/blog/product-highlights-from-april-2026/)

**Labels, manifests, pickup**
- Shiprocket lists label printing, multiple pickup locations and Instant Pick Up, plus a picklist from the New tab and a WhatsApp flow for failed pickups. — [shiprocket.in](https://www.shiprocket.in/); [Apr 2026](https://www.shiprocket.in/blog/product-highlights-from-april-2026/)
- For low-volume Instagram sellers, aggregators give free daily pickup with no volume commitment, though some Tier 2/3 routes are alternate-day. A4 PDF labels are fine; a thermal printer is not needed below about 40 orders a day. Direct courier accounts want 300 to 500 shipments a month. — [CourierBook, 18 May 2026](https://www.courierbook.in/blog/instagram-seller-low-volume-shipping-india/) [secondary, founder-written]
- Reseller/dropship labels: a third-party Shiprocket carrier integration exposes "Hide Shipper Address On Label", "Hide Entire Shipper Details On Label" and a "Product Mask" field. Native support in Shiprocket's own panel was not confirmed. — [eShipz KB](https://eshipz1.zohodesk.in/portal/en/kb/articles/steps-to-integrate-shiprocket-b2c-carrier) [secondary]

**Weight discrepancy**
- Sellers complain about weight disputes, for example small items billed as 1 kg. Shiprocket Fulfilment claims "almost zero weight discrepancy issues". — [Shiprocket Shopify reviews](https://apps.shopify.com/shiprocket) [secondary, review summary]; [shiprocket.in](https://www.shiprocket.in/)

**Hyperlocal**
- Shiprocket Quick offers local delivery from ₹10/km. — [shiprocket.in](https://www.shiprocket.in/)

**Weight- and pincode-based shipping fees on the storefront**
- Shopify lists live third-party rates only on Advanced. — [Shopify pricing](https://www.shopify.com/in/pricing)
- Dukaan's custom shipping rules are Enterprise-only. — [SoftwareONE](https://platform.softwareone.com/product/custom-shipping-rules/PCP-2833-8847)
- Low-volume price example: a 300 g parcel costs about ₹60 to ₹80 through an aggregator. — [CourierBook](https://www.courierbook.in/blog/instagram-seller-low-volume-shipping-india/)

### Inferences
- **Highest-value shipping gaps for CartHedge:**
  - (a) Shiprocket status sync (3.4), the prerequisite for everything below.
  - (b) NDR inbox. A failed delivery triggers a WhatsApp message to the buyer asking for a new date, address or phone, then pushes a re-attempt. This fits CartHedge's DM-native model better than Shiprocket's IVR.
  - (c) Address-quality warning at checkout. Pincode/locality mismatch and missing landmark are cheap heuristic rules; a model score can come later.
  - (d) Reconciling COD remittance against orders.
- Rich weight/zone shipping rules are an Enterprise or Advanced feature on Shopify and Dukaan. So a simple version (weight slabs × metro/rest-of-India) would beat what small sellers get elsewhere at CartHedge's price. Lakshmi asked for this in FEEDBACK.
- Shipment insurance and RTO freight protection are insurance products sold by aggregators. CartHedge should pass them through via Shiprocket, not build them.

### Gaps
- Shiprocket's NDR, ShipSure and Auto Secure prices are not public.
- No independent data on how much NDR outreach lifts delivery. Shiprocket's 10 to 15% figure is from a sponsored advertorial [snippet].
- Whether Shiprocket's API exposes NDR actions and address scores to integrators like CartHedge was not checked.
- Native blind/white-label labels in Shiprocket's own panel were not confirmed.

## Q3. Payments and checkout features

### Takeaway
The checkout features that are standard among Indian vendors are:
- one-tap OTP login with network address prefill
- COD controls (fee, cap, pincode block, OTP, block repeat COD)
- prepaid and payment-mode discounts
- **partial COD** (advance plus balance)
- abandoned-cart recovery
- gateway failover

CartHedge already has OTP checkout, a COD fee, a prepaid discount, a COD token and abandoned-checkout reminders. Its clear payment gaps are:
- partial COD as a percentage or amount, rather than a fixed token
- a COD block for risk-flagged buyers (3.7)
- marking offline payments as paid (3.8)
- COD-remittance reconciliation
- store credit and gift cards

### Cited Findings
- **Partial COD** is offered by Razorpay Magic Checkout (example: 30% upfront, 70% on delivery; positioned for high-risk, high-value and first-time orders). — [Razorpay blog, 10 Oct 2024](https://razorpay.com/blog/partial-payments-partial-cod/) [official, old]
- Partial COD is also offered by PenguinCOD (free plan), WALoops, and formerly GoKwik's Shopify app. — [Shopify App Store](https://apps.shopify.com/kwikcheckout); [WALoops](https://apps.shopify.com/waloops) [snippet]
- A recommended token advance is ₹50 to ₹150 before the balance on delivery, with no study cited. — [vCommission](https://www.vcommission.com/affiliate-marketing/cash-on-delivery-in-india-how-to-avoid-high-return-rates/) [secondary]
- **RTO by payment mode:**
  - COD orders run 25 to 40% RTO against 3 to 5% for prepaid. — [Hillteck](https://www.hillteck.com/blog/convert-cod-to-prepaid-shopify.html) [secondary, vendor]
  - Instagram-DM COD runs 30%+ RTO against 5 to 12% for prepaid Instagram orders. — [CourierBook, May 2026](https://www.courierbook.in/blog/instagram-seller-low-volume-shipping-india/)
  - Counterpoint: the conversion lost by restricting COD "consistently and significantly outweighs" the RTO savings. — [Base.com](https://base.com/en-IN/blog/how-indian-d2c-brands-can-reduce-rto-without-removing-cod-and-why-base-com-makes-it-operationally-possible/) [vendor opinion]
- **COD risk controls:**
  - Fastrr blocks multiple COD orders from the same buyer and sets parameter-based COD charges. — [checkout.shiprocket.in](https://checkout.shiprocket.in/)
  - GoKwik offers "70+ interventions" in its Smart COD suite. — [gokwik.co](https://www.gokwik.co/)
- **Payment routing and failover:** Fastrr switches payment mode automatically when a gateway fails often, and offers AI payment routing. — [checkout.shiprocket.in](https://checkout.shiprocket.in/); [Digital Terminal](https://digitalterminal.in/solutions/shiprocket-launches-fastrr-an-ai-powered-commerce-suite-to-transform-online-shopping-experiences)
- **Store credit as the refund instrument:** Return Prime offers store-credit and exchange incentives. Shopify includes gift cards on every plan. — [gokwik.co](https://www.gokwik.co/); [Shopify pricing](https://www.shopify.com/in/pricing)
- **Advance payments with reminders** for made-to-order businesses: Kamai, a bakery operating system for India, tracks advance payments and sends reminders. — [Product Hunt: Kamai](https://www.producthunt.com/products/kamai-the-baker-cockpit) [secondary, early-stage]
- **Recurring subscriptions** are on Swipe RISE (₹5,499/yr). — [Capterra](https://www.capterra.com/p/10008988/Swipe/pricing/)

### Inferences
- CartHedge's fixed COD token is a narrow version of partial COD. Moving to "advance = X% or ₹Y, with the balance collected on delivery or by UPI before dispatch" covers both the RTO case and FEEDBACK's "advance plus balance" request from custom/made-to-order sellers (Sneha, Shabnam). The order and ledger then need a "balance due" state and a balance-payment reminder.
- Network address prefill (GoKwik's 220M network, Fastrr's buyer network) cannot be copied. CartHedge's equivalent is reusing a buyer's verified address across all CartHedge stores, which would need a consent and DPDP review.
- Payment-gateway failover matters less for CartHedge because the seller uses their own Razorpay or UPI. A "UPI fallback if Razorpay fails" toggle is the cheap version.

### Gaps
- No controlled data on partial COD's net effect on RTO versus conversion. All figures come from vendors.
- UPI AutoPay for repeat buyers of physical goods at small-seller scale was not researched further. Only Swipe's recurring invoices and Razorpay's general subscription product are known.
- Payout reconciliation features (matching Razorpay settlements to orders) for small-seller tools were not found in any reviewed product page.

## Q4. Catalog and storefront features

### Takeaway
Rivals' storefront and catalog features that CartHedge lacks:
- collections and featured ordering (FEATURE-GAPS 4.5)
- multi-warehouse and locations (Shopify 10, Dukaan 2 to 5)
- B2B catalogs and price lists (Shopify B2B, Swipe "multiple price lists")
- in-cart upsells and free-gift progress bars (GoKwik Cart)
- AI listing from a photo (Amazon India Seller Assistant, free, Hinglish)
- WhatsApp catalog sync through Meta Commerce Manager (Interakt, Shopaccino, Zoko)
- delivery-date/slot booking with capacity caps (OrderSlots on Wix; nothing India-native found)

Automatic import of Instagram posts as products is not offered cleanly by anyone. Meta's API limits it, so even Shopify apps need manual tagging.

### Cited Findings
- **AI listing from a photo:**
  - Amazon India's Seller Assistant (2026) turns a photo, URL or description into title, details, category and fee preview. English and Hinglish, 24x7. Amazon says it pre-fills up to 70% of the work. Built on Bedrock with Nova and Claude models. Free. — [About Amazon India](https://www.aboutamazon.in/news/small-business/amazon-seller-assistant-ai-tool-india) [official]
  - EcomShadow: AI listing builder for Flipkart, Meesho, Myntra and Snapdeal, plus label cropping. — [Product Hunt](https://www.producthunt.com/products/ecomshadow/launches/ecomshadow-2) [secondary]
  - Lister AI: a full listing with images from one photo, at $0.3 per product. — [Shopify App Store: Lister AI](https://apps.shopify.com/lister-ai-bulk-products)
  - Swipe lists "Swipe AI" without details. — [getswipe.in](https://www.getswipe.in/pricing)
- **Instagram import:**
  - Shopify community thread: apps need manual product tagging after importing IG photos, possibly because Meta does not expose tagged-product data via API. — [Shopify Community](https://community.shopify.com/t/looking-for-app-that-inserts-the-ig-tagged-product-pictures-into-the-product-page/56662/1)
  - Magical (Chrome extension) copies fields from an IG post into a product form, semi-manually. — [getmagical.com](https://www.getmagical.com/integrations/instagram-to-shopify)
  - Tappr: a free Indian store for Instagram sellers with UPI. IG import not confirmed. — [hunted.space: Tappr](https://www.hunted.space/product/tappr)
- **WhatsApp catalog sync:**
  - The catalog lives in Meta Commerce Manager with three feed options: partner integration, CSV/Sheets, or the Catalog API from your own backend. It must be linked to the WABA, otherwise you get "Catalog unavailable". Sync is not instant. Item review takes 24 to 48 hours. — [bot.space, Aug 2026](https://www.bot.space/blog/whatsapp-catalog-setup-shopify); [Zoko](https://www.zoko.io/post/whatsapp-business-catalog-bulk-upload-shopify) [secondary]
  - Shopaccino auto-updates Meta when a product or price changes. — [Shopaccino blog](https://www.shopaccino.com/blog/how-to-accept-orders-on-whatsapp-and-sync-them-with-your-ecommerce-store) [vendor]
- **Delivery slots and capacity:**
  - OrderSlots (Wix): customers pick a date and slot; the merchant caps quantity per slot, with cut-off times, blocked days and per-product calendars. — [Wix App Market: OrderSlots](https://www.wix.com/app-market/web-solution/krchz245-orderslots-1)
  - Indian home bakers typically need 24 h lead time. — [IndiaMART: HomeBakes](https://m.indiamart.com/homebakes)
  - No India-native storefront with per-day capacity caps was found.
- **Multi-location and warehouses:** Shopify includes 10 locations on all plans. Dukaan offers 2 (Starter) or 5 (Growth) warehouses. — [Shopify pricing](https://www.shopify.com/in/pricing); [SoftwareSuggest](https://www.softwaresuggest.com/dukaan) [secondary]
- **B2B and wholesale price lists:** Shopify B2B (up to 3 catalogs on every plan); Swipe JET's "multiple price lists". — [Shopify pricing](https://www.shopify.com/in/pricing); [Capterra](https://www.capterra.com/p/10008988/Swipe/pricing/)
- **Cart-level merchandising:** GoKwik Cart offers in-cart smart discounts, value-based free gifts with progress bars, AI upsells (frequently bought together, one-click add-ons) and order notes. — [gokwik.co](https://www.gokwik.co/)
- **Batch/expiry and serial/IMEI tracking** are on Swipe RISE. Relevant to food, cosmetics and electronics sellers. — [Capterra](https://www.capterra.com/p/10008988/Swipe/pricing/)
- **Barcode label printing** is on myBillBook Platinum. — [Accountune](https://www.accountune.com/mybillbook-alternatives)

### Inferences
- A practical "Instagram import" for CartHedge is: the seller pastes or forwards a post link or photo, AI drafts the product (title, price from the caption, options, description in Hinglish), and the seller confirms. This works within Meta's limits, matches what Amazon now offers marketplace sellers free, and fits the "AI does the busywork" story.
- Pushing CartHedge's catalog to the seller's WhatsApp catalog via the Catalog API would make the WhatsApp go-live work (Coexistence) more valuable. Buyers could browse in WhatsApp and the AI could send product messages.
- Delivery slots plus daily capacity is a real niche gap (bakers, caterers, made-to-order). FEEDBACK has it from Sneha and Shabnam, and no India-native small-seller tool covers it.
- Multiple price lists generalise CartHedge's single reseller price list into wholesale tiers, which FEEDBACK asked for (Hiren, Gurpreet).

### Gaps
- Dukaan's and Instamojo's 2026 AI catalog features (if any) were not found.
- Preorder and made-to-order product types among Indian small-seller storefronts were not confirmed for any vendor.
- No data on how often social sellers use collections or multi-location.

## Q5. Billing, accounting and team features

### Takeaway
For CartHedge's target (B2C, mostly under ₹5 Cr turnover), e-invoicing is legally irrelevant and e-way bills only matter above ₹50,000 per consignment. The billing features small sellers actually compare are:
- **Tally export** (Swipe, Vyapar)
- **staff/multi-user with roles** (Dukaan's 3 roles; Swipe 2 users on JET; myBillBook multi-user on Enterprise)
- **multiple businesses/branches** (Swipe Biz)
- expenses and purchases
- **bundled SMS/WhatsApp credits** (myBillBook 500 a year)

CartHedge lacks Tally/GSTR-1 export and staff roles (both in FEEDBACK as must-haves, 5.6), and multi-store.

### Cited Findings
- **E-invoicing** is mandatory only if aggregate annual turnover crossed ₹5 Cr in any year since FY2017-18, under Notification 10/2023 effective 1 Aug 2023. It covers B2B, SEZ and export supplies, not B2C. No notification lowering it had been issued as of 2026. A B2C e-invoice rollout is proposed with no date. — [GimBooks, 2026](https://www.gimbooks.com/blog/5-crore-e-invoice-turnover-rule-2026/amp/); [eChai](https://echai.ventures/d2c/d2c-gst-multistate/e-invoicing-e-way-bill-thresholds) [secondary]
- **E-way bill** is required for consignments above ₹50,000. — [eChai](https://echai.ventures/d2c/d2c-gst-multistate/e-invoicing-e-way-bill-thresholds) [secondary]
- GST registration is optional below ₹40 lakh of annual goods turnover. — [CourierBook](https://www.courierbook.in/blog/instagram-seller-low-volume-shipping-india/) [secondary]
  - Note: sellers on e-commerce operators face different rules; not checked here.
- **Tally:**
  - Swipe advertises "Swipe x Tally". — [getswipe.in](https://www.getswipe.in/pricing)
  - Vyapar lists export to and import from Tally. — [Vyapar comparison](https://vyaparapp.in/comparison-with-other-apps?brand=zoho) [official]
- **E-way bills and e-invoices in billing apps:**
  - Swipe: e-way bills from JET (₹4,199/yr), e-invoice on RISE + E-Invoice (₹7,499/yr). — [Capterra](https://www.capterra.com/p/10008988/Swipe/pricing/)
  - Vyapar Silver: 10 e-way bills a month. — [SoftwareSuggest](https://www.softwaresuggest.com/vyapar)
  - myBillBook: e-invoice on Enterprise. — [Accountune](https://www.accountune.com/mybillbook-alternatives)
- **Staff and roles:**
  - Dukaan: Admin / Manager (no Payments, Accounts or Reports) / Staff (Orders and Delivery only). — [Dukaan help](https://dukaan.help.center/article/5014-how-to-create-a-staff-account-in-dukaan) [official]
  - Shopify: 0 staff on Basic, 5 on Grow, 15 on Advanced. — [Shopify pricing](https://www.shopify.com/in/pricing)
  - Swipe JET: 2 users. — [Capterra](https://www.capterra.com/p/10008988/Swipe/pricing/)
  - myBillBook Diamond: 1 user + 1 CA seat. — [Accountune](https://www.accountune.com/mybillbook-alternatives)
- **Multi-business / branches:** Swipe Biz. — [Capterra](https://www.capterra.com/p/10008988/Swipe/pricing/)
- **Godown management, staff attendance/payroll, POS:** myBillBook Platinum and Enterprise; Shopify POS Pro ₹7,000/mo per location. — [Accountune](https://www.accountune.com/mybillbook-alternatives); [Shopify pricing](https://www.shopify.com/in/pricing)
- **Bundled messaging credits:** myBillBook Platinum includes 500 SMS + WhatsApp marketing messages a year. — [Accountune](https://www.accountune.com/mybillbook-alternatives)

### Inferences
- **"CA seat":** myBillBook gives a free accountant login on its cheapest paid tier. A read-only "accountant" role that sees invoices, credit notes and the GSTR-1-ready export (not chats or customers) is a low-cost addition when staff roles are built. It also answers FEEDBACK's CA persona.
- **Roles template:** Dukaan's three-role split maps directly to CartHedge's board. "Staff = orders + delivery only" is exactly the packer persona in FEATURE-GAPS 5.6.
- **What not to build:** e-invoice and e-way bill are low priority for the segment and can be deferred indefinitely. Use GSTR-1 export (B2C large/small, HSN summary, credit notes) and a Tally voucher export instead.
- **Purchase/stock-in and expenses** would feed FEATURE-GAPS 4.4 (cost price → profit). They are standard in every billing app but can wait until margin reporting is built.

### Gaps
- Exact GSTR-1 JSON export support per billing app was not confirmed from official pages.
- Expense and purchase module details per tier for Swipe, Vyapar and myBillBook were not extracted.
- Prices for myBillBook and Vyapar conflict across aggregators and some are probably out of date.

## Q6. Post-purchase and retention features

### Takeaway
On Shopify, retention is bought as add-ons: loyalty/referral/reviews from Nector ($49 to $349/mo), Flits or Smile.io (free up to 200 orders); returns with store credit from GoKwik's Return Prime; gift cards come with every Shopify plan. Logistics suites now send WhatsApp milestone updates to buyers (Shiprocket Smart Orders Notify).

CartHedge lacks:
- reviews/ratings (FEATURE-GAPS 6.4)
- loyalty points, referral codes, gift cards and store credit
- "my orders" by OTP (7.2)
- possibly automated buyer WhatsApp status updates (to verify in code)

### Cited Findings
- **Nector:** Starter $49/mo (loyalty, reviews, automated emails, birthday rewards); Growth $179/mo (adds referrals, image reviews, branding removal); Premium $349/mo. 7-day trial. Overage $5 or $8 per extra 100 orders (sources conflict). 4.8 stars on Shopify, with Indian merchants mentioning coin redemption. — [Nector pricing, May 2026](https://www.nector.io/pricing-md); [Shopify App Store: Nector](https://apps.shopify.com/nector-rewards-loyalty)
- **Smile.io:** free up to 200 orders/month, first paid plan $15/mo. **LoyaltyLion and Yotpo:** about $199/mo. — [Nector comparison, checked 3 Aug 2026](https://www.nector.io/blog/shopify-loyalty-platform-comparison) [competitor-published]
- **Flits** (Ahmedabad): loyalty, wishlist and rewards with a free tier. Price table not found. — [Shopify App Store: Flits](https://apps.shopify.com/flits)
- An Indian D2C community recommends Nector for India-first loyalty, referrals and reviews. — [eChai Ventures](https://echai.ventures/d2c/d2c-community-loyalty/which-loyalty-referral-tools-to-use) [editorial]
- **Return Prime (GoKwik):** automated return/exchange decisions, return labels, exchange and store-credit incentives, upsell during returns. Claims 10% more recovered revenue. — [gokwik.co](https://www.gokwik.co/)
- **WhatsApp buyer status automation:**
  - Shiprocket Smart Orders Notify covers confirmation, dispatch, out-for-delivery and delivery. — [Shiprocket Apr 2026](https://www.shiprocket.in/blog/product-highlights-from-april-2026/)
  - Third-party bots (Spur, BotPenguin) answer order-status questions on WhatsApp and Instagram using Shiprocket tracking. — [Spur](https://www.spurnow.com/integrations/shiprocket); [BotPenguin](https://botpenguin.com/integrations/shiprocket) [vendor]
- **Gift cards:** included on every Shopify India plan. — [Shopify pricing](https://www.shopify.com/in/pricing)
- **AI support chatbot** for post-purchase queries: GoKwik claims 80%+ of queries automated. — [gokwik.co](https://www.gokwik.co/)

### Inferences
- **Status updates are the cheapest loyalty driver.** CartHedge already has the buyer's WhatsApp thread, so milestone messages (confirmed, shipped with tracking, out for delivery, delivered + review ask) cost almost nothing once courier sync (3.4) lands. They also generate the review prompt.
- **Reviews:** a reviews MVP (post-delivery WhatsApp ask → star + photo → shown on the product page and usable by the AI as social proof) matches what Nector charges $49/mo for.
- **Store credit:** CartHedge already issues credit notes on refunds. Adding "refund as store credit" plus simple gift cards reuses the coupon/ledger rails and is Return Prime's main lever for keeping revenue on returns.
- **Loyalty points and referral codes** are standard on Shopify but cost $49 to $179/mo there. For social sellers, a simple referral code (buyer shares a code, both get ₹X off) layered on existing coupons is the low-effort version.

### Gaps
- No India-specific evidence on how much small social sellers use loyalty or referral programs. Every source found is Shopify-brand oriented.
- Whether CartHedge already sends buyer WhatsApp status messages on status change was not checked in code. Verify before treating it as a gap.
- Subscriptions (repeat orders on UPI AutoPay) for physical goods at this scale were not researched in depth.

## Q7. Consolidated gap inventory: what CartHedge lacks, how standard it is, who charges for it, and evidence of seller value

### Takeaway
Most of the high-value ops gaps cluster around **post-dispatch logistics**: status sync, NDR, address scoring, COD remittance, insurance pass-through. Second are **payment flexibility** (partial COD / advance + balance, store credit) and **team/accounting** (roles, CA seat, Tally/GSTR-1). Third are **catalog AI and channels** (photo-to-listing, WhatsApp catalog sync, slots/capacity, price lists).

E-invoice and e-way bill, POS, payroll and multi-warehouse are standard in other categories but low value for CartHedge's segment.

### Cited Findings
How to read the table:
- **Standardness:** U = ubiquitous among the relevant tools; C = common; N = niche.
- **Status vs existing docs:** NEW = not in FEATURE-GAPS or FEEDBACK; otherwise the existing ref is given.

| Gap | Standardness | Who has it, tier/price | Evidence sellers value it | CartHedge status |
|---|---|---|---|---|
| Courier status sync (auto shipped/delivered/RTO) | U (all aggregators) | Shiprocket, all plans ([shiprocket.in](https://www.shiprocket.in/)) | Prerequisite for NDR and buyer updates | FG 3.4 open |
| NDR inbox with buyer outreach and re-attempt | U among aggregators | Shiprocket pay-as-you-go; WhatsApp/SMS/IVR ([NDR page](https://sr-website.shiprocket.in/ndr-management/)) | Shopify reviews: "very bad experience with NDR and RTO" ([Shiprocket reviews](https://apps.shopify.com/shiprocket)) | NEW |
| Address-quality warning at checkout and before dispatch | C (new in 2026) | Shiprocket Apr 2026; Fastrr "address filtering" ([Apr 2026](https://www.shiprocket.in/blog/product-highlights-from-april-2026/)) | Shiprocket says bad addresses drive repeat failures and RTO (vendor) | NEW (related to FG 3.6 pincode rules) |
| Pincode serviceability / COD-blocked pincodes | U | Old GoKwik app; Shiprocket ([snippet](https://apps.shopify.com/kwikcheckout?locale=de)) | Common RTO lever | FG 3.6 open |
| Weight-slab × zone shipping fee | C (often a top-tier feature) | Shopify Advanced live rates; Dukaan Enterprise rules ([Shopify](https://www.shopify.com/in/pricing); [SoftwareONE](https://platform.softwareone.com/product/custom-shipping-rules/PCP-2833-8847)) | FEEDBACK: Lakshmi | FEEDBACK open |
| COD remittance reconciliation (expected vs received, early-COD cost) | C | Shiprocket consolidated remittances; early COD 0.49 to 0.99% ([support](https://support.shiprocket.in/support/solutions/articles/43000463560)) | Reviews: remittance held when wallet goes negative from RTOs ([Shiprocket reviews](https://apps.shopify.com/shiprocket)) | NEW |
| Shipment insurance / RTO freight protection pass-through | C (aggregator add-on) | ShipSure, Auto Secure above ₹2,500 ([Apr 2026](https://www.shiprocket.in/blog/product-highlights-from-april-2026/)) | Vendor-led | NEW (pass-through only) |
| Weight-discrepancy dispute tracking | C | Shiprocket panel ([shiprocket.in](https://www.shiprocket.in/)) | Reviews: small items billed as 1 kg ([Shiprocket reviews](https://apps.shopify.com/shiprocket)) | NEW (low priority) |
| Blind/white-label dropship label | N | Third-party Shiprocket integrations ([eShipz](https://eshipz1.zohodesk.in/portal/en/kb/articles/steps-to-integrate-shiprocket-b2c-carrier)) | FEEDBACK: Hiren, Gurpreet | FEEDBACK open |
| Hyperlocal same-city delivery | N | Shiprocket Quick ₹10/km ([shiprocket.in](https://www.shiprocket.in/)) | Bakers and food sellers (inferred) | NEW |
| Partial COD / advance + balance (% or ₹) | C | Razorpay Magic; PenguinCOD free; WALoops; old GoKwik app ([Razorpay](https://razorpay.com/blog/partial-payments-partial-cod/)) | FEEDBACK: Sneha, Shabnam; COD-DM RTO 30%+ ([CourierBook](https://www.courierbook.in/blog/instagram-seller-low-volume-shipping-india/)) | Partial (fixed COD token only) |
| Block repeat/multiple COD orders per buyer; COD block for risky buyers | C | Fastrr ([checkout](https://checkout.shiprocket.in/)) | — | FG 3.7 open |
| Mark offline payment as paid | U in billing apps | Swipe, Vyapar, myBillBook (core) | — | FG 3.8 open |
| Store credit / gift cards | U on Shopify | Shopify all plans; Return Prime store credit ([Shopify](https://www.shopify.com/in/pricing); [GoKwik](https://www.gokwik.co/)) | Return Prime claims 10% more recovered revenue (vendor) | NEW |
| In-cart upsell / free-gift progress bar | C (brand checkouts) | GoKwik Cart ([gokwik.co](https://www.gokwik.co/)) | Vendor claims a 15% AOV lift | NEW (low priority for DM-led sales) |
| AI photo-to-listing (Hinglish) | C (2026) | Amazon Seller Assistant, free ([About Amazon](https://www.aboutamazon.in/news/small-business/amazon-seller-assistant-ai-tool-india)); Lister AI $0.3/product | Amazon claims 70% pre-fill | NEW (supersedes FG 4.5 "IG import") |
| WhatsApp catalog sync (Meta Commerce Manager) | C among WhatsApp BSPs | Interakt, Shopaccino, Zoko ([bot.space](https://www.bot.space/blog/whatsapp-catalog-setup-shopify)) | Vendor-led | NEW |
| Collections / featured ordering | U | Shopify, Dukaan | — | FG 4.5 open |
| Multiple price lists / wholesale tiers | C | Swipe JET ₹4,199/yr; Shopify B2B 3 catalogs ([Capterra](https://www.capterra.com/p/10008988/Swipe/pricing/)) | FEEDBACK: Hiren, Gurpreet | FEEDBACK open |
| Delivery date/slot + per-slot capacity | N (no India-native tool found) | OrderSlots (Wix) ([Wix](https://www.wix.com/app-market/web-solution/krchz245-orderslots-1)) | FEEDBACK: Sneha, Shabnam | FEEDBACK open |
| Batch/expiry tracking | C in billing apps | Swipe RISE ₹5,499/yr | Food and cosmetics sellers (inferred); FSSAI ask in FEEDBACK | NEW |
| Multi-warehouse / locations | U on Shopify | Shopify 10; Dukaan 2 to 5 ([SoftwareSuggest](https://www.softwaresuggest.com/dukaan)) | Low for 1-person sellers | NEW (low priority) |
| Staff roles (Admin/Manager/Staff) | U | Dukaan by plan; Shopify Grow 5; Swipe JET 2 users ([Dukaan help](https://dukaan.help.center/article/5014-how-to-create-a-staff-account-in-dukaan)) | FEEDBACK must-have | FG 5.6 open |
| Accountant (CA) seat | C in billing apps | myBillBook Diamond "1 user + 1 CA" ([Accountune](https://www.accountune.com/mybillbook-alternatives)) | FEEDBACK CA persona | NEW |
| Tally / GSTR-1 export | U in billing apps | Swipe, Vyapar ([Vyapar](https://vyaparapp.in/comparison-with-other-apps?brand=zoho)) | FEEDBACK must-have | FEEDBACK open |
| Multi-business / multi-store | C | Swipe Biz ([Capterra](https://www.capterra.com/p/10008988/Swipe/pricing/)) | FEEDBACK agency ask (Rohit) | FEEDBACK open |
| E-invoice / e-way bill | U in billing apps | Swipe JET/RISE; Vyapar 10/mo on Silver | Legally needed only above ₹5 Cr (B2B) or ₹50k consignments ([GimBooks](https://www.gimbooks.com/blog/5-crore-e-invoice-turnover-rule-2026/amp/)) | NEW (defer) |
| Bundled marketing message credits | C | myBillBook Platinum 500/yr | FEEDBACK asks for a prepaid WhatsApp wallet | Related to FEEDBACK |
| Reviews / ratings with photo | U (via apps) | Nector Starter $49/mo; Judge.me-type apps | eChai recommends Nector ([eChai](https://echai.ventures/d2c/d2c-community-loyalty/which-loyalty-referral-tools-to-use)) | FG 6.4 open |
| Loyalty points / referral codes | C (via apps) | Nector Growth $179/mo for referrals; Smile.io free to 200 orders ([Nector](https://www.nector.io/pricing-md)) | Indian merchants on Nector reviews | NEW |
| Buyer WhatsApp milestone updates | U | Shiprocket Smart Orders Notify; Spur/BotPenguin ([Apr 2026](https://www.shiprocket.in/blog/product-highlights-from-april-2026/)) | Response rate 30%→70% (old, vendor) ([Tata Comms](https://tatacommunications.com/hubfs/47271964/TaCO-2024/case-studies/doc/Shiprocket-WhatsApp.pdf)) | Verify in code |
| Ads measured on delivered orders | N (new) | Fastrr Ads ([Digital Terminal](https://digitalterminal.in/solutions/shiprocket-launches-fastrr-an-ai-powered-commerce-suite-to-transform-online-shopping-experiences)) | — | NEW (later) |

### Inferences
- **Suggested additions to FEATURE-GAPS from this research (NEW only):**
  1. **NDR inbox over WhatsApp** (P1, after 3.4).
  2. **Address-quality check at checkout** (P1).
  3. **COD remittance reconciliation** (P1 for COD-heavy sellers).
  4. **Partial COD as % or ₹ plus balance due** (P1; generalises the COD token and covers advance + balance).
  5. **Store credit and gift cards** on the coupon rails (P2).
  6. **AI photo/post → product draft** (P1; strong AI-story fit, free on Amazon).
  7. **WhatsApp catalog push via Catalog API** (P2, after the WhatsApp go-live).
  8. **CA read-only role** alongside staff roles (P1 with 5.6).
  9. **Referral codes** (P2).
  10. **Batch/expiry** for food sellers (P2).
  11. **Insurance/ShipSure pass-through** via Shiprocket (P2).
- **Competitive threat:** Shiprocket's Engage 360 Instagram chatbot and Fastrr Identify (WhatsApp) put a logistics giant into CartHedge's AI DM space. CartHedge's defensible differences remain grounded order-taking in the chat, no GMV cut, and a single tool for DM, storefront, order desk and GST, rather than features Shiprocket sells separately to brands.
- **Deprioritise:** e-invoice and e-way bill, POS, staff payroll and multi-warehouse. They are standard in billing and Shopify, but CartHedge's segment (mostly under ₹40 lakh to ₹5 Cr turnover, B2C, single location) rarely needs them.

### Gaps
- No Reddit or forum threads from Indian social sellers were retrieved. Two searches restricted to Reddit returned nothing relevant, so "seller value" evidence leans on Shopify app reviews, FEEDBACK personas and vendor claims.
- Play Store reviews for Dukaan, Swipe, myBillBook and Vyapar were not read within the tool budget.
- No independent (non-vendor) measurement was found for NDR outreach, address scoring, partial COD or loyalty lifts.
- YouTube comparisons were not reviewed.
