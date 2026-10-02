package ai

import (
	"context"
	"encoding/json"

	"carthedge/internal/order"
	"carthedge/internal/product"
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
	st.Products, err = s.products.List(ctx, bizID, product.Filter{})
	return st, err
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
