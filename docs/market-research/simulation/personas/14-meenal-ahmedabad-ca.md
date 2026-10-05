# Panelist 14: CA Meenal Joshi, Ahmedabad (chartered accountant, advisor to small sellers)

## Profile

- **Who:** CA Meenal Joshi, 41, Ahmedabad, Gujarat. Gujarati at home, Hindi with clients, English for notices and emails. Sole-proprietor CA practice in Navrangpura. Files GST returns and does books and ITR for about 60 small online sellers (fashion, jewellery, food).
- **Business in numbers:** 60 clients. About 34 are regular GST taxpayers (monthly or QRMP), 9 are composition dealers, 17 are unregistered because they are below the threshold. Roughly 24 fashion and boutique, 14 jewellery (silver, imitation, a few gold), 16 food (sweets, namkeen, bakery, home chefs), 6 other. Most sell through Instagram DMs and WhatsApp, take UPI and COD, and keep their order book in a notebook, an Excel sheet or Vyapar.
- **Income and team:** about ₹85,000 to ₹95,000 a month in fees (GST clients ₹1,000 to ₹2,500 a month, composition and unregistered clients less, plus ITR and audit work in season). Team is Hetal (accounts executive, ₹22,000), Jignesh (semi-qualified assistant, ₹15,000) and a part-time data entry operator (₹8,000). Tools about ₹6,000 a month (Tally Prime with renewals, a GST filing utility, Zoho mail and storage, DSC renewals).
- **What she knows:** which small sellers get notices and why: wrong place of supply, HSN blank, invoices missing for sales that happened, RTO parcels still reported as sales, credit notes never issued, composition dealers shipping inter-state. She also knows which "apps" quietly stop working and leave a client with no data.
- **What she checks first:** is the GST invoice correct (HSN, place of supply, CGST/SGST vs IGST, B2B with GSTIN, credit notes, financial-year series), can I export to Tally or Excel, is the vendor's own bill a valid GST invoice my client can take ITC on, where does the data go, and does the tool create a compliance risk (e-commerce operator TCS, registration triggers, consent for promotional messages).
- **Influence:** her clients buy what she says is safe. One "avoid this" from her travels through the Ahmedabad CA WhatsApp groups. She does not take commission on recommendations.
- **Mood:** precise, short on time (the 11th and the 20th are her bad days), polite but unmoved by "AI". Wants things in writing.

## Round 1

### Stage 1. Cold first impression

I was scrolling Instagram between two GSTR-1 uploads and this sponsored post came up. A client's daughter had sent me a reel from the same kind of app last month, so I stopped.

**What I think it is:** an AI chatbot for Instagram DMs that also takes the order. The "approve with a tap" part tells me the seller stays in the loop. It talks about DMs, so I assume Instagram only, not WhatsApp.

**Would I tap?** Yes, but only to look at the footer, not to start the trial. I would not start a trial from an ad. I open the site and look for who this company is.

**What I would suspect:**
- No company name, no GSTIN, no address on the ad. For my purposes, a vendor I cannot find on the GST portal is not a vendor.
- "Collects the order and confirms it": then what? An order without a correct invoice behind it is my problem three months later. Does the tool stop at the chat, or does it carry the order through to a tax invoice and a credit note?
- An AI reading my clients' customers' chats means names, phone numbers and addresses going into some model. Where? Who sees it?
- "Buyers in their language": fine. But Gujarati? Marathi? I will look.

**What I would need to see next:** the company's legal name and GSTIN, a privacy policy and terms I can read, whether the price is plus GST, and one sample invoice.

### Stage 2. Looking around like a real person

I kept this to three searches. This is what I found.

- **Reviews and footprint:** I searched for CartHedge with "Instagram DM order automation India reviews". Nothing about CartHedge. The results are all comment-to-DM tools priced very low (ReplyKaro at about ₹99 a month in India, others a bit above). [ReplyKaro India page](https://www.replykaro.com/instagram-automation/india), [Creator Lane list of tools](https://creatorlanehq.com/blog/best-instagram-dm-automation-tools-india). So no public footprint, no reviews, and I cannot check a GSTIN without a company name. That is a minus, not a disaster, at this stage. What my clients compare it with in their heads is a ₹99 to ₹699 keyword bot, and I will have to explain why this is a different thing, if it is.
- **TCS and e-commerce operator question:** my clients ask me this whenever a new platform shows up. Current TCS under Section 52 is 0.5% (0.25% CGST plus 0.25% SGST, or 0.5% IGST) since 10 July 2024, and it applies to the net value of taxable supplies made through the operator where the operator collects the consideration. A person selling on his own website is not an e-commerce operator. [GST Safar on Notification 15/2024](https://gstsafar.com/tcs-rate-for-e-commerce-operator/), [TaxGuru on e-commerce operators](https://taxguru.in/goods-and-service-tax/gst-e-commerce-operators.html), [GST Council FAQ on e-commerce](https://gstcouncil.gov.in/sites/default/files/2024-02/faq-e-commerc.pdf). Honest note: what I found does not talk about a SaaS storefront vendor specifically. The wording "owns, operates or manages a digital platform" is broad, so I want the vendor to state in writing that it is a software provider, not an operator, and that buyer money does not pass through it.
- **Data law:** the DPDP Rules were notified in November 2025. The main duties of a data fiduciary start 13 May 2027, with a 72 hour breach report to the Board, and there is no small business exemption. [TCSA roadmap](https://www.tcsa.in/resources/dpdp-rules-2025-implementation-roadmap), [K&S on breach timeline](https://ksandk.com/data-protection-and-data-privacy/dpdp-data-breach-notification-timeline/). So each of my sellers is a data fiduciary for their buyers' phone numbers and addresses, and the tool is their processor. I need a processor agreement and a breach process before May 2027, not after.
- **Not looked up:** Meta's WhatsApp message charges (my clients quote them to me from their BSPs, I did not re-check this week) and what the bigger WhatsApp tools charge. I only insist that whatever the vendor charges for Meta messages is shown with GST on the bill.

Worry going in: unknown company, unknown data path, and nothing yet about the thing I care about, which is what happens to the order after the chat.

### Stage 3. After reading product.txt and the website copy

The product is bigger than the ad. It is an order desk that happens to have a chatbot in front. Whoever wrote section 8.9 has sat with a CA, I think: tax invoice, bill of supply and plain invoice by registration type, GSTIN checksum, numbering restarting each financial year (PREFIX/2627/0001), CGST plus SGST or IGST from the delivery address, HSN and amount in words, credit note for every refund, buyer GSTIN for B2B, and prices GST-inclusive with the tax split out line by line. Buyer money goes to the seller's own Razorpay, and CartHedge says it never holds it. That last point takes most of the TCS worry away for now.

What I noticed on a careful read:

- **Export:** the monthly report "for the seller's accountant" is mentioned, and "Accounting exports: deeper GST and Tally style reporting" sits on the roadmap. I do not know what the export looks like today. I need GSTR-1 shaped data, not a sales PDF.
- **Invoice timing is not stated.** The order journey copy says "Packed: packing slip and invoice ready" and "Delivered: invoice numbered". Under Section 31 a tax invoice for goods is issued at or before removal of goods, not at delivery. If numbering happens at delivery, either it is late or an RTO parcel never gets a number, and I need to know which. And RTO: the doc says a cancelled or returned prepaid order creates a pending refund and "an invoiced order gets a GST credit note for every refund". A COD order that comes back RTO has no refund. If it was invoiced, the seller has reported a sale that never happened.
- **Rate and value rules:** HSN and rate are "per product, falling back to the store default". A single default HSN for a catalogue is how my clients end up with a wrong HSN summary. And since 22 September 2025 apparel is 5% up to ₹2,500 per piece and 18% above it. One fixed rate per product breaks the day a variant crosses that price. Shipping and COD charges are separate lines, but what rate do they carry on a cart with two rates? Discounts (coupon, pay-online discount): are they spread across the lines before tax?
- **Exchange:** "a linked replacement order with the returned value credited, buyer pays only the difference". Is that a credit note plus a fresh tax invoice, or a net-off with no paper? I need to know.
- **Invoice number length:** Rule 46 allows 16 characters, letters, numbers, slash and hyphen. With a long seller-chosen prefix, PREFIX/2627/0001 can run past 16. Is the prefix capped?
- **Composition dealers:** a composition dealer cannot make inter-state supplies at all. The doc builds IGST for inter-state sales and a bill of supply for composition, but I see nothing that stops or warns a composition seller shipping to another state.
- **CartHedge's own invoice:** the admin has "invoice identity: legal name, GSTIN, address, SAC, GST rate". Good. But does it print the seller's GSTIN and legal name, and the right place of supply, so CGST/SGST vs IGST is correct and the credit appears in the seller's GSTR-2B? That depends on CartHedge filing its own GSTR-1 on time. Also the pricing table does not say whether ₹499, ₹999 and ₹1,999 are plus GST.
- **Section 10, business model:** "payment take-rate via a licensed aggregator" and "courier margin" are listed as later streams. The day CartHedge collects consideration for sellers, my TCS and operator reading changes. I will want to hear about it before it happens.
- **Data:** "Erase a buyer's data on request, orders stay without details so tax figures do not change". Fine for B2C. For a B2B invoice, name, address and GSTIN must stay (records for 72 months under Section 36). Also "AI spend per seller at the model providers' list prices" tells me a third-party model is used. So buyer chat text, names and addresses leave the platform. To which vendor, which country, retained or not, used for training or not?
- **Good:** consent kept with the words, place and time for offers (DPDP friendly); STOP in every offer; "view as seller" support access is read-only and recorded; delete account with 30 days and tax invoices retained; data export in one file; per-seller isolation; keys encrypted.
- **Website:** the file itself says the testimonials ("RTO from 27% to 9%", "₹31,000 saved") are seed placeholders hidden until real ones replace them. Good that it knows. If those were shown as real customers, I would tell my clients to stay away: misleading claims are a risk to the seller who runs the tool too. The language samples show Hindi, Tamil, Bengali, Telugu, Kannada. No Gujarati and no Marathi. I serve Gujarat.
- **Footer:** "Made in India" and links for Privacy, Terms and Data deletion. No legal entity name, no GSTIN, no registered address that I can see in the copy.

### Stage 4. The interview

**1. In your words, what does it do? What confused you?**
It reads a seller's Instagram DMs, answers in the buyer's language, collects item, size and address, shows an exact summary, and the order lands on a board. The seller or buyer gets a link for payment (own Razorpay, UPI, COD with an optional token), tracking, returns and refunds, and the seller gets GST invoices and credit notes from the order. What confused me: (a) when exactly is the invoice issued and what happens to it on RTO, cancellation and exchange; (b) is the price plus GST; (c) what the export for the accountant contains today; (d) which data goes to which AI vendor; (e) who the company is.

**2. Top 3 things that excite you, ranked, and why for your business**
1. **Invoice and credit note tied to the order and the return.** Most of my clients make invoices by hand in Excel or not at all, and returns never reach their GST. If the tool makes a correct invoice from the order, with place of supply from the delivery address, HSN, FY series, and a credit note when a refund is recorded, it removes the three errors I correct most.
2. **Buyer money goes straight to the seller's own Razorpay, CartHedge takes no cut.** No TCS, no operator reading, nothing for me to worry about on reconciliation of someone else's settlement. This is the cleanest architecture I have seen from a small vendor.
3. **Seller stays in control and every consent is on record.** The assistant steps back when the owner replies, the order summary is computed by the system and not the AI, and offer consents are logged with words, time and place. For my clients that is the right shape for DPDP and for not sending a wrong price to a buyer.

**3. Top 3 doubts, fears or deal-breakers**
1. **No GSTR-1 or Tally export today.** "Deeper reporting" is on the roadmap. I will not recommend a tool whose GST output I have to re-key. For my 34 regular taxpayers, B2B, B2CL, B2CS by state and rate, credit notes, HSN summary and documents-issued data is the whole job. DEAL-BREAKER for recommending.
2. **Invoice rules I cannot verify and a vendor I cannot verify.** Invoice timing, RTO and exchange handling, default HSN, the apparel price rule, discount and shipping tax treatment. And no legal entity, GSTIN or registered address anywhere. If CartHedge's own GST invoice does not reach my client's GSTR-2B, the ITC is lost and I get the call.
3. **Data path and breach duty.** Customers' phone numbers, addresses and chats are read by an AI from an unnamed vendor. I need a data processing agreement, the list of sub-processors, the hosting region, retention and training terms in writing, and a 72 hour breach process. No answer means no recommendation, however nice the screens are.

**4. Features missing that you would need**
- **GSTR-1 ready export (Excel and JSON in the offline tool format): B2B, B2CL, B2CS by state and rate, CDNR and CDNUR, HSN summary split B2B and B2C the way the portal wants it, and documents issued with a count of cancelled numbers.** MUST HAVE before I recommend or pay.
- **Sales register and credit note register in Excel (invoice number, date, buyer, GSTIN, place of supply, HSN, taxable value, rate, CGST, SGST, IGST, round off, total) plus a Tally Prime import file (rate-wise sales ledgers, output tax ledgers, party ledgers).** MUST HAVE.
- **Clear invoice rules, documented and enforced: invoice issued at or before dispatch, numbers consecutive with no gaps, RTO and cancelled-after-invoice produce a credit note or recorded cancellation, exchange produces a credit note plus a new invoice, no edits after issue, an audit trail of changes.** MUST HAVE.
- **HSN and rate controls: no single store default HSN for a whole catalogue, a searchable HSN picker with 4 and 6 digit validation, the apparel rate switch at ₹2,500 per piece, discounts spread across lines before tax, shipping and COD charges taxed at the principal rate or in proportion to the lines.** MUST HAVE. The seller's CA decides the HSN, the tool must never fill it in silently by AI.
- **CartHedge's own invoice correct for ITC: legal name, GSTIN and place of supply of the seller, SAC, CGST plus SGST or IGST by the seller's state, overage fees as their own line, emailed as PDF, "plus GST" printed next to every price, and CartHedge filing its GSTR-1 on time so it reaches 2B.** MUST HAVE before I tell any registered client to pay.
- **Vendor disclosure: legal entity name, GSTIN, CIN or LLP number, registered office, grievance officer, a processor agreement, sub-processor list and hosting region, written statement on AI vendor retention and no training on buyer data, 72 hour breach commitment.** MUST HAVE.
- **Buyer erasure that keeps B2B invoice data for 72 months (name, GSTIN, address) and erases only what the law does not require to keep.** MUST HAVE (confirm in writing).
- **Read-only accountant login per client: invoices, order totals and exports, with no access to buyer chats, phone numbers or keys.** MUST HAVE for how I actually work. I cannot ask 60 clients to share one password.
- **The AI must not answer tax questions or promise a "GST bill" in a DM.** MUST HAVE. "GST bill milega?" and "price me GST hai?" are common questions, and a wrong yes creates a liability for the seller. Hand over, or answer only from a fixed seller-written line.
- **Gujarati (and Marathi) replies tested, not just "regional scripts".** MUST HAVE for my clients in Gujarat. NICE LATER for the rest.
- **Registration guards: composition seller blocked or warned on inter-state sale, unregistered seller never shown a GST line, and a turnover tracker for the financial year with a warning at 80% of the ₹40 lakh goods threshold.** NICE LATER, but I would sell this to clients myself.
- **Razorpay settlement and courier COD remittance matching report.** NICE LATER, and it is where my staff spend most of their time.
- **Firm dashboard to switch between my clients.** NICE LATER.
- **e-invoice IRN for sellers above ₹5 crore, and an e-way bill warning on consignments above ₹50,000 (jewellery).** NICE LATER. None of my clients needs the IRN today, two will within two years.

**5. Features you would never use**
Live selling. RTO insurance and COD guarantee. Reseller price tier for most of my clients. Broadcasts and drops: I tell my clients to be very careful with promotional messages, and I will not set one up. Comment-to-DM. The storefront for the many who sell only in chat.

**6. What you spend today on tools, apps, staff, agencies; how you like to pay**
My practice: staff ₹45,000 a month, tools about ₹6,000. For clients: what I see them pay is Vyapar or a similar billing app (a few hundred rupees a month), a ₹99 to ₹699 Instagram bot for some, a BSP like AiSensy for WhatsApp (₹1,500 to ₹3,200 a month, what clients tell me, not checked), and my own fee of ₹1,000 to ₹2,500. Per client, tools plus my fee is ₹2,500 to ₹5,000 a month. I like UPI AutoPay for small subscriptions and a business card for anything where I take ITC. Monthly is my default. Annual only after two months of use and only with the GST invoice issued before I pay. For clients I insist they pay the vendor directly in their own name and GSTIN. I never pay and re-bill.

**7. Price sensitivity (plus GST, for a typical client with 100 to 300 orders a month)**
- (a) so cheap I'd doubt it: under ₹299. Below that I assume the vendor is a hobby or a scraper and will be gone before the next return.
- (b) bargain: ₹499 to ₹799 with GST invoice, accountant export and read-only CA login included.
- (c) getting expensive but I'd still pay: ₹1,299 to ₹1,499, for a seller with heavy COD where the saving is visible in rupees.
- (d) too expensive: ₹1,999 and above for a seller below 300 orders. Add 18% GST and ₹1,999 becomes ₹2,359.

Note on GST: 17 of my 60 are unregistered and 9 are composition. They cannot take ITC, so the 18% is a real cost to them. For the 34 regular ones it is neutral. So the price list must say plus GST in the same size as the price.

**8. React to the current price list**
- **Which plan fits:** for my typical client (80 to 250 orders) Growth at ₹999 is the right plan, because it carries GST invoices and reports, which is the thing I care about. Starter at ₹499 has no GST invoices on the list in section 9, so it is a link tool, not a compliance tool. Pro at ₹1,999 is justified only if the automatic replies are worth it to a seller with a COD problem.
- **Would I tell clients to pay after the trial:** not yet. Only after I have seen an export I can file from, a correct vendor invoice, and written answers on data. Then I would put 6 to 8 clients on Growth.
- **What makes me upgrade a client:** order count over the quota or a clear RTO saving. **What makes me tell clients to leave:** a late or wrong GST invoice from the vendor, no export at filing time, a data incident without notice, or a vendor that moves to collecting buyer payments without telling us.
- **Flat vs per-order vs % of sales:** flat fee. A flat fee is easy to book and to explain to a seller who budgets monthly. Per-order above the quota is acceptable only if "order" is defined (is a cancelled, RTO or exchange order counted, the doc says an exchange does not count) and the seller gets a notice at 80%. Percent of sales never: it makes the vendor look like an operator, and it invites questions on tax collection.

**9. Free plan or free trial? How long? Annual?**
A trial is right. But 15 days is too short for me to check the output: I need a full filing cycle, the 11th and the 20th, so 30 days. A test mode with a dummy GSTIN where I can raise an invoice and a credit note and download the exports before the client goes live would be better still. Annual: 15% to 20% off is tempting for registered clients who take ITC, with the invoice before the payment and a pro-rata refund if the vendor changes terms.

**10. Add-ons you would actually pay for**
- GSTR-1 and Tally export: should be inside Growth. If it must be an add-on, ₹199 to ₹299 a month, not more.
- Read-only accountant login: free, up to 3 per client. Extra staff logins ₹99 to ₹149 for a client's own staff.
- Setup and catalogue upload: I would pay nothing for HSN mapping by the vendor, because HSN is my professional responsibility. A vendor-run catalogue upload for ₹1,500 to ₹2,500 one time is fine for clients as long as HSN is left for me to confirm.
- WhatsApp message packs: not mine to decide, but pass-through with GST shown on the invoice.
- Auto-replies on the seller's own WhatsApp number: ₹500 to ₹799 a month for those who sell mainly on WhatsApp.
- Branding removal, courier booking, COD/RTO protection, more AI replies: not for me. For courier and COD protection I would want to see the GST on those fees.
- Priority support on call: ₹1,000 a month is fine if there is a named person who answers on the 10th, 11th, 19th and 20th of the month.
- No referral commission to me. Give the discount to the client. It keeps my advice clean.

**11. Who else influences the decision, and what they'd ask**
- **The seller (and often her husband or brother who packs orders):** "Kitna lagega, GST alag hai kya, aur data safe hai?"
- **Hetal, my accounts executive:** "Export kis format me hai, GSTR-1 me upload hoga ya re-entry? Credit note alag dikhega?"
- **My peers in the Ahmedabad CA groups:** "Company kaun hai, GSTIN check kiya? Koi notice aaya kisi ko is tool ke bill se?"
- **The seller's bank or Razorpay account manager:** whether a third-party app sits in front of the checkout.
- **Me, last:** a written answer on invoice timing, RTO and exchange, on data, and on the entity.

**12. One sentence to a friend about CartHedge right now**
"Idea aur invoice-credit note ka concept saru chhe, par jab tak GSTR-1 ya Tally export, apna GSTIN wala ITC invoice aur data ka likhit jawab nahi aata, main kisi client ko nahi bataungi, bas 3 clients pe test karungi."

## Round 2 notes

- I now accept per-order fees above quota only with a defined "order" (RTO, cancelled, exchange not counted), an alert at 80%, a written monthly cap, and a nudge to the cheaper plan (Hiren's ₹2,749 vs Pro ₹1,999 shows the ladder needs it). Still flat monthly fee, never percent of sales, 30 day trial, no permanent free plan. WhatsApp/Meta costs as a separate pass-through line with GST, under a seller-set cap.
- New worry from Devanshi's 32% COD refusals: if the invoice is issued at dispatch, every refused COD parcel needs a credit note or recorded cancellation, but the product file raises a credit note only on a refund. Added to my invoice-rule MUST list; I will not trust the RTO savings meter until it reconciles with credit notes.
- New idea from Pooja: GSTIN on the order page and invoice, checked live on the GST portal, makes "seller verified" meaningful for registered sellers (my 34 plus 9 composition); unregistered sellers must be labelled honestly, never "verified". Changed my mind: GSTIN is a buyer trust feature, not only my compliance need.
- Price range unchanged, plus GST: ₹499 to 799 bargain, ₹1,299 to 1,499 my limit, ₹1,999 plus 18% hard under 300 orders. Annual only after two months, invoice before payment.
- Agree with Hiren on per-order wariness but not on "never"; disagree with Rohit's 25 to 30 percent lifetime agency commission (I take none; give the discount to the seller; vendor invoice must carry the seller's own GSTIN, no pay-and-re-bill). Agree with Devanshi, Vikram and Farheen that percent of sales is out.

## Round 3 notes

- RTO and credit note reconciliation now MUST before trial: if an invoice goes out at dispatch and the parcel comes back RTO with no refund, does CartHedge auto-generate a credit note or leave the seller to record it manually? Until this is clear in writing, the RTO savings claim is unverifiable. Same for invoice series: can CartHedge continue from the seller's current number mid-year (e.g. start at INV-0413), or does it always reset to INV-0001? Mid-year reset breaks the registration record.
- Tax treatment letter for composition and unregistered clients now a MUST: CartHedge must provide a letter stating the subscription is "order management and GST compliance software, composition-dealer-eligible expense" so my accountant can file it correctly and my clients know the booking head. Without this, composition and unregistered sellers will ask me which head to use, and I cannot advise.
- Commission structure with Rohit clarified: I take none, ever, to keep my advice clean. If Rohit earns a fee from CartHedge, that fee lives on CartHedge's books as "partner fees" with a GST invoice and 10D TDS, not hidden in the seller's bill. This keeps the books honest for the seller and the vendor both.

## Round 4 vote

- Growth at ₹1,299 is my price and the safeguards (hard cap, alerts, defined order, flat fee) answer my per-order-cost fear. "Maybe" on pay-after-trial pending RTO-credit note logic in writing and a tax treatment letter for composition sellers.
- Hard cap on overages matters most: prevents surprise bills like my client got from a payment gateway. But I need to see the export format and RTO reconciliation before I tell clients to leave the trial.
