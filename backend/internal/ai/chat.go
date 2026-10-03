package ai

import (
	"context"
	"encoding/json"
	"fmt"

	"carthedge/internal/order"
	"carthedge/internal/product"
	"carthedge/internal/shop"
)

// LoadStore reads what a DM turn may say about the seller.
func (s *Service) LoadStore(ctx context.Context, bizID string) (Store, error) {
	st := Store{ID: bizID, BaseURL: s.baseURL}
	var razorpayKeyID, upiID string
	err := s.pool.QueryRow(ctx, `select name, code, city, ai_notes, shipping_fee, free_shipping_above,
		cod_enabled, cod_token_amount, razorpay_key_id, upi_id from businesses where id=$1`, bizID).Scan(
		&st.Name, &st.Code, &st.City, &st.Notes, &st.ShippingFee, &st.FreeShippingAbove,
		&st.CodEnabled, &st.CodTokenAmount, &razorpayKeyID, &upiID)
	if err != nil {
		return st, err
	}
	// same rule order.Create enforces: no gateway and no UPI ID, no online orders
	st.OnlinePay = razorpayKeyID != "" || upiID != ""
	settings, err := shop.Load(ctx, s.pool, bizID)
	if err != nil {
		return st, err
	}
	st.Policies, st.Profile, st.Pricing = settings.Policies, settings.AI, settings.Checkout.Pricing
	if st.Profile.Handles.Offers {
		st.Offers = s.offerLines(ctx, bizID)
	}
	st.Products, err = s.products.List(ctx, bizID, product.Filter{})
	return st, err
}

// offerLines are the store's live public coupons, described the way a seller
// would say them, for an assistant allowed to mention them.
func (s *Service) offerLines(ctx context.Context, bizID string) []string {
	rows, err := s.pool.Query(ctx, `select code, kind, value, min_amount, max_discount, first_order_only from offers
		where business_id=$1 and active and (expires_at is null or expires_at > now())
		and (max_uses = 0 or max_uses > (select count(*) from orders o where o.business_id = offers.business_id
			and o.offer_code = offers.code and o.status <> 'cancelled'))
		order by created_at desc limit 5`, bizID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var code, kind string
		var value, minAmount, maxDiscount int
		var firstOnly bool
		if rows.Scan(&code, &kind, &value, &minAmount, &maxDiscount, &firstOnly) != nil {
			continue
		}
		line := code + ": " + inr(value) + " off"
		if kind == "percent" {
			line = fmt.Sprintf("%s: %d%% off", code, value)
			if maxDiscount > 0 {
				line += " (up to " + inr(maxDiscount) + ")"
			}
		}
		if minAmount > 0 {
			line += " on orders above " + inr(minAmount)
		}
		if firstOnly {
			line += ", first order only"
		}
		out = append(out, line+" — the buyer enters the code at checkout")
	}
	return out
}

// PracticeInput is a seller trying their own assistant: the chat so far and
// the state the previous practice turn returned.
type PracticeInput struct {
	Transcript  []ChatLine
	Cart        Cart
	Stage       string
	SummaryHash string
}

// Practice runs one real assistant turn on a chat the seller types, with the
// live catalog and settings, and places nothing. The caller keeps the state.
func (s *Service) Practice(ctx context.Context, bizID string, in PracticeInput) (*TurnResult, error) {
	st, err := s.LoadStore(ctx, bizID)
	if err != nil {
		return nil, err
	}
	var autoOrder bool
	s.pool.QueryRow(ctx, `select ai_auto_order from businesses where id=$1`, bizID).Scan(&autoOrder)
	return s.Turn(ctx, TurnInput{Store: st, Transcript: in.Transcript, Cart: in.Cart, Stage: in.Stage,
		SummaryHash: in.SummaryHash, AutoOrder: autoOrder})
}

// PlaceFromChat turns a confirmed chat cart into an order (seller allowed
// auto-confirm) or into a draft for the seller's one tap. The cart has already
// passed Store.check, so every line is a real, in-stock catalog item.
func (s *Service) PlaceFromChat(ctx context.Context, st Store, convID, source string, c Cart, q Quote, auto bool) (*order.Order, string, error) {
	if auto {
		p := order.CreateParams{BusinessID: st.ID, Source: "ai", ConversationID: convID,
			Name: c.Name, Phone: c.Phone, Address: c.Address, PaymentMethod: c.Payment,
			Notes: "Ordered and confirmed by the buyer in the " + source + " chat"}
		for _, l := range q.Lines {
			p.Refs = append(p.Refs, order.Ref{ProductID: l.ProductID, VariantID: l.VariantID, Qty: l.Qty})
		}
		o, err := s.orders.Create(ctx, p)
		return o, "", err
	}

	data := DraftData{CustomerName: c.Name, Phone: c.Phone, Address: c.Address, PaymentMethod: c.Payment,
		Notes: "Buyer confirmed this order in the chat", Confidence: 100}
	for _, l := range q.Lines {
		data.Items = append(data.Items, DraftItem{ProductID: l.ProductID, Name: l.Name, Variant: l.Variant, Qty: l.Qty, Price: l.Price})
	}
	draftJSON, _ := json.Marshal(data)
	s.DiscardChatDrafts(ctx, st.ID, convID)
	var id string
	err := s.pool.QueryRow(ctx, `insert into ai_drafts (business_id, conversation, draft, confidence, source, conversation_id)
		values ($1,$2,$3::jsonb,100,$4,$5) returning id`,
		st.ID, st.summary(c, q), string(draftJSON), source, convID).Scan(&id)
	return nil, id, err
}

// DiscardChatDrafts keeps at most one live draft per chat: a buyer who changes
// their mind (or backs out) must not leave the seller a card to confirm.
func (s *Service) DiscardChatDrafts(ctx context.Context, bizID, convID string) {
	if convID == "" {
		return
	}
	s.pool.Exec(ctx, `update ai_drafts set status='discarded'
		where business_id=$1 and conversation_id=$2 and status='pending'`, bizID, convID)
}
