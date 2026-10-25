-- A seller's own WhatsApp number can be billed two ways:
--   ''        the seller's WhatsApp account pays Meta (their card), sent through Meta's Cloud API
--   'partner' CartHedge pays through its Solution Partner's credit line (YCloud), sent through the partner
-- phone is the number in E.164; the partner addresses senders by number, not id.
alter table channel_connections add column billing text not null default '';
alter table channel_connections add column phone text not null default '';
