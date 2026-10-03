package messaging

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"carthedge/internal/ai"
	"carthedge/internal/alert"
	"carthedge/internal/httpx"
	"carthedge/internal/product"
	"carthedge/internal/shop"
)

const (
	// sellerPause is how long the assistant stays quiet on a chat after the
	// seller writes in it themselves (from CartHedge or the Instagram app).
	sellerPause = 12 * time.Hour
	// chatWindow is Meta's 24-hour messaging window, minus a safety margin.
	chatWindow = 23*time.Hour + 45*time.Minute
	// maxAIPerHour stops a runaway exchange (a buyer's own bot, a loop) and
	// hands the chat to the seller instead. Counted in messages: a reply is
	// usually two or three short ones, so this is roughly 15–20 replies.
	maxAIPerHour = 40
	nudgeSweep   = 5 * time.Minute
	// a buyer who went quiet mid-order gets one follow-up in this window
	nudgeAfter  = 4 * time.Hour
	nudgeBefore = 22 * time.Hour
)

var (
	errNotConnected  = errors.New("this chat's account is not connected")
	errOutsideWindow = errors.New("the buyer's 24-hour messaging window has closed")
)

// handle runs one quiet conversation: the assistant answers when the seller
// allows it and the plan includes it; otherwise it becomes a draft as before.
func (s *Service) handle(ctx context.Context, c dueConv) {
	if !s.can(ctx, c.biz, "ai") {
		return
	}
	var autoReply, autoOrder, paused bool
	var stage string
	var profileRaw []byte
	if err := s.pool.QueryRow(ctx, `select b.ai_auto_reply, b.ai_auto_order, coalesce(c.ai_paused_until > now(), false), c.stage,
		b.ai_profile from conversations c join businesses b on b.id = c.business_id where c.id=$1`, c.id).Scan(
		&autoReply, &autoOrder, &paused, &stage, &profileRaw); err != nil {
		return
	}
	if paused && stage == "handoff" {
		return // the owner is handling this chat personally; a draft card from it is noise
	}
	var profile shop.AIProfile
	json.Unmarshal(profileRaw, &profile)
	open := profile.Hours.OpenAt(time.Now())
	// "only while I am closed": the seller answers during business hours
	sellerHours := profile.ReplyWhen == "closed" && open
	if !autoReply || paused || sellerHours || !s.can(ctx, c.biz, "aiReply") {
		if !open && !paused && profile.Away != "" {
			s.sendAway(ctx, c, profile.Away)
		}
		s.draftOnly(ctx, c)
		return
	}
	s.converse(ctx, c, autoOrder, false)
}

// sendAway posts the seller's away message, at most once per chat in 12
// hours: claimed by stamping away_sent_at, so a burst gets one copy.
func (s *Service) sendAway(ctx context.Context, c dueConv, text string) {
	ct, err := s.pool.Exec(ctx, `update conversations set away_sent_at=now() where id=$1
		and (away_sent_at is null or away_sent_at < now() - interval '12 hours')`, c.id)
	if err != nil || ct.RowsAffected() == 0 {
		return
	}
	if err := s.send(ctx, c.id, "system", text); err != nil {
		s.log.Warn("away message not sent", "conversationId", c.id, "err", err)
	}
}

// converse runs the assistant on a chat and acts on the result.
func (s *Service) converse(ctx context.Context, c dueConv, autoOrder, nudge bool) {
	var started time.Time
	s.pool.QueryRow(ctx, `select now()`).Scan(&started)
	in, err := s.turnInput(ctx, c)
	if err != nil {
		s.log.Warn("dm turn: could not load the chat", "conversationId", c.id, "err", err)
		return
	}
	in.AutoOrder, in.Nudge = autoOrder, nudge
	if !nudge {
		// what a person does on opening the chat: seen, then typing
		s.senderAction(ctx, c.id, "mark_seen")
		s.senderAction(ctx, c.id, "typing_on")
	}

	var recent int
	s.pool.QueryRow(ctx, `select count(*) from conversation_messages
		where conversation_id=$1 and author='ai' and created_at > now() - interval '1 hour'`, c.id).Scan(&recent)
	if recent >= maxAIPerHour {
		s.handOff(ctx, c, "the chat went back and forth unusually fast")
		return
	}

	res, err := s.ai.Turn(ctx, in)
	if err != nil {
		s.log.Warn("dm turn failed", "conversationId", c.id, "err", err)
		return
	}
	// the buyer kept typing while this turn was being written: drop it — the
	// next turn reads everything, and nothing is placed off a stale "yes"
	var newer bool
	s.pool.QueryRow(ctx, `select exists(select 1 from conversation_messages
		where conversation_id=$1 and direction='in' and created_at > $2)`, c.id, started).Scan(&newer)
	if newer {
		return
	}

	placed := false
	switch res.Action {
	case ai.ActPlace:
		o, draftID, err := s.ai.PlaceFromChat(ctx, in.Store, c.id, c.channel, res.Cart, res.Quote, autoOrder)
		if err != nil && autoOrder {
			// stock ran out, COD switched off… the buyer said yes, so the seller
			// gets a draft to sort out rather than the buyer getting an error
			s.log.Warn("auto order failed, leaving a draft", "conversationId", c.id, "err", err)
			_, draftID, err = s.ai.PlaceFromChat(ctx, in.Store, c.id, c.channel, res.Cart, res.Quote, false)
			res.Stage = "awaiting_seller"
			res.Messages = []string{"Thank you! 🙏 Hum aapka order confirm karke yahin order link bhejte hain."}
		}
		if err != nil {
			s.log.Error("could not save the confirmed chat order", "conversationId", c.id, "err", err)
			s.handOff(ctx, c, "the buyer confirmed an order but it could not be saved")
			return
		}
		if draftID != "" {
			s.pool.Exec(ctx, `update conversations set draft_id=$2 where id=$1`, c.id, draftID)
			s.bus.Publish(ctx, c.biz, "draftReady", httpx.M{"conversationId": c.id, "draftId": draftID, "confidence": 100})
		}
		// a placed order already reset the chat and messaged the buyer
		placed = o != nil
	case ai.ActHandoff:
		// stays with the seller until they resume it: a complaint must not be
		// picked back up by the assistant just because nobody answered
		s.pool.Exec(ctx, `update conversations set ai_paused_until=now() + interval '100 years' where id=$1`, c.id)
		s.alertOwner(ctx, c, res.Handoff)
	}
	// a buyer backing out while their order waits for the seller's tap must
	// not leave a draft the seller could still confirm
	if in.Stage == "awaiting_seller" && res.Intent == "decline" {
		s.ai.DiscardChatDrafts(ctx, c.biz, c.id)
		res.Stage = "open"
	}

	if !placed {
		cart, _ := json.Marshal(res.Cart)
		s.pool.Exec(ctx, `update conversations set stage=$2, cart=$3::jsonb, summary_hash=$4 where id=$1`,
			c.id, res.Stage, string(cart), res.SummaryHash)
	}
	if nudge {
		s.pool.Exec(ctx, `update conversations set nudged_at=now() where id=$1`, c.id)
	}
	if len(res.Messages) == 0 {
		s.senderAction(ctx, c.id, "typing_off")
	}
	s.deliver(ctx, c.id, res.Messages)
}

// deliver sends a reply as the separate short messages a person types, with
// a "typing…" pause between them that scales with the length of the next one.
func (s *Service) deliver(ctx context.Context, convID string, msgs []string) {
	for i, m := range msgs {
		if i > 0 {
			s.senderAction(ctx, convID, "typing_on")
			pause := 700*time.Millisecond + time.Duration(len([]rune(m)))*25*time.Millisecond
			select {
			case <-ctx.Done():
				return
			case <-time.After(min(pause, 3*time.Second)):
			}
		}
		if err := s.send(ctx, convID, "ai", m); err != nil {
			s.log.Warn("dm reply not sent", "conversationId", convID, "err", err)
			return
		}
	}
}

// senderAction shows the buyer "seen" / "typing…" while a reply is written.
// Best effort: a failure here changes nothing about the reply itself.
func (s *Service) senderAction(ctx context.Context, convID, action string) {
	ch, err := s.channelOf(ctx, convID)
	if err != nil {
		return
	}
	if err := s.client.SenderAction(ctx, ch.channel, ch.token, ch.contactID, action); err != nil {
		s.log.Debug("sender action not shown", "action", action, "err", err)
	}
}

// chatChannel is how to reach the buyer of one conversation.
type chatChannel struct {
	bizID, channel, contactID, externalID, token string
}

func (s *Service) channelOf(ctx context.Context, convID string) (chatChannel, error) {
	var ch chatChannel
	if err := s.pool.QueryRow(ctx, `select business_id, channel, contact_id from conversations where id=$1`, convID).
		Scan(&ch.bizID, &ch.channel, &ch.contactID); err != nil {
		return ch, err
	}
	var tokenEnc string
	if err := s.pool.QueryRow(ctx, `select external_id, access_token from channel_connections
		where business_id=$1 and channel=$2 and status='connected'`, ch.bizID, ch.channel).Scan(&ch.externalID, &tokenEnc); err != nil {
		return ch, errNotConnected
	}
	token, err := s.cipher.Decrypt(tokenEnc)
	if err != nil {
		return ch, errNotConnected
	}
	ch.token = token
	return ch, nil
}

// handOff pauses the assistant and tells the seller, without a model call.
func (s *Service) handOff(ctx context.Context, c dueConv, reason string) {
	s.pool.Exec(ctx, `update conversations set stage='handoff', ai_paused_until=now() + interval '100 years' where id=$1`, c.id)
	s.alertOwner(ctx, c, reason)
}

// turnInput loads everything a turn reads: the store, the chat since the last
// order, the cart being built, earlier orders and the buyer's last address.
func (s *Service) turnInput(ctx context.Context, c dueConv) (ai.TurnInput, error) {
	var in ai.TurnInput
	st, err := s.ai.LoadStore(ctx, c.biz)
	if err != nil {
		return in, err
	}
	in.Store = st
	var cart []byte
	if err := s.pool.QueryRow(ctx, `select stage, cart, summary_hash from conversations where id=$1`, c.id).
		Scan(&in.Stage, &cart, &in.SummaryHash); err != nil {
		return in, err
	}
	json.Unmarshal(cart, &in.Cart)

	rows, err := s.pool.Query(ctx, `select direction, body from (
			select m.direction, m.body, m.created_at from conversation_messages m
			join conversations c on c.id = m.conversation_id
			where m.conversation_id=$1 and m.created_at > coalesce(c.cutoff_at, '-infinity')
			order by m.created_at desc limit 30
		) recent order by created_at asc`, c.id)
	if err != nil {
		return in, err
	}
	for rows.Next() {
		var dir, body string
		if rows.Scan(&dir, &body) == nil {
			who := "buyer"
			if dir == "out" {
				who = "shop"
			}
			in.Transcript = append(in.Transcript, ai.ChatLine{Who: who, Text: body})
		}
	}
	rows.Close()

	orows, err := s.pool.Query(ctx, `select o.order_code, o.status, o.payment_method, o.payment_status, o.total, o.items,
		o.courier_name, o.courier_tracking_id, c.name, c.phone, o.address
		from orders o join customers c on c.id = o.customer_id
		where o.conversation_id=$1 order by o.created_at desc limit 3`, c.id)
	if err != nil {
		return in, err
	}
	defer orows.Close()
	for orows.Next() {
		var o ai.OrderFact
		var items, addr []byte
		var name, phone string
		if orows.Scan(&o.Code, &o.Status, &o.PaymentMethod, &o.PaymentStatus, &o.Total, &items,
			&o.CourierName, &o.TrackingID, &name, &phone, &addr) != nil {
			continue
		}
		var lines []product.Line
		json.Unmarshal(items, &lines)
		o.Items = lines
		in.Orders = append(in.Orders, o)
		if in.Returning == nil {
			r := ai.Cart{Name: name, Phone: phone}
			json.Unmarshal(addr, &r.Address)
			in.Returning = &r
		}
	}
	return in, orows.Err()
}

// send records an outbound line and delivers it. The row is written first so
// Instagram's echo of it — which can arrive before Send returns — is
// recognised as ours and not mistaken for the seller typing in the app.
func (s *Service) send(ctx context.Context, convID, author, text string) error {
	ch, err := s.channelOf(ctx, convID)
	if err != nil {
		return err
	}
	bizID, channel := ch.bizID, ch.channel
	var msgID string
	if err := s.pool.QueryRow(ctx, `insert into conversation_messages (conversation_id, direction, body, author)
		values ($1,'out',$2,$3) returning id`, convID, text, author).Scan(&msgID); err != nil {
		return err
	}
	metaID, err := s.client.Send(ctx, channel, ch.externalID, ch.token, ch.contactID, text)
	if err != nil {
		// the raw error carries graph URLs and transport detail — logged, not shown
		s.log.Error("channel send failed", "channel", channel, "businessId", bizID, "err", err)
		s.pool.Exec(ctx, `delete from conversation_messages where id=$1`, msgID)
		return err
	}
	s.pool.Exec(ctx, `update conversation_messages set external_id=$2 where id=$1 and $2 <> ''`, msgID, metaID)
	s.pool.Exec(ctx, `update conversations set last_message_at=now() where id=$1`, convID)
	return nil
}

// SendToConversation is how an order speaks to the buyer on the chat it came
// from. Outside Meta's 24-hour window it refuses, and the caller falls back
// to WhatsApp — automated messages may not use the human-agent extension.
func (s *Service) SendToConversation(ctx context.Context, convID, text string) error {
	var lastIn *time.Time
	if err := s.pool.QueryRow(ctx, `select last_inbound_at from conversations where id=$1`, convID).Scan(&lastIn); err != nil {
		return err
	}
	if lastIn == nil || time.Since(*lastIn) > chatWindow {
		return errOutsideWindow
	}
	return s.send(ctx, convID, "system", text)
}

// recordEcho handles the business account's own outbound messages. Ours were
// stored before sending; anything else is the seller replying from the app,
// which is kept in the thread and pauses the assistant on that chat.
func (s *Service) recordEcho(ctx context.Context, bizID string, in Inbound) {
	var convID string
	if err := s.pool.QueryRow(ctx, `select id from conversations where business_id=$1 and channel=$2 and contact_id=$3`,
		bizID, in.Channel, in.ContactID).Scan(&convID); err != nil {
		return // the seller wrote to someone who has not messaged the shop
	}
	var ours bool
	s.pool.QueryRow(ctx, `select exists(select 1 from conversation_messages
		where conversation_id=$1 and direction='out'
		and (external_id=$2 or (strpos(body, $3) > 0 and created_at > now() - interval '10 minutes')))`,
		convID, in.MessageID, in.Text).Scan(&ours)
	if ours {
		return
	}
	s.pool.Exec(ctx, `insert into conversation_messages (conversation_id, direction, external_id, body, author)
		values ($1,'out',$2,$3,'seller') on conflict do nothing`, convID, in.MessageID, in.Text)
	s.pool.Exec(ctx, `update conversations set last_message_at=now(),
		ai_paused_until = greatest(coalesce(ai_paused_until, now()), now() + make_interval(secs => $2)) where id=$1`,
		convID, sellerPause.Seconds())
}

// SetAIPaused lets the seller stop or resume the assistant on one chat.
func (s *Service) SetAIPaused(ctx context.Context, bizID, convID string, paused bool) error {
	q := `update conversations set ai_paused_until=null,
		stage = case when stage='handoff' then 'open' else stage end where id=$1 and business_id=$2`
	if paused {
		// "until I resume it": a date no chat will reach
		q = `update conversations set ai_paused_until=now() + interval '100 years' where id=$1 and business_id=$2`
	}
	ct, err := s.pool.Exec(ctx, q, convID, bizID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("conversation not found")
	}
	return nil
}

// nudgeQuiet sends one gentle follow-up to buyers who stopped mid-order,
// while the messaging window is still open.
func (s *Service) nudgeQuiet(ctx context.Context) {
	// claimed by stamping nudged_at up front, so two instances never both
	// follow up with the same buyer
	rows, err := s.pool.Query(ctx, `update conversations set nudged_at=now()
		where id in (select c.id from conversations c join businesses b on b.id = c.business_id
		where b.ai_auto_reply and b.status='active'
		  and c.stage in ('open','confirming') and not c.parse_pending
		  -- an emptied cart is stored as items:null, which jsonb_array_length rejects
		  and case when jsonb_typeof(c.cart->'items') = 'array' then jsonb_array_length(c.cart->'items') else 0 end > 0
		  and c.last_inbound_at between now() - make_interval(secs => $1) and now() - make_interval(secs => $2)
		  and (c.ai_paused_until is null or c.ai_paused_until < now())
		  and (c.nudged_at is null or c.nudged_at < c.last_inbound_at)
		  and (select m.author from conversation_messages m where m.conversation_id=c.id
		       order by m.created_at desc limit 1) = 'ai'
		limit 20 for update of c skip locked)
		returning id, business_id, channel,
		  (select b.ai_auto_order from businesses b where b.id = conversations.business_id)`, nudgeBefore.Seconds(), nudgeAfter.Seconds())
	if err != nil {
		s.log.Warn("nudge query failed", "err", err)
		return
	}
	type due struct {
		c         dueConv
		autoOrder bool
	}
	var list []due
	for rows.Next() {
		var d due
		if rows.Scan(&d.c.id, &d.c.biz, &d.c.channel, &d.autoOrder) == nil {
			list = append(list, d)
		}
	}
	rows.Close()
	for _, d := range list {
		if !s.can(ctx, d.c.biz, "aiReply") || s.sellerAnswering(ctx, d.c.biz) {
			continue
		}
		s.converse(ctx, d.c, d.autoOrder, true)
	}
}

// sellerAnswering reports whether the seller asked to handle chats themselves
// right now (assistant only outside business hours).
func (s *Service) sellerAnswering(ctx context.Context, bizID string) bool {
	var raw []byte
	if s.pool.QueryRow(ctx, `select ai_profile from businesses where id=$1`, bizID).Scan(&raw) != nil {
		return false
	}
	var p shop.AIProfile
	json.Unmarshal(raw, &p)
	return p.ReplyWhen == "closed" && p.Hours.OpenAt(time.Now())
}

// alertOwner tells the seller a chat needs them: the Inbox shows it, and the
// owner is alerted on their chosen channels so it is not missed.
func (s *Service) alertOwner(ctx context.Context, c dueConv, reason string) {
	var contact string
	if err := s.pool.QueryRow(ctx, `select coalesce(nullif(contact_name,''), contact_id) from conversations where id=$1`,
		c.id).Scan(&contact); err != nil {
		return
	}
	s.bus.Publish(ctx, c.biz, "chatNeedsSeller", httpx.M{"conversationId": c.id, "reason": reason})
	s.alerts.Seller(c.biz, alert.Alert{Kind: "chatHandoff",
		Title: "A buyer needs you on " + c.channel,
		Body:  fmt.Sprintf("%s: %s. The assistant is paused on that chat — reply from the AI desk.", contact, reason),
		Path:  "/app/ai?conversation=" + c.id})
}
