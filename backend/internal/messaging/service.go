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
	"carthedge/internal/secure"

	"github.com/jackc/pgx/v5/pgxpool"
)

// lull is how long a conversation must be quiet before its new messages are
// batched into one AI parse — bounds LLM cost during a buyer's burst of DMs.
const lull = 12 * time.Second

// Service ingests Instagram/WhatsApp DMs, batches them into AI order drafts the
// seller approves, and sends replies back on the seller's own channel token.
type Service struct {
	pool   *pgxpool.Pool
	client *Client
	ai     *ai.Service
	bus    *events.Bus
	cipher *secure.Cipher
	log    *slog.Logger
}

func NewService(pool *pgxpool.Pool, client *Client, aiSvc *ai.Service, bus *events.Bus, cipher *secure.Cipher, log *slog.Logger) *Service {
	return &Service{pool: pool, client: client, ai: aiSvc, bus: bus, cipher: cipher, log: log}
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
}

// ConnectChannel stores (or refreshes) a seller's channel token, encrypted.
func (s *Service) ConnectChannel(ctx context.Context, bizID, channel, externalID, token, displayName string) error {
	if channel != "whatsapp" && channel != "instagram" {
		return errors.New("channel must be whatsapp or instagram")
	}
	if externalID == "" || token == "" {
		return errors.New("account id and access token are required")
	}
	enc, err := s.cipher.Encrypt(token)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `insert into channel_connections (business_id, channel, external_id, display_name, access_token, status)
		values ($1,$2,$3,$4,$5,'connected')
		on conflict (business_id, channel) do update set
		  external_id=excluded.external_id, display_name=excluded.display_name,
		  access_token=excluded.access_token, status='connected', updated_at=now()`,
		bizID, channel, externalID, displayName, enc)
	if err != nil {
		return errors.New("this account is already connected to another business")
	}
	return nil
}

func (s *Service) Disconnect(ctx context.Context, bizID, channel string) error {
	_, err := s.pool.Exec(ctx, `delete from channel_connections where business_id=$1 and channel=$2`, bizID, channel)
	return err
}

func (s *Service) ListChannels(ctx context.Context, bizID string) ([]httpx.M, error) {
	rows, err := s.pool.Query(ctx, `select channel, external_id, display_name, status,
		to_char(connected_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from channel_connections where business_id=$1 order by channel`, bizID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []httpx.M{}
	for rows.Next() {
		var channel, externalID, name, status, connectedAt string
		if err := rows.Scan(&channel, &externalID, &name, &status, &connectedAt); err != nil {
			return nil, err
		}
		out = append(out, httpx.M{"channel": channel, "externalId": externalID, "displayName": name,
			"status": status, "connectedAt": connectedAt})
	}
	return out, rows.Err()
}

// Receive routes each inbound DM to its business, appends it to the thread and
// marks the conversation for the next parse pass.
func (s *Service) Receive(ctx context.Context, body []byte) {
	for _, in := range parseWebhook(body) {
		var bizID string
		err := s.pool.QueryRow(ctx, `select business_id from channel_connections
			where channel=$1 and external_id=$2 and status='connected'`, in.Channel, in.ExternalID).Scan(&bizID)
		if err != nil {
			s.log.Warn("inbound for unknown channel", "channel", in.Channel, "externalId", in.ExternalID)
			continue
		}
		var convID string
		err = s.pool.QueryRow(ctx, `insert into conversations
			(business_id, channel, contact_id, contact_name, last_message_at, last_inbound_at, unread, parse_pending)
			values ($1,$2,$3,$4,now(),now(),1,true)
			on conflict (business_id, channel, contact_id) do update set
			  last_message_at=now(), last_inbound_at=now(),
			  unread=conversations.unread+1, parse_pending=true,
			  contact_name=case when conversations.contact_name='' then excluded.contact_name else conversations.contact_name end
			returning id`, bizID, in.Channel, in.ContactID, in.Name).Scan(&convID)
		if err != nil {
			s.log.Error("upsert conversation failed", "err", err)
			continue
		}
		if _, err := s.pool.Exec(ctx, `insert into conversation_messages (conversation_id, direction, external_id, body)
			values ($1,'in',$2,$3)`, convID, in.MessageID, in.Text); err != nil {
			s.log.Error("insert message failed", "err", err)
			continue
		}
		s.bus.Publish(ctx, bizID, "messageReceived", httpx.M{
			"conversationId": convID, "channel": in.Channel, "contact": in.Name, "preview": preview(in.Text)})
	}
}

// ingestDue parses every quiet, pending conversation exactly once.
func (s *Service) ingestDue(ctx context.Context) {
	rows, err := s.pool.Query(ctx, `select id, business_id, channel from conversations
		where parse_pending and last_inbound_at < now() - make_interval(secs => $1) limit 20`, lull.Seconds())
	if err != nil {
		return
	}
	type conv struct{ id, biz, channel string }
	var due []conv
	for rows.Next() {
		var c conv
		if rows.Scan(&c.id, &c.biz, &c.channel) == nil {
			due = append(due, c)
		}
	}
	rows.Close()

	for _, c := range due {
		// clear the flag first so a parse error (e.g. no LLM key) never loops
		s.pool.Exec(ctx, `update conversations set parse_pending=false where id=$1`, c.id)
		thread, err := s.thread(ctx, c.id)
		if err != nil || thread == "" {
			continue
		}
		draft, err := s.ai.ParseConversation(ctx, c.biz, thread, c.channel, c.id)
		if err != nil {
			s.log.Warn("dm parse failed", "conversationId", c.id, "err", err)
			continue
		}
		s.pool.Exec(ctx, `update conversations set draft_id=$2 where id=$1`, c.id, draft.ID)
		s.bus.Publish(ctx, c.biz, "draftReady", httpx.M{
			"conversationId": c.id, "draftId": draft.ID, "confidence": draft.Confidence})
	}
}

func (s *Service) thread(ctx context.Context, convID string) (string, error) {
	rows, err := s.pool.Query(ctx, `select direction, body from conversation_messages
		where conversation_id=$1 order by created_at asc limit 40`, convID)
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

	rows, err := s.pool.Query(ctx, `select direction, body, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		from conversation_messages where conversation_id=$1 order by created_at asc limit 100`, convID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	msgs := []httpx.M{}
	for rows.Next() {
		var dir, body, at string
		if err := rows.Scan(&dir, &body, &at); err != nil {
			return nil, err
		}
		msgs = append(msgs, httpx.M{"direction": dir, "body": body, "createdAt": at})
	}
	return httpx.M{"id": convID, "channel": channel, "contactId": contactID, "contactName": name,
		"draftId": draftID, "messages": msgs}, rows.Err()
}

// Reply sends the seller's message back on the buyer's channel and records it.
func (s *Service) Reply(ctx context.Context, bizID, convID, text string) error {
	if strings.TrimSpace(text) == "" {
		return errors.New("message is empty")
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
	if err := s.client.Send(ctx, channel, externalID, token, contactID, text); err != nil {
		// the raw error carries graph URLs and transport detail — useless to the
		// seller and not theirs to see
		s.log.Error("channel send failed", "channel", channel, "businessId", bizID, "err", err)
		return errors.New("could not send on " + channel + " right now — reconnect the account or try again")
	}
	s.pool.Exec(ctx, `insert into conversation_messages (conversation_id, direction, body) values ($1,'out',$2)`, convID, text)
	s.pool.Exec(ctx, `update conversations set last_message_at=now() where id=$1`, convID)
	return nil
}

func preview(s string) string {
	s = strings.TrimSpace(s)
	if len(s) > 120 {
		return s[:120] + "…"
	}
	return s
}
