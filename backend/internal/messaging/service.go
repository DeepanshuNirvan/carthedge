package messaging

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"time"

	"carthedge/internal/ai"
	"carthedge/internal/events"
	"carthedge/internal/httpx"
	"carthedge/internal/order"
	"carthedge/internal/secure"

	"github.com/jackc/pgx/v5/pgxpool"
)

// lull is how long a conversation must be quiet before its new messages are
// batched into one AI parse — bounds LLM cost during a buyer's burst of DMs.
const lull = 12 * time.Second

// tokenSweep is how often connections are checked for an approaching expiry,
// and tokenRenewLead how far ahead of it a token is renewed. The lead is wide
// so a few sweeps can fail before a seller actually loses their DM capture.
const (
	tokenSweep     = 6 * time.Hour
	tokenRenewLead = 7 * 24 * time.Hour
)

// maxParseAttempts bounds retries of a failed AI parse (provider outage, rate
// limit). Each retry waits a minute longer than the last.
const maxParseAttempts = 3

// Auto-reply guard rails. A human reply from the seller pauses the bot for
// humanPause, and a single thread never gets more than autoReplyCap bot
// messages an hour — a looping buyer, or another bot, cannot run up a tab.
const (
	humanPause   = 30 * time.Minute
	autoReplyCap = 6
)

// autoConfirmConfidence is the floor for turning a draft into an order with no
// seller tap. Below it, the draft waits on the AI desk as before.
const autoConfirmConfidence = 90

// Features reports whether a business's plan includes a feature.
type Features func(ctx context.Context, bizID, feature string) bool

// OrderMessages renders the buyer-facing summary of a confirmed order.
type OrderMessages interface {
	ChatSummary(ctx context.Context, o *order.Order) string
}

type Deps struct {
	Pool     *pgxpool.Pool
	Client   *Client
	AI       *ai.Service
	Orders   OrderMessages
	Features Features
	Bus      *events.Bus
	Cipher   *secure.Cipher
	Log      *slog.Logger
}

// Service ingests Instagram/WhatsApp DMs, batches them into AI order drafts,
// and sends replies back on the seller's own channel token: the seller's own,
// the AI's when auto-reply is on, and the order link once an order is booked.
type Service struct {
	pool     *pgxpool.Pool
	client   *Client
	ai       *ai.Service
	orders   OrderMessages
	features Features
	bus      *events.Bus
	cipher   *secure.Cipher
	log      *slog.Logger
}

func NewService(d Deps) *Service {
	return &Service{pool: d.Pool, client: d.Client, ai: d.AI, orders: d.Orders, features: d.Features,
		bus: d.Bus, cipher: d.Cipher, log: d.Log}
}

// Start runs the debounce loop: quiet conversations with new messages get one
// AI parse and become a draft.
func (s *Service) Start(ctx context.Context) {
	go func() {
		t := time.NewTicker(5 * time.Second)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				s.ingestDue(ctx)
			}
		}
	}()
	go func() {
		t := time.NewTicker(tokenSweep)
		defer t.Stop()
		s.refreshExpiring(ctx) // catch up on anything that lapsed while down
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				s.refreshExpiring(ctx)
			}
		}
	}()
}

// alreadySeen reports whether this Meta message id is already in a thread.
// Meta message ids are globally unique, so no business scoping is needed.
func (s *Service) alreadySeen(ctx context.Context, messageID string) bool {
	if messageID == "" {
		return false
	}
	var exists bool
	if err := s.pool.QueryRow(ctx,
		`select exists(select 1 from conversation_messages where external_id=$1)`, messageID).Scan(&exists); err != nil {
		return false // a failed check must not drop a real message
	}
	return exists
}

// refreshExpiring renews Instagram tokens before their 60-day expiry. A failure
// flips the connection to 'error' so Settings can prompt the seller to
// reconnect, rather than the DMs just stopping.
func (s *Service) refreshExpiring(ctx context.Context) {
	rows, err := s.pool.Query(ctx, `select id, access_token from channel_connections
		where channel='instagram' and status='connected'
		  and expires_at is not null and expires_at < now() + make_interval(secs => $1)`,
		tokenRenewLead.Seconds())
	if err != nil {
		s.log.Error("token refresh query failed", "err", err)
		return
	}
	type due struct{ id, enc string }
	var pending []due
	for rows.Next() {
		var d due
		if rows.Scan(&d.id, &d.enc) == nil {
			pending = append(pending, d)
		}
	}
	rows.Close()

	for _, d := range pending {
		token, err := s.cipher.Decrypt(d.enc)
		if err != nil {
			s.log.Error("could not decrypt channel token", "connection", d.id, "err", err)
			continue
		}
		fresh, ttl, err := s.client.RefreshInstagram(ctx, token)
		if err != nil {
			s.log.Warn("instagram token refresh failed", "connection", d.id, "err", err)
			s.pool.Exec(ctx, `update channel_connections set status='error', updated_at=now() where id=$1`, d.id)
			continue
		}
		enc, err := s.cipher.Encrypt(fresh)
		if err != nil {
			continue
		}
		if _, err := s.pool.Exec(ctx, `update channel_connections
			set access_token=$2, expires_at=now()+make_interval(secs => $3), updated_at=now()
			where id=$1`, d.id, enc, ttl.Seconds()); err != nil {
			s.log.Error("could not store refreshed token", "connection", d.id, "err", err)
		}
	}
}

// ConnectChannel stores (or refreshes) a seller's channel token, encrypted.
func (s *Service) ConnectChannel(ctx context.Context, bizID string, c *Connection) error {
	if c.Channel != "whatsapp" && c.Channel != "instagram" {
		return errors.New("channel must be whatsapp or instagram")
	}
	if c.ExternalID == "" || c.Token == "" {
		return errors.New("account id and access token are required")
	}
	enc, err := s.cipher.Encrypt(c.Token)
	if err != nil {
		return err
	}
	var expiresAt any
	if c.ExpiresAt != nil {
		expiresAt = *c.ExpiresAt
	}
	// one Instagram/WhatsApp account feeds one business — otherwise a second
	// seller could connect someone else's account and read their buyers' DMs
	var owner string
	err = s.pool.QueryRow(ctx, `select business_id from channel_connections
		where channel=$1 and business_id<>$2 and (external_id=$3 or (alt_external_id<>'' and alt_external_id=$3))
		limit 1`, c.Channel, bizID, c.ExternalID).Scan(&owner)
	if err == nil {
		return errors.New("this account is already connected to another CartHedge business")
	}
	_, err = s.pool.Exec(ctx, `insert into channel_connections
		(business_id, channel, external_id, alt_external_id, display_name, access_token, status, expires_at)
		values ($1,$2,$3,$4,$5,$6,'connected',$7)
		on conflict (business_id, channel) do update set
		  external_id=excluded.external_id, alt_external_id=excluded.alt_external_id,
		  display_name=excluded.display_name, access_token=excluded.access_token, status='connected',
		  expires_at=excluded.expires_at, connected_at=now(), updated_at=now()`,
		bizID, c.Channel, c.ExternalID, c.AltID, c.DisplayName, enc, expiresAt)
	if err != nil {
		s.log.Error("store channel connection failed", "channel", c.Channel, "err", err)
		return errors.New("could not save the connection — try again")
	}
	return nil
}

func (s *Service) Disconnect(ctx context.Context, bizID, channel string) error {
	_, err := s.pool.Exec(ctx, `delete from channel_connections where business_id=$1 and channel=$2`, bizID, channel)
	return err
}

// Automation is a seller's DM automation settings.
type Automation struct {
	AutoReply   bool `json:"autoReply"`
	AutoConfirm bool `json:"autoConfirm"`
}

func (s *Service) Automation(ctx context.Context, bizID string) (Automation, error) {
	var a Automation
	err := s.pool.QueryRow(ctx, `select dm_auto_reply, dm_auto_confirm from businesses where id=$1`, bizID).
		Scan(&a.AutoReply, &a.AutoConfirm)
	return a, err
}

func (s *Service) SetAutomation(ctx context.Context, bizID string, a Automation) error {
	_, err := s.pool.Exec(ctx, `update businesses set dm_auto_reply=$2, dm_auto_confirm=$3, updated_at=now() where id=$1`,
		bizID, a.AutoReply, a.AutoConfirm)
	return err
}

func (s *Service) ListChannels(ctx context.Context, bizID string) ([]httpx.M, error) {
	rows, err := s.pool.Query(ctx, `select channel, external_id, display_name, status,
		to_char(connected_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		coalesce(to_char(expires_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '')
		from channel_connections where business_id=$1 order by channel`, bizID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []httpx.M{}
	for rows.Next() {
		var channel, externalID, name, status, connectedAt, expiresAt string
		if err := rows.Scan(&channel, &externalID, &name, &status, &connectedAt, &expiresAt); err != nil {
			return nil, err
		}
		out = append(out, httpx.M{"channel": channel, "externalId": externalID, "displayName": name,
			"status": status, "connectedAt": connectedAt, "expiresAt": expiresAt})
	}
	return out, rows.Err()
}

// connectionFor finds the business behind a webhook's account id. Instagram
// may name the account by either of its two ids.
func (s *Service) connectionFor(ctx context.Context, channel, accountID string) (bizID, tokenEnc string, err error) {
	err = s.pool.QueryRow(ctx, `select business_id, access_token from channel_connections
		where channel=$1 and status='connected'
		  and (external_id=$2 or (alt_external_id<>'' and alt_external_id=$2))
		limit 1`, channel, accountID).Scan(&bizID, &tokenEnc)
	return
}

// Receive routes each inbound DM to its business, appends it to the thread and
// marks the conversation for the next parse pass.
func (s *Service) Receive(ctx context.Context, body []byte) {
	for _, in := range parseWebhook(body) {
		// Meta retries until it gets a 200. Without this a retry re-bumps the
		// unread count and re-triggers the AI parse on the same message.
		if s.alreadySeen(ctx, in.MessageID) {
			continue
		}
		bizID, tokenEnc, err := s.connectionFor(ctx, in.Channel, in.ExternalID)
		if err != nil {
			s.log.Warn("inbound for unknown channel", "channel", in.Channel, "externalId", in.ExternalID)
			continue
		}
		if in.Outbound {
			s.receiveEcho(ctx, bizID, in)
			continue
		}
		var convID, name string
		err = s.pool.QueryRow(ctx, `insert into conversations
			(business_id, channel, contact_id, contact_name, last_message_at, last_inbound_at, unread, parse_pending)
			values ($1,$2,$3,$4,now(),now(),1,true)
			on conflict (business_id, channel, contact_id) do update set
			  last_message_at=now(), last_inbound_at=now(),
			  unread=conversations.unread+1, parse_pending=true, parse_attempts=0, parse_after=null,
			  contact_name=case when conversations.contact_name='' then excluded.contact_name else conversations.contact_name end
			returning id, contact_name`, bizID, in.Channel, in.ContactID, in.Name).Scan(&convID, &name)
		if err != nil {
			s.log.Error("upsert conversation failed", "err", err)
			continue
		}
		// Instagram webhooks carry only an opaque sender id — resolve the handle
		// once per conversation so the seller sees a name, not a number
		if name == "" {
			if token, err := s.cipher.Decrypt(tokenEnc); err == nil {
				if name = s.client.Profile(ctx, in.Channel, token, in.ContactID); name != "" {
					s.pool.Exec(ctx, `update conversations set contact_name=$2 where id=$1 and contact_name=''`, convID, name)
				}
			}
		}
		if _, err := s.pool.Exec(ctx, `insert into conversation_messages (conversation_id, direction, external_id, body)
			values ($1,'in',$2,$3) on conflict do nothing`, convID, in.MessageID, in.Text); err != nil {
			s.log.Error("insert message failed", "err", err)
			continue
		}
		s.bus.Publish(ctx, bizID, "messageReceived", httpx.M{
			"conversationId": convID, "channel": in.Channel, "contact": name, "preview": preview(in.Text)})
	}
}

// receiveEcho records a message the seller's own account sent. CartHedge's
// sends are already in the thread (written before the send, so a fast echo
// still finds them) and are only stamped with Meta's id; anything else was
// typed by the seller in the Instagram app and is kept as theirs.
func (s *Service) receiveEcho(ctx context.Context, bizID string, in Inbound) {
	var convID string
	err := s.pool.QueryRow(ctx, `insert into conversations (business_id, channel, contact_id, last_message_at)
		values ($1,$2,$3,now())
		on conflict (business_id, channel, contact_id) do update set last_message_at=now()
		returning id`, bizID, in.Channel, in.ContactID).Scan(&convID)
	if err != nil {
		s.log.Error("upsert conversation for echo failed", "err", err)
		return
	}
	ct, err := s.pool.Exec(ctx, `update conversation_messages set external_id=$3
		where id = (select id from conversation_messages
			where conversation_id=$1 and direction='out' and external_id='' and body=$2
			  and created_at > now() - interval '10 minutes'
			order by created_at desc limit 1)`, convID, in.Text, in.MessageID)
	if err == nil && ct.RowsAffected() == 1 {
		return
	}
	s.pool.Exec(ctx, `insert into conversation_messages (conversation_id, direction, external_id, body, author)
		values ($1,'out',$2,$3,'seller') on conflict do nothing`, convID, in.MessageID, in.Text)
}

type dueConversation struct{ id, biz, channel string }

// ingestDue parses every quiet, pending conversation, then runs whatever
// automation the seller turned on: auto-confirm a complete order, or answer
// the buyer.
func (s *Service) ingestDue(ctx context.Context) {
	rows, err := s.pool.Query(ctx, `select id, business_id, channel from conversations
		where parse_pending and last_inbound_at < now() - make_interval(secs => $1)
		  and (parse_after is null or parse_after < now())
		order by last_inbound_at limit 20`, lull.Seconds())
	if err != nil {
		return
	}
	var due []dueConversation
	for rows.Next() {
		var c dueConversation
		if rows.Scan(&c.id, &c.biz, &c.channel) == nil {
			due = append(due, c)
		}
	}
	rows.Close()

	for _, c := range due {
		s.process(ctx, c)
	}
}

func (s *Service) process(ctx context.Context, c dueConversation) {
	// clear the flag first, so a crash mid-parse cannot loop on one thread
	var attempts int
	if err := s.pool.QueryRow(ctx, `update conversations set parse_pending=false, parse_attempts=parse_attempts+1
		where id=$1 returning parse_attempts`, c.id).Scan(&attempts); err != nil {
		return
	}
	thread, err := s.thread(ctx, c.id)
	if err != nil || thread == "" {
		return
	}
	draft, err := s.ai.ParseConversation(ctx, c.biz, thread, c.channel, c.id)
	if err != nil {
		s.log.Warn("dm parse failed", "conversationId", c.id, "attempt", attempts, "err", err)
		if attempts < maxParseAttempts && !errors.Is(err, ai.ErrNotConfigured) {
			s.pool.Exec(ctx, `update conversations set parse_pending=true,
				parse_after=now() + make_interval(mins => $2) where id=$1 and not parse_pending`, c.id, attempts)
		}
		return
	}
	s.pool.Exec(ctx, `update conversations set draft_id=$2, parse_attempts=0, parse_after=null where id=$1`, c.id, draft.ID)
	// one live draft per thread: the newest read of the chat replaces older ones
	s.pool.Exec(ctx, `update ai_drafts set status='superseded'
		where conversation_id=$1 and status='pending' and id<>$2`, c.id, draft.ID)
	s.bus.Publish(ctx, c.biz, "draftReady", httpx.M{
		"conversationId": c.id, "draftId": draft.ID, "confidence": draft.Confidence})

	auto, err := s.Automation(ctx, c.biz)
	if err != nil {
		return
	}
	if auto.AutoConfirm && s.autoConfirm(ctx, c, draft) {
		return // the order message is the reply
	}
	if auto.AutoReply && s.features != nil && s.features(ctx, c.biz, "aiReply") {
		s.autoReply(ctx, c, thread, draft)
	}
}

// autoConfirm books a draft as an order with no seller tap — only when every
// field an order needs is present and matched to the catalog.
func (s *Service) autoConfirm(ctx context.Context, c dueConversation, d *ai.Draft) bool {
	if !autoConfirmable(d) {
		return false
	}
	// A thank-you after an order re-reads the same chat into the same order.
	// Booking it twice is far worse than leaving one draft for the seller.
	var recent bool
	s.pool.QueryRow(ctx, `select exists(select 1 from ai_drafts where conversation_id=$1 and status='confirmed'
		and created_at > now() - interval '24 hours')`, c.id).Scan(&recent)
	if recent {
		return false
	}
	o, err := s.ai.ConfirmDraft(ctx, c.biz, d.ID, nil)
	if err != nil {
		s.log.Info("auto-confirm skipped", "conversationId", c.id, "reason", err)
		return false
	}
	s.bus.Publish(ctx, c.biz, "orderAutoConfirmed", httpx.M{"conversationId": c.id, "orderId": o.ID, "code": o.Code})
	return true
}

func autoConfirmable(d *ai.Draft) bool {
	data := d.Data
	if d.Confidence < autoConfirmConfidence || len(data.Items) == 0 {
		return false
	}
	for _, it := range data.Items {
		if it.ProductID == "" || it.Qty < 1 {
			return false
		}
	}
	if strings.TrimSpace(data.CustomerName) == "" || strings.TrimSpace(data.Address.Line) == "" {
		return false
	}
	if _, ok := httpx.NormalizePhone(data.Phone); !ok {
		return false
	}
	return httpx.ValidPincode(data.Address.Pincode)
}

// autoReply answers the buyer when the seller has opted in, no human is
// active in the chat, and the model is sure of its answer.
func (s *Service) autoReply(ctx context.Context, c dueConversation, thread string, d *ai.Draft) {
	var lastDir string
	var humanRecent bool
	var botCount int
	err := s.pool.QueryRow(ctx, `select
		coalesce((select direction from conversation_messages where conversation_id=$1 order by created_at desc limit 1), ''),
		exists(select 1 from conversation_messages where conversation_id=$1 and author='seller'
			and created_at > now() - make_interval(secs => $2)),
		(select count(*) from conversation_messages where conversation_id=$1 and author='ai'
			and created_at > now() - interval '1 hour')`, c.id, humanPause.Seconds()).
		Scan(&lastDir, &humanRecent, &botCount)
	if err != nil || lastDir != "in" || humanRecent || botCount >= autoReplyCap {
		return
	}
	reply, err := s.ai.AutoReply(ctx, c.biz, thread, d)
	if err != nil {
		s.log.Warn("auto-reply failed", "conversationId", c.id, "err", err)
		return
	}
	if reply == "" {
		return // the model judged this one needs the seller
	}
	if err := s.send(ctx, c.biz, c.id, reply, "ai"); err != nil {
		s.log.Warn("auto-reply send failed", "conversationId", c.id, "err", err)
	}
}

// OrderConfirmed sends the buyer the booked order and its link in the same
// chat it came from: COD confirmation or payment, then tracking. Runs after
// the order is committed; a failed send never undoes the order.
func (s *Service) OrderConfirmed(ctx context.Context, bizID, conversationID string, o *order.Order) {
	if conversationID == "" || o == nil || s.orders == nil {
		return
	}
	if err := s.send(ctx, bizID, conversationID, s.orders.ChatSummary(ctx, o), "system"); err != nil {
		s.log.Warn("order message not sent in chat", "conversationId", conversationID, "order", o.Code, "err", err)
	}
}

func (s *Service) thread(ctx context.Context, convID string) (string, error) {
	// the newest 40 messages, then back into reading order. Taking the first 40
	// instead would mean a repeat buyer's thread is pinned to its oldest messages
	// forever, and their new order would never reach the parser.
	rows, err := s.pool.Query(ctx, `select direction, body from (
			select direction, body, created_at from conversation_messages
			where conversation_id=$1 order by created_at desc limit 40
		) recent order by created_at asc`, convID)
	if err != nil {
		return "", err
	}
	defer rows.Close()
	var b strings.Builder
	for rows.Next() {
		var dir, body string
		if err := rows.Scan(&dir, &body); err != nil {
			return "", err
		}
		who := "buyer"
		if dir == "out" {
			who = "seller"
		}
		b.WriteString(who + ": " + body + "\n")
	}
	return b.String(), rows.Err()
}

func (s *Service) ListConversations(ctx context.Context, bizID string, limit, offset int) ([]httpx.M, error) {
	rows, err := s.pool.Query(ctx, `select c.id, c.channel, c.contact_id, c.contact_name, c.unread, c.status,
		to_char(c.last_message_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), coalesce(c.draft_id::text,''),
		coalesce((select body from conversation_messages m where m.conversation_id=c.id order by created_at desc limit 1),'')
		from conversations c where c.business_id=$1 order by c.last_message_at desc limit $2 offset $3`, bizID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []httpx.M{}
	for rows.Next() {
		var id, channel, contactID, name, status, lastAt, draftID, last string
		var unread int
		if err := rows.Scan(&id, &channel, &contactID, &name, &unread, &status, &lastAt, &draftID, &last); err != nil {
			return nil, err
		}
		out = append(out, httpx.M{"id": id, "channel": channel, "contactId": contactID, "contactName": name,
			"unread": unread, "status": status, "lastMessageAt": lastAt, "draftId": draftID, "preview": preview(last)})
	}
	return out, rows.Err()
}

// Conversation returns the full thread (and clears the unread badge).
func (s *Service) Conversation(ctx context.Context, bizID, convID string) (httpx.M, error) {
	var channel, contactID, name, draftID string
	err := s.pool.QueryRow(ctx, `select channel, contact_id, contact_name, coalesce(draft_id::text,'')
		from conversations where id=$1 and business_id=$2`, convID, bizID).Scan(&channel, &contactID, &name, &draftID)
	if err != nil {
		return nil, errors.New("conversation not found")
	}
	s.pool.Exec(ctx, `update conversations set unread=0 where id=$1`, convID)

	// the newest 100, in reading order — the oldest 100 would hide a long
	// thread's latest messages from the seller
	rows, err := s.pool.Query(ctx, `select direction, body, author, at from (
			select direction, body, author, created_at,
				to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
			from conversation_messages where conversation_id=$1 order by created_at desc limit 100
		) recent order by created_at asc`, convID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	msgs := []httpx.M{}
	for rows.Next() {
		var dir, body, author, at string
		if err := rows.Scan(&dir, &body, &author, &at); err != nil {
			return nil, err
		}
		msgs = append(msgs, httpx.M{"direction": dir, "body": body, "author": author, "createdAt": at})
	}
	return httpx.M{"id": convID, "channel": channel, "contactId": contactID, "contactName": name,
		"draftId": draftID, "messages": msgs}, rows.Err()
}

// Reply sends the seller's message back on the buyer's channel and records it.
func (s *Service) Reply(ctx context.Context, bizID, convID, text string) error {
	return s.send(ctx, bizID, convID, text, "seller")
}

// maxMessageRunes keeps a reply inside the stricter of the two channels'
// limits (Instagram caps a text DM at 1,000 characters).
const maxMessageRunes = 1000

func (s *Service) send(ctx context.Context, bizID, convID, text, author string) error {
	text = strings.TrimSpace(text)
	if text == "" {
		return errors.New("message is empty")
	}
	if len([]rune(text)) > maxMessageRunes {
		return errors.New("message is too long — keep it under 1,000 characters")
	}
	var channel, contactID string
	if err := s.pool.QueryRow(ctx, `select channel, contact_id from conversations where id=$1 and business_id=$2`,
		convID, bizID).Scan(&channel, &contactID); err != nil {
		return errors.New("conversation not found")
	}
	var externalID, tokenEnc string
	if err := s.pool.QueryRow(ctx, `select external_id, access_token from channel_connections
		where business_id=$1 and channel=$2 and status='connected'`, bizID, channel).Scan(&externalID, &tokenEnc); err != nil {
		return errors.New(channel + " is not connected")
	}
	token, err := s.cipher.Decrypt(tokenEnc)
	if err != nil {
		return errors.New("channel token unavailable")
	}
	// written before the send, so the echo Meta fires back — sometimes before
	// the send call even returns — finds it and is not mistaken for the seller
	var rowID string
	if err := s.pool.QueryRow(ctx, `insert into conversation_messages (conversation_id, direction, body, author)
		values ($1,'out',$2,$3) returning id`, convID, text, author).Scan(&rowID); err != nil {
		return errors.New("could not record the message")
	}
	mid, err := s.client.Send(ctx, channel, externalID, token, contactID, text)
	if err != nil {
		s.pool.Exec(ctx, `delete from conversation_messages where id=$1`, rowID)
		// the raw error carries Graph detail — useless to the seller and not theirs to see
		s.log.Error("channel send failed", "channel", channel, "businessId", bizID, "author", author, "err", err)
		if outsideWindow(err) {
			return errors.New("the buyer last wrote more than 24 hours ago — Meta only allows a reply after they message again")
		}
		return errors.New("could not send on " + channel + " right now — reconnect the account or try again")
	}
	if mid != "" {
		s.pool.Exec(ctx, `update conversation_messages set external_id=$2 where id=$1 and external_id=''`, rowID, mid)
	}
	s.pool.Exec(ctx, `update conversations set last_message_at=now() where id=$1`, convID)
	return nil
}

// outsideWindow recognises Meta's refusal to deliver outside the 24-hour
// customer service window.
func outsideWindow(err error) bool {
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "outside of allowed window") || strings.Contains(msg, "24 hour") ||
		strings.Contains(msg, "re-engagement")
}

// Deauthorize drops the token of an account that removed CartHedge from its
// Instagram settings. Its threads stay — they are the seller's order records.
func (s *Service) Deauthorize(ctx context.Context, accountID string) (int64, error) {
	if accountID == "" {
		return 0, errors.New("no account id")
	}
	ct, err := s.pool.Exec(ctx, `delete from channel_connections
		where external_id=$1 or (alt_external_id<>'' and alt_external_id=$1)`, accountID)
	if err != nil {
		return 0, err
	}
	return ct.RowsAffected(), nil
}

// DeleteAccountData honours a Meta data-deletion request for a connected
// account: the token, every captured thread, and the chat text kept on AI
// drafts. Orders already booked stay — they are the seller's tax records.
func (s *Service) DeleteAccountData(ctx context.Context, accountID string) (string, error) {
	if accountID == "" {
		return "", errors.New("no account id")
	}
	code := strings.ToUpper(secure.Token(10))
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	type conn struct{ biz, channel string }
	var found []conn
	rows, err := tx.Query(ctx, `delete from channel_connections
		where external_id=$1 or (alt_external_id<>'' and alt_external_id=$1)
		returning business_id, channel`, accountID)
	if err != nil {
		return "", err
	}
	for rows.Next() {
		var c conn
		if rows.Scan(&c.biz, &c.channel) == nil {
			found = append(found, c)
		}
	}
	rows.Close()

	channel, bizID := "instagram", ""
	for _, c := range found {
		channel, bizID = c.channel, c.biz
		if _, err := tx.Exec(ctx, `update ai_drafts set conversation='', status=case when status='pending' then 'discarded' else status end
			where business_id=$1 and source=$2`, c.biz, c.channel); err != nil {
			return "", err
		}
		if _, err := tx.Exec(ctx, `delete from conversations where business_id=$1 and channel=$2`, c.biz, c.channel); err != nil {
			return "", err
		}
	}
	if _, err := tx.Exec(ctx, `insert into data_deletion_requests (code, channel, external_id, business_id)
		values ($1,$2,$3,nullif($4,'')::uuid)`, code, channel, accountID, bizID); err != nil {
		return "", err
	}
	if err := tx.Commit(ctx); err != nil {
		return "", err
	}
	return code, nil
}

// DeletionStatus reports a deletion request by its confirmation code.
func (s *Service) DeletionStatus(ctx context.Context, code string) (status, at string, err error) {
	err = s.pool.QueryRow(ctx, `select status, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		from data_deletion_requests where code=$1`, strings.ToUpper(code)).Scan(&status, &at)
	return
}

// preview truncates by rune, not byte — DMs are Hinglish and Devanagari, and a
// byte slice through a multi-byte character produces invalid UTF-8 in the JSON.
func preview(s string) string {
	s = strings.TrimSpace(s)
	runes := []rune(s)
	if len(runes) > 120 {
		return string(runes[:120]) + "…"
	}
	return s
}
