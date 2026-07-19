-- Platform admin: CartHedge staff accounts, site content and custom-plan pipeline.

create table admins (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text not null unique,
    password_hash text not null,
    created_at timestamptz not null default now()
);

-- Editable CartHedge website content (contact info, socials, banners).
create table site_settings (
    key text primary key,
    value jsonb not null,
    updated_at timestamptz not null default now()
);

-- Custom-plan enquiries from sellers, worked by the admin team.
create table plan_requests (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    message text not null,
    expected_orders int not null default 0,
    status text not null default 'open', -- open | contacted | closed
    admin_note text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index idx_plan_requests_status on plan_requests(status, created_at desc);

-- Default admin login: admin@carthedge.in / Admin@123 — change after first login.
insert into admins (name, email, password_hash)
values ('CartHedge Admin', 'admin@carthedge.in', crypt('Admin@123', gen_salt('bf')));

insert into site_settings (key, value) values
('contact', '{"email":"hello@carthedge.in","phone":"","address":"","supportHours":"Mon-Sat 10am-7pm IST"}'),
('social', '{"instagram":"","twitter":"","linkedin":"","youtube":""}'),
('site', '{"tagline":"The AI order desk for Instagram & WhatsApp sellers","announcement":""}');
