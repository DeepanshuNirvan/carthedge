-- Instagram long-lived tokens expire 60 days after they are issued. Nothing
-- refreshed them, so a seller's DM capture went silent two months after they
-- connected, with no error anywhere. The sweep in messaging.Service renews on
-- this column.
alter table channel_connections add column expires_at timestamptz;
update channel_connections set expires_at = connected_at + interval '60 days' where channel = 'instagram';

-- Meta retries a webhook until it gets a 200, so the same buyer message can
-- arrive several times. Message ids are globally unique across WhatsApp
-- (wamid.*) and Instagram (mid.*), so one index covers both channels.
create unique index idx_convmsg_external on conversation_messages (external_id) where external_id <> '';
