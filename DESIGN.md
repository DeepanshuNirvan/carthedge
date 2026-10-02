---
name: CartHedge
description: The stall that never closes. An AI sales desk for Instagram and WhatsApp sellers, lit by a strand of warm bulbs.
colors:
  jade: "#26CC88"
  jade-deep: "#0FB06C"
  jade-ink-night: "#34D694"
  jade-ink-day: "#046C40"
  bulb-gold: "#F0BE62"
  bulb-night: "#F6C870"
  bulb-day: "#D69830"
  gold-ink-day: "#805410"
  text-on-accent: "#04140C"
  obsidian-ground: "#07090B"
  obsidian-surface: "#101418"
  obsidian-surface-raised: "#181D22"
  bulb-off-night: "#3A4248"
  night-text-hi: "#F0F4F3"
  night-text-mid: "#BCC5C4"
  night-text-low: "#96A0A0"
  night-text-dim: "#808A8A"
  porcelain-ground: "#E8ECED"
  porcelain-surface: "#FDFEFE"
  day-text-hi: "#0C1214"
  day-text-mid: "#384244"
  danger: "#EC5C50"
  danger-fill: "#C4342A"
  danger-ink-night: "#F4766A"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 1.6rem + 4.6vw, 5.75rem)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.5rem + 2.2vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.3rem, 1.15rem + 0.7vw, 1.65rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  page-title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.006em"
    fontFeature: "'ss01', 'cv11'"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.006em"
  chip:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.005em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  xs: "8px"
  sm: "11px"
  md: "14px"
  lg: "20px"
  xl: "28px"
  2xl: "36px"
  full: "999px"
spacing:
  page-x-phone: "16px"
  page-x: "24px"
  card-pad: "20px"
  section-y-phone: "80px"
  section-y: "96px"
components:
  button-primary:
    backgroundColor: "{colors.jade}"
    textColor: "{colors.text-on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-primary-lg:
    backgroundColor: "{colors.jade}"
    textColor: "{colors.text-on-accent}"
    rounded: "{rounded.full}"
    padding: "0 28px"
    height: "52px"
  button-gold:
    backgroundColor: "{colors.bulb-gold}"
    textColor: "{colors.obsidian-ground}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.obsidian-surface-raised}"
    textColor: "{colors.night-text-hi}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-ghost:
    textColor: "{colors.night-text-mid}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.danger-fill}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  input:
    textColor: "{colors.night-text-hi}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "44px"
  card:
    backgroundColor: "{colors.obsidian-surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
  sheet:
    rounded: "{rounded.xl}"
  chip:
    typography: "{typography.chip}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  tabs:
    rounded: "{rounded.full}"
    padding: "4px"
---

# Design System: CartHedge

## Overview

**Creative North Star: "The Stall That Never Closes"**

A night-bazaar lane with a strand of warm bulbs strung across the top of every working surface. Each bulb is a step of one order: the AI answers, collects, confirms, ships. The world has two times of day. Night is smoked obsidian glass on a cool near-black ground. Day is frosted porcelain glass on a cool grey ground. Both themes stay on cool neutrals, with no warm paper and no cream. All warmth comes from the light itself.

Glass is reserved for chrome that floats over content: navigation, tab bars, sheets, menus, toasts, sticky headers and the marketing hero counter. Content sits on an opaque panel that carries the same rim light, so the two read as one family without paying for a page of blurred cards inside the Instagram in-app browser. The fixed lane ground (lamp fall-off at the top, a wet-lane reflection pool at the bottom) is what the glass frosts, so the strand reads through the header as warm light.

Density follows the mode. Marketing (Persuade) uses fluid display type and generous sections. The seller app, admin console and storefront (Operate) use iOS large titles, compact 13–14px UI type, capsule controls and tabular money.

**Key Characteristics:**
- Two complete themes on cool neutrals; every colour reads a CSS variable, so both themes are complete by construction.
- Glass for floating chrome, opaque panels for content.
- Capsule controls, 20px cards, 28px sheets.
- One family (Geist), with hierarchy carried by size, weight and tracking. Geist Mono only for codes and URLs.
- A bulb vocabulary for state: lit gold means now, jade means settled, unlit means empty or waiting.
- Status changes strike through the old word instead of silently recolouring.

## Colors

A cool-neutral ground lit by two signal hues: jade for what is settled, bulb-gold for what is live.

### Primary
- **Answer Jade** (#26CC88 fill, #0FB06C deep): answered, confirmed, paid, delivered, and the primary action. The primary button is a jade capsule (gradient 400→500) with a glass top edge. Focus rings, the text caret and selection tint are jade. For text and icons, use the theme-tuned ink (#34D694 night, #046C40 day), never the fill.

### Secondary
- **Bulb Gold** (#F0BE62 fill; strand bulb #F6C870 night, #D69830 day; ink #805410 day): live, now, needs you, and money. New orders, trials, pending payments and "sending" are gold. The gold button is a secondary emphasis for money moments.

### Tertiary
- **Refusal Red** (#EC5C50 tint, #C4342A fill, #F4766A night ink): only refusals and errors, such as RTO, failed, expired, suspended and invalid fields. White text sits on the darker fill (5.8:1). The lighter tone is for tints only.

### Neutral
- **Obsidian Ground** (#07090B): night page ground, painted only on `html`.
- **Obsidian Surface** (#101418) / **Raised** (#181D22): night panels and raised controls.
- **Porcelain Ground** (#E8ECED) / **Porcelain Surface** (#FDFEFE): day ground and panels. The ground sits below the surface so every pane lifts.
- **Text ramp, night** (#F0F4F3 hi, #BCC5C4 mid, #96A0A0 low, #808A8A dim) and **day** (#0C1214 hi, #384244 mid): all four steps clear AA on ground and surface (dim clears at least 4.6:1).
- **Unlit Bulb** (#3A4248 night): an empty socket on the strand.
- **Hairline**: white at 8% (night) or ink at 9% (day). It is the default border colour, and 15% for strong rules.

### Named Rules
**The Two Signals Rule.** Jade means settled, gold means live. A status maps to one of them, to neutral (packed, shipped, closed, draft), or to red for refusals. Never assign a hue for decoration.

**The No Blue Status Rule.** Blue is not a status colour. No order, payment or plan state maps to info blue.

**The Ink Versus Fill Rule.** Numbered brand steps are fills. Text and icons use the `ink` step, which each theme retunes for contrast.

## Typography

**Display Font:** Geist (with ui-sans-serif, system-ui)
**Body Font:** Geist (same family)
**Label/Mono Font:** Geist Mono (with ui-monospace), only for order codes and URLs

**Character:** One neutral grotesk set tight. Display is set large with negative tracking and UI is set small and steady, so the hierarchy comes from the settings, not from a second face. Geist is the only tested face with both the ₹ glyph and tabular figures. The detector ignore in `.impeccable/config.json` records that reason.

### Hierarchy
- **Display** (600, d0 to d1: clamp up to 5.75rem, line-height 0.98–1.0, -0.04em): marketing hero and closing CTA headlines only, capped at about 14ch.
- **Headline** (600, d2: clamp(2rem…3.5rem), 1.04, -0.035em): marketing section heads, capped at about 18ch, and legal page titles. d3 (up to 2.4rem) sits between headline and title for secondary section heads.
- **Title** (600, d4: clamp(1.3rem…1.65rem), 1.2, -0.02em): sub-group heads and mobile nav items.
- **Page title** (600, 1.75rem on phones and 2rem from sm up, -0.03em): the iOS large title on every Operate page, with a one-line subtitle under it capped at 60ch.
- **Body** (400, 14px in UI and 16px to 18px in marketing, -0.006em, features ss01 and cv11): running text, capped at 52–65ch.
- **Label** (500–600, 13px): field labels, tabs, small buttons, card titles (15px, 600).
- **Chip** (600, 11.5px, +0.005em): status chips and badges, in sentence case or capitalized.

### Named Rules
**The Tabular Money Rule.** Every amount, count and metric is set in tabular figures (`.tnum`). Money columns must not jitter.

**The One Face Rule.** Display and UI are the same Geist family. Do not add a second display face.

## Layout

The seller app content column is capped at 90rem with 16px gutters on phones and 24px from sm up. It clears a bottom glass tab bar on phones (6.75rem plus the safe area) and uses a sidebar from lg up. Marketing sections are centred at max-w-6xl (72rem) with 20px/32px gutters and 80px/96px vertical rhythm. Section heads are left-aligned by default.

Page headers stack on phones, and their actions grow to full width so nothing gets squeezed. Horizontal chip and card rails scroll without a visible bar and contain overscroll. Touch targets are 44px on touch and 40px where a cursor can aim (IconButton and tabs). Fields use 16px text below sm so iOS does not zoom.

Blur radii halve below 900px because backdrop-filter is the most expensive paint inside the Instagram and WhatsApp in-app browsers.

**The Lane Ground Rule.** Only `html` carries the ground colour. `body` stays transparent so the fixed, negative-z LaneGround and MarketingBackground layers paint through. Pages whose header starts transparent (storefront, product) use the lane without its strand, so lamps never sit behind header icons.

## Elevation & Depth

The system is layered. Depth comes from three materials plus a cool ambient shadow scale. Every pane carries three edges: a cool rim all round, a bright specular line on top, and a darker line underneath. Glass fills are tinted, never clear, so text over them stays AA. Under prefers-reduced-transparency, glass falls back to opaque surface. Under prefers-contrast: more, glass and panels become opaque with an 80% hairline, and sheen and spotlight are removed.

### Shadow Vocabulary
- **Soft** (night `0 1px 1px rgb(0 0 0/.4), 0 8px 24px -10px rgb(0 0 0/.6)`): panels, gold and danger buttons, glass-nav.
- **Raised** (night `0 2px 4px rgb(0 0 0/.42), 0 22px 48px -18px rgb(0 0 0/.72)`): regular glass, and hover lift on interactive cards.
- **Float** (night `0 6px 16px -4px rgb(0 0 0/.5), 0 42px 90px -30px rgb(0 0 0/.85)`): sheets and modals.
- Day versions use cool ink rgb(24 44 52) at 6–28%.
- **Glow / Glow-gold** (`0 18px 40px -18px` jade-500 or gold-400 at 55%): a lit pane casts light downward like a lamp.

### Named Rules
**The Chrome-Only Glass Rule.** Glass (`.glass`, `.glass-nav`, `.glass-bar`) is for floating chrome: nav, tab bars, sheets, menus, toasts, sticky headers and the hero counter. Content cards are opaque panels. A card uses glass only when it floats over imagery.

**The Lift-Is-A-Target Rule.** Only cards that are themselves a click target get the pointer-lit jade spotlight edge and the 2px lift.

## Shapes

The shape lock: controls are capsules (999px). Fields are gently rounded (14px), cards are 20px, sheets and modals are 28px (top corners only on phone bottom-sheets), and the largest marketing panes are 36px. Small wells and focus outlines use 8px, and 11px is for compact inner elements. Borders are hairlines drawn as inset box-shadows rather than CSS borders, so they stack with the rim light. Bulbs are perfect circles that hang from a sagging quadratic wire.

## Components

### Buttons
Tactile lit capsules.
- **Shape:** full capsule (999px). Heights are 36px, 44px or 52px, with 16px, 20px or 28px padding and 13px, 14px or 15px semibold text with snug tracking.
- **Primary:** jade gradient 400→500 with dark-green text and the clay material: a white top edge at 38%, a dark bottom edge, and a jade-700 drop.
- **Gold:** gold 300→400 gradient with obsidian text, used for money and live moments.
- **Secondary:** raised neutral control (surface-2 with rim and top light). **Glass:** frosted with a specular sheen ring, used over imagery. **Ghost:** mid text that gains a faint field tint on hover. **Danger:** the deep red fill with white text.
- **Hover / Active:** brightness +5–7% or a tint step on hover. Pressing scales to 0.97 over 140ms on the spring ease, and IconButton scales to 0.9. Disabled sits at 45% opacity. A loading button swaps its icon for a spinner and sets aria-busy.

### Chips
- **Style:** capsule with an 11.5px semibold label, a 14–16% tint of its hue, the theme ink as text, and a 20–26% inset ring. Tones are jade, gold, danger and neutral. The status map never uses info.
- **State:** StatusChip strikes through the old word in place (a 360ms draw) while the new word rises, then lets the old word go after 1.1s.

### Cards / Containers
- **Corner Style:** 20px.
- **Background:** opaque panel (surface plus a faint top light).
- **Shadow Strategy:** Soft, rising to Raised on hover for interactive cards.
- **Border:** inset hairline plus a specular top line.
- **Internal Padding:** 20px. Card titles are 15px semibold, with a 13px low-contrast subtitle.

### Inputs / Fields
- **Style:** a recessed well (field tint at 4.5–5% with an inner shadow), 14px radius, 44px tall.
- **Focus:** the well brightens to surface with a 1.5px jade ring and a 4px jade halo at 16%.
- **Error / Disabled:** a 1.5px danger ring with a red-ink message under the field (role=alert). Disabled sits at 50% opacity. Labels are 13px medium, and "Optional" is shown in low text.

### Navigation
- **Tabs:** an iOS segmented control. A recessed capsule groove holds one raised surface pill that springs between segments (stiffness 460, damping 36). Each control gets its own pill id. Counts appear as tabular mini-capsules, jade-tinted when active.
- **App shell:** a glass sidebar from lg up and a bottom glass tab bar on phones, both frosting the lane ground. Admin follows the same pattern.

### Sheets / Modals
Thick glass-nav material with sheen and the Float shadow, at a 28px radius. On phones they are bottom sheets with a grab handle. Side drawers dock to the right on desktop. They enter on springs (stiffness 340–380, damping 34–36).

### The Strand (signature)
- **Bulb:** a circle on bulb-off. When lit, it turns gold with a 3px halo and a downward light cast. When done, it turns jade with a halo.
- **BulbString:** a short sagging wire with hung bulbs. Unlit, it marks empty or waiting states, such as an empty list or lane.
- **LaneGround:** a fixed ground with nine lit lamps on a two-sag wire, warm fall-off, and a jade and gold reflection pool.
- **Typing dots:** three bulbs taking turns, used only for "assistant is replying".

### Motion
Exponential ease-out throughout: enter is `cubic-bezier(0.16,1,0.3,1)` and spring is `cubic-bezier(0.22,1,0.36,1)`. Durations are 140ms (micro), 260ms (standard), 520ms (expressive) and 760ms (cinematic). Sheets and pills use physical springs. Under reduced motion, every animation collapses. The hero renders its final state and the sticky order journey becomes a plain list.

## Do's and Don'ts

### Do:
- **Do** put content on opaque panels and keep glass for floating chrome.
- **Do** make every control a capsule, every card 20px, and every sheet 28px.
- **Do** map state to the bulb vocabulary: lit gold for now or needs-you, jade for settled, an unlit BulbString for empty or waiting.
- **Do** strike through the old status word when a status changes.
- **Do** set money and metrics in tabular Geist. Use Geist Mono only for order codes and URLs.
- **Do** use the `ink` step of a hue for text and icons, and the numbered steps for fills.
- **Do** paint the ground on `html` only, and drop the strand on pages whose header starts transparent.
- **Do** keep touch targets at 44px and field text at 16px below sm.

### Don't:
- **Don't** use blue for any status chip.
- **Don't** use red for anything but refusals and errors.
- **Don't** use typing dots for generic loading. They mean "assistant is replying". Use the skeleton sweep or a spinner instead.
- **Don't** blur content cards or stack glass on glass for decoration.
- **Don't** introduce warm paper or cream grounds. Warmth comes from bulb light, not the neutrals.
- **Don't** add a second display face or a gradient text fill. Emphasis is colour (jade ink) plus weight.
- **Don't** paint a background colour on `body`.
