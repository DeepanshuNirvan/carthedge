package product

import (
	"errors"
	"fmt"
	"slices"
	"strings"
	"unicode"
)

// Option is one way a product varies: Size, Colour, Storage, Finish, Pack.
// Every variant is one value from each option, in this order, and is named by
// joining them ("M / Pink") — the name orders, invoices, share links and the
// assistant already use, so none of them needs to know about options.
type Option struct {
	Name   string        `json:"name"`
	Values []OptionValue `json:"values"`
}

// OptionValue is one choice. Images are photos of the product in this choice
// (the pink kurti, the rose-gold finish), taken from the product's own photos:
// picking the value shows them first.
type OptionValue struct {
	Name   string   `json:"name"`
	Images []string `json:"images,omitempty"`
}

const (
	maxOptions      = 3
	maxOptionValues = 30
	maxVariants     = 100
	maxValueImages  = 10
)

// legacyOption names the single group a product gets when its variants come
// without groups (older catalog rows, CSV, API clients): each variant name is
// one value, which is exactly how such products behaved before groups existed.
const legacyOption = "Option"

func variantName(values []string) string { return strings.Join(values, " / ") }

// legacyGroups turns a plain variant list into one group of its names.
func legacyGroups(variants []Variant) []Option {
	if len(variants) == 0 {
		return []Option{}
	}
	group := Option{Name: legacyOption}
	seen := map[string]bool{}
	for i := range variants {
		name := strings.TrimSpace(variants[i].Name)
		variants[i].Options = []string{name}
		if key := strings.ToLower(name); !seen[key] {
			seen[key] = true
			group.Values = append(group.Values, OptionValue{Name: name})
		}
	}
	return []Option{group}
}

// shapeOptions validates the groups and names every variant from its values.
// Omitted variants keep what is stored; variants sent without groups become
// one group of their names.
func (in *Input) shapeOptions() error {
	if in.Variants == nil {
		if in.Options != nil {
			return errors.New("send the variants together with the options")
		}
		return nil
	}
	if len(in.Variants) > maxVariants {
		return fmt.Errorf("at most %d combinations per product", maxVariants)
	}
	if len(in.Options) == 0 {
		names := map[string]bool{}
		for _, v := range in.Variants {
			key := strings.ToLower(strings.TrimSpace(v.Name))
			if key == "" {
				return errors.New("variant name is required")
			}
			if names[key] {
				return fmt.Errorf("two options are both called %q", strings.TrimSpace(v.Name))
			}
			names[key] = true
		}
		in.Options = legacyGroups(in.Variants)
		return nil
	}
	if len(in.Variants) == 0 {
		return errors.New("add at least one combination, or remove the option groups")
	}
	if len(in.Options) > maxOptions {
		return fmt.Errorf("at most %d option groups (for example size, colour and material)", maxOptions)
	}
	// a variant sent by name only (an API client adding "XL" to a product it
	// read back) takes its values from the name, and a value its group does
	// not have yet joins the group
	for i := range in.Variants {
		v := &in.Variants[i]
		if len(v.Options) > 0 {
			continue
		}
		parts := nameParts(v.Name, len(in.Options))
		if parts == nil {
			return fmt.Errorf("each combination needs one choice from every group (%s)", groupList(in.Options))
		}
		for g, value := range parts {
			if _, ok := in.Options[g].value(value); !ok {
				in.Options[g].Values = append(in.Options[g].Values, OptionValue{Name: value})
			}
		}
		v.Options = parts
	}
	if in.Images == nil && slices.ContainsFunc(in.Options, func(o Option) bool {
		return slices.ContainsFunc(o.Values, func(v OptionValue) bool { return len(v.Images) > 0 })
	}) {
		return errors.New("send the product photos together with photos for an option")
	}
	gallery := map[string]bool{}
	for _, img := range in.Images {
		gallery[img] = true
	}
	groupNames := map[string]bool{}
	for i := range in.Options {
		o := &in.Options[i]
		o.Name = strings.Join(strings.Fields(o.Name), " ")
		if o.Name == "" || len([]rune(o.Name)) > 30 {
			return errors.New("each option group needs a name of up to 30 characters, like Size or Colour")
		}
		if groupNames[strings.ToLower(o.Name)] {
			return fmt.Errorf("two option groups are both called %q", o.Name)
		}
		groupNames[strings.ToLower(o.Name)] = true
		if len(o.Values) == 0 || len(o.Values) > maxOptionValues {
			return fmt.Errorf("%s needs between 1 and %d choices", o.Name, maxOptionValues)
		}
		values := map[string]bool{}
		for j := range o.Values {
			v := &o.Values[j]
			v.Name = strings.Join(strings.Fields(v.Name), " ")
			if v.Name == "" || len([]rune(v.Name)) > 40 {
				return fmt.Errorf("each %s choice needs a name of up to 40 characters", o.Name)
			}
			if values[strings.ToLower(v.Name)] {
				return fmt.Errorf("%s has %q twice", o.Name, v.Name)
			}
			values[strings.ToLower(v.Name)] = true
			// option photos are the product's own: a photo removed from the
			// gallery drops out of its choice too
			var kept []string
			for _, img := range v.Images {
				if gallery[img] && !slices.Contains(kept, img) {
					kept = append(kept, img)
				}
			}
			if len(kept) > maxValueImages {
				return fmt.Errorf("at most %d photos for %s %s", maxValueImages, o.Name, v.Name)
			}
			v.Images = kept
		}
	}
	combos := map[string]bool{}
	for i := range in.Variants {
		v := &in.Variants[i]
		if len(v.Options) != len(in.Options) {
			return fmt.Errorf("each combination needs one choice from every group (%s)", groupList(in.Options))
		}
		for g, value := range v.Options {
			canonical, ok := in.Options[g].value(value)
			if !ok {
				return fmt.Errorf("%q is not one of the %s choices", strings.TrimSpace(value), in.Options[g].Name)
			}
			v.Options[g] = canonical
		}
		v.Name = variantName(v.Options)
		key := strings.ToLower(v.Name)
		if combos[key] {
			return fmt.Errorf("%s is listed twice", v.Name)
		}
		combos[key] = true
	}
	return nil
}

// nameParts splits a variant name into one value per group: "M / Pink" for
// two groups, the whole name for one. Nil when the count does not fit.
func nameParts(name string, groups int) []string {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil
	}
	if groups == 1 {
		return []string{name}
	}
	parts := strings.Split(name, " / ")
	if len(parts) != groups {
		parts = strings.Split(name, "/")
	}
	if len(parts) != groups {
		return nil
	}
	for i := range parts {
		if parts[i] = strings.TrimSpace(parts[i]); parts[i] == "" {
			return nil
		}
	}
	return parts
}

// value finds a choice by name, ignoring case and spacing, and returns the
// group's own spelling of it.
func (o Option) value(name string) (string, bool) {
	name = strings.Join(strings.Fields(name), " ")
	for _, v := range o.Values {
		if strings.EqualFold(strings.Join(strings.Fields(v.Name), " "), name) {
			return v.Name, true
		}
	}
	return "", false
}

func groupList(options []Option) string {
	names := make([]string, len(options))
	for i, o := range options {
		names[i] = o.Name
	}
	return strings.Join(names, ", ")
}

// settleOptions makes a stored product read consistently: groups that do not
// describe every variant (rows written before groups, or by an older build)
// fall back to one group of the variant names, and option photos that are no
// longer in the gallery are dropped.
func (p *Product) settleOptions() {
	if p.Options == nil {
		p.Options = []Option{}
	}
	if len(p.Variants) == 0 {
		p.Options = []Option{}
		return
	}
	fits := len(p.Options) > 0
	for i := 0; fits && i < len(p.Variants); i++ {
		v := p.Variants[i]
		fits = len(v.Options) == len(p.Options)
		for g := 0; fits && g < len(v.Options); g++ {
			_, fits = p.Options[g].value(v.Options[g])
		}
	}
	if !fits {
		p.Options = legacyGroups(p.Variants)
		return
	}
	gallery := map[string]bool{}
	for _, img := range p.Images {
		gallery[img] = true
	}
	for g := range p.Options {
		for j := range p.Options[g].Values {
			imgs := p.Options[g].Values[j].Images
			p.Options[g].Values[j].Images = slices.DeleteFunc(slices.Clone(imgs), func(img string) bool { return !gallery[img] })
		}
	}
}

// settled is the product with its groups in place, also when it was built by
// hand rather than read through the catalog query (which settles every row).
func (p Product) settled() Product {
	if len(p.Options) == 0 && len(p.Variants) > 0 {
		p.Variants = slices.Clone(p.Variants)
		p.settleOptions()
	}
	return p
}

// Choice is what a buyer's words settle about a product's options.
type Choice struct {
	Variant Variant
	Found   bool
	// Open holds the groups the words did not settle, narrowed to values that
	// still make a real combination. Nil with Found false means every group was
	// named but that combination does not exist.
	Open []Option
}

// Choose reads what a buyer said ("pink M", "M / Pink", "medium, pink wala")
// against the product's options.
func (p Product) Choose(said string) Choice {
	p = p.settled()
	said = strings.TrimSpace(said)
	if said != "" {
		for _, v := range p.Variants {
			if strings.EqualFold(strings.Join(strings.Fields(v.Name), " "), strings.Join(strings.Fields(said), " ")) {
				return Choice{Variant: v, Found: true}
			}
		}
	}
	words := tokens(said)
	picked := make([]string, len(p.Options))
	settled := 0
	for g, o := range p.Options {
		best, bestLen, tie := "", 0, false
		for _, v := range o.Values {
			vt := tokens(v.Name)
			if len(vt) == 0 || !containsAll(words, vt) {
				continue
			}
			switch {
			case len(vt) > bestLen:
				best, bestLen, tie = v.Name, len(vt), false
			case len(vt) == bestLen:
				tie = true
			}
		}
		if best != "" && !tie {
			picked[g] = best
			settled++
		}
	}
	matches := func(v Variant) bool {
		for g, want := range picked {
			if want != "" && (g >= len(v.Options) || !strings.EqualFold(v.Options[g], want)) {
				return false
			}
		}
		return true
	}
	if settled == len(p.Options) && settled > 0 {
		for _, v := range p.Variants {
			if matches(v) {
				return Choice{Variant: v, Found: true}
			}
		}
		return Choice{}
	}
	var open []Option
	for g, o := range p.Options {
		if picked[g] != "" {
			continue
		}
		narrowed := Option{Name: o.Name}
		for _, val := range o.Values {
			if slices.ContainsFunc(p.Variants, func(v Variant) bool {
				return matches(v) && g < len(v.Options) && strings.EqualFold(v.Options[g], val.Name)
			}) {
				narrowed.Values = append(narrowed.Values, OptionValue{Name: val.Name})
			}
		}
		open = append(open, narrowed)
	}
	if len(open) == 0 {
		return Choice{}
	}
	return Choice{Open: open}
}

// ChoiceText lists choices for a buyer or the assistant: "S, M, L" for a plain
// list, "Size: S, M, L; Colour: Pink, Blue" for named groups. Only values that
// are in stock in at least one combination are offered.
func (p Product) ChoiceText(groups []Option) string {
	p = p.settled()
	if groups == nil {
		groups = p.Options
	}
	var parts []string
	for _, o := range groups {
		g := slices.IndexFunc(p.Options, func(x Option) bool { return x.Name == o.Name })
		var names []string
		for _, val := range o.Values {
			if g >= 0 && slices.ContainsFunc(p.Variants, func(v Variant) bool {
				return v.Stocked() && g < len(v.Options) && strings.EqualFold(v.Options[g], val.Name)
			}) {
				names = append(names, val.Name)
			}
		}
		if len(names) == 0 {
			continue
		}
		if o.Name == legacyOption && len(p.Options) == 1 {
			parts = append(parts, strings.Join(names, ", "))
		} else {
			parts = append(parts, o.Name+": "+strings.Join(names, ", "))
		}
	}
	if len(parts) == 0 {
		return "none in stock"
	}
	return strings.Join(parts, "; ")
}

// Grouped reports whether the product has named option groups, rather than
// only a plain list of variant names.
func (p Product) Grouped() bool {
	return len(p.Options) > 1 || (len(p.Options) == 1 && p.Options[0].Name != legacyOption)
}

// sizeWords lets "medium" match a size written as M.
var sizeWords = map[string]string{"small": "s", "medium": "m", "large": "l"}

func tokens(s string) []string {
	fields := strings.FieldsFunc(strings.ToLower(s), func(r rune) bool { return !unicode.IsLetter(r) && !unicode.IsDigit(r) })
	for i, f := range fields {
		if w, ok := sizeWords[f]; ok {
			fields[i] = w
		}
	}
	return fields
}

func containsAll(have, want []string) bool {
	for _, w := range want {
		if !slices.Contains(have, w) {
			return false
		}
	}
	return true
}
