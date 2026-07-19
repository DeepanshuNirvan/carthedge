create table products (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    name text not null,
    description text not null default '',
    category text not null default '',
    price int not null,                -- paise
    reseller_price int not null default 0,
    compare_price int not null default 0,
    sku text not null default '',
    images jsonb not null default '[]',
    in_stock boolean not null default true,
    trending boolean not null default false,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index idx_products_business on products(business_id) where active;

create table product_variants (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references products(id) on delete cascade,
    name text not null,                -- e.g. "M / Pink"
    price int not null default 0,      -- 0 = inherit product price
    sku text not null default '',
    in_stock boolean not null default true
);
create index idx_variants_product on product_variants(product_id);

create table offers (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    code text not null,
    kind text not null,                -- percent | flat
    value int not null,                -- percent (1-100) or paise
    min_amount int not null default 0, -- paise
    product_ids jsonb,                 -- null = all products
    active boolean not null default true,
    expires_at timestamptz,
    created_at timestamptz not null default now(),
    unique (business_id, code)
);

create table waitlist (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    product_id uuid not null references products(id) on delete cascade,
    phone text not null,
    notified_at timestamptz,
    created_at timestamptz not null default now(),
    unique (product_id, phone)
);
