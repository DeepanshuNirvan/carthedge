# CartHedge pricing plan (v2, 5 Oct 2026, after the panel vote: see VOTE-RESULTS.md)

Sources:
- The research report (`reports/CartHedge pricing market research.md`).
- 16 simulated people over 3 discussion rounds (`simulation/`).

Prices are shown before GST, with the GST-inclusive figure in brackets, as every competitor does. The website also shows a "₹/day" line.

## 1. Plans

| Plan | ₹/month | Yearly (2 months free) | Orders/mo | AI replies/mo | Staff logins | For |
|---|---|---|---|---|---|---|
| **Free** (after trial) | 0 | n/a | 25 | 0 (no AI) | 1 | micro sellers, first-timers (Shabnam), stores whose trial ended |
| **Starter** | 499 (589) | 4,990 | 150 | 300 | 1 | small Instagram sellers (Farheen, Mousumi, Lakshmi) |
| **Growth** ★ most popular | 1,299 (1,533) | 12,990 | 600 | 2,500 | 3 with roles | boutiques and RTO-heavy sellers (Ritu, Devanshi, Sneha, Vikram, Gurpreet) |
| **Pro** | 2,999 (3,539) | 29,990 | 2,500 | 8,000 | 10 | resellers and drop sellers (Hiren, Kabir) |
| **Brand / Partner** | from 5,999 | custom | 5,000+ | custom | unlimited, API | D2C brands, creators, agencies (Arjun, Tanya, Rohit) |

**Included on every paid plan:**
- storefront and share links;
- order board;
- COD confirmation;
- GST invoices;
- returns;
- the customer list;
- insights;
- no cut of sales, ever.

**What changed from the current ₹499/₹999/₹1,999 list, and why:**
- **The AI assistant moves into Growth.** Today it is Pro-only. The panel called it "bait and switch" to show it in ads but lock it in the ₹1,999 plan.
- **Pro goes up to ₹2,999.** At ₹1,999 the AI assistant runs at -30% to -98% margin.
- **Growth goes up to ₹1,299.** That is still inside most sellers' "I'd still pay" range (₹1,200 to ₹1,500).

## 2. Safeguards against surprise bills

These are the panel's conditions for paying.
1. **Overage costs ₹2 per extra order, with a hard cap the seller sets** (default ₹500).
   - Alerts go out at 80% and 100% by WhatsApp and email.
   - A seller's bill can never exceed the next plan's price: we switch them to the cheaper option automatically.
2. **"Order" is defined in writing as a confirmed order.** Unpaid drafts, cancelled orders and test orders don't count.
3. **When AI replies run out, the assistant pauses.** It falls back to drafting orders for the seller to approve, and orders are never blocked. AI top-up: ₹299 per 1,000 replies.
4. **WhatsApp charges come from a prepaid wallet.** Meta's rate is shown separately, with a visible 15% handling fee. No surprise debit.
5. **Price lock:** 12 months for anyone who joins in the first year.
6. **Trial:** 30 days, no card. It starts when the seller connects Instagram (or WhatsApp, when that is live), not at signup. When it ends the store drops to the Free plan, nothing is locked and no data is lost.
7. **Trust page:**
   - legal entity name, GSTIN and address;
   - a support phone number with Hindi and English support (regional languages on Growth and above);
   - one-click data export;
   - refund terms;
   - where buyer data goes when it is sent to the AI provider.

## 3. Unit economics

Assumptions:
- A gpt-4.1-mini/nano hybrid, about ₹0.11 per AI turn.
- About ₹0.40 of WhatsApp per order.
- Support and maintenance share of about ₹150 per seller once there are 300 or more sellers.

| Plan | Net of GST | Cost at typical use | Cost at full allowance | Gross margin (typical / full) |
|---|---|---|---|---|
| Starter | ₹499 | about ₹140 | about ₹230 | 72% / 54% |
| Growth | ₹1,299 | about ₹420 | about ₹700 | 68% / 46% |
| Pro | ₹2,999 | about ₹1,100 | about ₹1,900 | 63% / 37% |
| Free | 0 | about ₹40 | about ₹60 | loss leader, capped at 25 orders |

**Break-even:** fixed costs run ₹33k to ₹95k a month. At a blended ₹900 per paying seller after costs, that is about 60 paying sellers at small scale and about 120 at 300 or more sellers.

**These margins depend on four engineering fixes:**
1. Run the "understand" AI call on a nano model (gated on the existing evals).
2. Reorder the prompt so the instructions and catalogue are cached.
3. Switch the Gemini failover to a Flash-Lite model.
4. Fix the admin AI-spend view, which uses ₹85 to the dollar instead of about ₹96.

## 4. Add-ons and extra revenue (in priority order)

| Add-on | Price | Margin | Notes |
|---|---|---|---|
| AI top-up | ₹299 per 1,000 replies | about 60% | top seller demand |
| WhatsApp on your own number | +₹499/mo (included on Pro) + wallet | about 70% + 15% wallet fee | #1 blocker for 8 of 16. Ship first |
| Extra staff login | ₹149/mo each | about 95% | Gurpreet, Hiren |
| COD risk check / verified COD | ₹2 per COD order | about 80% | Devanshi; Shiprocket charges ₹2.49 |
| Done-for-you setup and catalogue upload | ₹1,499 / ₹2,999 one-time | services | Mousumi, Shabnam, Lakshmi |
| Drop / peak pack | ₹999 per drop day (queue, extra AI, priority support) | high | Kabir, Tanya |
| Agency partner program | 20% revenue share for 12 months, or setup fees; multi-client login | channel | Rohit. Commission invoiced by CartHedge with GST and TDS (Meenal) |
| Razorpay / Cashfree partner commission | about 0.1 to 0.3% of prepaid sales, paid by the gateway | pure upside | costs the seller nothing |
| Courier partner (Shiprocket referral) | referral payout | pure upside | later |

## 5. Who it wins and who it loses

**Wins:**
- **Starter:** Farheen, Mousumi and Lakshmi (once WhatsApp works).
- **Growth:** Ritu, Devanshi, Sneha, Vikram and Meenal's clients.
- **Pro:** Hiren and Kabir.
- **Partner:** Rohit.

**Loses for now:**
- Arjun, until Shopify sync exists.
- Tanya, until comment-to-DM exists.
- Shabnam, who stays on Free until she earns more.

**Price check against the panel:** the panel's middle "still pay" range was about ₹800 to ₹1,500, and Growth at ₹1,299 sits inside it.

## 6. Launch order

1. Ship the safeguards in section 2, plan gates in the admin, the Free plan, and the 30-day trial that starts on connect.
2. Ship WhatsApp on the seller's own number (phase 2 with a partner), staff roles, and Tally/GSTR-1 export. These unblock the most revenue.
3. Launch offer: the first 200 sellers get 30% off for 12 months, with the price locked.

**Measure in the first 90 days:**
- trial-to-paid conversion (target 8 to 12%);
- AI turns per order;
- actual gross margin per plan;
- churn reasons;
- how many sellers pay yearly.

## 7. Risks and what we do about each

| Risk | Response |
|---|---|
| **Meta's free Business Agent** | Sell the order desk, COD/RTO control and GST invoices, not just the replies. |
| **AI costs run about 2x the estimate** | Cut the allowances; top-ups cover the gap. |
| **Backlash against per-order fees** | Keep the hard caps, and keep the "never more than the next plan" rule. |
| **Meta's free service-message allowance is gone** | It is about ₹115 per seller a month. It is already inside the wallet margin. |

## 8. Changes from the panel vote (v2)

Votes: 5 yes, 8 maybe, 2 no. Average fairness 3.9 out of 5. Growth is the clear centre at ₹1,299.
- Prices stay the same.
- WhatsApp on the seller's own number drops to **₹299/mo** on Starter and Growth, and stays included on Pro. 6 of the 8 "maybe" votes depend on this feature: ship it first.
- The Starter card says "AI auto-reply included" in large text.
- **7-day grace period** after a failed payment.
- Phone support in Hindi and English on every plan. Gujarati, Bangla, Tamil and Marathi on Growth and above.
- Drop pack: **₹1,999 per drop week** (was ₹999 per day).
- Written promise: if WhatsApp on the seller's own number is not live within 90 days of paying, the seller gets one month free.
- The "verified seller" badge requires a GSTIN, or a PAN plus address, check.
- **Before charging GST-registered sellers:** credit notes for refused COD parcels, Tally/GSTR-1 export, and invoice numbering that continues from the seller's previous app.
