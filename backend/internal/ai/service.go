package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"carthedge/internal/customer"
	"carthedge/internal/httpx"
	"carthedge/internal/notify"
	"carthedge/internal/order"
	"carthedge/internal/product"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const parsePrompt = `You are an order-entry assistant for Indian social-commerce sellers.
Extract order details from an Instagram/WhatsApp DM conversation. Conversations mix Hindi and English (Hinglish), e.g. "pink wali kurti M size bhejo COD se".

Seller catalog (one product per line: id | name | category | price paise | variants):
%s

Return STRICT JSON only:
{"items":[{"productId":"catalog id or empty if no match","name":"item name","variant":"variant name or empty","qty":1,"price":0}],
"customerName":"","phone":"","address":{"line":"","city":"","state":"","pincode":""},
"paymentMethod":"cod or prepaid","notes":"anything unclear or special requests","confidence":0}

Rules:
- Match items to the catalog by name/description; set price from the catalog. Unmatched items: empty productId, price 0.
- paymentMethod is "cod" when the buyer says COD/cash/"paise baad me", else "prepaid".
- Extract the 10-digit phone and 6-digit pincode when present.
- confidence 0-100: how complete and unambiguous the order is.`

const replyPrompt = `You are the seller's assistant for %s, an Indian social-commerce store.
Answer the buyer's pre-sales question briefly and warmly, like the seller would on WhatsApp. Hinglish is fine when the buyer uses it.

Store details: %s
Catalog:
%s

Only answer from the store details and catalog. If you don't know, say the seller will confirm shortly. Never invent prices or delivery dates.
Every amount above is already written in rupees. Quote them exactly as given. Never mention paise, and never convert or recalculate an amount.`

type DraftItem struct {
	ProductID string `json:"productId"`
	Name      string `json:"name"`
	Variant   string `json:"variant"`
	Qty       int    `json:"qty"`
	Price     int    `json:"price"`
}

type DraftData struct {
	Items         []DraftItem      `json:"items"`
	CustomerName  string           `json:"customerName"`
	Phone         string           `json:"phone"`
	Address       customer.Address `json:"address"`
	PaymentMethod string           `json:"paymentMethod"`
	Notes         string           `json:"notes"`
	Confidence    int              `json:"confidence"`
}

type Draft struct {
	ID             string    `json:"id"`
	Conversation   string    `json:"conversation"`
	Data           DraftData `json:"draft"`
	Confidence     int       `json:"confidence"`
	Status         string    `json:"status"`
	Source         string    `json:"source"`
	ConversationID string    `json:"conversationId,omitempty"`
	OrderID        string    `json:"orderId,omitempty"`
	CreatedAt      string    `json:"createdAt"`
}

type Service struct {
	pool     *pgxpool.Pool
	client   *Client
	orders   *order.Service
	products *product.Service
	log      *slog.Logger
	baseURL  string // buyer links the DM assistant may share
}

func NewService(pool *pgxpool.Pool, client *Client, orders *order.Service, products *product.Service, log *slog.Logger, baseURL string) *Service {
	return &Service{pool: pool, client: client, orders: orders, products: products, log: log, baseURL: baseURL}
}

// ParseOrder reads a pasted DM thread and drafts an order card for one-tap confirm.
func (s *Service) ParseOrder(ctx context.Context, bizID, conversation string) (*Draft, error) {
	return s.parse(ctx, bizID, conversation, "manual", "")
}

// ParseConversation is the automated path: same parse, but the draft is tagged
// with its channel and linked to the conversation it came from.
func (s *Service) ParseConversation(ctx context.Context, bizID, conversation, source, conversationID string) (*Draft, error) {
	return s.parse(ctx, bizID, conversation, source, conversationID)
}

func (s *Service) parse(ctx context.Context, bizID, conversation, source, conversationID string) (*Draft, error) {
	if conversation == "" {
		return nil, errors.New("conversation is required")
	}
	catalog, err := s.products.Catalog(ctx, bizID)
	if err != nil {
		return nil, err
	}
	raw, err := s.client.Complete(ctx, fmt.Sprintf(parsePrompt, catalog), conversation, true)
	if err != nil {
		return nil, err
	}
	var data DraftData
	if err := json.Unmarshal([]byte(stripFences(raw)), &data); err != nil {
		s.log.Error("ai parse: bad json from model", "err", err)
		return nil, errors.New("could not parse the conversation, try again")
	}
	if data.PaymentMethod != "prepaid" {
		data.PaymentMethod = "cod"
	}
	s.priceFromCatalog(ctx, bizID, data.Items)
	draftJSON, _ := json.Marshal(data)

	d := &Draft{Conversation: conversation, Data: data, Confidence: data.Confidence, Status: "pending", Source: source, ConversationID: conversationID}
	s.DiscardChatDrafts(ctx, bizID, conversationID)
	err = s.pool.QueryRow(ctx, `insert into ai_drafts (business_id, conversation, draft, confidence, source, conversation_id)
		values ($1,$2,$3::jsonb,$4,$5,nullif($6,'')::uuid) returning id, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
		bizID, conversation, string(draftJSON), data.Confidence, source, conversationID).Scan(&d.ID, &d.CreatedAt)
	if err != nil {
		return nil, err
	}
	return d, nil
}

// priceFromCatalog fills the price a model left at zero for a matched item.
// The order itself is always priced from the catalog at confirm time, so
// without this the review card quotes ₹0 for a line that will bill in full.
func (s *Service) priceFromCatalog(ctx context.Context, bizID string, items []DraftItem) {
	for i := range items {
		// A matched product is always priced from the catalog, even when the model
		// filled in a price — models guess prices, and the seller confirms the draft
		// card on sight and may quote that number back to the buyer in chat.
		// Unmatched (custom) lines keep the model's price; there is nothing to look up.
		if items[i].ProductID == "" {
			continue
		}
		p, err := s.products.Get(ctx, bizID, items[i].ProductID)
		if err != nil {
			continue
		}
		items[i].Price = p.Price
		for _, v := range p.Variants {
			if v.Price > 0 && strings.EqualFold(v.Name, items[i].Variant) {
				items[i].Price = v.Price
				break
			}
		}
	}
}

// ConfirmDraft turns a draft into a real order. The seller can override any
// field from the review card before confirming.
func (s *Service) ConfirmDraft(ctx context.Context, bizID, draftID string, overrides *DraftData) (*order.Order, error) {
	var draftJSON []byte
	var status, convID string
	err := s.pool.QueryRow(ctx, `select draft, status, coalesce(conversation_id::text, '') from ai_drafts
		where id=$1 and business_id=$2`, draftID, bizID).Scan(&draftJSON, &status, &convID)
	if err != nil {
		return nil, errors.New("draft not found")
	}
	if status != "pending" {
		return nil, errors.New("draft was already " + status)
	}
	var data DraftData
	json.Unmarshal(draftJSON, &data)
	if overrides != nil {
		data = *overrides
	}
	// the model (or a quick edit) wrote these; the ledger keys buyers on the
	// normalised mobile, and a bad pincode is a failed delivery
	phone, ok := httpx.NormalizePhone(data.Phone)
	if !ok {
		return nil, errors.New("add the buyer's 10-digit mobile number before confirming")
	}
	if !httpx.ValidPincode(data.Address.Pincode) {
		return nil, errors.New("add a valid 6-digit pincode before confirming")
	}
	data.Phone = phone

	params := order.CreateParams{
		BusinessID: bizID, Source: "ai", AiDraftID: draftID, ConversationID: convID,
		Name: data.CustomerName, Phone: data.Phone, Email: "",
		Address: data.Address, PaymentMethod: data.PaymentMethod, Notes: data.Notes,
	}
	for _, item := range data.Items {
		if item.ProductID != "" {
			variantID, err := s.variantIDByName(ctx, item.ProductID, item.Variant)
			if err != nil {
				return nil, err
			}
			params.Refs = append(params.Refs, order.Ref{ProductID: item.ProductID, VariantID: variantID, Qty: item.Qty})
		} else {
			params.CustomLines = append(params.CustomLines, product.Line{Name: item.Name, Variant: item.Variant, Qty: item.Qty, Price: item.Price})
		}
	}
	return s.orders.Create(ctx, params)
}

func (s *Service) variantIDByName(ctx context.Context, productID, variantName string) (string, error) {
	if variantName == "" {
		return "", nil
	}
	var id string
	err := s.pool.QueryRow(ctx, `select id from product_variants where product_id=$1 and lower(name)=lower($2)`,
		productID, variantName).Scan(&id)
	if err != nil {
		return "", nil // unmatched variant: order the base product, seller adjusts on review
	}
	return id, nil
}

func (s *Service) DiscardDraft(ctx context.Context, bizID, draftID string) error {
	var convID *string
	err := s.pool.QueryRow(ctx, `update ai_drafts set status='discarded' where id=$1 and business_id=$2 and status='pending'
		returning conversation_id::text`, draftID, bizID).Scan(&convID)
	if errors.Is(err, pgx.ErrNoRows) {
		return errors.New("draft not found or already handled")
	}
	if err != nil {
		return err
	}
	if convID != nil {
		// the chat is no longer waiting on the seller; the assistant takes it
		// from where the buyer is
		s.pool.Exec(ctx, `update conversations set stage='open' where id=$1 and stage='awaiting_seller'`, *convID)
	}
	return nil
}

func (s *Service) ListDrafts(ctx context.Context, bizID string, limit, offset int) ([]Draft, error) {
	rows, err := s.pool.Query(ctx, `select id, conversation, draft, confidence, status, coalesce(order_id::text, ''),
		source, coalesce(conversation_id::text, ''), to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		from ai_drafts where business_id=$1 order by created_at desc limit $2 offset $3`, bizID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Draft
	for rows.Next() {
		var d Draft
		var draftJSON []byte
		if err := rows.Scan(&d.ID, &d.Conversation, &draftJSON, &d.Confidence, &d.Status, &d.OrderID, &d.Source, &d.ConversationID, &d.CreatedAt); err != nil {
			return nil, err
		}
		json.Unmarshal(draftJSON, &d.Data)
		out = append(out, d)
	}
	return out, rows.Err()
}

// Reply drafts an answer to a buyer's pre-sales question from store context.
func (s *Service) Reply(ctx context.Context, bizID, question string) (string, error) {
	if question == "" {
		return "", errors.New("question is required")
	}
	var name, city, whatsapp string
	var shippingFee int
	var codEnabled bool
	if err := s.pool.QueryRow(ctx, `select name, city, whatsapp, shipping_fee, cod_enabled from businesses where id=$1`,
		bizID).Scan(&name, &city, &whatsapp, &shippingFee, &codEnabled); err != nil {
		return "", err
	}
	// buyer-facing prompt: rupees, never paise
	catalog, err := s.products.CatalogForBuyer(ctx, bizID)
	if err != nil {
		return "", err
	}
	details := fmt.Sprintf("ships from %s; delivery charge %s; COD available: %t; WhatsApp %s",
		city, notify.Rupees(shippingFee), codEnabled, whatsapp)
	return s.client.Complete(ctx, fmt.Sprintf(replyPrompt, name, details, catalog), question, false)
}
