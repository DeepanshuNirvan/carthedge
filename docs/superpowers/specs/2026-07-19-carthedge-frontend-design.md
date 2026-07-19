# CartHedge Frontend — Design

**Spec of record:** `frontend/BUILD_PROMPT.md` (user-authored, approved). This doc records only the decisions made on top of it.

## Locked decisions

- **Stack:** React 18 + TS strict + Vite. React Router v6 with four lazy route groups (marketing `/`, seller `/app`, admin `/admin`, buyer `/s/:code` + `/l/:code/:token` + `/track`). Tailwind 3.4 driven by a custom token preset (CSS variables, both themes). TanStack Query v5 + Zustand. GSAP/ScrollTrigger + Lenis on marketing only; Framer Motion everywhere; R3F/three lazy-loaded on marketing only.
- **SEO:** react-helmet-async per route + static `sitemap.xml`/`robots.txt` + JSON-LD components. No SSR/SSG framework — helmet path is allowed by the spec and keeps the build simple.
- **Fonts:** Clash Display + Satoshi self-hosted (Fontshare download at build setup), JetBrains Mono for money/metrics. `font-display: swap`, two preloaded weights.
- **API base:** `VITE_API_BASE_URL`. Errors: `{error}` (+`code:"subscriptionExpired"` on 402). No response envelope — resources are raw or wrapped in a named key (`{products:[…]}` etc.), typed exactly from the Go handlers.

## API contract (extracted from backend, authoritative)

- Auth session: `{accessToken, refreshToken, businessId, businessCode, businessName, trialEndsAt?}`; refresh rotates both tokens.
- Dashboard: `{todayOrders, todayRevenue, monthOrders, monthRevenue, pendingOrders, codAtRisk, totalCustomers, repeatRatePercent, rtoMeter{baselinePercent,actualPercent,codOutcomes,savedThisMonth}, quota{plan,used,included,overageOrders,overageFee}}`.
- Board: `{counts: Record<status,number>, columns: Record<status, Order[]>}`; statuses: new/confirmed/packed/shipped/delivered/rto/cancelled.
- Buyer flow: OTP verify → `{orderToken, prefill?}`; order create → `{orderCode, total, tokenAmount, paymentMethod, next: "pay"|"codPending"}`; pay → `{razorpayOrderId, razorpayKeyId, amount, currency, orderCode, businessName, kind}`.
- Admin login separate token: `{accessToken, name, email}`; site settings = `{contact, social, site}` JSON values.
- All money paise ints; single `formatPaise` at the render edge.

## Architecture

Folder layout exactly as BUILD_PROMPT §12. Auth: seller access token in memory (zustand), refresh token in localStorage, silent refresh on 401 with request replay; admin tokens in a separate slice + separate fetch wrapper so they never cross. Global 402 → paywall route; 429 → toast retry copy; store 403 paused → paused screen.

## Build order

design system → marketing → seller app → admin → storefront; verify with `tsc --noEmit`, ESLint, and `vite build` after each surface.
