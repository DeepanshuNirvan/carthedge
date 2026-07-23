-- Background job state: COD nudge and subscription reminders must fire once.
alter table orders add column cod_reminder_at timestamptz;
alter table subscriptions add column reminder_sent_at timestamptz;

create index idx_orders_cod_unconfirmed on orders (created_at)
    where payment_method = 'cod' and cod_confirmed_at is null and cod_reminder_at is null;

-- board filters by source and date range
create index idx_orders_source on orders (business_id, source, created_at desc);
