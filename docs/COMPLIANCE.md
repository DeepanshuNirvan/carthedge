# Payments, data and compliance

How CartHedge handles money and personal data, what the code guarantees, and what still needs a person (lawyer, dashboard setting). Checked against the code on 3 Oct 2026. Not legal advice — have the policies reviewed.

## Payment data: what is stored

- **Never stored:** card number, CVV, expiry, UPI PIN, bank account details. Buyers and sellers type these into Razorpay's checkout only, so card data never reaches CartHedge (hosted checkout keeps CartHedge out of PCI DSS card-data scope). RBI's card-on-file rules forbid merchants keeping card data; repeat payments go through Razorpay (tokenised saved cards, autopay mandates).
- **Stored, for reconciliation, refunds and tax records:** Razorpay order, payment, refund and subscription ids; amounts in paise; status and timestamps (`payments`, `refunds`, `subscriptions`); the GST documents issued (`invoices`, `credit_notes`, `platform_invoices`); a buyer's UPI transaction reference when they report a UPI payment.
- **Seller's own Razorpay key secret:** AES-GCM encrypted at rest, never sent back to the browser. A seller's UPI id is stored as entered (it is a public payee address).

## No double charge, no double refund

| Path | Guarantee |
|---|---|
| Buyer payment verify | Atomic `pending → paid` flip; a racing verify or a repeated webhook books it once and messages the buyer once (idempotent by state, not by event id). |
| Subscription payment | Unique index on `razorpay_payment_id`; verify and webhook share one activation; an autopay charge is booked once per Razorpay payment. |
| Order placement | The buyer's OTP token is consumed when the order is created, so a double tap cannot create two orders. |
| Refund cap | The order row is locked first, then refunds are summed in a fresh statement, so simultaneous refunds can never exceed what was paid (race test R4; the old combined query let three through). |
| Razorpay refunds | Each refund carries our refund id as Razorpay's `receipt`. The refund row stays locked during the call (two clicks cannot send twice). A retry or void first asks Razorpay for a refund with that receipt. Only a clear 4xx decline marks it failed; a 5xx or no answer leaves it pending for a safe retry. |
| Coupons, stock, returns, invoice numbers | Per-offer lock for usage caps; atomic stock decrement; one open return per order (unique index); per-financial-year counter row inside the issuing transaction, so serials are distinct and gap-free (race tests R1, R2, R3, R6, R7). |

## Recurring payments (RBI e-mandate)

- The mandate is registered and authenticated in Razorpay's checkout. Razorpay sends the pre-debit notifications RBI requires before each charge.
- Sellers can turn autopay off any time in Billing; CartHedge cancels the Razorpay subscription. Failed charges (`subscription.pending`) alert the seller; repeated failure (`halted`) pauses autopay and asks them to renew.
- Overage (orders above quota) is added to the next charge the day before renewal. Charges above ₹15,000 need extra authentication under RBI rules; plan plus overage normally stays far below that.

## GST

- Sellers' invoices: tax invoice / bill of supply / invoice by registration; CGST + SGST or IGST by place of supply; HSN per line; buyer GSTIN for B2B; financial-year numbering; credit notes for refunds.
- CartHedge's invoices to sellers: SAC 998314 at the rate set in admin, numbered `CH/YYYY/NNNNN` — issued without GST until CartHedge's GSTIN is saved in admin → Site content → Invoice identity.
- Retention (CGST Act s.36, 72 months): CartHedge's own invoices and subscription payments are kept when a seller deletes their account. A seller's own sales records are theirs; the delete dialog tells them to download their data first.

## Personal data (DPDP Act 2023)

- **Notice at collection:** checkout says what the details are for (delivering the order, messages about it, one reminder if checkout is not finished) and links the privacy policy. The privacy policy, terms and data-deletion page were updated on 3 Oct 2026 to match what the app collects.
- **Limits:** dropped-checkout records are deleted after 30 days; device push addresses are removed when notifications are turned off or rejected; AI usage is stored as counts, not message text.
- **Rights:** sellers export everything and delete their account themselves (30-day grace, then a purge job); sellers erase a buyer's personal details from the customer page while keeping the order for their books; contact `privacy@carthedge.in`.
- **Security:** AES-GCM for secrets and channel tokens; HTTPS; signed Meta and Razorpay webhooks; password change ends other sessions; staff support views are read-only and recorded; rate limits on login, OTP, orders, refunds and order tracking.
- **Logs:** while no WhatsApp/SMS/email provider is configured (OPS-1), outgoing messages — including OTPs — are written to the server log so they can be read during testing. Once a provider is set, message text is no longer logged. Configure providers and limit log access before real buyers use it.

## Marketing consent (WhatsApp offers)

- **Opt-in is the buyer's own act:** an unticked box at checkout that names the store and the channel ("Send me offers and new arrivals from <store> on WhatsApp. I can stop them any time."), shown only after the number is verified by OTP; or "Yes, send me offers" on the order page behind a fresh OTP; or replying START to the store's WhatsApp. A purchase alone never subscribes anyone, and a seller can never turn offers on.
- **Withdrawal is as easy:** reply STOP (or tap "Stop promotions"), one tap on the stop link at the end of every offer (no code needed), the order page, or ask the seller (Customers → Stop offers).
- **Proof:** every yes and no is appended to `marketing_consents` with the exact sentence agreed to (or the message sent), source, order, IP address and browser, and time. The seller sees the history in the customer drawer and in their data export. Erasing a buyer deletes it.
- **Sending:** broadcasts reach only buyers whose current answer is yes; the seller accepts the broadcast rules (version + time + IP recorded in `terms_acceptances`) before the first send or schedule.
- **Which number:** marketing (offers, cart reminders, back-in-stock) only ever leaves from the seller's own WhatsApp number, never CartHedge's: the buyer said yes to the shop, not to CartHedge. Until sellers can connect WhatsApp, those messages wait (`notify.SetOffers` unset) and the seller reaches buyers by hand. CartHedge's number sends only one-to-one transactional templates (codes, order updates, seller alerts).
- **Roles:** the seller is the data fiduciary for their buyers under the DPDP Act; CartHedge processes on the seller's behalf (terms, "Broadcasts and marketing messages").

## Owner actions (not code)

- [ ] Have a lawyer review the privacy policy and terms against the DPDP Rules (notice contents, grievance contact, consent wording for reminders and broadcasts).
- [ ] Configure the WhatsApp/SMS and email providers (OPS-1).
- [ ] Confirm the AI provider account does not use API data for training (the privacy policy says it is not). OpenAI's API does not by default; Gemini's free tier may.
- [ ] Save CartHedge's GSTIN in admin, and subscribe the Razorpay webhook to `subscription.*` and `payment.captured`.
- [x] Broadcast opt-in for WhatsApp marketing (built 4 Oct 2026, see "Marketing consent" below). Have the lawyer check the consent sentence and the Broadcasts section of the terms.
- [ ] Have the lawyer confirm which label details (MRP, country of origin, maker/packer/importer) apply to fashion and handmade sellers.
