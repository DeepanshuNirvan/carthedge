-- Instagram Login hands out two ids for one account: the app-scoped id from the
-- token exchange and /me `id`, and the professional account id from /me
-- `user_id`. Webhooks route on the professional id, so only that one matched
-- a seller — and which one appears in `entry.id` has moved between Graph
-- versions. Keep both and route on either.
alter table channel_connections add column alt_external_id text not null default '';
create index idx_channel_alt_external on channel_connections (channel, alt_external_id) where alt_external_id <> '';

-- Who wrote an outbound message: '' (buyer, inbound), 'seller' (typed in
-- CartHedge or in the Instagram/WhatsApp app itself), 'ai' (auto-reply),
-- 'system' (order link sent on confirm). A recent 'seller' message means a
-- human has taken the chat over, and auto-reply stands down.
alter table conversation_messages add column author text not null default '';

-- DM automation is opt-in per seller. Auto-reply answers buyer questions from
-- the catalog; auto-confirm turns a complete, high-confidence draft into an
-- order without a tap. Both default off.
alter table businesses add column dm_auto_reply boolean not null default false;
alter table businesses add column dm_auto_confirm boolean not null default false;

-- A failed AI parse (provider outage, rate limit) used to be dropped for good.
-- Retry a bounded number of times, backing off between attempts.
alter table conversations add column parse_attempts int not null default 0;
alter table conversations add column parse_after timestamptz;

-- Meta's data-deletion callback must hand back a confirmation code the user
-- can look up later. Kept as an audit trail of what was erased and when.
create table data_deletion_requests (
    code text primary key,
    channel text not null,
    external_id text not null,
    business_id uuid,
    status text not null default 'completed',
    created_at timestamptz not null default now()
);
