# Services support ("enquiry mode"): feasibility and design

Date: 16 Nov 2026. Status: **phase 1 built 16–21 Nov 2026 (owner approved), not committed or deployed.** What changed from this plan while building is in section 15.
Evidence and sources: `docs/market-research/research_notes/CartHedge services research/service_sellers_demand_and_tools.md`.

## 1. The question

Many businesses on Instagram and WhatsApp do not sell a product. They sell a service: bookings, event management, packages, trips, transport. The owner asked whether CartHedge should cater to them, how much would change, and what the right architecture is. The constraints given:

- General, not tied to any one trade.
- An order does not have to be confirmed. The seller enters the details, the assistant answers from them, and an enquiry becomes a customer.
- The seller may sell products, services, or both.
- Nothing that works today may change.
- If it is built, it must be flexible and able to grow.
- Analysis and plan only. No implementation in this pass.

## 2. Verdict

**Worth building, as a narrow enquiry mode. Not as a booking system.**

- The part of CartHedge that matters to a service seller already exists: the assistant replies in seconds, in the buyer's language, from the seller's own details, refuses to invent a price or a link, and hands the chat to the owner when it should.
- What a service seller needs that is missing is small and specific: an item that is not shipped or stocked, a price that can be "from" or "on request", a short list of questions to collect, and a place where the collected enquiry lands.
- What a service seller does not need is most of the order desk: cart, stock, COD, RTO, courier, packing slips. Those stay exactly as they are for product sellers and are simply not shown.
- A calendar with slots and availability is a different product. It is left out on purpose (section 5).

Honest limits on this verdict:

- Demand cannot be sized. No public source splits Indian WhatsApp or Instagram businesses into products and services, and the supporting numbers are mostly vendor blogs.
- CartHedge's edge is narrower here than for products. Meta's free Business AI already captures leads and books appointments inside the WhatsApp Business app. What CartHedge adds is Instagram DMs, a structured enquiry inbox, the seller's own questions, and an advance-payment link.
- Every persona in the simulation panel sells a product. This has not been tested against a single service seller.

So: build phase 1 (small, additive), and check it with real service sellers before building phase 2.

## 3. What works today for a service seller, and what breaks

Checked against the code on 16 Nov 2026.

**Already works without any change**

| Need | What covers it today |
|---|---|
| Describe a service in detail | `products.description` (5,000 characters) plus up to 20 labelled details, each a label and a value (`product.Detail`). "Inclusions", "Duration", "Pickup point" fit as they are. |
| Tiers and packages with their own prices | Option groups and variants ("3N/4D / 5N/6D" × "Standard / Deluxe"), each combination with its own price. |
| Photos | `products.images`. |
| Word-for-word answers | Up to 20 FAQs (`shop.Policies.FAQs`) and free-text notes (`businesses.ai_notes`). |
| Reply language, tone, hours, away message | `shop.AIProfile`. |
| Hand the chat to the owner | `decide` → `ActHandoff`, alert through `alert.Seller`. |
| No invented prices or links | `grounded()` in `backend/internal/ai/cart.go`. |
| Take an advance | A custom link (title and amount), `backend/internal/link/service.go`. |
| Bill for usage | Plans meter orders a month and AI replies a month (`docs/market-research/PRICING-PLAN.md`). A service seller uses AI replies, which is the real cost. |

**Breaks or is wrong**

| # | Problem | Where |
|---|---|---|
| 1 | A price is mandatory and must be positive. "Price on request" and "starting from" cannot be stored. | `product.Input.validate`, `backend/internal/product/service.go:232` |
| 2 | Once the buyer picks something, the assistant collects name, phone, address, pincode and COD-or-online, then shows an order summary with "Delivery" and "Deliver to". | `Store.check` and `Store.summary`, `backend/internal/ai/cart.go:200` and `:326` |
| 3 | The prompts describe a shop that packs and delivers ("Pack kar du aapke liye?", stock, delivery charge). | `understandPrompt`, `dmReplyPrompt`, `backend/internal/ai/agent.go:22` and `:53` |
| 4 | There is nowhere to say "ask for the event date and the number of guests". | no field exists |
| 5 | A service chat produces nothing the seller can work from. It is only a conversation. | no enquiry record exists |
| 6 | An order requires an address and a pincode, and moves through packed, shipped, delivered, RTO. | `CreateParams.check`, `backend/internal/order/service.go:313`; `backend/internal/order/status.go` |
| 7 | The storefront shows stock and a buy button. | `frontend/src/store-front` |
| 8 | A paid advance through a custom link still asks the buyer for a delivery address (same check as row 6). | phase 2 |

Rows 1 to 5 and 7 are phase 1. Rows 6 and 8 only matter once money is taken for a service, which is phase 2.

## 4. How much change

Phase 1, estimated from the code read, not measured:

- One additive migration (`0019`). No backfill, no change to existing rows.
- One new small backend package (`enquiry`: handler and service).
- Focused edits in four existing packages: `product`, `ai`, `messaging`, `publicapi`. Small touches in `alert`, `customer` (erase) and `auth` (export).
- One new seller page (Enquiries) and edits to four existing screens (product form, settings, register, storefront item).
- No change to `order`, `payment`, `invoice`, `aftersale`, `courier`, `broadcast`, `link` (beyond one refusal), `plan` or `admin`.

About 12 backend files and 8 frontend files. The largest single piece is the turn engine in `backend/internal/ai`, where the work is one new branch and one new action, plus evaluation cases.

## 5. Goals, non-goals, anti-goals

**Goals**
- A seller can list a service with all its details, a price that is fixed, "starting from" or "on request", and a unit ("per person", "per day").
- The assistant answers questions about it from those details, collects the questions the seller chose, and hands the seller a structured enquiry.
- The seller says whether they sell products, services or both, and the app shows what fits.
- A product seller sees and experiences no difference at all.

**Non-goals for phase 1**
- Calendar, time slots, availability, double-booking checks.
- Taking payment for a service inside the chat (phase 2).
- Quotation documents, staff assignment, lead scoring, ad attribution.
- Per-industry data models (an itinerary builder, a fleet list).
- An enquiry form on the storefront, and adding an enquiry by hand.

**Anti-goals** (it has failed if any of these happen, even if it works)
- The assistant tells a buyer a date, slot, seat or vehicle is available or booked.
- The assistant states a price for a service priced "on request".
- A second assistant, a second prompt stack, or a second catalog.
- Any existing evaluation case changes its result.
- The assistant gives medical, legal or financial advice on a seller's behalf.

## 6. Approaches considered

**A. No code: tell service sellers to use products and custom links.**
Costs nothing. Fails on rows 1 to 5 of section 3: the price is mandatory, and the assistant will ask a wedding client for a delivery pincode and offer cash on delivery. Not usable beyond a demo.

**B. A separate services module: its own tables, its own assistant flow, its own storefront section.**
Clean on paper. In practice it copies the catalog, the facts sheet, the grounding check, the option groups, the photos and the storefront, and every later improvement to the assistant has to be made twice. A seller who sells both gets two catalogs. Rejected.

**C. A kind on the existing catalog item, and an enquiry as a second outcome of the same turn engine.** ← recommended
One catalog. Each item says what kind it is. The turn engine stays one engine: for a product it ends in an order, as today; for a service it ends in an enquiry. Everything the assistant already does well (matching what the buyer means, option groups, grounding, language, handoff, the nudge, the practice chat) applies to services with no copy. This is also how commerce platforms model it: Shopify and Medusa keep one catalog and put a "requires shipping" flag on the item.

**D. Free text only: the seller writes notes and FAQs, the assistant answers and hands off.**
This is available today (`ai_notes` and FAQs) and stays available. On its own it gives the storefront nothing to show, gives the assistant no per-service price to ground against, and gives the seller no structured enquiry. It is a subset of C, not an alternative.

## 7. Design (approach C)

### 7.1 Data: migration `0019_services.sql`

Everything is additive and every default is today's behaviour.

```sql
-- what the business sells: drives labels, onboarding and the assistant's wording
alter table businesses add column sells text not null default 'products';  -- products | services | both

-- one catalog; kind says what an item is
alter table products add column kind text not null default 'product';      -- product | service
alter table products add column price_kind text not null default 'fixed';  -- fixed | from | quote
alter table products add column price_unit text not null default '';       -- "per person", "per day", "per km"
alter table products add column ask jsonb not null default '[]';           -- [{label, required}] the assistant collects

-- what a service chat produces
create table enquiries (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    conversation_id uuid references conversations(id) on delete set null,
    items jsonb not null default '[]',          -- [{productId, name, option, qty}]
    name text not null default '',
    phone text not null default '',
    answers jsonb not null default '[]',        -- [{label, value}], the buyer's own words
    status text not null default 'new',         -- new | contacted | quoted | won | lost
    quoted_amount int not null default 0,       -- paise, entered by the seller
    seller_notes text not null default '',
    order_id uuid references orders(id) on delete set null,  -- phase 2
    source text not null default '',            -- instagram | whatsapp
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index idx_enquiries_board on enquiries(business_id, status, created_at desc);
create index idx_enquiries_phone on enquiries(business_id, phone);
-- one open enquiry per chat: later turns update it and never duplicate it
create unique index idx_enquiries_open_chat on enquiries(conversation_id) where status = 'new';
```

Why these shapes:

- `kind` is text, not a boolean. A third kind later (digital, rental) is a new value, not a new column.
- `price_kind = 'quote'` stores `price = 0`. `'from'` stores the starting price. `'fixed'` is today.
- `ask` is the general answer to "every trade needs different details". Travel asks for destination, dates, people and budget. An event planner asks for date, venue and guests. A transporter asks for pickup, drop and date. The seller types the labels. The backend holds no trade-specific schema.
- Answers are stored as the buyer's words. Go does not parse dates or numbers in phase 1.
- One enquiry row per chat while it is new, mirroring one cart per chat. Once the seller moves it on, the next enquiry from that chat is a new row.

### 7.2 Behaviour hangs off the kind, in one place

Two methods on `product.Product`, so that no other file compares `kind` to a string:

- `Ships()`: true for a product. Decides whether stock, address, pincode, delivery charge and COD apply.
- `Enquiry()`: true for a service. Decides whether the chat ends in an enquiry and not an order.

`product.Public` gains `kind`, `priceKind` and `priceUnit`. `ask` stays private (the rule that a field is private until it is added to `Public` holds).

### 7.3 One guard that keeps orders safe

`product.ResolveLine` (`backend/internal/product/service.go:707`) is the single point every catalog item passes through on its way into an order: storefront, link checkout, manual order, AI draft, chat order. In phase 1 it refuses a service ("this is booked by enquiry"). One line there means no path can put a zero-priced or address-less service into an order. Seller-typed custom lines are unaffected.

`link.Create` refuses a product or cart link that contains a service, with a message that says so.

### 7.4 The turn engine (`backend/internal/ai`)

The shape stays: understand → Go checks → Go decides → write from facts → grounding check.

- **Cart.** `Cart` gains `Answers []Answer` tagged `json:"answers,omitempty"`. The `omitempty` is required: `Cart.hash()` hashes the JSON, and without it every product cart's hash changes at deploy and a buyer who was shown a summary has their "yes" rejected once.
- **Understand.** The catalog table gains a kind column and, for a service, the list of questions. The JSON gains `answers`. One new rule: fill an answer only with what the buyer said, under the label listed for that service; never guess a date or a number.
- **Check.** `Store.check` branches on `Ships()`.
  - A service item is matched and its option resolved exactly as a product's is. `in_stock = false` means "not taking bookings now".
  - It does not enter `Quote.Lines`. No money is worked out for it.
  - What it still needs: each required question without an answer, then name, then phone number.
  - It never asks for address, pincode or payment.
  - A cart with both kinds: product lines follow today's order flow untouched; service lines form the enquiry beside it.
- **Decide.** One new action, `ActLead`, raised when the enquiry is complete and differs from the open enquiry already stored for this chat. Comparing with the stored row is what stops a repeat; no extra state column is needed. All other rules in `decide` are unchanged and only see product lines.
- **Write.** On `ActLead` Go renders a recap card (the service, the option, the answers, name and phone) through the existing `[SUMMARY]` token, and the task tells the writer to say the owner will reply here with the details or the price.
- **Facts.** A service item carries `kind`, its price as words ("from ₹2,500 per person", or "on request, the owner shares it"), details, options and its store link. The open enquiry from this chat is included so "did you get my details?" has an answer.
- **Hard rules added to the writer.** Never say a date, slot, seat or vehicle is available, booked or reserved: the owner confirms that. For a service priced on request, never state a price.
- **Handoff rule added.** A request for medical, legal or financial advice goes to the owner.
- **Wording.** The prompts take the business kind from `Store.Sells`: "shop" or "business", "pack one for you" or "note your details", and a matching block of example lines. For `sells = 'products'` the prompt text must be byte-for-byte what it is today.

After `ActLead` the chat stays `open`. The assistant keeps answering factual questions. When the seller replies from the app, the existing echo rule pauses it for 12 hours.

### 7.5 Messaging glue (`backend/internal/messaging`)

- `converse` handles `ActLead`: upsert the enquiry (new `ai.SaveEnquiry`), publish `enquiryReady` on the event bus, alert the seller with a new alert kind `newEnquiry` on insert only.
- On WhatsApp the buyer's number is already known (`conversations.contact_id`), so it fills the enquiry's phone and is not asked for. On Instagram it is asked.
- `draftOnly` (auto-reply off, or the plan lacks `aiReply`): run understand and check without writing a reply, and save the enquiry silently, so a seller who answers chats themselves still gets the structured enquiry. Builder's call on whether this lands in phase 1 or follows it.
- The nudge (`nudgeQuiet`) already fires on a non-empty cart. Its task text says "order"; it needs the service wording.
- The 72-hour session reset clears the cart as today. An open enquiry stays with the seller.

Capability: saving enquiries rides on `ai`, replying on `aiReply`, as drafts and replies do today. No new capability.

### 7.6 Enquiries (`backend/internal/enquiry`, new)

Handler and service in the house layout. List by status, get one, update status, quoted amount and seller notes. Routes under `/api/v1/enquiries`, behind the same authed + active + `RequireFeature("ai")` gate as conversations. List endpoints return `[]`, never `nil`.

### 7.7 Seller app

All UI follows the root `CLAUDE.md` pipeline (tokens only, single jade accent, impeccable critique and polish).

- **Settings and Register:** "What do you sell?" with Products, Services, Both. Default Products.
- **Navigation:** "Products" reads "Services" for a services-only seller and "Catalog" for both. "Enquiries" appears when `sells` is not `products`.
- **Item form:** a type control, shown only when `sells = 'both'`. For a service the form hides SKU, stock count, reseller price, MRP, country of origin, maker and size chart. It shows price type (Fixed, Starting from, On request), unit, the in-stock toggle relabelled "Taking bookings", and "Ask before handing over": up to 6 questions, each a label and a required tick.
- **Suggested questions:** a few starter sets (trip, event, transport, appointment) as a front-end constant the seller can tap to fill the list. No backend meaning.
- **Enquiries page (`/app/enquiries`):** tabs New, Contacted, Quoted, Won, Lost. Each card: name, service and option, the answers, time, channel. Actions: open the chat (`/app/ai?conversation=`), call or WhatsApp, change status, enter a quoted amount, add notes.
- **Dashboard:** a "New enquiries" tile when `sells` is not `products`.
- **Practice chat:** works with no change, since it runs the same `Turn`.

### 7.8 Buyer surfaces

- **Storefront item:** price shown as "From ₹2,500 per person" or "Price on request". No stock badge, no quantity, no add to cart. The button is "Ask on WhatsApp" or "Message on Instagram", a `wa.me` or `ig.me` link with the service name prefilled. The store payload already carries both handles (`backend/internal/publicapi/store.go:28`), so this is front-end only. The chat stays the shop.
- **Share link for a service:** its storefront page (`/s/:code/p/:id`), not a checkout link.

### 7.9 Privacy and compliance

- **DPDP.** An enquiry holds a name, a phone number and free-text answers. `customer.Erase` must also erase enquiries with that phone, and `auth.Export` must include them. Account deletion already cascades through the foreign key.
- **WhatsApp policy.** Regulated verticals are restricted and health information may not be exchanged. Add to the seller terms and to onboarding that services giving medical, legal or financial advice are not supported, and read the official policy page (last updated 23 Sep 2026) before launch.
- **GST.** Phase 1 takes no money, so nothing changes. For phase 2: services use SAC codes, which the existing validator already accepts (`shop.ValidHSN` takes 4, 6 or 8 digits), so only the label becomes "HSN / SAC"; and GST on a service advance is due when the advance is received, unlike goods. Confirm the invoice treatment with a CA before phase 2.

### 7.10 Plans and billing

No change in phase 1. AI replies are metered, which covers the cost of a service seller. Orders a month will read zero for them, which is accurate.

## 8. Invariants (must hold after the build)

1. With `sells = 'products'` and no service item, every prompt string, every `decide` result and every cart hash is identical to before. The existing evaluation suite passes unchanged.
2. Nothing in an order, a quote, a link checkout or a payment can contain a service in phase 1 (`ResolveLine` guard).
3. The assistant never states an amount or a link that is not in the facts. Unchanged, and it now also covers "on request" services, which have no amount in the facts.
4. The assistant never confirms availability or a booking. The owner does.
5. One open enquiry per chat. A repeated turn updates it.
6. A new field on `product.Product` is private until it is added to `product.Public`.
7. `Cart.Answers` is `omitempty`.
8. Erasing a buyer erases their enquiries.

## 9. Phases

**Phase 1: enquiry mode.** Sections 7.1 to 7.10. Ends when a service seller can list services, the assistant answers and collects, and enquiries arrive on the Enquiries page with an alert.

**Gate before phase 2:** put two or three service personas through the simulation panel, or talk to five real service sellers. Phase 2 is built only if they would use it.

**Phase 2: paid bookings without shipping.**
- `orders.fulfilment` (`ship` | `none`); `CreateParams.check` skips the address when nothing ships; a short board path for `none` (new → confirmed → done / cancelled); no courier, no RTO.
- "Send advance link" on an enquiry: one tap makes the existing custom link from the quoted amount and sends it on the chat. Payment marks the enquiry won and links the order.
- The existing token mechanism (`cod_token_amount`: pay part now, the rest later) is the natural fit for "advance now, balance at the venue".
- Fixed-price services the seller marks as bookable in chat may go through the order flow; the `ResolveLine` guard relaxes for those only.
- "HSN / SAC" label, receipt for an advance, enquiry-to-won numbers in analytics.

**Phase 3: only on proven demand.**
- Slots and availability (a WhatsApp Flow slot picker, or the cheap version: a booking-link field on the service that the assistant may share).
- Enquiry form on the storefront, adding an enquiry by hand, enquiries into the customer ledger with broadcast consent, ad attribution.
- Marketing-site copy for service sellers.

## 10. Change map for phase 1

| Area | File | Change |
|---|---|---|
| DB | `backend/internal/database/migrations/0019_services.sql` | New. Section 7.1. |
| Catalog | `backend/internal/product/service.go` | `Kind`, `PriceKind`, `PriceUnit`, `Ask` on `Product` and `Input`; validation (price may be 0 only for `quote`; at most 6 questions; label up to 40 characters); `Ships()`, `Enquiry()`; `Public` fields; `ResolveLine` guard; read and write the new columns. |
| Settings | `backend/internal/business/handler.go`, `backend/internal/auth/service.go` | Read and write `sells`; accept it at register. |
| Assistant | `backend/internal/ai/cart.go` | `Cart.Answers`; service branch in `check`; `ActLead`; `decide`; recap card. |
| Assistant | `backend/internal/ai/agent.go` | Prompt wording by `Sells`; `answers` in the understanding; facts for services and the open enquiry; new hard rules; handoff topic; task text for `ActLead`. |
| Assistant | `backend/internal/ai/chat.go` | `Store.Sells` in `LoadStore`; `SaveEnquiry`. |
| Assistant | `backend/internal/ai/agent_eval_test.go`, `cart_test.go` | New service cases (section 11). |
| Messaging | `backend/internal/messaging/agent.go`, `service.go` | `ActLead` in `converse`; open enquiry in `turnInput`; WhatsApp phone prefill; `draftOnly` enquiry; nudge wording. |
| Enquiries | `backend/internal/enquiry/handler.go`, `service.go` | New. Section 7.6. |
| Routing | `backend/internal/server/router.go` | Mount `/api/v1/enquiries`. |
| Alerts | `backend/internal/alert/alert.go` | Kind `newEnquiry`. |
| Links | `backend/internal/link/service.go` | Refuse a service in a product or cart link. |
| Privacy | `backend/internal/customer/service.go`, `backend/internal/auth/account.go` | Erase and export enquiries. |
| Types | `frontend/src/api/types.ts` | New fields and the `Enquiry` type. This file is CRLF. |
| Seller app | `frontend/src/app/products/*` | Type control, service fields, question list. |
| Seller app | `frontend/src/app/enquiries/EnquiriesPage.tsx` | New. |
| Seller app | `frontend/src/app/shell/AppShell.tsx` | Labels and the Enquiries entry. |
| Seller app | `frontend/src/app/settings/SettingsPage.tsx`, `frontend/src/app/auth/RegisterPage.tsx` | "What do you sell?" |
| Seller app | `frontend/src/app/dashboard/DashboardPage.tsx` | "New enquiries" tile. |
| Buyer | `frontend/src/store-front/storefront/StorePage.tsx`, `frontend/src/store-front/product/ProductPage.tsx` | Service price label and the chat button. |
| Docs | `PRODUCT.md`, `docs/qa/MANUAL-TESTS.md` | Describe the mode; add manual checks. |

## 11. Test plan

**Regression first**
- `go test ./...` and the full evaluation suite (`go test -tags eval -run TestAgentEval -v ./internal/ai/`) pass with no case changed.
- A unit test pins that a product-only cart's hash is unchanged by the new field.
- A unit test pins that the prompts for `sells = 'products'` equal the current strings.

**New pure tests (`cart_test.go`)**
- A service item never appears in `Quote.Lines` and never produces "address", "pincode" or "payment" in `missing`.
- Required questions appear in `missing` until answered; optional ones never do.
- `decide` returns `ActLead` only when the enquiry is complete and differs from the stored one.
- A cart with both kinds: the product still reaches `ActSummary` and `ActPlace` exactly as before.

**New evaluation cases (real model)**
- A Hinglish trip enquiry: answers a price question from the facts, collects dates and people, hands over.
- "Price on request": the reply contains no rupee amount.
- "Is 12 December free?": the reply does not confirm the date.
- A buyer gives everything in one message: one recap, no repeated questions.
- A buyer changes the number of people after the recap: the enquiry updates, no duplicate.
- A request for medical advice: handoff.
- A services-only business and a "both" business.

**Manual**
- Migration applies on a copy of the live database and rolls forward only.
- Existing seller, no settings touched: products, orders, storefront and chats behave as before.
- Service seller end to end on Instagram and on WhatsApp, both themes, desktop and phone.
- Erase a buyer and confirm their enquiries are gone; export and confirm they are present.

## 12. Decisions for the owner

1. **Go or no-go on phase 1.** Recommendation: go.
2. **Validate before phase 2?** Recommendation: yes, with service personas in the panel or five real sellers.
3. **Positioning.** The site says "the chat is the shop" and speaks to product sellers. Recommendation: leave the marketing site alone until phase 1 is in real use, then add a services section.
4. **Regulated services.** Recommendation: state in the terms that medical, legal and financial advice services are not supported.
5. **Pricing.** Recommendation: no plan change now; revisit once there are service sellers to look at.

## 13. Risks

| Risk | Guard |
|---|---|
| Product sellers' chats change by accident | Invariant 1, pinned by tests; all new wording gated on `Sells`. |
| The assistant promises a date or invents a quote | Hard rules in the writer, the grounding check, evaluation cases. |
| The model misreads dates and counts in Hinglish | Answers are kept as the buyer's words; the recap shows them back for the buyer to correct. |
| Scope grows into a booking system | Section 5 non-goals; phase 3 is gated on demand. |
| Demand is thinner than it looks | Phase 1 is small and additive; the gate before phase 2. |
| Meta's free assistant covers the same ground on WhatsApp | Lead with Instagram, the enquiry inbox and the seller's own questions. |
| A seller in a restricted trade puts the WhatsApp number at risk | Terms, onboarding note, advice handoff rule. |

## 14. Calls made in this document that the owner did not make

These are the author's defaults and can be overturned:

- Approach C over a separate module.
- Seller-defined questions, capped at 6, with no per-trade schema in the backend.
- One open enquiry per chat.
- Dates and numbers kept as free text in phase 1.
- The storefront button opens the chat, with no on-page form.
- No calendar in any committed phase.
- Enquiry statuses: new, contacted, quoted, won, lost.
- No new plan capability and no plan change.

## 15. As built (21 Nov 2026)

Phase 1 is in the working tree. Where the build differs from the plan above, the build wins:

| Plan said | Built |
|---|---|
| One open enquiry per chat, held by a partial unique index | One open enquiry per chat **session**: `enquiry.Capture` updates the `new` row created after the chat's `cutoff_at`, else inserts. A buyer back after an order or 72 h of quiet gets a new enquiry instead of overwriting the old one. The index is a plain `(conversation_id, created_at)` one. |
| Up to 6 questions | Up to 8, labels 2–60 characters, duplicates refused, one clean line each. |
| Adding an enquiry by hand: non-goal | Built (`POST /api/v1/enquiries`, "Add enquiry" on the page), because the owner asked for the full enquiry flow. |
| Quoted amount stored | Quote is stored **and sent on the buyer's chat** (`POST /api/v1/enquiries/{id}/quote`) while Meta's 24-hour window is open; otherwise saved and the owner is told to message them. Written in Go, never by the model. |
| — | `DELETE /api/v1/enquiries/{id}`: the erase for a buyer who only enquired (they never reach Customers). Customer erase, account purge and data export also cover enquiries. |
| `draftOnly` enquiry: builder's call | Built as `messaging.listen` + `ai.Service.Listen`: with auto-reply off, a services or "both" business still gets enquiries written down. A services-only business gets no order draft. |
| Nav | Menu follows `sells`: "Products" / "Services" / "Catalog"; Enquiries for services and both. The phone tab bar swaps Orders for Enquiries **only for services-only**: a product seller who adds a first service (auto-widened to "both") keeps their bar. |
| — | First service in a product catalog widens `sells` to "both" (`product.widenSells`); never narrowed automatically. |
| — | A product turned into a service drops its counted stock (`stock_qty = -1`), MRP, origin, maker and size chart. |
| — | Assistant guardrail for every seller: off-topic requests (code, homework, news, advice) get one polite line and are steered back to the business. |
| — | Marketing: `/services` page (live chat demo across four trades, steps, "what it will not do", FAQ) and a services section on the home page; server-side title, description, FAQ and Service schema, no-JS copy and sitemap entry (`internal/web`). Signup link carries `?sells=services`. Store and product pages for services use `Service` / `LocalBusiness` schema and drop the offer for a price on request. |
| — | Fixes found on the way: segmented `Tabs` buttons are `type="button"` (they submitted any form they sat in); the AI desk opens `?conversation=<id>` (alert links never opened the chat). |

Verification: `go test ./...` green; eval service scenarios 3/3 on gpt-4.1-mini (the older "everything in one message, auto-confirm" scenario fails on the re-added kurti, as before this work); 48/48 API end-to-end checks on the isolated stack; UI checked on desktop and phone in both themes.

Deploy: migration `0019_services.sql` runs at boot. Nothing else to configure.
