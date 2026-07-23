-- Plan tiers were marketing copy only: every seller could reach every feature.
-- capabilities is the machine-readable entitlement list the API enforces;
-- features stays the prose bullet list the pricing page renders.
alter table plans add column capabilities jsonb not null default '[]';

update plans set capabilities = '["ai","broadcasts","offers","invoices"]' where code = 'growth';
update plans set capabilities = '["ai","aiReply","broadcasts","offers","invoices","courier","waitlist"]' where code = 'pro';

-- Real inventory: -1 keeps a product untracked (the in_stock toggle alone),
-- 0 or more is a counted quantity that orders draw down.
alter table products add column stock_qty int not null default -1;
alter table product_variants add column stock_qty int not null default -1;

-- Free delivery above a cart value — standard storefront lever, 0 = off.
alter table businesses add column free_shipping_above int not null default 0;

create index idx_products_low_stock on products (business_id, stock_qty)
    where active and stock_qty >= 0;
