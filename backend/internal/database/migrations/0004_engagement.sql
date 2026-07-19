create table broadcasts (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    name text not null,
    message text not null,
    segment text not null default 'all', -- all | retail | reseller | repeat
    status text not null default 'draft', -- draft | scheduled | sending | sent
    scheduled_at timestamptz,
    sent_count int not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index idx_broadcasts_business on broadcasts(business_id);

create table invoices (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    order_id uuid not null unique references orders(id),
    invoice_number text not null,
    subtotal int not null,
    discount int not null default 0,
    shipping int not null default 0,
    gst_rate int not null default 0,   -- percent, GST-inclusive pricing
    gst_amount int not null default 0,
    total int not null,
    created_at timestamptz not null default now(),
    unique (business_id, invoice_number)
);

-- AI-parsed DM conversations awaiting one-tap confirm.
create table ai_drafts (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    conversation text not null,
    draft jsonb not null,
    confidence int not null default 0,
    status text not null default 'pending', -- pending | confirmed | discarded
    order_id uuid references orders(id),
    created_at timestamptz not null default now()
);
create index idx_drafts_business on ai_drafts(business_id, status);
