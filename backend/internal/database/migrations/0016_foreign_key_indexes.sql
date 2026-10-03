-- Postgres does not index a foreign key column by itself. These are read on
-- hot paths (refunds look up an order's payment, link stats count orders per
-- link, the AI desk finds drafts per chat, every invoice view lists its credit
-- notes) or scanned row by row when a parent row is deleted (account purge).
-- Small admin-only tables (plan_requests, subscriptions.plan_id, admin_audit)
-- are left as they are.
create index if not exists idx_payments_order on payments (order_id) where order_id is not null;
create index if not exists idx_orders_link on orders (link_id) where link_id is not null;
create index if not exists idx_orders_conversation on orders (conversation_id) where conversation_id is not null;
create index if not exists idx_ai_drafts_conversation on ai_drafts (conversation_id) where conversation_id is not null;
create index if not exists idx_ai_drafts_order on ai_drafts (order_id) where order_id is not null;
create index if not exists idx_credit_notes_invoice on credit_notes (invoice_id);
create index if not exists idx_credit_notes_refund on credit_notes (refund_id) where refund_id is not null;
create index if not exists idx_refunds_return on refunds (return_id) where return_id is not null;
create index if not exists idx_returns_replacement on return_requests (replacement_order_id) where replacement_order_id is not null;
create index if not exists idx_waitlist_business on waitlist (business_id);
