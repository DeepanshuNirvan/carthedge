-- Automated DM capture from Instagram + WhatsApp. Inbound messages land here,
-- get batched into one AI parse per conversation, and become an ai_draft the
-- seller approves. Manual paste (ai_drafts.source='manual') still works too.

create table channel_connections (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    channel text not null,                     -- whatsapp | instagram
    external_id text not null,                 -- WA phone_number_id / IG account id: webhook routing key
    display_name text not null default '',
    access_token text not null default '',     -- AES-GCM encrypted (same ENCRYPTION_KEY as Razorpay keys)
    status text not null default 'connected',  -- connected | error | disconnected
    connected_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (business_id, channel),
    unique (channel, external_id)
);

create table conversations (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    channel text not null,
    contact_id text not null,                  -- WA phone / IG-scoped sender id
    contact_name text not null default '',
    contact_handle text not null default '',
    last_message_at timestamptz not null default now(),
    last_inbound_at timestamptz,
    unread int not null default 0,
    parse_pending boolean not null default false,
    draft_id uuid,                             -- latest AI draft for this thread
    status text not null default 'open',       -- open | archived
    created_at timestamptz not null default now(),
    unique (business_id, channel, contact_id)
);
create index idx_conversations_business on conversations(business_id, last_message_at desc);
create index idx_conversations_parse on conversations(last_inbound_at) where parse_pending;

create table conversation_messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references conversations(id) on delete cascade,
    direction text not null,                   -- in | out
    external_id text not null default '',
    body text not null default '',
    created_at timestamptz not null default now()
);
create index idx_convmsg_conversation on conversation_messages(conversation_id, created_at);

-- Trace a draft back to the DM it came from.
alter table ai_drafts add column conversation_id uuid references conversations(id) on delete set null;
alter table ai_drafts add column source text not null default 'manual'; -- manual | whatsapp | instagram
