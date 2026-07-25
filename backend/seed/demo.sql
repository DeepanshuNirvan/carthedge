-- Demo seed for local/dev. Idempotent — safe to run repeatedly.
-- Run (Postgres from docker-compose):
--   docker compose up -d
--   docker exec -i carthedge-postgres-1 psql -U postgres -d carthedge < backend/seed/demo.sql
-- Logins:  seller demo@carthedge.in / Demo@123   ·   admin admin@carthedge.in / Admin@123
-- Product images point at the frontend's /public/demo/*.webp assets (served by the web app).

-- Plans (also seeded by migration 0005; kept here so this file stands alone).
insert into plans (code, name, price_monthly, order_quota, per_order_fee, features, capabilities) values
('starter','Starter',49900,100,300,'["Order links","Order board","COD confirmation flow","Customer ledger","WhatsApp status updates"]','[]'),
('growth','Growth',99900,500,250,'["Everything in Starter","AI order capture from DMs","Broadcast drops","Offers & reseller pricing","Invoices & reports"]','["ai","broadcasts","offers","invoices"]'),
('pro','Pro',199900,2000,200,'["Everything in Growth","Courier handoff (Shiprocket)","Back-in-stock waitlists","AI reply assistant","Priority support"]','["ai","aiReply","broadcasts","offers","invoices","courier","waitlist"]')
on conflict (code) do nothing;

-- Platform admin.
insert into admins (name, email, password_hash)
values ('CartHedge Admin','admin@carthedge.in', crypt('Admin@123', gen_salt('bf')))
on conflict (email) do update set password_hash = excluded.password_hash;

-- Demo seller.
insert into businesses (id, code, name, owner_name, email, phone, password_hash, whatsapp, instagram,
                        address, city, state, pincode, upi_id, shipping_fee, cod_token_amount, baseline_rto_percent)
values ('10000000-0000-0000-0000-000000000001','demo-store','Demo Store','Demo Owner','demo@carthedge.in','9876543210',
        crypt('Demo@123', gen_salt('bf')),'9876543210','demostore.in','12 MG Road','Jaipur','Rajasthan','302001',
        'demo@upi',5000,5000,30)
on conflict (id) do update set
  password_hash = excluded.password_hash, code = excluded.code, name = excluded.name, email = excluded.email,
  owner_name = excluded.owner_name, phone = excluded.phone, whatsapp = excluded.whatsapp, instagram = excluded.instagram,
  address = excluded.address, city = excluded.city, state = excluded.state, pincode = excluded.pincode,
  upi_id = excluded.upi_id, shipping_fee = excluded.shipping_fee, cod_token_amount = excluded.cod_token_amount,
  updated_at = now();

-- 15-day trial on the Pro plan.
insert into subscriptions (business_id, plan_id, status, ends_at)
select '10000000-0000-0000-0000-000000000001', id, 'trial', now() + interval '15 days' from plans where code='pro'
on conflict (business_id) do update set plan_id = excluded.plan_id, status = 'trial',
  ends_at = now() + interval '15 days', updated_at = now();

-- Catalog: wipe the demo seller's products (cascades variants/waitlist) and reinsert with images.
delete from products where business_id = '10000000-0000-0000-0000-000000000001';

insert into products (id, business_id, name, description, category, price, reseller_price, compare_price, sku, images, trending, stock_qty) values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Rose Chikankari Kurti','Hand-embroidered lucknowi chikankari on soft cotton.','Kurtis',149900,124900,199900,'KUR-ROSE','["/demo/kurti.webp","/demo/juttis.webp"]',true,40),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Oxidised Silver Jhumkas','German-silver oxidised jhumkas with matching studs.','Jewellery',89900,74900,119900,'JHU-OX','["/demo/jhumka.webp"]',true,60),
('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','Emerald Embroidered Juttis','Handcrafted velvet juttis with a cushioned sole.','Footwear',169900,149900,219900,'JUT-EMR','["/demo/juttis.webp"]',false,25),
('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','Block-print Cushion Cover','Jaipuri hand block print, set of two covers.','Home Decor',129900,109900,159900,'CUS-BLK','["/demo/cushion.webp"]',false,15);

insert into product_variants (product_id, name) values
('20000000-0000-0000-0000-000000000001','S'),
('20000000-0000-0000-0000-000000000001','M'),
('20000000-0000-0000-0000-000000000001','L'),
('20000000-0000-0000-0000-000000000001','XL'),
('20000000-0000-0000-0000-000000000003','UK4'),
('20000000-0000-0000-0000-000000000003','UK5'),
('20000000-0000-0000-0000-000000000003','UK6');

-- One live offer.
insert into offers (business_id, code, kind, value, min_amount) values
('10000000-0000-0000-0000-000000000001','WELCOME10','percent',10,50000)
on conflict (business_id, code) do nothing;
