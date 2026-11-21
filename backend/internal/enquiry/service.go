// Package enquiry holds what a chat about a service ends in: who asked, what
// for, and the details the business wanted first. The owner follows it up,
// quotes a price and closes it; nothing here books, bills or ships.
package enquiry

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"

	"carthedge/internal/httpx"
	"carthedge/internal/notify"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("enquiry not found")

// Statuses are the owner's pipeline, in order. Any move is allowed: it is
// their record of where a conversation stands, not a state machine.
var Statuses = []string{"new", "contacted", "quoted", "won", "lost"}

// maxQuote keeps an amount inside the int column (paise): ₹2 crore.
const maxQuote = 2_000_000_000

// Item is one thing the buyer asked about. Qty is people, days or units —
// whatever the service is priced by.
type Item struct {
	ProductID string `json:"productId,omitempty"`
	Name      string `json:"name"`
	Option    string `json:"option,omitempty"`
	Qty       int    `json:"qty"`
}

// Answer is one detail in the buyer's own words, under the seller's label.
type Answer struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

// Lead is an enquiry as the chat built it.
type Lead struct {
	Items   []Item   `json:"items"`
	Answers []Answer `json:"answers"`
	Name    string   `json:"name"`
	Phone   string   `json:"phone"`
}

// Hash pins exactly what was handed to the owner, so the same details are
// never handed over twice and a changed detail is.
func (l Lead) Hash() string {
	b, _ := json.Marshal(l)
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:8])
}

// Title names what was asked about: "Goa Trip (Deluxe) × 4, Airport Pickup".
func (l Lead) Title() string {
	parts := make([]string, 0, len(l.Items))
	for _, it := range l.Items {
		name := it.Name
		if it.Option != "" {
			name += " (" + it.Option + ")"
		}
		if it.Qty > 1 {
			name += fmt.Sprintf(" × %d", it.Qty)
		}
		parts = append(parts, name)
	}
	return strings.Join(parts, ", ")
}

type Enquiry struct {
	ID             string `json:"id"`
	ConversationID string `json:"conversationId,omitempty"`
	Lead
	Status       string `json:"status"`
	QuotedAmount int    `json:"quotedAmount"`
	QuoteNote    string `json:"quoteNote"`
	SellerNotes  string `json:"sellerNotes"`
	Source       string `json:"source"`
	// ContactName is the chat's display name; ChatOpen says a message can
	// still be sent on that chat (Meta's 24-hour window)
	ContactName string `json:"contactName,omitempty"`
	ChatOpen    bool   `json:"chatOpen"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

type Service struct {
	pool *pgxpool.Pool
	// dm sends a message on the buyer's chat; set at boot by messaging, which
	// refuses once the chat's messaging window has closed
	dm func(ctx context.Context, conversationID, text string) error
}

func NewService(pool *pgxpool.Pool) *Service { return &Service{pool: pool} }

// SetMessenger lets a quote reach the buyer on the chat the enquiry came from.
func (s *Service) SetMessenger(fn func(ctx context.Context, conversationID, text string) error) {
	s.dm = fn
}

// Capture stores the enquiry a chat produced. A buyer adding a detail updates
// the enquiry of the current chat session while the owner has not picked it up;
// once the owner has moved it on, or the chat started over (an order was
// placed, or the buyer came back after days of quiet), the next one is a new
// row, so an earlier enquiry is never overwritten. created says which.
//
// ponytail: select-then-write is safe because messaging runs one turn per
// chat at a time; it needs a lock if turns ever run on several replicas.
func (s *Service) Capture(ctx context.Context, bizID, convID, source string, l Lead) (id string, created bool, err error) {
	items, _ := json.Marshal(l.Items)
	answers, _ := json.Marshal(orEmpty(l.Answers))
	err = s.pool.QueryRow(ctx, `update enquiries e set items=$3::jsonb, name=$4, phone=$5, answers=$6::jsonb, updated_at=now()
		from conversations c where c.id = e.conversation_id and e.business_id=$1 and e.conversation_id=$2
		and e.status = 'new' and e.created_at > coalesce(c.cutoff_at, '-infinity')
		returning e.id`, bizID, convID, string(items), l.Name, l.Phone, string(answers)).Scan(&id)
	if err == nil {
		return id, false, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", false, err
	}
	err = s.pool.QueryRow(ctx, `insert into enquiries (business_id, conversation_id, items, name, phone, answers, source)
		values ($1,$2,$3::jsonb,$4,$5,$6::jsonb,$7) returning id`,
		bizID, convID, string(items), l.Name, l.Phone, string(answers), source).Scan(&id)
	return id, err == nil, err
}

// Delete erases one enquiry on the buyer's request (DPDP). A buyer who only
// enquired never reaches the customer ledger, so this is their erase.
func (s *Service) Delete(ctx context.Context, bizID, id string) error {
	ct, err := s.pool.Exec(ctx, `delete from enquiries where id=$1 and business_id=$2`, id, bizID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// Input is an enquiry the owner writes down themselves: a call, a walk-in.
type Input struct {
	Name    string `json:"name"`
	Phone   string `json:"phone"`
	About   string `json:"about"` // what they asked for
	Details string `json:"details"`
}

func (s *Service) Create(ctx context.Context, bizID string, in Input) (*Enquiry, error) {
	in.Name, in.About, in.Details = clean(in.Name), clean(in.About), strings.TrimSpace(in.Details)
	if in.Name == "" || in.About == "" {
		return nil, errors.New("add the person's name and what they asked for")
	}
	if len([]rune(in.Name)) > 120 || len([]rune(in.About)) > 200 || len([]rune(in.Details)) > 2000 {
		return nil, errors.New("keep the name under 120 characters, the request under 200 and the details under 2,000")
	}
	phone := ""
	if strings.TrimSpace(in.Phone) != "" {
		p, ok := httpx.NormalizePhone(in.Phone)
		if !ok {
			return nil, errors.New("that mobile number does not look right")
		}
		phone = p
	}
	items, _ := json.Marshal([]Item{{Name: in.About, Qty: 1}})
	var id string
	if err := s.pool.QueryRow(ctx, `insert into enquiries (business_id, items, name, phone, seller_notes, source)
		values ($1,$2::jsonb,$3,$4,$5,'manual') returning id`, bizID, string(items), in.Name, phone, in.Details).Scan(&id); err != nil {
		return nil, err
	}
	return s.Get(ctx, bizID, id)
}

const selectEnquiry = `select e.id, coalesce(e.conversation_id::text, ''), e.items, e.name, e.phone, e.answers, e.status,
	e.quoted_amount, e.quote_note, e.seller_notes, e.source, coalesce(c.contact_name, ''),
	coalesce(c.last_inbound_at > now() - interval '23 hours 45 minutes', false),
	to_char(e.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), to_char(e.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
	from enquiries e left join conversations c on c.id = e.conversation_id`

func scan(row pgx.Row) (*Enquiry, error) {
	var e Enquiry
	var items, answers []byte
	if err := row.Scan(&e.ID, &e.ConversationID, &items, &e.Name, &e.Phone, &answers, &e.Status, &e.QuotedAmount,
		&e.QuoteNote, &e.SellerNotes, &e.Source, &e.ContactName, &e.ChatOpen, &e.CreatedAt, &e.UpdatedAt); err != nil {
		return nil, err
	}
	e.Items, e.Answers = []Item{}, []Answer{}
	json.Unmarshal(items, &e.Items)
	json.Unmarshal(answers, &e.Answers)
	return &e, nil
}

func (s *Service) Get(ctx context.Context, bizID, id string) (*Enquiry, error) {
	e, err := scan(s.pool.QueryRow(ctx, selectEnquiry+` where e.id=$1 and e.business_id=$2`, id, bizID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return e, err
}

// List returns one status (or all of them when status is empty), newest first.
func (s *Service) List(ctx context.Context, bizID, status string, limit, offset int) ([]Enquiry, error) {
	rows, err := s.pool.Query(ctx, selectEnquiry+` where e.business_id=$1 and ($2 = '' or e.status = $2)
		order by e.created_at desc limit $3 offset $4`, bizID, status, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Enquiry{}
	for rows.Next() {
		e, err := scan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *e)
	}
	return out, rows.Err()
}

// Counts is how many enquiries sit in each status, for the tabs.
func (s *Service) Counts(ctx context.Context, bizID string) (map[string]int, error) {
	counts := map[string]int{}
	for _, st := range Statuses {
		counts[st] = 0
	}
	rows, err := s.pool.Query(ctx, `select status, count(*) from enquiries where business_id=$1 group by status`, bizID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var st string
		var n int
		if err := rows.Scan(&st, &n); err != nil {
			return nil, err
		}
		counts[st] = n
	}
	return counts, rows.Err()
}

// Patch is what the owner may change; omitted fields keep their value.
type Patch struct {
	Status       *string `json:"status"`
	QuotedAmount *int    `json:"quotedAmount"`
	QuoteNote    *string `json:"quoteNote"`
	SellerNotes  *string `json:"sellerNotes"`
}

func (p *Patch) check() error {
	if p.Status != nil && !slices.Contains(Statuses, *p.Status) {
		return errors.New("status must be new, contacted, quoted, won or lost")
	}
	if p.QuotedAmount != nil && (*p.QuotedAmount < 0 || *p.QuotedAmount > maxQuote) {
		return errors.New("the quoted price must be between ₹0 and ₹2 crore")
	}
	if p.QuoteNote != nil {
		note := strings.TrimSpace(*p.QuoteNote)
		if len([]rune(note)) > 500 {
			return errors.New("keep the note about the price under 500 characters")
		}
		p.QuoteNote = &note
	}
	if p.SellerNotes != nil && len([]rune(*p.SellerNotes)) > 2000 {
		return errors.New("keep your notes under 2,000 characters")
	}
	return nil
}

func (s *Service) Update(ctx context.Context, bizID, id string, p Patch) (*Enquiry, error) {
	if err := p.check(); err != nil {
		return nil, err
	}
	ct, err := s.pool.Exec(ctx, `update enquiries set status=coalesce($3, status), quoted_amount=coalesce($4, quoted_amount),
		quote_note=coalesce($5, quote_note), seller_notes=coalesce($6, seller_notes), updated_at=now()
		where id=$1 and business_id=$2`, id, bizID, p.Status, p.QuotedAmount, p.QuoteNote, p.SellerNotes)
	if err != nil {
		return nil, err
	}
	if ct.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	return s.Get(ctx, bizID, id)
}

// Quote records the price the owner is offering and sends it to the buyer on
// the chat the enquiry came from. sent is false when there is no chat to send
// it on or its messaging window has closed: the price is saved either way, and
// the owner is told to message the buyer themselves.
func (s *Service) Quote(ctx context.Context, bizID, id string, amount int, note string) (e *Enquiry, sent bool, err error) {
	if amount <= 0 {
		return nil, false, errors.New("enter the price you are quoting")
	}
	quoted := "quoted"
	if e, err = s.Update(ctx, bizID, id, Patch{Status: &quoted, QuotedAmount: &amount, QuoteNote: &note}); err != nil {
		return nil, false, err
	}
	if e.ConversationID == "" || s.dm == nil {
		return e, false, nil
	}
	var store string
	if err := s.pool.QueryRow(ctx, `select name from businesses where id=$1`, bizID).Scan(&store); err != nil {
		return e, false, nil
	}
	return e, s.dm(ctx, e.ConversationID, QuoteMessage(store, e)) == nil, nil
}

// QuoteMessage is the quote as the buyer reads it. Written here, not by the
// assistant: it carries the money.
func QuoteMessage(store string, e *Enquiry) string {
	var b strings.Builder
	fmt.Fprintf(&b, "💬 Quote from %s\n", store)
	if title := e.Title(); title != "" {
		b.WriteString(title + "\n")
	}
	fmt.Fprintf(&b, "Price: %s\n", notify.Rupees(e.QuotedAmount))
	if e.QuoteNote != "" {
		b.WriteString(e.QuoteNote + "\n")
	}
	b.WriteString("Reply here to go ahead, or ask us anything.")
	return b.String()
}

// Fact is what the assistant may say about the enquiry a chat already made.
type Fact struct {
	Lead
	Status       string
	QuotedAmount int
	QuoteNote    string
}

// ForChat is the latest enquiry from one chat, nil when there is none.
func (s *Service) ForChat(ctx context.Context, convID string) *Fact {
	var f Fact
	var items, answers []byte
	if err := s.pool.QueryRow(ctx, `select items, answers, name, phone, status, quoted_amount, quote_note from enquiries
		where conversation_id=$1 order by created_at desc limit 1`, convID).Scan(
		&items, &answers, &f.Name, &f.Phone, &f.Status, &f.QuotedAmount, &f.QuoteNote); err != nil {
		return nil
	}
	json.Unmarshal(items, &f.Items)
	json.Unmarshal(answers, &f.Answers)
	return &f
}

// clean keeps a typed field to one printable line.
func clean(s string) string { return strings.Join(strings.Fields(s), " ") }

func orEmpty(a []Answer) []Answer {
	if a == nil {
		return []Answer{}
	}
	return a
}
