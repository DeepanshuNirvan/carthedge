-- Services. A business may sell things it ships, things it does (a trip, an
-- event, a repair, a class), or both. The catalog stays one table: kind says
-- what an item is. A service is not stocked, shipped or paid for at checkout —
-- a chat about it ends in an enquiry the owner follows up. Everything here is
-- additive, and every default is the behaviour before this migration.

-- what the business sells: wording in the app and the assistant, nothing else
alter table businesses add column sells text not null default 'products'
    check (sells in ('products', 'services', 'both'));

alter table products add column kind text not null default 'product'
    check (kind in ('product', 'service'));
-- fixed: price is the price. from: price is where it starts. quote: price is 0
-- and the owner shares it per enquiry.
alter table products add column price_kind text not null default 'fixed'
    check (price_kind in ('fixed', 'from', 'quote'));
alter table products add column price_unit text not null default '';   -- "per person", "per day", "per km"
-- [{label, required}]: what the assistant finds out before handing the enquiry
-- over. The seller writes the labels, so no trade is built into the schema.
alter table products add column ask jsonb not null default '[]';

create table enquiries (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    conversation_id uuid references conversations(id) on delete set null,
    items jsonb not null default '[]',      -- [{productId, name, option, qty}]
    name text not null default '',
    phone text not null default '',
    answers jsonb not null default '[]',    -- [{label, value}], in the buyer's words
    status text not null default 'new'
        check (status in ('new', 'contacted', 'quoted', 'won', 'lost')),
    quoted_amount int not null default 0 check (quoted_amount >= 0),  -- paise
    quote_note text not null default '',    -- what the quoted price covers, sent with it
    seller_notes text not null default '',  -- private
    source text not null default 'manual',  -- instagram | whatsapp | manual
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index idx_enquiries_board on enquiries(business_id, status, created_at desc);
create index idx_enquiries_phone on enquiries(business_id, phone);
-- a chat's open enquiry is looked up by conversation (enquiry.Capture keeps
-- one per chat session; one turn per chat runs at a time)
create index idx_enquiries_conversation on enquiries(conversation_id, created_at desc);
