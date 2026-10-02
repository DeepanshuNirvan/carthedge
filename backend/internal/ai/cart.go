package ai

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"carthedge/internal/customer"
	"carthedge/internal/httpx"
	"carthedge/internal/notify"
	"carthedge/internal/product"
)

// Cart is the order a buyer is building in a chat. It lives on the
// conversation between turns; the model proposes changes, Go checks them.
type Cart struct {
	Items   []CartItem       `json:"items"`
	Name    string           `json:"name"`
	Phone   string           `json:"phone"`
	Address customer.Address `json:"address"`
	Payment string           `json:"payment"` // cod | prepaid | ""
}

type CartItem struct {
	ProductID string `json:"productId"`
	Name      string `json:"name"`
	Variant   string `json:"variant"`
	Qty       int    `json:"qty"`
}

// Store is everything about the seller a chat turn may rely on.
type Store struct {
	ID                string
	Name              string
	Code              string
	City              string
	Notes             string
	BaseURL           string
	ShippingFee       int
	FreeShippingAbove int
	CodEnabled        bool
	CodTokenAmount    int
	OnlinePay         bool
	Products          []product.Product // active products, in stock or not
}

func (st Store) storeLink() string { return st.BaseURL + "/s/" + st.Code }

func (st Store) productLink(id string) string { return st.BaseURL + "/s/" + st.Code + "/p/" + id }

// QuoteLine is one checked, priced cart line.
type QuoteLine struct {
	ProductID string
	VariantID string
	Name      string
	Variant   string
	Qty       int
	Price     int // paise, per unit
}

type Quote struct {
	Lines    []QuoteLine
	Subtotal int
	Shipping int
	Total    int
}

const maxQty = 20

// check validates a proposed cart against the live catalog. Items the shop
// cannot sell are dropped and explained in problems; what an order still needs
// is listed in missing. Prices come from the catalog only.
func (st Store) check(c Cart) (Cart, Quote, []string, []string) {
	var problems, missing []string
	var q Quote
	var kept []CartItem
	for _, it := range c.Items {
		p, ok := st.find(it)
		if !ok {
			if it.Name != "" {
				problems = append(problems, fmt.Sprintf("%q is not something the shop sells", it.Name))
			}
			continue
		}
		if !p.InStock {
			problems = append(problems, p.Name+" is out of stock")
			continue
		}
		it.ProductID, it.Name = p.ID, p.Name
		if it.Qty < 1 {
			it.Qty = 1
		}
		if it.Qty > maxQty {
			problems = append(problems, fmt.Sprintf("%d × %s is more than we take in a chat order", it.Qty, p.Name))
			it.Qty = maxQty
		}
		line := QuoteLine{ProductID: p.ID, Name: p.Name, Qty: it.Qty, Price: p.Price}
		if len(p.Variants) > 0 {
			v, found := variantByName(p, it.Variant)
			switch {
			case it.Variant == "":
				missing = append(missing, fmt.Sprintf("which option of %s (%s)", p.Name, optionList(p)))
			case !found:
				problems = append(problems, fmt.Sprintf("%s has no option %q (available: %s)", p.Name, it.Variant, optionList(p)))
				it.Variant = ""
				missing = append(missing, fmt.Sprintf("which option of %s (%s)", p.Name, optionList(p)))
			case v.InStock != nil && !*v.InStock:
				problems = append(problems, fmt.Sprintf("%s in %s is out of stock (available: %s)", p.Name, v.Name, optionList(p)))
				it.Variant = ""
				missing = append(missing, fmt.Sprintf("which option of %s (%s)", p.Name, optionList(p)))
			default:
				it.Variant, line.VariantID, line.Variant = v.Name, v.ID, v.Name
				if v.Price > 0 {
					line.Price = v.Price
				}
				if n := v.Qty(); n >= 0 && it.Qty > n {
					problems = append(problems, fmt.Sprintf("only %d of %s (%s) left", n, p.Name, v.Name))
					it.Qty = n
				}
			}
		} else if p.StockQty >= 0 && it.Qty > p.StockQty {
			problems = append(problems, fmt.Sprintf("only %d of %s left", p.StockQty, p.Name))
			it.Qty = p.StockQty
		}
		if it.Qty < 1 {
			continue
		}
		line.Qty = it.Qty
		kept = append(kept, it)
		if line.VariantID != "" || len(p.Variants) == 0 {
			q.Lines = append(q.Lines, line)
			q.Subtotal += line.Price * line.Qty
		}
	}
	c.Items = kept
	if len(c.Items) == 0 {
		missing = append([]string{"what they would like to order"}, missing...)
	}

	if c.Phone != "" {
		if p, ok := httpx.NormalizePhone(c.Phone); ok {
			c.Phone = p
		} else {
			problems = append(problems, "the phone number "+c.Phone+" is not a valid 10-digit mobile number")
			c.Phone = ""
		}
	}
	if c.Address.Pincode != "" && !httpx.ValidPincode(c.Address.Pincode) {
		problems = append(problems, "pincode "+c.Address.Pincode+" is not a valid 6-digit pincode")
		c.Address.Pincode = ""
	}
	switch {
	case c.Payment == "cod" && !st.CodEnabled:
		problems = append(problems, "cash on delivery is not available at this shop")
		c.Payment = ""
	case c.Payment == "prepaid" && !st.OnlinePay:
		problems = append(problems, "online payment is not available at this shop")
		c.Payment = ""
	case c.Payment != "cod" && c.Payment != "prepaid":
		c.Payment = ""
	}

	if c.Name == "" {
		missing = append(missing, "their name")
	}
	if c.Phone == "" {
		missing = append(missing, "their 10-digit mobile number")
	}
	if c.Address.Line == "" {
		missing = append(missing, "full delivery address (house, street, area, city)")
	}
	if c.Address.Pincode == "" {
		missing = append(missing, "6-digit pincode")
	}
	if c.Payment == "" {
		missing = append(missing, "how they want to pay ("+st.payOptions()+")")
	}

	if q.Subtotal > 0 {
		q.Shipping = st.ShippingFee
		if st.FreeShippingAbove > 0 && q.Subtotal >= st.FreeShippingAbove {
			q.Shipping = 0
		}
		q.Total = q.Subtotal + q.Shipping
	}
	return c, q, problems, missing
}

func (st Store) payOptions() string {
	var opts []string
	if st.CodEnabled {
		opts = append(opts, "cash on delivery")
	}
	if st.OnlinePay {
		opts = append(opts, "online by UPI/card through the order link")
	}
	if len(opts) == 0 {
		return "the shop will confirm payment"
	}
	return strings.Join(opts, " or ")
}

// find resolves an item by catalog id, falling back to an exact name match —
// models occasionally drop the id but keep the product's name.
func (st Store) find(it CartItem) (product.Product, bool) {
	for _, p := range st.Products {
		if it.ProductID != "" && p.ID == it.ProductID {
			return p, true
		}
	}
	for _, p := range st.Products {
		if it.Name != "" && strings.EqualFold(strings.TrimSpace(p.Name), strings.TrimSpace(it.Name)) {
			return p, true
		}
	}
	return product.Product{}, false
}

func variantByName(p product.Product, name string) (product.Variant, bool) {
	for _, v := range p.Variants {
		if name != "" && strings.EqualFold(strings.TrimSpace(v.Name), strings.TrimSpace(name)) {
			return v, true
		}
	}
	return product.Variant{}, false
}

func optionList(p product.Product) string {
	var names []string
	for _, v := range p.Variants {
		if v.InStock == nil || *v.InStock {
			names = append(names, v.Name)
		}
	}
	if len(names) == 0 {
		return "none in stock"
	}
	return strings.Join(names, ", ")
}

// hash pins the exact cart a summary showed, so "yes" confirms only that.
func (c Cart) hash() string {
	b, _ := json.Marshal(c)
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:8])
}

// summary is the order card the buyer confirms. Rendered in Go, never by the
// model: it carries the money.
func (st Store) summary(c Cart, q Quote) string {
	var b strings.Builder
	b.WriteString("🧾 Order summary\n")
	for _, l := range q.Lines {
		name := l.Name
		if l.Variant != "" {
			name += " (" + l.Variant + ")"
		}
		fmt.Fprintf(&b, "%d × %s — %s\n", l.Qty, name, inr(l.Price*l.Qty))
	}
	if q.Shipping > 0 {
		fmt.Fprintf(&b, "Delivery — %s\n", inr(q.Shipping))
	} else {
		b.WriteString("Delivery — free\n")
	}
	fmt.Fprintf(&b, "Total — %s\n", inr(q.Total))
	pay := "Cash on delivery"
	if c.Payment == "prepaid" {
		pay = "Online (payment link after confirming)"
	}
	fmt.Fprintf(&b, "Payment: %s\n", pay)
	addr := strings.TrimSpace(strings.Join(nonEmpty(c.Address.Line, c.Address.City, c.Address.State), ", ") + " " + c.Address.Pincode)
	fmt.Fprintf(&b, "Deliver to: %s, %s · %s", c.Name, addr, c.Phone)
	return b.String()
}

func nonEmpty(parts ...string) []string {
	var out []string
	for _, p := range parts {
		if s := strings.TrimSpace(p); s != "" {
			out = append(out, s)
		}
	}
	return out
}

// inr is the one money format buyers see.
var inr = notify.Rupees

var amountRe = regexp.MustCompile(`(?i)(?:₹|rs\.?|inr)\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)`)

// amounts finds every rupee amount written in a text, as paise.
func amounts(text string) []int {
	var out []int
	for _, m := range amountRe.FindAllStringSubmatch(text, -1) {
		f, err := strconv.ParseFloat(strings.ReplaceAll(m[1], ",", ""), 64)
		if err == nil {
			out = append(out, int(f*100+0.5))
		}
	}
	return out
}

var urlRe = regexp.MustCompile(`https?://[^\s)\]>"']+`)

// grounded reports whether every amount and link in reply appears in facts.
// It is the backstop behind the prompt: a model that invents a price or a
// link does not get to send it.
func grounded(reply, facts string) (bool, string) {
	allowed := map[int]bool{}
	for _, a := range amounts(facts) {
		allowed[a] = true
	}
	for _, a := range amounts(reply) {
		if !allowed[a] {
			return false, "the amount " + inr(a) + " is not in the facts"
		}
	}
	for _, u := range urlRe.FindAllString(reply, -1) {
		u = strings.TrimRight(u, ".,!?;:")
		if !strings.Contains(facts, u) {
			return false, "the link " + u + " is not in the facts"
		}
	}
	return true, ""
}

// Action is what a turn does with the buyer's message.
type Action string

const (
	ActSilent  Action = "silent"  // nothing worth answering ("ok", 👍, spam)
	ActReply   Action = "reply"   // answer, ask for what is missing
	ActSummary Action = "summary" // cart complete: show the summary, ask to confirm
	ActPlace   Action = "place"   // buyer said yes to the summary they were shown
	ActHandoff Action = "handoff" // a person from the shop must take over
)

// decide is the whole conversation policy, kept pure so it can be tested
// exhaustively. The model reports what the buyer meant; this decides what
// happens, and nothing reaches an order without passing through here.
func decide(u Understanding, stage, summaryHash string, c Cart, complete bool) Action {
	if u.Handoff != "" {
		return ActHandoff
	}
	if u.Confirmed && stage == "confirming" && complete && c.hash() == summaryHash {
		return ActPlace
	}
	// a complete cart the buyer has not been shown yet gets its summary even if
	// the last message was "ok" or a side question — otherwise the chat stalls
	// one step from an order. Only a no, a later or spam holds it back.
	shown := stage == "confirming" && c.hash() == summaryHash
	if complete && !shown && u.Intent != "decline" && u.Intent != "later" && u.Intent != "spam" {
		return ActSummary
	}
	if !u.needsReply() {
		return ActSilent
	}
	return ActReply
}
