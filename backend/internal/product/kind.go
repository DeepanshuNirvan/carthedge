package product

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"unicode"

	"carthedge/internal/notify"

	"github.com/jackc/pgx/v5"
)

// What a catalog item is. A product is counted, shipped and paid for at
// checkout. A service is something the business does (a trip, an event, a
// repair, a class): it is booked by enquiry, so it is never stocked, never
// shipped and never enters an order (see ResolveLine).
const (
	KindProduct = "product"
	KindService = "service"
)

// How a price reads to a buyer.
const (
	PriceFixed = "fixed" // the price
	PriceFrom  = "from"  // where it starts
	PriceQuote = "quote" // the owner shares it per enquiry; the stored price is 0
)

// Question is one thing the assistant finds out before it hands an enquiry to
// the owner ("Event date", "Number of guests"). The seller writes the label, so
// no trade is built into the code.
type Question struct {
	Label    string `json:"label"`
	Required bool   `json:"required"`
}

const (
	maxQuestions     = 8
	maxQuestionLabel = 60
	maxPriceUnit     = 30
)

// IsService is the one place the rest of the code asks what an item is.
func (p Product) IsService() bool { return p.Kind == KindService }

// PriceLabel is the price in a buyer's words: "₹1,499", "from ₹2,500 per
// person", "price on request". For a product it is exactly the rupee amount.
func (p Product) PriceLabel() string {
	if p.PriceKind == PriceQuote {
		return "price on request"
	}
	label := notify.Rupees(p.Price)
	if p.PriceKind == PriceFrom {
		label = "from " + label
	}
	if p.PriceUnit != "" {
		label += " " + p.PriceUnit
	}
	return label
}

// defaults fills the kind and price type a client left out: a new item is a
// fixed-price product, an edited one keeps what it was.
func (in *Input) defaults(kind, priceKind string) {
	if in.Kind == "" {
		in.Kind = kind
	}
	if in.PriceKind == "" {
		in.PriceKind = priceKind
	}
}

// widenSells keeps the business's "what do you sell" in step with its catalog:
// the first service in a product catalog (or the first product among services)
// makes it "both". The setting only words the app and the assistant, so it is
// never narrowed behind the seller's back.
func widenSells(ctx context.Context, tx pgx.Tx, bizID, kind string) error {
	_, err := tx.Exec(ctx, `update businesses set sells='both', updated_at=now() where id=$1
		and ((sells='products' and $2='service') or (sells='services' and $2='product'))`, bizID, kind)
	return err
}

// oneLine keeps seller-typed labels to a single printable line: they are shown
// to buyers and read by the assistant, so no line breaks or control characters.
func oneLine(s string) string {
	s = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return ' '
		}
		return r
	}, s)
	return strings.Join(strings.Fields(s), " ")
}

// shapeKind validates what kind of item this is and how it is priced, and
// drops the fields that do not apply to it.
func (in *Input) shapeKind() error {
	if in.Kind != KindProduct && in.Kind != KindService {
		return errors.New("kind must be product or service")
	}
	if !slices.Contains([]string{PriceFixed, PriceFrom, PriceQuote}, in.PriceKind) {
		return errors.New("priceKind must be fixed, from or quote")
	}
	if in.Kind == KindProduct {
		none := ""
		if in.PriceKind != PriceFixed {
			return errors.New(`only a service can be priced "starting from" or "on request"`)
		}
		if in.Price <= 0 {
			return errors.New("price must be positive (in paise)")
		}
		in.PriceUnit, in.Ask = &none, []Question{}
		return nil
	}

	// a service has no counted stock, no reseller price and no packaged-goods
	// label; cleared rather than kept, so a product turned into a service does
	// not carry an MRP or a size chart onto its page
	zero, blank := 0, ""
	in.StockQty, in.ResellerPrice = nil, 0
	in.MRP, in.OriginCountry, in.Manufacturer, in.SizeChart = &zero, &blank, &blank, &blank
	for i := range in.Variants {
		in.Variants[i].StockQty = nil
	}
	if in.PriceKind == PriceQuote {
		// the owner shares the price per enquiry: nothing is stored that the
		// assistant or the store page could quote by mistake
		in.Price, in.ComparePrice = 0, 0
		for i := range in.Variants {
			in.Variants[i].Price = 0
		}
	} else if in.Price <= 0 {
		return errors.New("add the price, or set it to \"on request\"")
	}
	if in.PriceUnit != nil {
		unit := oneLine(*in.PriceUnit)
		if len([]rune(unit)) > maxPriceUnit {
			return fmt.Errorf("keep the price unit under %d characters, like \"per person\"", maxPriceUnit)
		}
		in.PriceUnit = &unit
	}
	if in.Ask == nil {
		return nil
	}
	if len(in.Ask) > maxQuestions {
		return fmt.Errorf("at most %d questions per service", maxQuestions)
	}
	kept, seen := []Question{}, map[string]bool{}
	for _, q := range in.Ask {
		q.Label = oneLine(q.Label)
		if q.Label == "" {
			continue
		}
		if n := len([]rune(q.Label)); n < 2 || n > maxQuestionLabel {
			return fmt.Errorf("each question needs 2 to %d characters, like \"Event date\"", maxQuestionLabel)
		}
		key := strings.ToLower(q.Label)
		if seen[key] {
			return fmt.Errorf("%q is asked twice", q.Label)
		}
		seen[key] = true
		kept = append(kept, q)
	}
	in.Ask = kept
	return nil
}
