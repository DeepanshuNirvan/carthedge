-- After-sales (returns, exchanges, refunds), seller settings (store policies,
-- assistant profile, checkout charges, GST, alerts), GST invoicing with credit
-- notes, owner alerts by web push, abandoned-checkout reminders, autopay, and
-- the admin's AI-cost and support tools.
--
-- Everything is additive with defaults: the running app keeps working on this
-- schema and simply ignores what it does not know about.

-- Seller settings: validated JSON documents (see internal/shop). '{}' means
-- "never set", and every reader treats it as the behaviour before this file.
alter table businesses add column policies jsonb not null default '{}'::jsonb;
alter table businesses add column ai_profile jsonb not null default '{}'::jsonb;
alter table businesses add column checkout_rules jsonb not null default '{}'::jsonb;
alter table businesses add column gst_profile jsonb not null default '{}'::jsonb;
alter table businesses add column alert_prefs jsonb not null default '{}'::jsonb;
-- set when the seller deletes the account (status 'deleted'); the data is
-- purged 30 days later and the row kept as an empty shell (status 'purged')
alter table businesses add column deleted_at timestamptz;

-- Orders: the checkout charges, optional B2B details for a GST invoice, and the
-- order an exchange ships against.
alter table orders add column prepaid_discount int not null default 0;
alter table orders add column cod_fee int not null default 0;
alter table orders add column buyer_gstin text not null default '';
alter table orders add column buyer_company text not null default '';
alter table orders add column replacement_of uuid references orders(id) on delete set null;
create index idx_orders_replacement on orders (replacement_of) where replacement_of is not null;
-- coupon limits count redemptions straight from orders
create index idx_orders_offer on orders (business_id, offer_code) where offer_code <> '';

alter table customers add column returns_count int not null default 0;

-- Coupon limits; 0 / false = no limit.
alter table offers add column max_discount int not null default 0;     -- paise cap on a percent offer
alter table offers add column max_uses int not null default 0;         -- orders in total
alter table offers add column max_per_customer int not null default 0; -- orders per buyer
alter table offers add column first_order_only boolean not null default false;

-- Product facts buyers and the assistant read, and GST per product.
alter table products add column details jsonb not null default '[]'::jsonb; -- [{label, value}]
alter table products add column size_chart text not null default '';        -- image URL
alter table products add column hsn text not null default '';
alter table products add column gst_rate int not null default -1;           -- percent; -1 = store default

-- Return and exchange requests. One open request per order at a time.
create table return_requests (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    order_id uuid not null references orders(id) on delete cascade,
    code text not null unique,                 -- RT-XXXXXX
    kind text not null,                        -- return | exchange
    reason text not null,                      -- size | damaged | wrong_item | quality | not_as_described | changed_mind | other
    note text not null default '',
    photos jsonb not null default '[]'::jsonb,
    items jsonb not null,                      -- [{index, productId, variantId, name, variant, qty, price, restock, exchangeVariantId, exchangeLabel}]
    status text not null default 'requested',  -- requested | approved | picked_up | received | completed | rejected | cancelled
    resolution text not null default '',       -- exchange | refund | exchange_refund (on completion)
    source text not null default 'buyer',      -- buyer | seller
    seller_note text not null default '',      -- what the buyer is told (pickup details, why rejected)
    pickup_courier text not null default '',
    pickup_tracking text not null default '',
    replacement_order_id uuid references orders(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index idx_returns_business on return_requests (business_id, created_at desc);
create index idx_returns_order on return_requests (order_id);
create unique index return_requests_open_key on return_requests (order_id)
    where status in ('requested', 'approved', 'picked_up', 'received');

-- Money going back to buyers. Pending ones are owed; processed ones are paid.
create table refunds (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    order_id uuid not null references orders(id) on delete cascade,
    return_id uuid references return_requests(id) on delete set null,
    amount int not null check (amount > 0),
    method text not null default '',           -- razorpay | upi | bank | cash | other ('' while pending)
    status text not null default 'pending',    -- pending | processed | failed | cancelled
    reference text not null default '',        -- UTR / Razorpay refund id
    reason text not null default '',
    created_at timestamptz not null default now(),
    processed_at timestamptz
);
create index idx_refunds_order on refunds (order_id);
create index idx_refunds_business on refunds (business_id, status, created_at desc);

-- Invoices keep the full GST document they were issued with; legacy rows
-- (data null) render from their totals as before.
alter table invoices add column doc_type text not null default 'tax_invoice'; -- tax_invoice | bill_of_supply | invoice
alter table invoices add column data jsonb;

-- A credit note reverses the tax on a refund against an invoiced order.
create table credit_notes (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    invoice_id uuid not null references invoices(id) on delete cascade,
    refund_id uuid references refunds(id) on delete set null,
    number text not null,
    data jsonb not null,
    total int not null,
    created_at timestamptz not null default now(),
    unique (business_id, number)
);

-- Gap-free document series (invoice, credit note, platform invoice) per
-- scope, e.g. "inv:<business>:2026-27". Advanced inside the issuing
-- transaction, so a rollback hands the number back.
create table doc_counters (
    scope text primary key,
    n int not null
);

-- CartHedge's own GST invoice for each subscription payment. Kept when a
-- seller's data is purged: tax law makes the platform keep its invoices.
create table platform_invoices (
    id uuid primary key default gen_random_uuid(),
    business_id uuid references businesses(id) on delete set null,
    payment_id uuid unique references payments(id) on delete set null,
    number text not null unique,
    data jsonb not null,
    total int not null,
    created_at timestamptz not null default now()
);
create index idx_platform_invoices_business on platform_invoices (business_id, created_at desc);

-- Autopay through Razorpay Subscriptions.
alter table subscriptions add column razorpay_subscription_id text not null default '';
alter table subscriptions add column autopay text not null default '';      -- '' | pending | active | halted | cancelled
alter table subscriptions add column autopay_plan text not null default ''; -- plan code the mandate renews
alter table subscriptions add column overage_billed_at timestamptz;          -- overage added to the next charge
create index idx_subscriptions_rzp on subscriptions (razorpay_subscription_id) where razorpay_subscription_id <> '';
create table razorpay_plans (
    plan_code text not null,
    amount int not null,
    razorpay_plan_id text not null,
    primary key (plan_code, amount)
);
-- one payments row per Razorpay payment: autopay charges are booked by
-- webhook and by the checkout verify, whichever lands first
create unique index payments_rzp_payment_key on payments (razorpay_payment_id) where razorpay_payment_id <> '';

-- Browsers that receive the owner's alerts (Web Push).
create table push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    created_at timestamptz not null default now()
);
create index idx_push_business on push_subscriptions (business_id);

-- A buyer who verified their number at checkout: one reminder if they do not
-- order. reminded_at survives a re-verify, so it is at most one a week.
create table checkout_sessions (
    business_id uuid not null references businesses(id) on delete cascade,
    phone text not null,
    items jsonb not null default '[]'::jsonb,
    link_token text not null default '',
    verified_at timestamptz not null default now(),
    reminded_at timestamptz,
    primary key (business_id, phone)
);
create index idx_checkout_sessions_due on checkout_sessions (verified_at);

-- The away message goes out at most once per chat in 12 hours.
alter table conversations add column away_sent_at timestamptz;

-- Model tokens per seller per IST day per model, for the admin's cost view.
create table ai_usage (
    business_id uuid not null references businesses(id) on delete cascade,
    day date not null,
    model text not null,
    calls int not null default 0,
    input_tokens bigint not null default 0,
    output_tokens bigint not null default 0,
    primary key (business_id, day, model)
);
create index idx_ai_usage_day on ai_usage (day);

-- What admins did to a business (plan changes, suspensions, support views).
create table admin_audit (
    id uuid primary key default gen_random_uuid(),
    admin_id uuid references admins(id) on delete set null,
    business_id uuid references businesses(id) on delete set null,
    action text not null,
    detail jsonb not null default '{}'::jsonb,
    ip text not null default '',
    created_at timestamptz not null default now()
);
create index idx_admin_audit_business on admin_audit (business_id, created_at desc);

-- Abandoned-checkout reminders are a paid capability, like broadcasts.
update plans set capabilities = capabilities || '["recovery"]'::jsonb
    where code in ('growth', 'pro') and not capabilities ? 'recovery';
