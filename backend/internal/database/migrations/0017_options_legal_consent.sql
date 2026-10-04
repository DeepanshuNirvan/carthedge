-- Product option groups (Size × Colour, Storage, Finish…) with photos per
-- choice, the legal facts a listing shows (MRP, country of origin, maker), and
-- WhatsApp marketing consent with its proof.
--
-- Everything is additive with defaults: the running app keeps working on this
-- schema and simply ignores what it does not know about.

-- [{name, values: [{name, images: [url]}]}]; '[]' = no groups (a product
-- without choices, or one whose variants predate groups — read as one group)
alter table products add column options jsonb not null default '[]'::jsonb;
alter table products add column mrp int not null default 0;              -- paise, 0 = not stated
alter table products add column origin_country text not null default '';
alter table products add column manufacturer text not null default '';   -- name and address of the maker, packer or importer

-- the variant's value in each group, in the product's group order
alter table product_variants add column options jsonb not null default '[]'::jsonb;
alter table product_variants add column position int not null default 0;

-- Marketing consent. The customer row holds the current answer; every change
-- is also appended to marketing_consents with what the buyer saw or sent,
-- where and when — the record a seller needs if a buyer or Meta asks.
alter table customers add column marketing_opt_in boolean not null default false;
alter table customers add column marketing_updated_at timestamptz;

create table marketing_consents (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    customer_id uuid references customers(id) on delete set null,
    phone text not null,
    opt_in boolean not null,
    source text not null,                  -- checkout | order_page | whatsapp | unsubscribe_link | seller
    wording text not null default '',      -- the exact sentence the buyer agreed to, or the message they sent
    order_id uuid references orders(id) on delete set null,
    ip text not null default '',
    user_agent text not null default '',
    created_at timestamptz not null default now()
);
create index idx_marketing_consents_customer on marketing_consents (business_id, phone, created_at desc);
create index idx_marketing_consents_order on marketing_consents (order_id) where order_id is not null;

-- Terms a seller accepted inside the app (the broadcast rules today), kept
-- append-only: which document, which version, when and from where.
create table terms_acceptances (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    document text not null,                -- broadcasts
    version text not null,
    ip text not null default '',
    user_agent text not null default '',
    accepted_at timestamptz not null default now()
);
create index idx_terms_acceptances_business on terms_acceptances (business_id, document, accepted_at desc);
