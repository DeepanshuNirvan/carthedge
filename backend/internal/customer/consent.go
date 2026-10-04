package customer

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// Marketing consent. WhatsApp offers go only to buyers who said yes, and every
// yes and no is kept with what the buyer saw or sent, where and when: the
// proof a seller needs if a buyer, Meta or a regulator asks (WhatsApp Business
// Messaging Policy; DPDP Act 2023, s.6).

// Where an answer came from.
const (
	SourceCheckout  = "checkout"         // the unticked box at checkout
	SourceOrderPage = "order_page"       // the order tracking page, behind OTP
	SourceWhatsApp  = "whatsapp"         // STOP / START sent to the shop's number
	SourceLink      = "unsubscribe_link" // the link at the foot of every broadcast
	SourceSeller    = "seller"           // the seller, at the buyer's request (stop only)
)

// OptInWording is the sentence beside the checkout box. It names the shop and
// the channel, as WhatsApp's opt-in rules require, and it is stored with every
// yes, so the record shows exactly what the buyer agreed to.
func OptInWording(store string) string {
	return fmt.Sprintf("Send me offers and new arrivals from %s on WhatsApp. I can stop them any time.", store)
}

// Proof is where an answer was given from.
type Proof struct {
	IP        string
	UserAgent string
}

// Consent is one yes or no to marketing messages.
type Consent struct {
	BusinessID string
	Phone      string
	OptIn      bool
	Source     string
	Wording    string // what the buyer agreed to, or the message they sent
	OrderID    string
	Name       string // for a WhatsApp START from someone who has not ordered yet
	Proof
}

// DB is a pool or a transaction: inside an order the answer is written on the
// order's transaction, so a refused order records nothing.
type DB interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// RecordConsent sets the buyer's current answer and appends it to the log.
func RecordConsent(ctx context.Context, db DB, c Consent) error {
	if c.BusinessID == "" || c.Phone == "" || c.Source == "" {
		return errors.New("consent needs a business, a phone and a source")
	}
	var customerID *string
	err := db.QueryRow(ctx, `update customers set marketing_opt_in=$3, marketing_updated_at=now(), updated_at=now()
		where business_id=$1 and phone=$2 returning id`, c.BusinessID, c.Phone, c.OptIn).Scan(&customerID)
	if errors.Is(err, pgx.ErrNoRows) && c.OptIn {
		// a yes on WhatsApp from someone who has not ordered: they join the
		// ledger as a subscriber, so broadcasts can reach them
		name := strings.TrimSpace(c.Name)
		if name == "" {
			name = "WhatsApp subscriber"
		}
		err = db.QueryRow(ctx, `insert into customers (business_id, name, phone, marketing_opt_in, marketing_updated_at)
			values ($1,$2,$3,true,now()) returning id`, c.BusinessID, name, c.Phone).Scan(&customerID)
	} else if errors.Is(err, pgx.ErrNoRows) {
		err = nil // a no from someone not in the ledger: the log still keeps it
	}
	if err != nil {
		return err
	}
	_, err = db.Exec(ctx, `insert into marketing_consents
		(business_id, customer_id, phone, opt_in, source, wording, order_id, ip, user_agent)
		values ($1,$2,$3,$4,$5,$6,nullif($7,'')::uuid,$8,$9)`,
		c.BusinessID, customerID, c.Phone, c.OptIn, c.Source, clipText(c.Wording, 500), c.OrderID,
		clipText(c.IP, 64), clipText(c.UserAgent, 300))
	return err
}

func clipText(s string, n int) string {
	if r := []rune(s); len(r) > n {
		return string(r[:n])
	}
	return s
}

// ConsentEvent is one entry of a buyer's consent history, as the seller sees it.
type ConsentEvent struct {
	OptIn     bool   `json:"optIn"`
	Source    string `json:"source"`
	Wording   string `json:"wording"`
	OrderCode string `json:"orderCode,omitempty"`
	At        string `json:"at"`
}

// ConsentHistory is a buyer's yes/no record, newest first.
func (s *Service) ConsentHistory(ctx context.Context, bizID, id string) ([]ConsentEvent, error) {
	rows, err := s.pool.Query(ctx, `select m.opt_in, m.source, m.wording, coalesce(o.order_code, ''),
		to_char(m.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		from marketing_consents m
		join customers c on c.business_id = m.business_id and c.phone = m.phone
		left join orders o on o.id = m.order_id
		where c.business_id=$1 and c.id=$2 order by m.created_at desc limit 20`, bizID, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ConsentEvent{}
	for rows.Next() {
		var e ConsentEvent
		if err := rows.Scan(&e.OptIn, &e.Source, &e.Wording, &e.OrderCode, &e.At); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// StopMarketing is the seller turning offers off for a buyer who asked them
// to. A seller can never turn them on: only the buyer's own yes counts.
func (s *Service) StopMarketing(ctx context.Context, bizID, id string, proof Proof) error {
	var phone string
	err := s.pool.QueryRow(ctx, `select phone from customers where business_id=$1 and id=$2`, bizID, id).Scan(&phone)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	return RecordConsent(ctx, s.pool, Consent{BusinessID: bizID, Phone: phone, OptIn: false, Source: SourceSeller,
		Wording: "Stopped by the seller at the buyer's request", Proof: proof})
}

// The link at the foot of a broadcast names the customer by a signed token:
// their id and a short HMAC, so it carries no phone number and cannot be
// forged for someone else.
const tokenSigBytes = 9

var errBadToken = errors.New("this link is not valid")

// UnsubscribeToken is the token for one customer's stop link.
func (s *Service) UnsubscribeToken(customerID string) string {
	id, err := hex.DecodeString(strings.ReplaceAll(customerID, "-", ""))
	if err != nil || len(id) != 16 {
		return ""
	}
	return base64.RawURLEncoding.EncodeToString(append(id, s.sign(id)...))
}

func (s *Service) sign(b []byte) []byte {
	mac := hmac.New(sha256.New, s.linkKey)
	mac.Write(b)
	return mac.Sum(nil)[:tokenSigBytes]
}

// LinkSubscriber is who a stop link belongs to.
type LinkSubscriber struct {
	BusinessID string `json:"-"`
	Phone      string `json:"-"`
	Store      string `json:"store"`
	OptedIn    bool   `json:"optedIn"`
}

// ByUnsubscribeToken resolves a stop link.
func (s *Service) ByUnsubscribeToken(ctx context.Context, token string) (*LinkSubscriber, error) {
	id, ok := s.tokenCustomer(token)
	if !ok {
		return nil, errBadToken
	}
	var sub LinkSubscriber
	err := s.pool.QueryRow(ctx, `select c.business_id, c.phone, b.name, c.marketing_opt_in from customers c
		join businesses b on b.id = c.business_id where c.id=$1 and b.status='active'`, id).Scan(
		&sub.BusinessID, &sub.Phone, &sub.Store, &sub.OptedIn)
	if err != nil {
		return nil, errBadToken
	}
	return &sub, nil
}

// tokenCustomer checks a stop-link token and returns the customer id in it.
func (s *Service) tokenCustomer(token string) (string, bool) {
	raw, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil || len(raw) != 16+tokenSigBytes || !hmac.Equal(raw[16:], s.sign(raw[:16])) {
		return "", false
	}
	h := hex.EncodeToString(raw[:16])
	return h[:8] + "-" + h[8:12] + "-" + h[12:16] + "-" + h[16:20] + "-" + h[20:], true
}

// Keyword reads a WhatsApp message that is only a stop or start request:
// "STOP", "Stop promotions" (the button WhatsApp puts on marketing templates),
// "unsubscribe", "START". Anything longer is a conversation, not a request.
func Keyword(text string) (optIn bool, ok bool) {
	t := strings.Join(strings.FieldsFunc(strings.ToLower(text), func(r rune) bool {
		return !(r >= 'a' && r <= 'z')
	}), " ")
	switch t {
	case "stop", "stop promotions", "stop offers", "unsubscribe", "opt out", "optout":
		return false, true
	case "start", "subscribe", "start offers", "opt in", "optin":
		return true, true
	}
	return false, false
}
