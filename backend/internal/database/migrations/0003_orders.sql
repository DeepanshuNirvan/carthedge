-- Buyer ledger, auto-built from orders. One row per phone per business.
create table customers (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    name text not null,
    phone text not null,
    email text not null default '',
    segment text not null default 'retail', -- retail | reseller
    last_address jsonb not null default '{}',
    orders_count int not null default 0,
    total_spent bigint not null default 0,  -- paise, delivered value
    cod_refusals int not null default 0,
    risk_flagged boolean not null default false,
    last_order_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (business_id, phone)
);

-- Shareable checkout links: /p/{businessCode}/{token}
create table order_links (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    token text not null unique,
    kind text not null,                -- product | cart | custom
    title text not null default '',
    items jsonb not null default '[]', -- [{productId, variantId, qty}]
    amount int not null default 0,     -- paise, custom links only
    active boolean not null default true,
    clicks int not null default 0,
    orders_count int not null default 0,
    expires_at timestamptz,
    created_at timestamptz not null default now()
);
create index idx_links_business on order_links(business_id);

create table orders (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    order_code text not null unique,
    link_id uuid references order_links(id),
    customer_id uuid not null references customers(id),
    items jsonb not null,              -- [{productId, name, variant, qty, price}]
    subtotal int not null,
    discount int not null default 0,
    shipping int not null default 0,
    total int not null,
    offer_code text not null default '',
    payment_method text not null,      -- prepaid | cod
    payment_status text not null default 'pending', -- pending | paid | token_paid | refunded | failed
    token_amount int not null default 0,
    status text not null default 'new', -- new | confirmed | packed | shipped | delivered | rto | cancelled
    cod_confirmed_at timestamptz,
    address jsonb not null,
    courier_name text not null default '',
    courier_tracking_id text not null default '',
    courier_status text not null default '',
    source text not null default 'link', -- link | manual | ai
    notes text not null default '',
    risk_flagged boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index idx_orders_board on orders(business_id, status, created_at desc);
create index idx_orders_customer on orders(customer_id);

create table order_events (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references orders(id) on delete cascade,
    status text not null,
    note text not null default '',
    created_at timestamptz not null default now()
);
create index idx_events_order on order_events(order_id);

create table payments (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    order_id uuid references orders(id),
    kind text not null,                -- order | token | subscription
    razorpay_order_id text not null default '',
    razorpay_payment_id text not null default '',
    amount int not null,               -- paise
    status text not null default 'created', -- created | paid | failed
    notes jsonb not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index idx_payments_rzp on payments(razorpay_order_id);
create index idx_payments_business on payments(business_id);
