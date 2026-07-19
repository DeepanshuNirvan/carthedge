-- Seed: plans + demo business with dummy data. Login: demo@carthedge.in / Demo@123

insert into plans (code, name, price_monthly, order_quota, per_order_fee, features) values
('starter', 'Starter', 49900, 100, 300, '["Order links","Order board","COD confirmation flow","Customer ledger","WhatsApp status updates"]'),
('growth', 'Growth', 99900, 500, 250, '["Everything in Starter","AI order capture from DMs","Broadcast drops","Offers & reseller pricing","Invoices & reports"]'),
('pro', 'Pro', 199900, 2000, 200, '["Everything in Growth","Courier handoff (Shiprocket)","Back-in-stock waitlists","AI reply assistant","Priority support"]');

insert into businesses (id, code, name, owner_name, email, phone, password_hash, whatsapp, instagram, address, city, state, pincode, upi_id, shipping_fee, cod_token_amount)
values ('10000000-0000-0000-0000-000000000001', 'demo-store', 'Demo Store', 'Demo Owner', 'demo@carthedge.in', '9876543210',
        crypt('Demo@123', gen_salt('bf')), '9876543210', 'demostore.in', '12 MG Road', 'Jaipur', 'Rajasthan', '302001', 'demo@upi', 5000, 5000);

insert into subscriptions (business_id, plan_id, status, ends_at)
select '10000000-0000-0000-0000-000000000001', id, 'trial', now() + interval '15 days' from plans where code = 'pro';

insert into products (id, business_id, name, description, category, price, reseller_price, compare_price, trending) values
('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Pink Chikankari Kurti', 'Hand-embroidered lucknowi chikankari, soft cotton', 'Kurtis', 89900, 74900, 129900, true),
('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Oxidised Jhumka Set', 'German silver oxidised jhumkas with studs', 'Jewellery', 34900, 27900, 49900, false),
('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Banarasi Silk Dupatta', 'Pure banarasi weave, zari border', 'Dupattas', 64900, 54900, 89900, true),
('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Block Print Bedsheet', 'Jaipuri hand block print, king size, 2 pillow covers', 'Home Decor', 119900, 99900, 159900, false);

insert into product_variants (product_id, name) values
('20000000-0000-0000-0000-000000000001', 'S'),
('20000000-0000-0000-0000-000000000001', 'M'),
('20000000-0000-0000-0000-000000000001', 'L'),
('20000000-0000-0000-0000-000000000001', 'XL'),
('20000000-0000-0000-0000-000000000003', 'Red'),
('20000000-0000-0000-0000-000000000003', 'Green');

insert into offers (business_id, code, kind, value, min_amount) values
('10000000-0000-0000-0000-000000000001', 'WELCOME10', 'percent', 10, 50000);

insert into customers (id, business_id, name, phone, email, segment, last_address, orders_count, total_spent, cod_refusals, risk_flagged, last_order_at) values
('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Priya Sharma', '9812345670', 'priya@example.com', 'retail',
 '{"line":"45 Civil Lines","city":"Delhi","state":"Delhi","pincode":"110054"}', 2, 154800, 0, false, now() - interval '2 days'),
('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Anita Reseller', '9823456781', '', 'reseller',
 '{"line":"8 Market Road","city":"Surat","state":"Gujarat","pincode":"395003"}', 1, 74900, 0, false, now() - interval '5 days'),
('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Rahul Verma', '9834567892', '', 'retail',
 '{"line":"22 Station Road","city":"Patna","state":"Bihar","pincode":"800001"}', 1, 0, 1, true, now() - interval '8 days');

insert into order_links (id, business_id, token, kind, title, items) values
('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'demokurti99', 'product', 'Pink Chikankari Kurti',
 '[{"productId":"20000000-0000-0000-0000-000000000001","qty":1}]');

insert into orders (id, business_id, order_code, link_id, customer_id, items, subtotal, discount, shipping, total, payment_method, payment_status, status, cod_confirmed_at, address, source, created_at) values
('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'CH-DEMO0001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
 '[{"productId":"20000000-0000-0000-0000-000000000001","name":"Pink Chikankari Kurti","variant":"M","qty":1,"price":89900}]',
 89900, 0, 5000, 94900, 'prepaid', 'paid', 'delivered', null,
 '{"line":"45 Civil Lines","city":"Delhi","state":"Delhi","pincode":"110054"}', 'link', now() - interval '12 days'),
('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'CH-DEMO0002', null, '30000000-0000-0000-0000-000000000001',
 '[{"productId":"20000000-0000-0000-0000-000000000002","name":"Oxidised Jhumka Set","qty":1,"price":34900},{"productId":"20000000-0000-0000-0000-000000000003","name":"Banarasi Silk Dupatta","variant":"Red","qty":1,"price":64900}]',
 99800, 9980, 5000, 94820, 'cod', 'pending', 'shipped', now() - interval '2 days',
 '{"line":"45 Civil Lines","city":"Delhi","state":"Delhi","pincode":"110054"}', 'ai', now() - interval '3 days'),
('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'CH-DEMO0003', null, '30000000-0000-0000-0000-000000000002',
 '[{"productId":"20000000-0000-0000-0000-000000000001","name":"Pink Chikankari Kurti","variant":"L","qty":1,"price":74900}]',
 74900, 0, 5000, 79900, 'prepaid', 'paid', 'confirmed', null,
 '{"line":"8 Market Road","city":"Surat","state":"Gujarat","pincode":"395003"}', 'manual', now() - interval '1 day'),
('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'CH-DEMO0004', null, '30000000-0000-0000-0000-000000000003',
 '[{"productId":"20000000-0000-0000-0000-000000000004","name":"Block Print Bedsheet","qty":1,"price":119900}]',
 119900, 0, 5000, 124900, 'cod', 'pending', 'rto', null,
 '{"line":"22 Station Road","city":"Patna","state":"Bihar","pincode":"800001"}', 'link', now() - interval '8 days'),
('50000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'CH-DEMO0005', null, '30000000-0000-0000-0000-000000000001',
 '[{"productId":"20000000-0000-0000-0000-000000000003","name":"Banarasi Silk Dupatta","variant":"Green","qty":1,"price":64900}]',
 64900, 0, 5000, 69900, 'cod', 'pending', 'new', null,
 '{"line":"45 Civil Lines","city":"Delhi","state":"Delhi","pincode":"110054"}', 'link', now() - interval '3 hours');

insert into order_events (order_id, status, note)
select id, status, 'seeded' from orders where business_id = '10000000-0000-0000-0000-000000000001';

insert into invoices (business_id, order_id, invoice_number, subtotal, discount, shipping, gst_rate, gst_amount, total)
values ('10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'INV-DEMOSTORE-00001', 89900, 0, 5000, 5, 4519, 94900);

insert into ai_drafts (business_id, conversation, draft, confidence) values
('10000000-0000-0000-0000-000000000001',
 'buyer: pink wali kurti hai kya M size me? seller: haan hai. buyer: bhejo COD se, 45 Civil Lines Delhi 110054, Priya 9812345670',
 '{"items":[{"productId":"20000000-0000-0000-0000-000000000001","name":"Pink Chikankari Kurti","variant":"M","qty":1,"price":89900}],"customerName":"Priya","phone":"9812345670","address":{"line":"45 Civil Lines","city":"Delhi","state":"Delhi","pincode":"110054"},"paymentMethod":"cod","notes":"","confidence":92}',
 92);
