-- Two things this closes:
--
-- 1. Trial farming and duplicate accounts. Email was the only unique column, so
--    the same person could take the same mobile, WhatsApp and Instagram handle
--    into any number of 15-day trials by varying the email (and Gmail aliases
--    made even that free). Identity now has four unique keys, and the mobile is
--    OTP-verified at signup before a trial is issued.
-- 2. Sellers with no payment gateway. A small seller usually has a UPI ID and
--    nothing else. `payment_ref` records the UTR the buyer submits so the seller
--    can verify a direct UPI transfer from the order card — money still goes
--    seller-to-seller, never through CartHedge.

-- Canonical form of the email, used only for duplicate detection. The address
-- the seller typed stays in `email` and is what they log in with.
alter table businesses add column email_normalized text not null default '';
update businesses set email_normalized = lower(email);

create unique index businesses_email_normalized_key on businesses (email_normalized);
create unique index businesses_phone_key on businesses (phone);
create unique index businesses_whatsapp_key on businesses (whatsapp) where whatsapp <> '';
create unique index businesses_instagram_key on businesses (lower(instagram)) where instagram <> '';

-- Signup-time proof that the mobile belongs to whoever is claiming the trial.
alter table businesses add column phone_verified_at timestamptz;
update businesses set phone_verified_at = created_at;

-- UPI reference (UTR) the buyer submits when they paid the seller's VPA
-- directly; the seller approves or rejects it from the order card.
alter table orders add column payment_ref text not null default '';
