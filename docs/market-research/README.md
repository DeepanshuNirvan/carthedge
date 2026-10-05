# CartHedge market research (finished: research, 3 discussion rounds, final plan)

## What is in this folder
- `reports/CartHedge pricing market research.md`: the full research report, with sources (competitors, seller behaviour, cost to serve, pricing models).
- `research_notes/CartHedge pricing market research/`: the 5 raw research notes.
- `simulation/PANEL-BRIEF.md`, `simulation/ROUND-2.md`: the rules the 16 simulated people followed.
- `simulation/personas/`: 16 people. Each file has the person's first impression, their research, what they learned about the product, a full interview with price ranges, and their round 2 notes.
- `simulation/rounds/r1/`: each person introduces themselves to the group.
- `simulation/rounds/r2/`: the group discussion, where people reply to each other by name.

Final outputs: `PRICING-PLAN.md` (v2 plans, prices, unit economics, add-ons, rollout), `VOTE-RESULTS.md` (round 4 vote by all 16), `FEEDBACK.md` (positives, negatives, feature backlog). All 4 rounds are in `simulation/rounds/`.

## Key findings
1. **The current prices lose money on the AI plan.** Pro (₹1,999) runs at -30% to -98% margin once the AI replies are counted. Growth is about 38% and Starter about 42%. AI costs about ₹0.11 to ₹0.21 per reply turn, roughly 12 turns per order.
2. **"No cut of your sales" is the strongest selling point.** Shopify takes 2%, Dukaan 2 to 5% and Instamojo 5%. Nobody else sells chat plus storefront plus order desk at this price.
3. **Market price bands.** Chat tools cost ₹999 to ₹1,500, then ₹2,500 to ₹3,500, then ₹5,000+. Billing apps cost about ₹300 a month.
4. **Free threats.** Meta's Business Agent is free to start, and Instagram-only DM tools are going free. So CartHedge must charge for the order desk, COD/RTO control, GST and storefront, not just for replies.
5. **What the panel asked for:**
   - **WhatsApp on their own number.** This is the number-one blocker for 8 of the 16.
   - **Billing safety.**
     - a flat fee;
     - a written cap on overage, with alerts at 80%;
     - Meta's WhatsApp charges passed on at cost from a prepaid wallet;
     - a 12-month price lock;
     - a 30-day trial.
   - **Team and accounting.** Staff logins with roles, Tally/GSTR export, and a partner program for agencies.
   - **Business-specific asks.**
     - comment-to-DM, and a mode for drop-day traffic spikes;
     - shipping charged by weight and pincode;
     - delivery date and slot for made-to-order sellers;
     - a credit note when a COD parcel is refused.
   - **Trust.** Show the company's legal name and GSTIN, and say where buyer data goes when it is sent to the AI provider.
6. **The buyer (Pooja).** She will accept a ₹30 to ₹50 COD token if it is adjusted against her bill and refunded automatically. She leaves over any hidden fee.

## Draft plan (prices exclude GST; finalise after rounds 3 and 4)
| Plan | Price/mo | For | Includes |
|---|---|---|---|
| Lite (free) | ₹0 | after the trial, micro sellers | 25 orders, links, board, no AI |
| Starter | ₹499 | 100 orders | storefront, links, COD confirm, GST invoices, a small AI reply allowance |
| Growth (most popular) | ₹1,499 | 500 orders | full AI assistant with about 3,000 replies, broadcasts, returns, staff logins |
| Pro / Brand | ₹3,999 | 2,000 orders | more AI, API, priority support, drop mode |
| Custom | quote | 3,000+ orders and agencies | |

- **Annual billing:** 2 months free.
- **Overage:** ₹1.50 to ₹2 per order, with a hard cap the seller sets and alerts at 80% and 100%.
- **When AI replies run out:** the assistant falls back to drafting orders. Orders are never blocked.
- **Extra revenue:**
  - AI top-ups at ₹399 per 1,000 replies;
  - WhatsApp credits at a small visible markup;
  - a COD risk check at ₹1 to ₹3 per COD order;
  - paid setup at ₹999 to ₹2,999;
  - agency partner share of 20% for 12 months;
  - Razorpay or Cashfree partner commission.
- **Cost fixes to do first:**
  - run the "understand" AI call on a nano model;
  - reorder the prompt so the instructions and catalog are cached;
  - switch the Gemini failover to a Flash-Lite model;
  - fix the admin AI-spend view, which uses ₹85 to the dollar instead of about ₹96.
