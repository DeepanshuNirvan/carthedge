# CartHedge — feature gaps (Oct 2026)

What a real Instagram/WhatsApp seller, their buyers and CartHedge staff will look for and not find today. Checked against the code (routes, statuses, schema, UI), not assumed. Each item says what exists now, what is missing, and why it matters.

**Priority:** P0 = before onboarding real sellers · P1 = core for this segment, soon after · P2 = later / nice to have.

## Status after the 3 Oct 2026 build

Built and verified (API suites + UI pass, see [FEATURE-BUILD.md](FEATURE-BUILD.md)):

- **Done:** 1.1 returns/exchanges · 1.3 refund records + credit notes · 1.4 buyer cancel · 2.1 structured policies · 2.2 buyer policy page · 2.3 FAQ pairs · 2.4 tone/language/emoji/aap-tum · 2.5 business hours + away message · 2.6 seller-chosen handoff rules · 2.7 product details + size chart · 2.8 practice chat · 3.1 seller alerts (WhatsApp/email/web push + live toast) · 3.2 packing slips + pick list · 3.3 bulk status/print · 3.5 COD charge + prepaid discount · 4.1 stock quantity in the form · 4.3 size chart · 5.1 change password + sign out other devices · 5.2 export + delete account + buyer erase · 5.3 subscription GST invoices + history · 5.4 GST-compliant buyer invoices · 5.5 autopay · 6.1 dropped-checkout reminder · 6.2 coupon limits · 7.4 policy page · 8.1 AI cost per seller · 8.2 view as seller (read-only, audited).
- **Partly done:** 1.2 (stock back on receipt and per-buyer return count; no per-product return rate yet) · 1.5 (address change by buyer and seller; no size or quantity edit) · 1.6 (the assistant quotes the policy and sends buyers to their order page; it does not open the request itself) · 2.1 (COD ceiling done; no blocked-pincode list) · 3.3 (no export) · 7.1 (cancel, address, return/exchange with photos; no invoice download or reorder) · 8.3 (staff actions are logged; one admin login, no roles or 2FA).
- **Still open:** 2.9, 3.4, 3.6, 3.7, 3.8, 3.9, 4.2, 4.4, 4.5, 5.6, 5.7, 6.3, 6.4, 7.2, 7.3, 7.5, 8.4, 8.5, 8.6 — and OPS-1 (OTP/WhatsApp delivery), which the alerts and reminders depend on.

---

## 1. Returns, exchanges, cancellations, refunds (the biggest hole)

**Today:** order statuses are `new → confirmed → packed → shipped → delivered / rto / cancelled`. There is no return, exchange or refund state. The AI assistant hands *every* "size badalna hai / damaged / wrong item / refund" message to the seller as a handoff, and the seller has nowhere in CartHedge to record what happened next.

| # | Gap | Pri | Why it matters |
|---|-----|-----|----------------|
| 1.1 | **Return / exchange journey after delivery**: buyer raises a request (reason: size, damaged, wrong item, quality, changed mind) with photos → seller approves/rejects → pickup or self-ship → item received → **exchange** (replacement order linked to the original, no charge or price difference) or **refund**. Partial returns (one item of a cart). | P0 | Fashion size exchanges are routine; without it sellers track them in WhatsApp again, which is what CartHedge replaces. |
| 1.2 | **Stock and ledger effects of returns**: stock back on *receipt* (not approval), damaged items not restocked, returns count + return rate per customer and per product. | P0 | Inventory and the customer risk view are wrong after every return. |
| 1.3 | **Refund records**: refund amount, method (Razorpay refund via the seller's keys, UPI with reference, store credit), status. Credit note on the invoice. | P0 | Prepaid cancellations and returns need money back; today nothing is recorded. |
| 1.4 | **Buyer self-cancel before packing** (track page and chat), with the seller notified; prepaid → refund record. | P1 | Today a buyer can only ask in DM; the AI hands it off. |
| 1.5 | **Edit an order after placing it** (address, size swap, quantity) instead of cancel and re-create. | P1 | Most common DM after ordering: "address change karna hai". |
| 1.6 | **AI handles returns within policy**: collects order code + reason + photo and opens the return request itself (instead of a plain handoff), quoting the seller's return window. Depends on 1.1 and 2.1. | P1 | Turns the most frequent post-sale DM into a ready request. |

## 2. Seller control over what the AI says (customisation)

**Today:** Settings → AI assistant has *auto-reply* and *auto-confirm* switches and one free-text "notes" box (2,000 characters) that is passed to the model as `notesFromSeller`. The assistant also knows the catalog, shipping fee, free-shipping threshold, COD on/off, COD token and payment rails.

| # | Gap | Pri | Why it matters |
|---|-----|-----|----------------|
| 2.1 | **Structured store policies**: return/exchange window and conditions, cancellation rule, delivery time (metro / rest of India), COD rules (max order value, blocked pincodes), warranty/care, custom terms. Used by the AI **and** shown to buyers (2.2). | P0 | A free-text box gets partially quoted; structured fields let the AI answer exactly and let Go enforce them (e.g. return window in 1.1). |
| 2.2 | **Buyer-facing policy page per store** (`/s/<code>/policies`: returns, shipping, cancellation, contact, terms) linked from storefront, checkout and tracking. | P0 | Buyers ask before paying; **Razorpay also asks sellers for refund/shipping/T&C/contact pages during account activation** — most small sellers have no website to point to. |
| 2.3 | **FAQ pairs** the AI uses (question → seller's exact answer): "bulk order?", "custom size?", "Delhi delivery kitne din?". | P1 | Sellers want specific answers word for word. |
| 2.4 | **Tone and persona**: default language, aap/tum, emoji level, sign-off name, greeting. | P1 | "Talks like the seller" is the product's promise; today the tone is fixed. |
| 2.5 | **Business hours / away message**: outside hours the AI says when a person will follow up; handoff alerts respect quiet hours. | P1 | Night-time DMs are the core use case. |
| 2.6 | **Handoff rules the seller chooses**: e.g. let the AI share an active offer code, handle size exchange inside policy, or always hand off bulk orders above ₹X. | P1 | Today the handoff list is fixed in the prompt. |
| 2.7 | **Per-product AI notes / attributes**: fabric, size chart, measurements, care, "true to size?". | P1 | Most pre-sale questions are about the product, not the shop. |
| 2.8 | **Try-it playground**: seller chats with their own assistant before turning auto-reply on. | P1 | Builds trust before letting AI talk to buyers. |
| 2.9 | **Quick replies / saved templates** for the seller's own replies in the inbox. | P2 | Speeds up manual replies on handed-off chats. |

## 3. Seller — orders, fulfilment and alerts

| # | Gap | Pri | Why it matters |
|---|-----|-----|----------------|
| 3.1 | **New-order alert to the seller** (WhatsApp/email/web push). Today the only signal is an SSE event the app does not subscribe to; the app polls only while it is open. | P0 | A seller who is not staring at the board misses orders — the opposite of "never miss a DM order". |
| 3.2 | **Packing slip / shipping label / pick list**, printable per order and in bulk. Marketing already promises "Packing slip and invoice ready" at the Packed step. | P0 | Claim on the site with no feature behind it (fix the feature or the copy). |
| 3.3 | **Bulk actions on orders**: select many → confirmed/packed/shipped, print slips, export. | P1 | Festive-drop days are 50+ orders. |
| 3.4 | **Courier tracking sync** (Shiprocket status webhook/poll → shipped / delivered / RTO automatically). Today Shiprocket only creates the shipment; delivered and RTO are marked by hand. | P1 | Status messages to buyers and the RTO meter depend on it. |
| 3.5 | **COD charge and prepaid discount** (e.g. +₹49 for COD, 5% off prepaid). Only a flat shipping fee and free-shipping threshold exist. | P1 | The standard Indian lever to move buyers to prepaid and cut RTO — fits the product's RTO story. |
| 3.6 | **Pincode rules without an aggregator**: non-serviceable and COD-blocked pincodes. Without Shiprocket every pincode is "serviceable". | P1 | Bad pincodes are a top RTO cause (the product says so itself). |
| 3.7 | **Block COD for risk-flagged buyers** (option). The risk flag is shown but blocks nothing. | P1 | The flag exists exactly for this. |
| 3.8 | **Mark offline payments as paid** (cash, bank transfer) on manual orders. Only buyer UPI claims can be settled. | P1 | Phone/walk-in orders stay "unpaid" forever. |
| 3.9 | Internal order notes and tags for the seller. | P2 | |

## 4. Seller — catalog

| # | Gap | Pri | Why it matters |
|---|-----|-----|----------------|
| 4.1 | **Stock quantity in the product form.** Counted stock only comes from CSV/API; the form has no quantity field (it only has an in-stock switch). | P0 | Sellers expect to type "5 left"; low-stock alerts and oversell protection need it. |
| 4.2 | **Variant matrix** (size × colour) and **images per variant**. Today one variant name and product-level images only. | P1 | A kurti in 3 colours × 4 sizes is the normal case. |
| 4.3 | Size chart / attributes (shared with 2.7). | P1 | |
| 4.4 | Cost price → profit and margin in reports. | P2 | Sellers ask "kitna kamaya", not just revenue. |
| 4.5 | Duplicate product, collections/featured ordering, Instagram post import. | P2 | |

## 5. Seller — account, billing, compliance

| # | Gap | Pri | Why it matters |
|---|-----|-----|----------------|
| 5.1 | **Change password while logged in, log out other sessions.** Only the forgot-password flow exists. | P0 | Basic account hygiene. |
| 5.2 | **Delete account / export my data** (seller), and buyer data on request. | P0 | India's DPDP Act 2023; Meta's data-deletion promise. |
| 5.3 | **GST tax invoice for the CartHedge subscription** (sellers claim input credit) and payment history in Billing. | P1 | Every GST-registered seller will ask. |
| 5.4 | **GST-compliant buyer invoices**: HSN per product, CGST+SGST vs IGST by place of supply, buyer GSTIN (B2B resellers), numbering that resets each financial year, credit notes for returns. Today: one GST rate split out of the total. | P1 | "GST-lite" is fine for small sellers; registered ones need the real fields. |
| 5.5 | **Subscription autopay** (Razorpay Subscriptions / UPI AutoPay) instead of manual renew every month. | P1 | Manual renewals churn. |
| 5.6 | **Staff accounts with roles** (packer sees orders, not revenue or payouts). | P1 | Boutiques have 1–3 helpers sharing one login today. |
| 5.7 | Change email, plan upgrade proration. | P2 | |

## 6. Seller — growth

| # | Gap | Pri | Why it matters |
|---|-----|-----|----------------|
| 6.1 | **Abandoned checkout recovery**: buyer verified OTP but didn't order → one reminder on WhatsApp/chat. | P1 | Cheapest extra revenue; the OTP already gives the number. |
| 6.2 | **Coupon controls**: total and per-buyer usage limits, first-order only. | P1 | Unlimited reusable codes leak margin. |
| 6.3 | **Broadcast consent and opt-out**, WhatsApp template support. | P1 | WhatsApp policy requires opt-in for marketing; also protects the seller's number. |
| 6.4 | Reviews/ratings and product Q&A on the storefront. | P2 | |

## 7. Buyer

| # | Gap | Pri | Why it matters |
|---|-----|-----|----------------|
| 7.1 | **Self-service on the tracking page**: cancel (before packing), change address (before dispatch), request return/exchange with photos, download invoice, reorder. | P0/P1 | Every one of these is a DM to the seller today (ties to section 1). |
| 7.2 | **"My orders" by phone OTP** for a store (all past orders, not one code at a time). | P1 | Repeat buyers. |
| 7.3 | **Order summary on the COD confirmation page** (items, total, address). Today it shows only the order code. | P1 | The product spec describes "summary → confirm"; buyers confirm blind. |
| 7.4 | Store policy page (2.2). | P0 | |
| 7.5 | Hindi / regional language toggle on storefront and checkout. | P2 | The chat already speaks the buyer's language; the pages do not. |

## 8. Admin (CartHedge staff)

| # | Gap | Pri | Why it matters |
|---|-----|-----|----------------|
| 8.1 | **AI usage and cost per seller** (calls, tokens, ₹), alerts on abuse. | P1 | Every DM turn costs money; a heavy trial account is invisible today. |
| 8.2 | **Login as seller (support view)** with an audit trail. | P1 | Support without asking for passwords. |
| 8.3 | **Multiple admins, roles, 2FA, admin audit log.** One shared admin login today (and it is the seed one — BUG-001). | P1 | |
| 8.4 | **Delivery health**: failed webhooks, failed WhatsApp/IG sends, OTP delivery rate. | P1 | OTP/WhatsApp failures are silent today (OPS-1). |
| 8.5 | Subscription refunds/credits, dunning for failed renewals, in-app announcements to sellers. | P2 | |
| 8.6 | Data-deletion request log (Meta confirmation codes are generated but not stored). | P2 | Meta can ask for the status of a code. |

---

## Suggested order (as written before the build — see the status above)

1. **Must before real sellers:** OTP/WhatsApp delivery (OPS-1), new-order alert (3.1), stock quantity in the form (4.1), store policies for AI + buyer page (2.1, 2.2), returns/exchange/refund records (1.1–1.3), packing slip or fix the marketing claim (3.2), change password + delete account (5.1, 5.2).
2. **Next:** buyer self-service (7.1, 1.4–1.6), AI FAQ/tone/hours/handoff rules (2.3–2.8), COD fee/prepaid discount + pincode rules + COD block for risky buyers (3.5–3.7), courier sync (3.4), bulk actions (3.3), abandoned checkout (6.1), subscription GST invoice + autopay (5.3, 5.5), AI cost per seller (8.1).
3. **Later:** variant matrix, staff roles, full GST invoices, coupons limits, reviews, Hindi storefront, admin roles/impersonation.
