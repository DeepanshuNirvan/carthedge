-- Marketing contact form used to be a mailto: link, so an enquiry only landed
-- if the visitor had a mail client. It is a sales lead — it belongs in the DB
-- and in the admin console next to plan requests.
create table contact_messages (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    business text not null default '',
    email text not null,
    phone text not null default '',
    message text not null,
    status text not null default 'open', -- open | contacted | closed
    admin_note text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index idx_contact_messages_status on contact_messages(status, created_at desc);
