package ai

import (
	"fmt"
	"strings"

	"carthedge/internal/enquiry"
	"carthedge/internal/product"
)

// A chat about a service does not end in an order. The assistant answers from
// the service's details, finds out what the business said it needs to know,
// and hands the owner an enquiry. It never prices one, never confirms a date
// and never books: the owner does that. Nothing here knows what trade the
// business is in — the questions are the seller's own.

// understandServices is added to the understanding step when the catalog has a
// service in it. A catalog of products only never sees it.
const understandServices = `
- Catalog rows ending in "SERVICE" are things the business does, not items it ships. Put one in cart.items like any other item when the buyer asks about it or wants it (qty = how many people, days or units the buyer said, else 1). Never ask for or invent an address, pincode or payment for a service.
- cart.answers holds the details a service row lists under "needs": one {"label","value"} for each detail the buyer has given, label copied exactly from the row, value in the buyer's own words ("12 Dec", "15-20 log", "Jaipur to Udaipur"). Keep the answers already in the order being built. Never guess or fill in a detail the buyer has not given; leave it out instead.
- For a service, intent is "order" when the buyer wants it, wants to book, or gives these details. confirmed stays false: there is no order summary for a service.
- A buyer who asks to book a service, or asks whether a date or slot is free, before the chat shows their "📝 Your enquiry" recap is NOT a handoff: it is intent "order", and the shop will ask for the details it needs.
- Once the chat shows the "📝 Your enquiry" recap the owner already has it: a thank-you or an ok after it is intent "ack" with handoff "", and a new detail is intent "change".
- handoff only when, after that recap, the buyer accepts a price the owner quoted in this chat or wants to pay for or finalise the booking: the owner does that personally.`

// writeServices is added to the writer's hard rules when the catalog has a
// service in it.
const writeServices = `
- Items marked "kind":"service" in the facts are things the business does. Nothing is packed or shipped for them: never mention packing, delivery, stock, cash on delivery or an address for a service.
- For a service, answer what they asked from its details, then ask for the next thing the task names, casually, one short question at a time ("Kab ke liye chahiye aapko?" / "Kitne log honge?" / "When do you need it?").
- Say a service's price exactly as the facts write it ("from ₹2,500 per person"). If it says "price on request", never state, estimate or hint at a number: say the owner will share the exact price here.
- Never say a date, time, slot, seat, room, vehicle or person is available, free, booked, reserved or confirmed, and never promise when the owner will reply: only the owner can. You may say you have noted their details. When they ask "is it available?" or "book it", do not open with "yes", "haan" or "sure": a buyer reads that as a confirmation. Say the owner will check that date.`

// HasServices reports whether anything in the catalog is a service.
func (st Store) HasServices() bool {
	for _, p := range st.Products {
		if p.IsService() {
			return true
		}
	}
	return false
}

// ships reports whether the business sends anything to anyone: a business that
// only offers services has no delivery, COD or return facts worth quoting.
func (st Store) ships() bool { return st.Sells != "services" }

func (st Store) product(id string) (product.Product, bool) {
	for _, p := range st.Products {
		if id != "" && p.ID == id {
			return p, true
		}
	}
	return product.Product{}, false
}

// placeholders are what models write where the buyer said nothing.
var placeholders = map[string]bool{"": true, "unknown": true, "not specified": true, "not provided": true,
	"not given": true, "not mentioned": true, "n/a": true, "na": true, "none": true, "null": true, "-": true, "?": true}

// answersFor keeps only the answers a service in the cart actually asks for,
// under the seller's own spelling of the label and cut to a sane length. The
// model proposes answers; this is what stops it storing anything else.
func (st Store) answersFor(c Cart) []enquiry.Answer {
	var out []enquiry.Answer
	seen := map[string]bool{}
	for _, it := range c.Items {
		p, ok := st.product(it.ProductID)
		if !ok || !p.IsService() {
			continue
		}
		for _, q := range p.Ask {
			key := strings.ToLower(q.Label)
			if seen[key] {
				continue
			}
			for _, a := range c.Answers {
				value := clip(a.Value, 200)
				if strings.EqualFold(strings.TrimSpace(a.Label), q.Label) && !placeholders[strings.ToLower(value)] {
					seen[key] = true
					out = append(out, enquiry.Answer{Label: q.Label, Value: value})
					break
				}
			}
		}
	}
	return out
}

// mergeAnswers keeps what the buyer already told us: a newer answer replaces
// the old one for the same detail, and a detail the model dropped stays.
func mergeAnswers(prev, next []enquiry.Answer) []enquiry.Answer {
	if len(prev) == 0 {
		return next
	}
	out := append([]enquiry.Answer(nil), prev...)
	for _, n := range next {
		if strings.TrimSpace(n.Value) == "" {
			continue
		}
		found := false
		for i := range out {
			if strings.EqualFold(out[i].Label, n.Label) {
				out[i].Value, found = n.Value, true
				break
			}
		}
		if !found {
			out = append(out, n)
		}
	}
	return out
}

// enquire reads the services in a checked cart as an enquiry: what was asked
// about, the details given so far, and what the business still wants to know
// (its required questions, then a name and a number). ready means it can go
// to the owner. contactPhone is the number the chat itself is on (WhatsApp),
// used when the buyer has not given another.
func (st Store) enquire(c Cart, contactPhone string) (lead enquiry.Lead, asks []string, ready bool) {
	asked := map[string]bool{}
	for _, it := range c.Items {
		p, ok := st.product(it.ProductID)
		if !ok || !p.IsService() {
			continue
		}
		item := enquiry.Item{ProductID: p.ID, Name: p.Name, Qty: it.Qty}
		if len(p.Variants) > 0 {
			if ch := p.Choose(it.Variant); ch.Found {
				item.Option = ch.Variant.Name
			}
		}
		lead.Items = append(lead.Items, item)
		for _, q := range p.Ask {
			key := strings.ToLower(q.Label)
			if asked[key] {
				continue
			}
			asked[key] = true
			answered := false
			for _, a := range c.Answers {
				if strings.EqualFold(a.Label, q.Label) {
					lead.Answers, answered = append(lead.Answers, a), true
					break
				}
			}
			if !answered && q.Required {
				asks = append(asks, q.Label)
			}
		}
	}
	if len(lead.Items) == 0 {
		return enquiry.Lead{}, nil, false
	}
	lead.Name, lead.Phone = c.Name, c.Phone
	if lead.Phone == "" {
		lead.Phone = contactPhone
	}
	if lead.Name == "" {
		asks = append(asks, "name")
	}
	if lead.Phone == "" {
		asks = append(asks, "phone number")
	}
	return lead, asks, len(asks) == 0
}

// recap is the card the buyer sees when their enquiry goes to the owner.
// Rendered in Go like the order summary: it is what the owner will act on.
func (st Store) recap(l enquiry.Lead) string {
	var b strings.Builder
	b.WriteString("📝 Your enquiry\n")
	for _, it := range l.Items {
		name := it.Name
		if it.Option != "" {
			name += " (" + it.Option + ")"
		}
		if it.Qty > 1 {
			name += fmt.Sprintf(" × %d", it.Qty)
		}
		b.WriteString(name + "\n")
	}
	for _, a := range l.Answers {
		fmt.Fprintf(&b, "%s: %s\n", a.Label, a.Value)
	}
	fmt.Fprintf(&b, "%s · %s", l.Name, l.Phone)
	return b.String()
}

// leadTask tells the writer what to say around the recap card. The models
// sometimes list what the shop "still needs" among the buyer's questions; at
// this point nothing is needed, so anything about a name or a number is
// dropped rather than asked again.
func leadTask(u Understanding, updated bool, opens string) string {
	var asked []string
	for _, q := range u.Questions {
		if l := strings.ToLower(q); !containsAny(l, "phone", "number", "name", "contact") {
			asked = append(asked, q)
		}
	}
	u.Questions = asked
	open := "You now have everything the business needs for their enquiry, including their name and phone number. Write one short line saying you have noted it down"
	if updated {
		open = "They changed the details of their enquiry. Write one short line saying it is updated"
	}
	close := "the owner will get back to them here with the full details and the price. Do not promise a time."
	if opens != "" {
		close = "the business is closed right now and the owner will reply here when it opens " + opens + "."
	}
	return answerFirst(u) + open + ", then put the exact token " + summaryToken +
		" on its own line (it will be replaced by their details), then one short line saying " + close +
		" Do not list their details yourself, do not ask them for anything more, and do not say anything is available, booked or confirmed."
}

// enquiryStatus is where an enquiry stands, in words the assistant may repeat.
var enquiryStatus = map[string]string{
	"new":       "noted and with the owner, who will reply here",
	"contacted": "the owner has been in touch about it",
	"quoted":    "the owner has sent a price for it",
	"won":       "confirmed by the owner",
	"lost":      "closed",
}

// enquiryFact is what the writer may say about the enquiry this chat already
// made, including a price the owner has quoted for it.
func enquiryFact(f *enquiry.Fact) map[string]any {
	out := map[string]any{"about": f.Title(), "status": enquiryStatus[f.Status]}
	if len(f.Answers) > 0 {
		out["details"] = f.Answers
	}
	if f.QuotedAmount > 0 {
		out["priceQuotedByOwner"] = inr(f.QuotedAmount)
		if f.QuoteNote != "" {
			out["quoteNote"] = clip(f.QuoteNote, 300)
		}
	}
	return out
}

// serviceCell marks a catalog row as a service for the understanding step and
// lists what the business wants to know before it takes the enquiry.
func serviceCell(p product.Product) string {
	var must, nice []string
	for _, q := range p.Ask {
		if q.Required {
			must = append(must, q.Label)
		} else {
			nice = append(nice, q.Label)
		}
	}
	cell := " | SERVICE"
	if len(must) > 0 {
		cell += "; needs: " + strings.Join(must, ", ")
	}
	if len(nice) > 0 {
		cell += "; note if said: " + strings.Join(nice, ", ")
	}
	return cell
}

// together joins two lists of things still needed, without repeats: a chat
// with a product and a service needs a name for both, asked once.
func together(a, b []string) []string {
	out := append([]string(nil), a...)
	for _, x := range b {
		dup := false
		for _, y := range a {
			if x == y {
				dup = true
				break
			}
		}
		if !dup {
			out = append(out, x)
		}
	}
	return out
}
