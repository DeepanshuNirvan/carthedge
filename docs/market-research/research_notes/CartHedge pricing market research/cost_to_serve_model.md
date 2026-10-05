# Cost to serve one CartHedge seller (India, Oct 2026): unit costs and a per-seller monthly model

Researched 4 Oct 2026. **FX used throughout: US$1 = ₹96.3** (Trading Economics shows 96.13 to 96.18 on 2 Oct 2026, with the rupee down about 8.4% over 12 months: [Trading Economics](https://tradingeconomics.com/india/currency)). USD lines paid by Indian card also carry a bank forex markup, estimated at about 3.5% as noted in the repo's [WHATSAPP-INSTAGRAM-GO-LIVE.md](../../../WHATSAPP-INSTAGRAM-GO-LIVE.md) (an estimate, not verified with a bank). "(est.)" marks my own estimates. Every "Cited" line has a source. Model arithmetic is in the Inferences of the last section.

---

## 1. WhatsApp Cloud API: India rates by category, free windows, volume tiers, partner fees

### Takeaway
India list rates per delivered message are ₹0.8631 for marketing and ₹0.115 for utility and authentication. From 1 Oct 2026 Meta also charges service replies (₹0.115) and utility templates sent inside the 24-hour window. Sources disagree on whether the first 1,000 service messages per number per month stay free. YCloud adds no fee. Gupshup adds about $0.001 (≈₹0.10) on every message, incoming included, which costs more than Meta itself for a chat-heavy seller.

### Cited Findings
- India rates: marketing ₹0.8631, utility ₹0.115, authentication ₹0.115 per message. The marketing rate rose about 10% (from ≈₹0.7846) on 1 Jan 2026. Source: search-result summary of India rate-card articles ([chatmitra](https://chatmitra.com/blog/whatsapp-business-cost-per-message/), [whautomate](https://whautomate.com/whatsapp-business-api-pricing-india), [montymobile](https://montymobile.com/blogs/whatsapp-business-api-pricing-in-india-inr-rates-gst-and-the-2026-currency-migration-deadline/)). The same figures appear in the repo doc, which says it checked Meta's INR rate card on 4 Oct 2026 ([WHATSAPP-INSTAGRAM-GO-LIVE.md §4](../../../WHATSAPP-INSTAGRAM-GO-LIVE.md)).
- "Authentication-international" (an OTP to an Indian user from a non-Indian WABA) costs ₹2.4971, about 22× the domestic rate. Same aggregator summary as above ([montymobile](https://montymobile.com/blogs/whatsapp-business-api-pricing-in-india-inr-rates-gst-and-the-2026-currency-migration-deadline/)).
- 18% GST applies on Meta's per-message charges, treated as imported digital services (OIDAR). A ₹0.8631 marketing message becomes about ₹1.02 with GST. India WABAs must move to INR billing by 31 Dec 2026, or delivery stops on 1 Jan 2027 ([montymobile](https://montymobile.com/blogs/whatsapp-business-api-pricing-in-india-inr-rates-gst-and-the-2026-currency-migration-deadline/), via search summary).
- From 1 Oct 2026, Meta charges service (non-template) messages per message at the market's utility/authentication rate, with **no volume tiers for service messages**. Utility templates inside the customer-service window are also charged from 1 Oct 2026 (previously free) ([Meta: non-template message pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages)).
- **Conflict on the free allowance.** The repo doc ([§1, §4](../../../WHATSAPP-INSTAGRAM-GO-LIVE.md)) and aggregator summaries ([whautomate](https://whautomate.com/whatsapp-business-api-pricing-india)) say "service replies billed at ₹0.1150 after the first 1,000 free per phone number each month". My fetch of [Meta's non-template page](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages) returned "Free Messages: None after October 1, 2026". My fetch of [Meta's main pricing page](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) still said "Service conversations are now free for all businesses", which looks like a stale or cached render. **Treat the 1,000 free as unconfirmed.**
- Free entry point window: a user who arrives through a Click-to-WhatsApp ad or a Facebook Page call to action opens a 24-hour customer-service window plus a **72-hour** free entry point window, during which "any type of message" is free ([Meta pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)). **Conflict:** the repo doc says "up to 7 days per Meta's page" ([§4](../../../WHATSAPP-INSTAGRAM-GO-LIVE.md)).
- India has market-specific **volume tiers for utility and authentication** messages. They reset monthly and unlock lower rates based on the total across all WABAs in a business portfolio ([Meta pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)). I did not retrieve the tier thresholds or the discounted rates.
- Meta Business Agent (Meta's own AI, not used by CartHedge): $2.00 per 1M tokens, "approximately 4–5 cents (USD) per message", from 1 Aug 2026 ([Meta non-template page](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages)).
- Partner fees, from the repo doc's 4 Oct 2026 comparison (not re-fetched in this pass):
  - YCloud: zero markup on the free "Tech Partner" plan; an optional $300/month plan adds only a partner manager; prepaid USD balance by card; at zero balance every seller's channel stops ([YCloud pricing & payment](https://helpdocs.ycloud.com/partner-center/english-en-2/ji-shu-kai-fa-huo-ban/ji-shu-kai-fa-huo-ban-jia-ge-ji-fei-he-fu-kuan-fang-shi), [YCloud Tech Partner](https://www.ycloud.com/tech-partner)).
  - Gupshup: about $0.001 per message, incoming included, plus 6% on marketing sent outside MM Lite ([getmacha](https://www.getmacha.com/blog/gupshup-ai-complete-guide), [codingclave](https://codingclave.com/blog/gupshup-whatsapp-pricing-india-2026)). The repo marks this "confirm with Gupshup".
  - Twilio: $0.005 per message, in and out ([Twilio](https://www.twilio.com/en-us/whatsapp/pricing)).
  - 360dialog: €250–1,000 a month platform fee plus €15–49 per number ([360dialog](https://docs.360dialog.com/partner/get-started/pricing)).
- A Tech Provider in a Multi-Partner Solution can onboard 200 new client businesses per rolling 7 days ([repo doc §3](../../../WHATSAPP-INSTAGRAM-GO-LIVE.md), citing Twilio's Tech Provider guide).

### Inferences
- Phase 1 (CartHedge's own number). A storefront or link order sends about 5 templates: OTP, placed or COD confirm, shipped, delivered, plus a seller alert. An Instagram-chat order sends about 1 (the seller alert). At a 50/50 mix, plus OTPs for buyers who drop out of checkout, that is **≈3.5 billable messages per order ≈ ₹0.40 per order before GST** (est.).
- Phase 2 (the seller's own WhatsApp through YCloud). Each assistant turn is one billable service message once the free allowance, if it exists, is used up, so WhatsApp adds about ₹0.115 to every AI turn. Gupshup adds about ₹0.096 on each inbound and each outbound message, which roughly doubles WhatsApp cost per turn. YCloud is the only partner whose cost stays tolerable at Pro volumes.
- CartHedge's WABA must be Indian (India-registered business, sending to Indian numbers). An OTP sent from a foreign WABA costs ₹2.50 instead of ₹0.115.
- If the 1,000-free tier does not exist, every seller in phase 2 costs about ₹115 a month more (1,000 × ₹0.115).

### Gaps
- Meta's India volume-tier thresholds and the discounted utility/authentication rates.
- An authoritative Meta statement on whether the 1,000 free service messages per number survived 1 Oct 2026 (sources conflict, see above).
- Whether the free entry point window is 72 hours or up to 7 days (sources conflict).
- Written confirmation of YCloud zero markup and Gupshup's $0.001 (the repo says to get both in writing).

---

## 2. Instagram Messaging API: cost and rate limits

### Takeaway
Meta charges nothing per message on Instagram. The binding limits are Meta's 24-hour window and per-account per-second caps, which sit far above what a small seller generates. On Instagram, CartHedge's only variable costs are AI and infrastructure.

### Cited Findings
- The Instagram API with Instagram Login has no per-message fee ([repo PRODUCTION.md §8.5](../../../PRODUCTION.md); also [WHATSAPP-INSTAGRAM-GO-LIVE.md §7](../../../WHATSAPP-INSTAGRAM-GO-LIVE.md): "There is no per-message charge on Instagram").
- Send API: 100 calls per second per Instagram professional account for text, links, reactions and stickers; 10 calls per second for audio or video. Conversations API (thread reads): 2 calls per second per account. Private replies to post and Reel comments: 750 calls per hour per account. Meta publishes no flat hourly DM cap; the widely quoted "200 DMs/hour" is a pacing limit that automation vendors set themselves, not a Meta figure. Source: search summary of [conferbot](https://www.conferbot.com/limits/instagram) and [postmcpai](https://www.postmcpai.com/instagram-messaging-api); Meta's general Graph API rate-limit doc is [here](https://developers.facebook.com/docs/graph-api/overview/rate-limiting/).
- Automated replies are allowed only within 24 hours of the buyer's last message. The 7-day human-agent tag is for a real person only. Tokens last 60 days ([repo doc §7](../../../WHATSAPP-INSTAGRAM-GO-LIVE.md)).
- CartHedge's own loop guard allows at most 40 AI messages per chat per hour, roughly 15–20 replies (`maxAIPerHour = 40` in `backend/internal/messaging/agent.go`).

### Inferences
- Instagram adds no messaging cost per seller. Its cost is the AI turns (section 3) and the order notifications it saves (they go on the chat instead of a WhatsApp template).
- Rate limits will not bind for this segment. Even a 2,000-order seller averages well under one send per second.

### Gaps
- I did not fetch Meta's own Instagram messaging rate-limit page. The figures above come from third-party summaries of it.

---

## 3. LLM prices, tokens per sales-chat turn, cost per conversation and per order, caching

### Takeaway
At list prices, a typical assistant turn (two calls, about 6,200 input and 380 output tokens; my estimate from the code) costs **≈₹0.30 on gpt-4.1-mini, or ≈₹0.21 with 50% cache hits**. That is 2–3× the repo's "well under ₹0.10 per turn". The nano and Flash-Lite tiers cost about ₹0.05–0.07 a turn. The configured Gemini failover, `gemini-3.6-flash`, costs about twice as much as gpt-4.1-mini, and its price doubles again on 1 Jan 2027. AI is CartHedge's largest variable cost at Pro volumes.

### Cited Findings
- **OpenAI**, standard tier, per 1M tokens (input / cached input / output) ([OpenAI pricing](https://developers.openai.com/api/docs/pricing)):

  | Model | Input | Cached input | Output |
  |---|---|---|---|
  | gpt-4.1-mini | $0.40 | $0.10 | $1.60 |
  | gpt-4.1-nano | $0.10 | $0.025 | $0.40 |
  | gpt-5-mini | $0.25 | $0.025 | $2.00 |
  | gpt-5-nano | $0.05 | $0.005 | $0.40 |

  Batch and Flex tiers are 50% off standard, e.g. gpt-4.1-mini input falls to $0.20 (same source).
- **Google Gemini**, paid tier, per 1M tokens (input / output / context caching) ([Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)):

  | Model | Input | Output | Context caching |
  |---|---|---|---|
  | Gemini 3.8 / 3.7 / 3.6 Flash, through 31 Dec 2026 | $0.75 | $3.75 | $0.075 |
  | Gemini 3.8 / 3.7 / 3.6 Flash, from 1 Jan 2027 | $1.50 | $7.50 | $0.15 |
  | Gemini 3.5 Flash | $1.50 | $9.00 | $0.15 |
  | Gemini 3.5 Flash-Lite | $0.30 | $2.50 | $0.03 |
  | Gemini 2.5 Flash | $0.30 | $2.50 | $0.03 |
  | Gemini 2.5 Flash-Lite | $0.10 | $0.40 | $0.01 |

  The page says the free tier offers "limited access to certain models".
- **Anthropic Claude Haiku 4.5**: $1 input, $5 output, $0.10 cache read, $1.25 cache write per 1M tokens; batch processing saves 50% ([Claude pricing](https://claude.com/pricing)).
- Repo facts that bear on cost:
  - CartHedge's Gemini config is `GEMINI_MODEL=gemini-3.6-flash`. New keys get no free quota on gemini-2.x, and `gemini-2.5-flash` returns "404 no longer available to new users" ([INTEGRATIONS.md §6](../../../INTEGRATIONS.md)). The Gemini key in `.env` is free tier, limited to 20 requests a day ([GO-LIVE §4](../../../WHATSAPP-INSTAGRAM-GO-LIVE.md)).
  - Prompt construction (`backend/internal/ai/agent.go`, `backend/internal/messaging/agent.go`):
    - The "understand" prompt template is about 2,830 characters and carries the catalog: up to 80 products, each line with id, name, category, price, options, stock and a 100-character description.
    - The "write" prompt template is about 2,790 characters, plus a facts JSON with FAQ text capped at 2,500 characters.
    - Chat history is the last 30 messages.
    - Replies are capped at 3 texts of 55 words or fewer.
  - The admin AI-spend view prices costs at `UsdInr: 85` and prices any "gemini" model at $0.30/$2.50 (`backend/internal/admin/support.go`).

### Inferences
**Tokens per turn (est.).** English runs about 4 characters per token; Devanagari and Hinglish tokenize worse.
- Understand call: template ≈700 tokens, catalog ≈2,600 (40 products) to ≈5,200 (80 products), history ≈450, cart and orders ≈150, output JSON ≈200. Total ≈3,900–6,500 in, ≈200 out.
- Write call: template ≈700, facts and FAQ ≈1,000, history ≈450. Total ≈2,200 in, ≈180 out.
- **Typical turn ≈ 6,200 input + 380 output tokens.**

**Cost per turn at ₹96.3/$** (no cache → 50% of input cached):

| Model | No cache | 50% cached |
|---|---|---|
| gpt-4.1-mini | ₹0.297 | ₹0.208 |
| gpt-4.1-nano | ₹0.074 | ₹0.052 |
| gpt-5-mini (+200 reasoning tokens) | ₹0.261 | ₹0.194 |
| gpt-5-nano (+200 reasoning tokens) | ₹0.052 | ₹0.039 |
| Gemini 2.5 Flash-Lite | ₹0.074 | ₹0.047 |
| Gemini 2.5 Flash | ₹0.271 | ₹0.190 |
| Gemini 3.6 Flash, 2026 | ₹0.585 | ₹0.384 |
| Gemini 3.6 Flash, 2027 | ₹1.17 | ₹0.77 |
| Claude Haiku 4.5 | ₹0.78 | ₹0.51 |

A **hybrid** (understand on gpt-4.1-nano, write on gpt-4.1-mini, 50% cached) costs **≈₹0.112 per turn**.

**Turns per conversation and per order (est.).**
- A converting chat takes about 7–8 turns: price, size, intent, details, payment, summary, "haan", one status question.
- Each order also carries about 2 non-converting browse chats of about 2 turns each (assumes about 33% chat-to-order conversion).
- Base case: **≈3 AI conversations and ≈12 turns per DM-originated order**, with a range of 8–18.

**AI cost per DM order:**

| Model | 8 turns | 12 turns (base) | 18 turns |
|---|---|---|---|
| gpt-4.1-mini, cached | ₹1.66 | ₹2.49 | ₹3.74 |
| Hybrid | ₹0.90 | ₹1.35 | ₹2.02 |
| Nano | ₹0.42 | ₹0.62 | ₹0.94 |

On gpt-4.1-mini, one AI conversation (about 4 turns) costs ≈₹0.83 cached or ≈₹1.19 uncached.

**Caching.** In `understandPrompt` the catalog comes right after the opening line and before the cart, stage and remaining instructions. So the cacheable prefix is mostly the catalog: about 40% of a turn's input, and only within the provider's cache lifetime. Moving all static text (instructions plus catalog) ahead of the per-turn data would raise cache hits. gpt-4.1-mini cached input is 75% off; gpt-5-mini and nano cached input is 90% off.

**Failover and admin-dashboard risks.**
- Failover to gemini-3.6-flash costs ≈1.85× gpt-4.1-mini per turn now and ≈3.7× from 1 Jan 2027. The failover model should be a cheap one (2.5 Flash-Lite if new keys can use it, otherwise 3.5 Flash-Lite at $0.30/$2.50).
- The admin AI-spend view under-reports cost by ≈12% on FX (85 vs 96.3). It under-reports gemini-3.6-flash by 2.5× on input and 1.5× on output.

**Smaller models.** PRODUCTION.md §8.6 already warns that small models are weaker at Hinglish catalog matching. Any move to nano or Flash-Lite should be gated on the repo's `agent_eval_test.go` suite.

### Gaps
- Real token counts per turn from production. Admin → AI spend logs tokens; one week of real data should replace these estimates.
- The OpenAI prompt-caching minimum prompt length and cache lifetime (the fetched pricing page did not state them).
- Whether gemini-2.5-flash-lite is available to newly created keys.
- The DM-to-order conversion rate and real turns per order for Indian Instagram sellers. No public source found.

---

## 4. Infrastructure: Render, Neon, Redis, object storage, email, SMS fallback, domain/CDN

### Takeaway
Infrastructure is small, mostly fixed, and steps up with seller count: about ₹7.7k a month at 50 sellers, ₹14.6k at 300 and ₹31k at 1,000 (est.). The always-on Neon compute is the largest line, because the server's background jobs keep the database awake. Storage and email are negligible per seller.

### Cited Findings
- **Render.** Starter web service $7/month (0.5 vCPU, 512 MB); Standard $25/month (1 vCPU, 2 GB). Key Value (Redis-compatible): Free $0 (25 MB), Starter $10 (256 MB), Standard $32 (1 GB), Pro $135 (5 GB). Pricing is a flat monthly fee for always-on compute. Source: search summary of [srvrlss.io](https://www.srvrlss.io/provider/render/) and [budgetforge](https://www.budgetforge.dev/tools/render-pricing-2026); the official [render.com/pricing](https://render.com/pricing) did not render in my fetch.
- Render's free plan sleeps when idle, and the assistant loop, schedulers and token refresh run inside the server. Production needs Starter or above. The code assumes one instance; the per-chat lock is in-process and needs Redis before a second instance ([GO-LIVE §8](../../../WHATSAPP-INSTAGRAM-GO-LIVE.md)).
- **Neon** ([neon.com/pricing](https://neon.com/pricing)):
  - No monthly minimum on Free, Launch or Scale.
  - Launch: compute $0.106 per CU-hour, storage $0.35 per GB-month, restore window up to 7 days.
  - Scale: $0.222 per CU-hour, 30-day restore.
  - Point-in-time restore adds $0.20 per GB-month.
  - Compute scales to zero when idle.
  - Neon's own example: 1 CU always on plus 50 GB on Scale ≈ $180/month.
- Neon currently runs in us-east-2 while Render runs in Singapore, adding about 200–300 ms per query. The repo plans to move Neon to AWS ap-southeast-1 ([GO-LIVE §8](../../../WHATSAPP-INSTAGRAM-GO-LIVE.md)).
- **Upstash Redis.** Free: 256 MB, 500K commands a month, 10 GB bandwidth. Pay-as-you-go: $0.2 per 100K commands, $0.25 per GB storage (first GB free), bandwidth free to 200 GB then $0.03/GB. Fixed plans from $10 (250 MB) to $1,500 (500 GB) with unlimited commands, e.g. Fixed 1 GB for $20/month ([Upstash](https://upstash.com/pricing/redis)).
- **Cloudflare R2.** Storage $0.015/GB-month; Class A operations $4.50 per million; Class B $0.36 per million; egress free. Free tier: 10 GB-month, 1M Class A and 10M Class B operations a month ([Cloudflare R2](https://developers.cloudflare.com/r2/pricing/)).
- **Resend.** Free: 3,000 emails a month, 100 a day, 3 domains. Pro: $20 for 50k a month or $35 for 100k. Scale: from $90 for 100k. Overage $0.90 per 1,000 ([Resend](https://resend.com/pricing)).
- **MSG91 SMS (India)**, per message by volume, +18% GST: ₹0.25 at 5,000; ₹0.20 at 16,500; ₹0.18 at 30,000; ₹0.17 from 60,000; ₹0.16 at 962,500. Enterprise rates "up to ₹0.13". DLT fees are not listed ([MSG91](https://msg91.com/in/pricing/sms)).
- DLT registration (TRAI) is a one-time ₹5,000–6,000 for entity and header, takes a few working days, and is mandatory before any production SMS ([PRODUCTION.md §8.3](../../../PRODUCTION.md), indicative).
- Domain about ₹800–1,200 a year. The Cloudflare free tier covers DNS, TLS, CDN and basic WAF. Sentry (5k events a month) and UptimeRobot free tiers suffice at launch ([PRODUCTION.md §8.11–8.12](../../../PRODUCTION.md)).

### Inferences
**Fixed versus variable.** Render, Neon compute, Redis, the domain and the email plan are fixed and step up with seller count. Per-seller variable infrastructure is only storage and object operations. R2 storage is about 0.2 GB per seller (100 products × 4 photos × ~300 KB plus option photos, est.), which costs ≈₹0.30 a month per seller once past the free 10 GB. Egress is free.

**Neon compute will not scale to zero.** The server sweeps jobs every 5 minutes (`nudgeSweep`) and runs schedulers, so plan for always-on compute.

| Seller count | Neon Launch compute (always on) |
|---|---|
| 50 | 0.5 CU ≈ $39/mo |
| 300 | 1 CU ≈ $77/mo |
| 1,000 | 2 CU ≈ $155/mo |

Add storage plus PITR at $0.55 per GB-month.

**SMS fallback.** At ₹0.16–0.25 plus GST, SMS costs 1.4–2.2× a WhatsApp authentication template (₹0.115). Keep WhatsApp primary and SMS only as a fallback. The DLT one-off cost is worth paying only when a meaningful share of buyers fail WhatsApp delivery.

**Redis.** Use Render Key Value in the same private network rather than Upstash pay-as-you-go. Rate limits, the SSE pub/sub and OTPs can run into millions of commands, which at $0.2 per 100K makes a fixed plan cheaper.

### Gaps
- Render's workspace or seat fee (a Professional workspace fee exists per [livemy.app](https://livemy.app/blog/render-pricing), but I did not get the amount), the Pro instance price, and bandwidth allowance and overage. The official page did not render.
- Real database size and compute need per seller. The storage-per-seller figures are estimates.

---

## 5. Payments and tax: Razorpay on subscription collection, GST on SaaS, GST on fees

### Takeaway
Collecting a plan through Razorpay costs **2% + 18% GST on the fee = 2.36%** of the charge on any domestic method, UPI included. Recurring card charges cost 0.9% + 2% (3.42% with GST). UPI AutoPay and e-mandate pricing is "on request". GST of 18% on the plan is the larger swing: a GST-inclusive ₹999 nets **₹846.61**.

### Cited Findings
- **Razorpay Standard** ([Razorpay pricing](https://razorpay.com/pricing/)):
  - 2% platform fee per successful domestic transaction on cards, UPI ("Zero MDR with 2% platform fee"), net banking, wallets and EMI. Corporate cards 2.15%. International cards up to 3%.
  - Recurring cards: "0.9% + Platform fees per transaction".
  - UPI, NACH and e-mandate recurring: "Pricing available on request".
  - 18% GST on Razorpay's fees.
  - No setup, annual maintenance or refund fees.
- **GST on SaaS:** a SaaS subscription is a service under SAC 9983 (commonly 998314 or 998315) at 18% for Indian customers ([xflowpay](https://www.xflowpay.com/blog/gst-on-software-services), via search summary).
- **Imported services:** an Indian business buying overseas SaaS (OIDAR) pays 18% GST under reverse charge if GST-registered ([stoxntax](https://stoxntax.in/2025/10/03/gst-on-saas-businesses-in-india-foreign-payments-reverse-charge-mechanisms/), [ampuesto](https://ampuesto.in/blog/gst-on-saas-digital-services-india/), via search summary).
- CartHedge already issues a GST invoice for every subscription payment and stores its SAC and GST rate in admin site settings ([product.txt §8.9, §8.13](../../../../product.txt)).

### Inferences
**Razorpay fee per plan charge** (one-off domestic 2.36%, card autopay 3.42%):

| Plan | One-off | Card autopay |
|---|---|---|
| ₹499 | ₹11.8 | ₹17.1 |
| ₹999 | ₹23.6 | ₹34.2 |
| ₹1,999 | ₹47.2 | ₹68.4 |

If CartHedge is GST-registered, the GST part of the fee is input tax credit, so the cash cost is 2% or 2.9%.

**GST-inclusive versus GST-exclusive plan prices:**

| Plan | Inclusive: net revenue | Exclusive: seller pays |
|---|---|---|
| ₹499 | ₹422.88 | ₹588.82 |
| ₹999 | ₹846.61 | ₹1,178.82 |
| ₹1,999 | ₹1,694.07 | ₹2,358.82 |

Many small Instagram sellers are unregistered and cannot claim the credit, so to them the inclusive figure is the price they feel. This model computes margins on **ex-GST net revenue**.

**GST on imported inputs.** Meta, OpenAI, Google, Render, Neon, Upstash, R2, Resend and YCloud are all imported services. If CartHedge is GST-registered, the 18% is paid under reverse charge and reclaimed, so it affects cash flow but is not a cost. If CartHedge is not registered, add 18% to every such line in the model.

### Gaps
- Razorpay's UPI AutoPay and e-mandate subscription rates (on request) and any Razorpay Subscriptions product surcharge.
- Primary CBIC notification text for the SaaS SAC and rate (only secondary summaries checked).

---

## 6. People: support executive, helpdesk tooling, maintenance developer, ticket volumes

### Takeaway
A support executive in India costs about ₹2.6 lakh a year in salary (≈₹21k a month). A capable backend or full-stack maintenance developer costs about ₹5–16 lakh a year depending on source and company type. B2B SaaS benchmarks run 0.2–0.5 tickets per customer per month. Non-technical Indian social sellers are likely 2–3× that early on (est.), so support is the main fixed per-seller cost after AI.

### Cited Findings
- **Customer Care Executive, India 2026** ([PayScale](https://www.payscale.com/research/IN/Job=Customer_Care_Executive/Salary)): average ₹256,688; base ₹166k–₹407k; total pay ₹169k–₹505k. Mid-career average ₹301,732; experienced ₹335,000.
- **Software developer, India 2026:**
  - Early career (1–4 years) average total compensation ₹495,681 ([PayScale Software Developer](https://www.payscale.com/research/IN/Job=Software_Developer/Salary)).
  - Software engineer with 1–4 years: ₹753,561 from 3,685 salaries ([PayScale Software Engineer](https://www.payscale.com/research/IN/Job=Software_Engineer/Salary)).
  - Entry level (1–3 years) ≈ ₹16.0 lakh ([Glassdoor India](https://www.glassdoor.co.in/Salaries/software-developer-salary-SRCH_KO0,18.htm)).
  - General market about ₹6–9 LPA. Product companies pay 3–5× IT-services firms for the same experience ([moneyview](https://moneyview.in/insights/software-developer-salary-in-india)).
  - All of the above come via search summary; the attribution of each figure to a site is from the result set, and individual pages were not fetched.
- **Zoho Desk India** (per agent per month, annual billing): Express ₹420, Standard ₹800, Professional ₹1,400, Enterprise ₹2,400. A permanently free plan covers up to 3 agents with email ticketing, a help center and a knowledge base ([itforsme](https://www.itforsme.in/pricing/zoho-desk-india/), [Zoho INR plan PDF](https://www.zoho.com/desk/images/desk-pricing-inr.pdf), via search summary).
- **Ticket volume benchmarks:** B2B SaaS runs 0.2–0.5 tickets per customer per month, high-touch enterprise 0.5–1.0. Aim for ticket volume under 10% of active users a month. SMB-focused SaaS spends $50–150 a month per active support user ([ideaplan](https://www.ideaplan.io/metrics/support-ticket-volume), [fullview](https://www.fullview.io/blog/customer-support-metrics), via search summary; exact per-figure attribution not verified).
- Customer support runs at 8–15% of revenue depending on product complexity (search summary of [saasrise](https://www.saasrise.com/blog/saas-benchmark-report-2026) and [cloudzero](https://www.cloudzero.com/blog/ai-gross-margin/); attribution not verified).
- The sales pitch promises "we'll import your catalog for you on the call" ([PRODUCTION.md §13](../../../PRODUCTION.md)). That is onboarding labour, best counted as CAC rather than cost to serve.

### Inferences
**Assumptions (est.):**
- Support executive fully loaded ≈ ₹30,000 a month (₹21k salary plus PF, phone, tools and attrition).
- Maintenance developer ≈ ₹1,00,000 a month (≈₹12 LPA for someone who can own Go, Postgres and Meta integrations).
- Tickets per seller per month (est.): 1.0 at 100 orders, 1.5 at 500, 2.0 at 2,000.
- One executive handles about 600–800 tickets a month (est.), so ≈₹43 per ticket. Per seller that is ≈₹43 (100 orders), ₹65 (500) and ₹86 (2,000).

**Staffing plan by seller count (est.):**

| Sellers | Support | Maintenance and on-call (counted in cost to serve) |
|---|---|---|
| 50 | Founder handles it (₹0 cash) | 0.25 FTE |
| 300 | 1 executive | 0.5 FTE |
| 1,000 | 2 executives | 1 FTE |

**AI deflection.** The assistant's own "needs you" handovers go to the seller, not CartHedge, so they are not CartHedge tickets.

### Gaps
- AmbitionBox pages returned 403, so there is no AmbitionBox figure for either role.
- No India- or SMB-commerce-specific ticket-rate benchmark found. The 1–2 tickets per seller is an estimate.
- Tickets handled per agent per day for Indian vernacular support (no source).

---

## 7. Per-seller monthly cost model and gross-margin targets

### Takeaway
On variable cost alone (before fixed costs), a 100-order Starter seller is very profitable (≈88% contribution; Starter has no AI). With the AI assistant on gpt-4.1-mini handling half of orders, **the 500- and 2,000-order sellers cost about as much as, or more than, their ex-GST plan price** (base case ₹848 vs ₹847 net for Growth, ₹3,346 vs ₹1,694 for Pro). The assistant is Pro-only today, so the 2,000-order Pro seller is the at-risk case.

Once support and maintenance staff are added, no current plan reaches the 70–75% SaaS gross-margin benchmark even at 1,000 sellers. The fixes are:
- route the "understand" call to a nano-class model;
- meter AI replies per plan;
- reprice Pro and its overage;
- deflect support tickets.

55–70% is the accepted benchmark for AI-heavy tiers.

### Cited Findings
- Median SaaS gross margin for private companies at $5–50M ARR is 71–74% in 2026 (KeyBanc/OpenView data). Subscription gross margin median is about 76%, top quartile 84%+ (search summary of [stealthagents](https://stealthagents.com/research/startup-gross-margin-benchmarks-2026) and [withorb](https://www.withorb.com/blog/saas-growth-margin-statistics); per-figure attribution not verified).
- Compute-heavy AI-native SaaS runs 55–70% gross margin, below the ≈75% B2B SaaS median. Surveyed companies expect a 52% average gross margin on AI products in 2026 (search summary of [cloudzero](https://www.cloudzero.com/blog/ai-gross-margin/) and [saasmag](https://www.saasmag.com/ai-cogs-saas-gross-margin-compression/)).
- Current plans: Starter ₹499 with 100 orders and ₹3 per extra order; Growth ₹999 with 500 orders and ₹2.50; Pro ₹1,999 with 2,000 orders and ₹2. The AI sales assistant (automatic DM replies) is Pro only. Growth includes AI order capture (drafts from connected chats) ([product.txt §9](../../../../product.txt)).
- The repo's earlier unit economics claimed ≈₹180 variable cost and ≈82% gross margin on Growth, and ≈₹0.40 per-order variable cost ([PRODUCTION.md §9–10.4](../../../PRODUCTION.md)). These predate the assistant and the 1 Oct 2026 Meta changes.

### Inferences

**Model assumptions (all est. unless sourced above):**
- FX ₹96.3/$ plus 3.5% forex on USD bills.
- 50% of orders come from AI-handled DMs; the rest come from the storefront or links.
- 12 AI turns and ≈3 AI conversations per DM order. AI cost is incurred on DM orders only.
- 6,200 input and 380 output tokens per turn; 50% input cache hit.
- WhatsApp phase 1 (CartHedge's number): 3.5 billable messages per order at ₹0.115.
- WhatsApp phase 2 (seller's number through YCloud): one service message per AI turn, the first 1,000 a month free (unconfirmed), plus the same order templates, +3.5% forex.
- Storage 0.2 GB per seller on R2.
- Razorpay one-off 2.36% on the plan price.
- Prices compared ex-GST (inclusive pricing).
- GST on inputs assumed reclaimed (CartHedge GST-registered).

#### A. Unit drivers per order

| Driver | Value |
|---|---|
| WhatsApp messages per order (phase 1) | ≈3.5, ₹0.40 |
| AI conversations per DM order | ≈3 (1 converting + 2 browse) |
| AI turns per DM order | ≈12 (range 8–18) |
| AI cost per DM order | ₹2.49 gpt-4.1-mini · ₹1.35 hybrid · ₹0.62 nano |
| Blended AI cost per order (50% DM) | ₹1.25 mini · ₹0.67 hybrid · ₹0.31 nano |
| **Blended variable cost per order** (AI + phase-1 WhatsApp) | **₹1.65 mini · ₹1.08 hybrid · ₹0.71 nano** |
| Phase 2 extra per AI turn (after the free 1,000) | +₹0.119 YCloud · +₹0.31 Gupshup (in + out + Meta) |
| Storage per seller | ≈0.2 GB, ≈₹0.30/mo |

#### B. Variable cost per seller per month (₹, ex-GST, AI assistant on for DM orders)

| Line | 100 orders | 500 orders | 2,000 orders |
|---|---|---|---|
| AI turns (50% DM × 12) | 600 | 3,000 | 12,000 |
| AI, gpt-4.1-mini (50% cached) | 125 | 623 | 2,494 |
| AI, hybrid (nano understand + mini write) | 67 | 337 | 1,350 |
| AI, all nano-class | 31 | 156 | 623 |
| WhatsApp phase 1 (own number) | 40 | 201 | 805 |
| WhatsApp phase 2 via YCloud (replaces phase 1 line) | 42 | 446 | 2,142 |
| WhatsApp phase 2 via Gupshup (replaces phase 1 line) | 190 | 1,178 | 5,055 |
| Storage (R2) | 0.3 | 0.3 | 0.3 |
| Razorpay on plan fee (₹499 / ₹999 / ₹1,999) | 12 | 24 | 47 |
| **Total, phase 1 + gpt-4.1-mini** | **177** | **848** | **3,346** |
| **Total, phase 1 + hybrid** | **119** | **562** | **2,202** |
| **Total, phase 1 + nano** | **83** | **381** | **1,475** |
| **Total, phase 2 YCloud + gpt-4.1-mini** | **179** | **1,093** | **4,683** |
| Plan net of 18% GST (inclusive pricing) | 423 (Starter) | 847 (Growth) | 1,694 (Pro) |
| Contribution margin, phase 1 + mini | 58% | 0% | −98% |
| Contribution margin, phase 1 + hybrid | 72% | 34% | −30% |
| Support allocation (ticket-driven; already inside fixed table C, do not add twice) | 43 | 65 | 86 |

Sensitivity at 2,000 orders on gpt-4.1-mini:
- 8 turns per DM order: ≈₹2,515 total.
- 18 turns per DM order: ≈₹4,590 total.
- 100% DM share: AI alone ≈₹4,990.

**As plans are actually sold today:**
- Starter has no AI, so a 100-order seller costs ≈₹52 variable (WhatsApp plus Razorpay): **≈88% contribution**.
- Growth uses one-shot draft parsing rather than turns. At about 2 parses per chat and ₹0.20 per parse on mini (est.), that is ≈₹300, for a total of ≈₹525 and **≈38% contribution**.
- The Pro row above is the real exposure.

#### C. Fixed monthly platform cost (₹, est., USD lines × 96.3 × 1.035)

| Line | 50 paying sellers | 300 paying sellers | 1,000 paying sellers |
|---|---|---|---|
| Render web service | 1 × Standard $25 = 2,492 | 1 × Standard $25 = 2,492 | 2 × Standard $50 = 4,984 (needs the Redis lock first) |
| Neon Postgres (Launch, always on, + storage and PITR) | 0.5 CU + 5 GB ≈ $41 = 4,130 | 1 CU + 20 GB ≈ $88 = 8,809 | 2 CU + 60 GB ≈ $188 = 18,714 |
| Redis (Render Key Value) | Starter $10 = 997 | Starter $10 = 997 | Standard $32 = 3,190 |
| R2 object storage + operations | 0 (free tier) | ≈$2 = 199 | ≈$7 = 698 |
| Email (Resend) | 0 (free) | Pro $20 = 1,993 | Pro $35 = 3,488 |
| Domain (Cloudflare free for DNS/TLS/CDN) | 75 | 75 | 75 |
| Monitoring (Sentry, UptimeRobot free) | 0 | 0 | 0 (paid tier likely later; unsourced) |
| **Infrastructure subtotal** | **≈7,700** | **≈14,600** | **≈31,100** |
| Helpdesk (Zoho Desk) | Free (≤3 agents) | Free | Standard 3 × ₹800 = 2,400 |
| Support staff (₹30k loaded per executive) | Founder (0 cash) | 1 = 30,000 | 2 = 60,000 |
| Maintenance developer share (₹1L/mo FTE) | 0.25 = 25,000 | 0.5 = 50,000 | 1.0 = 1,00,000 |
| **Total fixed** | **≈32,700** | **≈94,600** | **≈1,93,500** |
| **Fixed cost per paying seller** | **≈654** | **≈315** | **≈194** |
| of which infrastructure only | ≈154 | ≈49 | ≈31 |

Not included: founder salary, sales and onboarding (CAC), the one-off DLT fee (₹5–6k, only if SMS is added), legal, a Render workspace fee (unverified), and 18% GST on imported services if CartHedge is not GST-registered.

#### D. Fully loaded cost per seller (variable B, phase 1 + hybrid AI, + fixed C)

| Seller volume | At 50 sellers | At 300 sellers | At 1,000 sellers | Net plan price today |
|---|---|---|---|---|
| 100 orders | 773 | 434 | 313 | 423 |
| 500 orders | 1,216 | 877 | 756 | 847 |
| 2,000 orders | 2,856 | 2,517 | 2,396 | 1,694 |

(With gpt-4.1-mini instead of hybrid, add ₹58, ₹286 and ₹1,144 to the 100-, 500- and 2,000-order rows.)

#### E. Implications and recommended targets
- **Gross-margin targets** (inference from the benchmarks above):
  - Blended subscription gross margin of **≥70%** at 300+ sellers, which is the SaaS median.
  - Accept **55–65%** on AI-heavy Pro-type tiers.
  - Price usage add-ons (offer credits, extra AI replies, WhatsApp overage) at **≥2× unit cost** (≥50% margin).
  - The per-order overage fee should be ≥2× blended variable cost per order.
- **Plan price (ex-GST) needed for a 70% margin**, by cost basis, assistant on with hybrid AI:

  | Cost basis | 100 orders | 500 orders | 2,000 orders |
  |---|---|---|---|
  | Variable only | ₹397 | ₹1,873 | ₹7,340 |
  | Variable + infrastructure share at 300 sellers (₹49) | ₹560 | ₹2,037 | ₹7,503 |
  | Fully loaded at 300 sellers (₹315) | ₹1,447 | ₹2,923 | ₹8,390 |
  | Fully loaded at 300 sellers, all-nano AI | ₹1,327 | ₹2,320 | ₹5,967 |

- **Plans as sold today**, where Starter has no AI (≈₹52 variable), Growth has draft parsing only (≈₹525) and Pro has the assistant (hybrid ≈₹2,202):

  | Plan | Gross margin, fully loaded at 300 sellers | At 1,000 sellers |
  |---|---|---|
  | Starter | 13% | 42% |
  | Growth | 1% | 15% |
  | Pro | −49% | −41% |

  On contribution alone, Starter (88%) is healthy, Growth (38%) is thin and Pro is negative. **No plan reaches 70% fully loaded at current prices, even at 1,000 sellers.** People costs (≈₹162 of the ₹194 fixed cost per seller at 1,000 sellers) drive Starter and Growth; AI drives Pro. Pro is underpriced roughly 4× for a seller whose DMs the assistant fully runs, unless AI usage is capped.
- **Cheapest fixes, in order:**
  1. Run the "understand" call on gpt-4.1-nano or gpt-5-nano (or Flash-Lite) after an eval pass. That halves AI cost.
  2. Reorder prompts so static instructions and the catalog form a cacheable prefix.
  3. Add a per-plan AI-reply allowance (e.g. Pro includes N replies, then packs at ≈₹0.25–0.45 per reply, which is ≥2× the ₹0.11–0.21 cost).
  4. Raise Pro or its per-order overage. ₹2 GST-inclusive is ₹1.69 net, which is roughly equal to the ₹1.65 per-order cost on mini.
  5. Change the Gemini failover from gemini-3.6-flash to a Flash-Lite model before its 1 Jan 2027 price doubling.
  6. Fix the admin AI-spend FX (85 → ~96) and the Gemini price row so dashboards show the true cost.
- **WhatsApp:**
  - Phase 1 is cheap per order (₹0.40) but scales linearly. At 2,000 orders it is ₹805, about 48% of Pro net revenue. Keep notifications on the Instagram chat and web push wherever possible.
  - In phase 2 stay on YCloud. Gupshup's per-message fee on chat-heavy sellers (₹1,178 at 500 orders) would erase Growth's margin.
  - Meter offers at ≈₹1.25 per message as the repo plans (₹0.8631 + forex + GST + margin).
- **Fixed cost:** infrastructure per seller falls from ≈₹154 to ≈₹31 between 50 and 1,000 sellers. People costs dominate fixed cost at every scale, so support deflection (self-serve help, in-app guides) matters more than hosting optimisation.

### Gaps
- No production data on turns per order, DM-order share or tokens per turn. Sections B–D hinge on these: a 2× error in turns per order moves AI cost 2×. Replace with 2–4 weeks of Admin → AI spend data from pilot sellers.
- The fate of Meta's 1,000-free service-message tier (phase 2 cost per seller ±₹115).
- Render seat or workspace fee and bandwidth overage. Razorpay UPI AutoPay rate.
- AmbitionBox salary data (blocked). No India-specific SMB SaaS gross-margin benchmark found; the targets above use global SaaS medians.
