# Product

<!-- impeccable:product-schema 1 -->

> Source: `product.txt` plus the owner's revamp brief (2 Oct 2026). The owner asked to skip the interview and build straight away, so every line below is drawn from those two sources. Lines marked *(inferred)* are my reading, not something the owner confirmed.

## Platform

web

## Users

- **Sellers** — Instagram/WhatsApp-first D2C sellers in India (fashion, jewellery, home decor, boutiques, reseller hubs). They run the business from a phone, often late at night, between DMs. The seller app is their daily tool.
- **Buyers** — anyone who taps a seller's link inside the Instagram or WhatsApp in-app browser. They don't sign up; phone OTP is their only identity. Most are on mid-range Android phones over 4G *(inferred)*.
- **CartHedge staff** — support, sales and ops, working in the platform admin console on a laptop *(inferred)*.
- **Visitors** — prospective sellers on the marketing site who are deciding whether to start the 15-day trial.

## Product Purpose

CartHedge is an AI sales assistant, an order desk and an instant storefront for sellers who sell in the chat. It replies to every buyer DM within seconds, in the buyer's own language, using the seller's real catalog. It collects the order and confirms it inside the chat, then keeps the buyer updated on that same chat. One branded link handles browsing, checkout, payment and tracking. Success means the seller stops living in the inbox and loses fewer sales and COD refusals.

## Positioning

The DM stays the shop. Competitors move the buyer off to a website; CartHedge works on the conversation itself. It answers, sells and closes inside the chat, and treats the storefront as an extra rather than the product. Money settles in the seller's own Razorpay account and never passes through CartHedge.

## Operating Context

- The core loop: DM → AI reply → order summary in the chat → buyer says "haan" → order placed or drafted → prepaid link or COD confirmation → kanban board (new → confirmed → packed → shipped → delivered / rto / cancelled) → automatic status updates on the same chat.
- Three alternative entry points that end on the same order board: AI desk, share link (product / cart / custom), and storefront.
- Chats are in Hinglish, Hindi, English and regional scripts.
- Buyer pages open inside the IG/WA in-app browsers, where `backdrop-filter` is expensive and the viewport is a phone.

## Capabilities and Constraints

- AI auto-reply, chat parsing into orders, auto-confirm (optional, off by default), handover to the seller, and pause/resume per chat.
- Order board, products and variants, bulk import, offers, reseller pricing, waitlists, links (with QR codes), customer ledger, broadcasts, GST-lite invoices, insights and analytics, billing.
- Buyer storefront, link checkout, phone OTP, UPI intent / card / COD with an optional token payment, COD confirmation page, and order tracking.
- Admin: MRR/GMV overview, businesses, plans (capabilities), plan requests, payments, site content.
- **Constraint for this revamp:** the work is UI only. API calls, query keys, route paths, form field names, data bindings and backend behaviour stay untouched.
- All money is in paise and always renders through `MoneyText` / `formatPaise`.

## Brand Commitments

- Name: CartHedge. Logo: an open jade ring cradling a cart with two gold coin-wheels (`LogoMark`), coloured by tokens.
- The owner's brief makes these binding:
  - iOS-style glassmorphism as the primary material (blur, thin translucent borders, layered depth). Light mode is frosted white glass; dark mode is smoked obsidian glass.
  - Neo-grotesque or geometric sans type with tight tracking.
  - No neon accents, no floating gradient orbs, and no rows of three symmetric icon cards.
  - The site must not lead with RTO. RTO is one feature; auto-reply, auto-parsing and auto-confirm carry equal weight.
  - App-like on mobile across every surface.
  - Micro-parallax, 3D hover tilt on the main CTAs, typing indicators, strikethrough status transitions, and custom skeleton and vector loaders instead of spinners.

## Evidence on Hand

- Product photography: `frontend/public/demo/*.webp` (kurti, jhumka, juttis, cushion, chikankari, auth-seller, aurora-texture).
- Marketing stats, testimonials and FAQs come from `site_settings` via `/api/v1/site`. The fallback copy lives in `frontend/src/strings/marketing.ts`; those testimonials are seed content, not verified customer quotes.
- Plan prices are live from `/api/v1/plans`.
- No real customer logos, press, or measured benchmarks exist. Don't invent any.

## Product Principles

1. **The chat is the shop.** Show the conversation doing the work before showing any dashboard.
2. **Seller in control.** The AI answers, but the seller approves, pauses and takes over. Every automation is visible and reversible.
3. **Zero buyer friction.** No signup, no app. Phone OTP only, inside the in-app browser.
4. **Rupees, not features.** Value is stated in money kept and orders closed.
5. **Phone first.** Every surface has to work one-handed on a phone before it works on a desktop.

## Accessibility & Inclusion

- WCAG AA contrast in both themes. Respect `prefers-reduced-motion` and `prefers-reduced-transparency`.
- Touch targets of 44px or more, and inputs at 16px or larger on mobile so iOS doesn't zoom.
- Buyer pages must stay fast on mid-range Android phones inside in-app browsers *(inferred from the existing performance notes in the code)*.
