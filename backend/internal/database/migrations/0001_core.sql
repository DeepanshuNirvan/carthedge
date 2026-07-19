create extension if not exists pgcrypto;

-- Onboarded sellers. Each business gets a unique code used in every buyer link.
create table businesses (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    name text not null,
    owner_name text not null,
    email text not null unique,
    phone text not null,
    password_hash text not null,
    whatsapp text not null default '',
    instagram text not null default '',
    address text not null default '',
    city text not null default '',
    state text not null default '',
    pincode text not null default '',
    gstin text not null default '',
    upi_id text not null default '',
    razorpay_key_id text not null default '',
    razorpay_key_secret text not null default '', -- AES-GCM encrypted
    logo_url text not null default '',
    shipping_fee int not null default 0,
    cod_enabled boolean not null default true,
    cod_token_amount int not null default 0,
    baseline_rto_percent int not null default 30,
    status text not null default 'active', -- active | suspended
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table plans (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    name text not null,
    price_monthly int not null,        -- paise
    order_quota int not null,          -- included orders per month
    per_order_fee int not null,        -- paise, charged above quota
    features jsonb not null default '[]',
    is_custom boolean not null default false,
    active boolean not null default true,
    created_at timestamptz not null default now()
);

create table subscriptions (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null unique references businesses(id) on delete cascade,
    plan_id uuid not null references plans(id),
    status text not null default 'trial', -- trial | active | cancelled | expired
    custom_price int,                     -- paise, overrides plan price when set
    starts_at timestamptz not null default now(),
    ends_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
