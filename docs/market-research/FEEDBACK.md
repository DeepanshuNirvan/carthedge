# Panel feedback (16 simulated people, 3 rounds)

The full conversations are in `simulation/rounds/r1`, `simulation/rounds/r2` and `simulation/rounds/r3`. Each person's full interview is in `simulation/personas/`.

## What people liked
- **Replies to night DMs in the buyer's language.** Ritu, Farheen, Mousumi and Lakshmi all lose buyers between 10pm and 1am.
- **"No cut of your sales" and money going to the seller's own Razorpay.**
- **The GST design.** The CA rated it the best part: invoice numbering by financial year, CGST/SGST vs IGST by place of supply, and credit notes.
- **COD confirmation and the buyer order page.** The buyer, Pooja, said she would order COD without fear.
- **The order summary is calculated by code, not by the AI.** Prices can't be invented.

## Negatives and objections
1. **The AI assistant is locked in the ₹1,999 Pro plan.** People called it "bait and switch".
2. **WhatsApp auto-replies on the seller's own number are not live.** This blocks 8 of the 16.
3. **Fear of surprise bills.** Uncapped per-order fees, auto-debits, and per-message markups, as Vikram experienced with WATI and Interakt.
4. **No proof the company is real.** Testimonials that look fake, and no legal name, GSTIN, address or phone number shown.
5. **15-day trial is too short.** People want 30 days, starting when they connect their account.
6. **Support.** People want phone support in their own language (Bangla, Tamil, Gujarati).
7. **AI risk.** A wrong price, a rude reply to a regular customer, or the bot pretending to be human.
8. **Buyer view.** Any hidden fee pushes buyers to Meesho. A COD token is acceptable only at ₹30 to ₹50, and only if it is adjusted against the bill and refunded automatically.
9. **Fake pages.** Free links could let scam pages pose as "verified" sellers.

## Feature requests

**Must have before paying:**
- [ ] WhatsApp auto-replies on the seller's own number (Meta Coexistence, so they keep the Business app)
- [ ] A hard cap on overage, alerts at 80%, a prepaid WhatsApp wallet, and a 12-month price lock
- [ ] Staff logins with roles (hide costs and margins from junior staff)
- [ ] Tally / GSTR-1 export, and continuing the invoice number series from the seller's previous app
- [ ] Credit note when a COD parcel is refused and returned to origin (today a credit note is only created on refunds)
- [ ] Legal identity and GSTIN on the website, a support phone line, and one-click data export
- [ ] AI always says it is the shop's assistant; a "regulars" list the bot never auto-replies to

**Important:**
- [ ] Comment-to-DM, and a drop or spike mode (stock hold timer, queue, waitlist) for Kabir and Tanya
- [ ] Shopify sync, an API, and team seats for D2C brands (Arjun)
- [ ] Shipping charged by weight and pincode, and weight-based options like 250g/500g/1kg (Lakshmi)
- [ ] Delivery date and time slot, advance plus balance payments, and daily capacity (Sneha, Shabnam)
- [ ] Gujarati, Bangla and Tamil, both in the assistant and in the dashboard
- [ ] Wholesale price tiers, and blind dropship slips showing the reseller's name (Hiren, Gurpreet)
- [ ] Agency partner program: multi-client login, white-label, recurring share (Rohit)
- [ ] Prepaid nudge in the DM (a discount for paying online) to cut COD
- [ ] FSSAI number on food invoices (Lakshmi, Vikram)
- [ ] A seller verification badge backed by a GSTIN or phone check

## Cost and code issues the research found
- AI cost per reply turn is about ₹0.21 on gpt-4.1-mini, against the repo's estimate of under ₹0.10. Use a nano model for the "understand" call.
- The Gemini failover costs about 1.85x the main model, and its price doubles in January 2027. Switch to Flash-Lite.
- The admin AI-spend view converts at ₹85 to the dollar (it should be about ₹96) and underprices Gemini.
