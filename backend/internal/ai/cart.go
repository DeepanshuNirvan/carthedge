package ai

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"unicode"

	"carthedge/internal/customer"
	"carthedge/internal/httpx"
	"carthedge/internal/notify"
	"carthedge/internal/product"
	"carthedge/internal/shop"
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
	// what the seller configured: policies and FAQs the assistant quotes,
	// how it talks and when it hands off, and the checkout charges
	Policies shop.Policies
	Profile  shop.AIProfile
	Pricing  shop.Pricing
	Offers   []string // public coupon codes in words, shared only when the seller allows it
}

// checkout is the store's pricing as order creation sees it.
func (st Store) checkout() shop.Checkout {
	return shop.Checkout{ShippingFee: st.ShippingFee, FreeShippingAbove: st.FreeShippingAbove, Pricing: st.Pricing}
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
	Lines           []QuoteLine
	Subtotal        int
	Shipping        int
	CodFee          int
	PrepaidDiscount int
	Total           int
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
		p, ok, close := st.find(it)
		if !ok {
			switch {
			case len(close) > 0:
				problems = append(problems, fmt.Sprintf("not sure which product %q means — closest: %s. Ask which one they want",
					it.Name, strings.Join(close, ", ")))
			case it.Name != "":
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
	// the seller's COD ceiling is checked on the COD total, charge included
	codAllowed := st.Policies.CodMaxOrder == 0 || q.Subtotal == 0 ||
		st.checkout().Totals(q.Subtotal, 0, "cod").Total <= st.Policies.CodMaxOrder

	if c.Phone != "" {
		if p, ok := httpx.NormalizePhone(c.Phone); ok {
			c.Phone = p
		} else {
			problems = append(problems, "the phone number "+c.Phone+" looks incomplete")
			c.Phone = ""
		}
	}
	if c.Address.Pincode != "" && !httpx.ValidPincode(c.Address.Pincode) {
		problems = append(problems, "the pincode "+c.Address.Pincode+" looks wrong")
		c.Address.Pincode = ""
	}
	switch {
	case c.Payment == "cod" && !st.CodEnabled:
		problems = append(problems, "cash on delivery is not available at this shop")
		c.Payment = ""
	case c.Payment == "cod" && !codAllowed:
		problems = append(problems, "cash on delivery is available on orders up to "+inr(st.Policies.CodMaxOrder)+"; this order needs online payment")
		c.Payment = ""
	case c.Payment == "prepaid" && !st.OnlinePay:
		problems = append(problems, "online payment is not available at this shop")
		c.Payment = ""
	case c.Payment != "cod" && c.Payment != "prepaid":
		c.Payment = ""
	}

	// plain words on purpose: the writer echoes these, and form language
	// ("10-digit mobile number") is exactly what makes a chat feel automated
	if c.Name == "" {
		missing = append(missing, "name")
	}
	if c.Phone == "" {
		missing = append(missing, "phone number")
	}
	if c.Address.Line == "" {
		missing = append(missing, "address")
	}
	if c.Address.Pincode == "" {
		missing = append(missing, "pincode")
	}
	if c.Payment == "" {
		missing = append(missing, "payment: "+st.payOptions(codAllowed))
	}

	if q.Subtotal > 0 {
		// the same maths order creation runs, so the card matches the bill
		t := st.checkout().Totals(q.Subtotal, 0, c.Payment)
		q.Shipping, q.CodFee, q.PrepaidDiscount, q.Total = t.Shipping, t.CodFee, t.PrepaidDiscount, t.Total
	}
	return c, q, problems, missing
}

func (st Store) payOptions(codAllowed bool) string {
	var opts []string
	if st.CodEnabled && codAllowed {
		opts = append(opts, "cash on delivery")
	}
	if st.OnlinePay {
		opts = append(opts, "online (UPI or card)")
	}
	if len(opts) == 0 {
		return "the shop will confirm payment"
	}
	return strings.Join(opts, " or ")
}

// find resolves an item: by catalog id, by exact name, then by the buyer's own
// words ("pink wali kurti") when one product fits clearly. When it cannot
// decide, close names the nearest products so the reply can offer them —
// "which one do you mean?" sells; "we don't have that" loses the buyer.
func (st Store) find(it CartItem) (p product.Product, ok bool, close []string) {
	for _, p := range st.Products {
		if it.ProductID != "" && p.ID == it.ProductID {
			return p, true, nil
		}
	}
	for _, p := range st.Products {
		if it.Name != "" && strings.EqualFold(strings.TrimSpace(p.Name), strings.TrimSpace(it.Name)) {
			return p, true, nil
		}
	}
	words := keywords(it.Name)
	if len(words) == 0 {
		return product.Product{}, false, nil
	}
	best, hits := 0, []product.Product{}
	for _, p := range st.Products {
		text := strings.ToLower(p.Name + " " + p.Category + " " + p.Description)
		score := 0
		for _, w := range words {
			if strings.Contains(text, w) {
				score++
			}
		}
		switch {
		case score > best:
			best, hits = score, []product.Product{p}
		case score == best && score > 0:
			hits = append(hits, p)
		}
	}
	if best == 0 {
		return product.Product{}, false, nil
	}
	if len(hits) == 1 {
		return hits[0], true, nil
	}
	seen := map[string]bool{}
	for _, h := range hits {
		if !seen[h.Name] && len(close) < 3 {
			seen[h.Name] = true
			close = append(close, h.Name)
		}
	}
	return product.Product{}, false, close
}

// fillers carry no product meaning in how buyers describe what they want.
var fillers = map[string]bool{"wali": true, "wala": true, "wale": true, "chahiye": true, "chaiye": true, "the": true,
	"and": true, "for": true, "size": true, "want": true, "need": true, "please": true, "plz": true, "mujhe": true,
	"yeh": true, "woh": true, "vali": true, "vala": true, "one": true, "this": true, "that": true}

// keywords are the meaningful words of a product description, lowercased.
func keywords(s string) []string {
	var out []string
	for _, w := range strings.FieldsFunc(strings.ToLower(s), func(r rune) bool { return !unicode.IsLetter(r) && !unicode.IsDigit(r) }) {
		if len([]rune(w)) >= 3 && !fillers[w] {
			out = append(out, w)
		}
	}
	return out
}

// sameThing reports whether two descriptions share a meaningful word.
func sameThing(a, b string) bool {
	for _, x := range keywords(a) {
		for _, y := range keywords(b) {
			if x == y || strings.HasPrefix(x, y) || strings.HasPrefix(y, x) {
				return true
			}
		}
	}
	return false
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
	if q.CodFee > 0 {
		fmt.Fprintf(&b, "COD charge — %s\n", inr(q.CodFee))
	}
	if q.PrepaidDiscount > 0 {
		fmt.Fprintf(&b, "Online payment discount — -%s\n", inr(q.PrepaidDiscount))
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
