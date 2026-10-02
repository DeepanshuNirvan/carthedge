-- DM sales assistant. The AI answers buyers in their DMs, keeps the order being
-- built on the conversation, and hands the seller a draft (or places the order
-- when the seller allows it). Everything here is additive with defaults.

-- Seller controls: answer DMs automatically (on by default), place orders
-- without the seller's tap (off by default), and free-text facts the assistant
-- may quote (delivery time, exchange policy, sizing).
alter table businesses add column ai_auto_reply boolean not null default true;
alter table businesses add column ai_auto_order boolean not null default false;
alter table businesses add column ai_notes text not null default '';

-- stage: open | confirming (summary shown, waiting for yes) | awaiting_seller
-- (draft made, seller to confirm) | handoff (seller needed, AI paused).
-- summary_hash pins the cart the buyer was shown, so a "yes" can only confirm
-- exactly that. cutoff_at marks the last placed order: the assistant reads only
-- what came after it, which is what stops a repeat order re-adding old items.
alter table conversations add column stage text not null default 'open';
alter table conversations add column cart jsonb not null default '{}'::jsonb;
alter table conversations add column summary_hash text not null default '';
alter table conversations add column cutoff_at timestamptz;
alter table conversations add column ai_paused_until timestamptz;
alter table conversations add column nudged_at timestamptz;

-- who wrote an outbound line: the assistant, the seller, or a system notice
-- (order confirmations). Inbound lines are the buyer's.
alter table conversation_messages add column author text not null default '';
update conversation_messages set author = case when direction = 'in' then 'buyer' else 'seller' end;

-- an order placed from a chat is answered on that chat
alter table orders add column conversation_id uuid references conversations(id) on delete set null;
