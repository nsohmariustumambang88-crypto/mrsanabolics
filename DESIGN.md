---
name: MrAnabolics
description: A catalogue floated, combed, and lifted — historical ebru pigments on two substrates.
colors:
  paper: "hsl(40 30% 94%)"
  paper-raised: "hsl(42 38% 97%)"
  paper-sunk: "hsl(38 24% 90%)"
  bath: "hsl(215 46% 14%)"
  bath-raised: "hsl(214 40% 18%)"
  bath-sunk: "hsl(216 50% 11%)"
  pigment-indigo: "hsl(214 58% 26%)"
  pigment-indigo-lift: "hsl(212 46% 42%)"
  pigment-madder: "hsl(12 62% 45%)"
  pigment-saffron: "hsl(36 74% 42%)"
  pigment-verdigris: "hsl(162 34% 30%)"
  pigment-lampblack: "hsl(220 28% 11%)"
  field-indigo: "hsl(214 58% 24%)"
  on-field: "hsl(40 30% 94%)"
  size-coat: "hsl(214 22% 83%)"
  plate-size: "hsl(38 24% 90%)"
  plate-band: "hsl(42 38% 97%)"
  ink: "hsl(220 28% 13%)"
  ink-soft: "hsl(218 14% 38%)"
  ink-faint: "hsl(216 12% 52%)"
  rule: "hsl(38 18% 82%)"
  rule-strong: "hsl(38 16% 72%)"
typography:
  display:
    fontFamily: "Familjen Grotesk, Archivo, sans-serif"
    fontSize: "clamp(2.75rem, 6vw, 5rem)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Familjen Grotesk, Archivo, sans-serif"
    fontSize: "clamp(1.75rem, 3.2vw, 2.75rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Familjen Grotesk, Archivo, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: "1rem"
    letterSpacing: "0.16em"
  assay:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
    fontFeature: "tnum 1"
rounded:
  none: "0px"
  sm: "0px"
  md: "2px"
  lg: "4px"
  full: "999px"
spacing:
  hairline: "1px"
  xs: "0.375rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.75rem"
  xl: "2.5rem"
  section: "4rem"
  section-wide: "6rem"
  gutter: "1rem"
  gutter-wide: "2.5rem"
  container: "86rem"
components:
  button-primary:
    backgroundColor: "{colors.pigment-indigo}"
    textColor: "{colors.paper-raised}"
    rounded: "{rounded.full}"
    padding: "0.875rem 1.5rem"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.pigment-indigo-lift}"
    textColor: "{colors.paper-raised}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0.875rem 1.5rem"
    typography: "{typography.body}"
  button-outline-hover:
    backgroundColor: "{colors.paper-sunk}"
    textColor: "{colors.ink}"
  card-sheet:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "1rem"
  chip-pigment:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0.5rem 0.875rem"
    typography: "{typography.label}"
  input-underline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0"
    typography: "{typography.body}"
  field-band:
    backgroundColor: "{colors.field-indigo}"
    textColor: "{colors.on-field}"
    rounded: "{rounded.none}"
    padding: "3rem 2.5rem"
---

# Design System: MrAnabolics

## Overview

**Creative North Star: "The Floated Pigment"**

A compound is a substance suspended at a concentration; ebru is the craft of exactly that. The whole system is built on one physical model: pigment is thrown onto a thickened bath, combed, and lifted onto a sheet of handmade paper in a single contact. Every surface in the build is either the bath or the sheet, and every colour in it comes from one historical pigment set — indigo, madder, saffron, verdigris, lamp black. Nothing is invented to fill a semantic slot.

The two themes are not a light mode and a dark mode of the same page. **Light is the lifted sheet**: warm, fibrous paper under daylight, ink and hairline plate rules on top of it. **Dark is the bath**: thickened water with indigo in it, before the lift. The same pigments run in both; only the substrate changes, and pigments lift in lightness for legibility while their saturation stays where the sheet put it. The result is one world under two lights rather than two palettes.

Density is that of a technical register, not a marketing page: hairline-ruled grids, tabular assay figures, mono labels for anything measured, generous measure limits on running text (68ch / 54ch). The build refuses the two arrangements this category ships — the near-black page with one acid accent, and the soft DTC wellness card grid — and it refuses the materials that carry them: no glass panels, no gradient text, no glow, no stock product photography, no eyebrow above a heading.

**Key Characteristics:**
- One historical pigment set on two substrates; nothing invented to fill a slot.
- Paper stock and real offset-and-blur shadow instead of translucency; no glass anywhere.
- Hairline plate rules everywhere; grids are drawn by a 1px gap showing the container colour.
- Mono, tabular figures for every assay number, price, and label.
- Authored SVG catalogue imagery — a drawn vessel per category, deterministic per slug.
- One authored motion moment: the hero bath lifting, and pointer combing.

## Colors

The palette is the historical ebru pigment set on two substrates; semantic roles are drawn from the pigments themselves rather than assigned from a generic ramp.

### Primary
- **Indigo (Çivit)** — The lead pigment. Primary actions, the hero's emphasized clause, link hover, active navigation, focus rings (in its lifted variant), the house mark's outer rings. It carries the brand's authority; the whole system leans on it rather than on an accent.
- **Lifted Indigo** — Indigo raised off the substrate. Focus outlines, hover state of the primary button, scrollbar thumb hover, the mark's middle ring. Never used for large fields.

### Secondary
- **Madder (Kök Boya)** — The one warm alarm. Discount flags, wishlist active state, destructive actions, the caret, and out-of-stock. Deliberately rare; it exists so the eye finds one thing per screen.
- **Saffron (Sarı)** — Caution only: low stock, warnings, a form's inline notice on a dark field.
- **Verdigris (Yeşil)** — Confirmation only: in stock, added to cart, subscription confirmed.

### Tertiary
- **Category Pigments** — Eleven drops from the same bath, one per catalogue category (injectables, orals, SARMs, PCT, peptides, fat burners, growth hormone, ancillaries, testosterone, bundles, accessories). Each appears as the same token everywhere its category appears: the hairline plate rule at the top of a product card, the filter dot, the navigation dot, the ground of the drawn product plate. On the bath they lift in lightness only — their saturation tracks the sheet's, because raising both turned madder into hot orange and verdigris into lime.
- **Field Indigo / On-Field** — A dedicated pair for large indigo fields (announcement bar, weekly-deals band, the closing newsletter section). It stays at bath depth in both themes and always carries cream on top.
- **Size Coat** — The ground the bath is covered with before any ink is thrown, and the tone thrown between every ink in the marbling renderer. It is a cool pale slate, deliberately not the sheet's value.
- **Plate Size / Plate Band** — The drawn product plate's own ground and the band thrown across it. Separate from the page's paper tokens so the bands read as pigment on water in both themes.

### Neutral
- **Paper / Paper Raised / Paper Sunk** — Page ground, lifted sheets and cards, and recessed passages (secondary sections, image wells, footer). On the bath these same three roles become the size's depths.
- **Ink / Ink Soft / Ink Faint** — Body copy and headings, secondary prose, and metadata or captions respectively.
- **Rule / Rule Strong** — Hairline plate rules dividing sheets, and the heavier hairline used for input underlines, outline buttons, and the condensed header edge.
- **Lamp Black (İs Mürekkebi)** — Not a text colour. It is the shadow pigment: every lift shadow is cast in lamp black (and indigo, on the sheet).

### Named Rules

**The One Bath Rule.** Every colour on every surface comes from the pigment set or the substrate tokens. If a new state needs a colour, it takes one of the five pigments and a role, never a new hue.

**The Lift Lightness, Never Saturation Rule.** Moving a pigment from the sheet to the bath raises its lightness only. Re-saturating is what turned madder into hot orange and verdigris into lime; both dark ramps track their light counterparts' saturation.

**The Field Stays Deep Rule.** Text and rules lift on the bath; large indigo *fields* do not. Fields use the dedicated field pair and stay at bath depth in both themes — a field that lifts becomes a pale block brighter than the page, which is an inverted palette rather than one world under two lights.

**The Coat Is Not The Sheet Rule.** The bath's ground coat is its own token and must never be set to the sheet's paper value. When it was, roughly half the marbled field read as bare paper.

**The Wrapped Pigment Rule.** The category tokens are bare HSL triplets, not colours. They are only valid through `categoryPigment(slug)`, which wraps them in `hsl()`. Handing a raw `var(--cat-…)` to a style paints nothing, silently, and no error is raised.

## Typography

**Display Font:** Familjen Grotesk (falling back to Archivo)
**Body Font:** Archivo (falling back to system sans)
**Label/Mono Font:** JetBrains Mono

**Character:** A tightly-tracked grotesque over a workmanlike text sans, with a monospace reserved for anything that is a measurement. Headings are set close and negative-tracked so they read as a printed plate mark; body copy stays plain and measured so an assay can be read for what it is.

### Hierarchy
- **Display** (600, `clamp(2.75rem, 6vw, 5rem)`, 0.95, -0.04em): the hero claim only; one per page, broken across lines by hand, with one clause set in indigo.
- **Headline** (600, `clamp(1.75rem, 3.2vw, 2.75rem)`, 1.05, -0.035em): section headings via the shared heading component. Route-level page titles run one step down (`clamp(2rem, 4vw, 3.25rem)`).
- **Title** (600, 1rem–1.25rem, snug, -0.02em): product card names, plate and panel headings; shifts to indigo on card hover.
- **Body** (400, 0.875rem, relaxed; 1rem at `sm` for lead paragraphs): running text in soft ink, constrained to 68ch (54ch for lead and column copy).
- **Label** (400, 0.6875rem, 0.14em–0.18em, uppercase, mono): column headings, filter group headings, footer legal, badges, the drag affordance. Labels sit *beside* or *below* content, never as an eyebrow above a heading.
- **Assay** (400, 0.75rem–0.875rem, mono, tabular): prices, concentrations, counts, dates, spec tables, and the numbered stages in the process list (up to 2.25rem there).

### Named Rules

**The No-Eyebrow Rule.** No kicker, eyebrow, or label sits above a heading anywhere. The shared section heading component has no eyebrow prop, by design; a heading carries its own weight.

**The Mono Is Measurement Rule.** Monospace marks data — a figure, a batch, a unit, a category label. It is never a technical costume on prose, and it never sets a sentence.

**The Tabular Assay Rule.** Every number a reader might compare or align is tabular. Tabular figures are applied globally to table cells, times, and anything carrying the numeric marker, plus an explicit class on prices and specs.

## Layout

The page is a stack of full-bleed sections divided by hairline plate rules, each holding a centred 86rem container with a 1rem gutter that opens to 1.5rem at `sm` and 2.5rem at `lg`. Vertical rhythm runs 4rem of section padding on small screens opening to 6rem at `lg`; dense register strips (the assurance line, the deals band) run 3rem or less, and a dense passage is always followed by a quiet one — the home page deliberately alternates a split index, a four-across grid, a ruled index, a feature-plus-list, a numbered sequence, a name list, and a sheet strip rather than repeating one card rhythm.

Grids are ruled, not gapped. A hairline grid is a `1px` gap over a rule-coloured container, so the rules are the container showing through; product grids, testimonial grids, spec grids, and category indexes are all built this way. Cell padding therefore carries the entire internal rhythm (1rem to 1.75rem), and rows sit flush against one another.

The hero splits the first viewport asymmetrically — the sheet at `0.9fr` with claim and action, the live bath at `1.1fr` full-bleed — divided by one vertical plate rule at `lg` and stacking to sheet-over-bath below it. The shop keeps a 16rem sticky filter rail beside its results at `lg` and collapses it into a sheet overlay below.

**The Closed Row Rule.** Because the rules are gaps, an incomplete final row leaves a bare rule-coloured cell. Every hairline grid must close its short row with the grid filler component (or render through the product grid, which does it), filling the remainder with the page ground so a short row reads as an empty slot in a ruled table.

## Elevation & Depth

The system is material, not layered glass. Depth comes from two things: a real paper shadow with offset and blur cast in lamp black and indigo, and tonal substrate steps (sunk / page / raised). Translucency is not a depth device here — chips, labels, and cards that sit over live pigment are opaque, because translucent ones lost legibility over a moving bath. There is no backdrop blur, no glass panel, and no glow anywhere in the build.

The whole page also sits on a real material: a fixed fractal-noise fibre layer, multiplied at low opacity on the sheet and screened even fainter on the bath, where it reads as surface caustics rather than paper fibre.

### Shadow Vocabulary
- **Lift** (`0 1px 2px -1px lampblack/0.14, 0 8px 22px -12px indigo/0.28` on the sheet; lamp-black-only and deeper on the bath): a sheet resting on the size. Product cards, floated labels over the bath, the condensed header.
- **Lift Strong** (`0 2px 4px -2px lampblack/0.16, 0 18px 44px -20px indigo/0.34`; deeper on the bath): a sheet being drawn out. Card hover, overlays, and dialogs.

### Named Rules

**The Lift-On-Contact Rule.** Elevation is a response to pointer contact, not a resting decoration. A card rests on `lift` and moves to `lift-strong` with a 1px rise on hover, over 300ms on the lift easing.

**The Opaque-Over-Pigment Rule.** Anything set over live marbling — a chip, a label, a card — takes a solid substrate colour and a hairline rule. Never a translucent panel.

## Shapes

The form language is a printed plate: square corners and hairline strokes. The base radius is 4px, but it is spent almost nowhere — sheets, cards, plates, bands, inputs, and grid cells are square. Two exceptions are systematic: pills (`999px`) for actions, chips, category tags, and the small icon-only toggles; and dots (`999px` at 6–8px) for the single state channel — a category pigment dot, a stock dot, a wishlist marker.

Borders are always 1px. There is no 2px border anywhere in the system; emphasis is achieved by moving a hairline from `rule` to `rule-strong` to a pigment, never by thickening it. Category emphasis on a product card is a single 1px plate rule in the category's pigment across the top edge.

The one non-rectilinear silhouette is the **deckle** — a torn, fibrous mask applied to the bottom edge of a canvas where a sheet meets the bath it was lifted from. It is applied to the bath surface only, never as a decorative frame, and it is switched off (via the mask-none utility) at the breakpoint where the seam becomes vertical.

## Components

### Buttons
- **Shape:** fully round (999px) for primary and outline actions; square (0px) for full-width bar actions inside a card.
- **Primary:** indigo ground with cream text, 0.875rem/1.5rem padding, a trailing arrow that slides 4px on hover, 300ms.
- **Hover / Focus:** primary moves to lifted indigo; focus is always the global 2px lifted-indigo outline at 2px offset. No shadow change on buttons.
- **Outline:** transparent on a strong hairline; on hover the rule becomes indigo and the ground becomes sunk paper.
- **Card bar action:** a square, full-width strip below the card body separated by a hairline; soft ink at rest, indigo ground with cream text on hover, verdigris ground for the 1.6s confirmed state, faint ink and no ground when disabled.

### Chips
- **Style:** opaque substrate ground, 1px hairline, fully round, mono label at 0.6875rem uppercase with 0.14–0.18em tracking. Category chips lead with a 6px dot in the category's pigment.
- **State:** selected chips take the category pigment on their rule and full-strength ink; unselected sit on `rule` with soft ink. Chips floated over the bath additionally take the lift shadow.

### Cards / Containers
- **Corner Style:** square (0px).
- **Background:** raised paper (raised bath in dark) on the page ground; the image well is sunk.
- **Shadow Strategy:** `lift` at rest, `lift-strong` with a 1px rise on hover (see Elevation).
- **Border:** 1px `rule`, moving to `rule-strong` on hover and to indigo when a child holds focus. A product card additionally carries the 1px category plate rule on its top edge.
- **Internal Padding:** 1rem in card bodies, 1.25–1.75rem in panels and floated labels.

### Inputs / Fields
- **Style:** underline only — a transparent ground on a single `rule-strong` bottom hairline, square, with the submit control inline at the right edge. No boxed input anywhere in the layout chrome.
- **Focus:** the underline becomes indigo on the wrapper's focus-within; the caret is madder. Inputs on an indigo field use cream at 35% for the rule and full cream on focus.
- **Error:** madder message below at 0.75rem (saffron on an indigo field, where madder would not carry).

### Navigation
- **Style:** sticky header on the page ground with a bottom hairline; on scroll it condenses (5rem of padding to 3rem, wordmark shrinking) and swaps its hairline to `rule-strong` plus the lift shadow, over 300ms on the lift easing.
- **Typography:** body sans at 0.875rem for nav items; mono labels for the counts and the wordmark's sub-line.
- **States:** soft ink at rest; sunk-paper ground and full ink on hover; the mega-panel entries carry a category pigment dot that scales 1.5× on hover and an indigo-lift underline.
- **Mobile:** a full-height sheet overlay on the page ground with accordions for categories and brands, hairline-divided links, and the substrate toggle at the top.

### The Bath (signature)
A live marbling canvas: an area-preserving drop-and-tine displacement model rendered to canvas, deterministic from a seed so a given surface is the same sheet on every visit. It composes lazily when it approaches the viewport, re-floats when the substrate changes, and honours reduced motion. `density` trades fidelity against time — the hero runs at full, decorative strips run low. Index 0 of the pigment list is the size coat, not an ink. It appears at three scales: the hero half-viewport (interactive, pointer-combable, deckled at its edge), field-section backgrounds at low opacity behind text (never interactive), and a footer band faded into the page ground by a tonal scrim.

### The Drop Mark (signature)
The house mark: one drop of pigment seen from above — concentric rings around a solid madder centre, in indigo and lifted indigo. Drawn as SVG, never composed from primitives, and it states the palette wherever it appears. Its companion, the stylus, marks any place the site talks about drawing through the size.

### The Product Plate (signature)
There is no product photography in this build. Catalogue imagery is authored SVG: the vessel the compound actually ships in (vial, capsule, dropper, syringe, carton, chosen by category) on a floated ground in that category's pigment, with the concentration marked in mono. Deterministic from the slug, so a product looks identical on every surface. Vector, not canvas, because a dozen live baths behind a dozen cards costs more than the picture is worth.

### Editorial Imagery
Journal photographs stay real frames but are printed in the house inks through an SVG duotone filter (a separate map per substrate), so a photograph joins the pigment set instead of shouting over it. CSS blend modes are not an acceptable substitute — they tint one end of the tonal range and leave the midtones grey.

## Do's and Don'ts

### Do:
- **Do** draw every colour from the pigment set and the substrate tokens; give a new state a role, not a new hue.
- **Do** route every category colour through `categoryPigment(slug)`; the raw token is not a valid CSS colour.
- **Do** close every hairline grid's short final row with the grid fillers, or render through the product grid.
- **Do** set prices, concentrations, counts, and dates in mono with tabular figures.
- **Do** keep anything sitting over live pigment opaque, with a hairline rule.
- **Do** use 1px rules only, and express emphasis by changing the rule's colour, not its weight.
- **Do** hold running text to the 68ch measure (54ch for lead and column copy).
- **Do** keep motion to the one authored moment — the hero's lift and pointer combing — on the lift easing (`cubic-bezier(0.16, 1, 0.3, 1)`), with reduced motion honoured.
- **Do** keep routes as server components owning metadata and JSON-LD, with interactivity in client children.

### Don't:
- **Don't** put a kicker, eyebrow, or label above a heading. Ever.
- **Don't** use glass, backdrop blur, glow, or gradient text. A tonal scrim fading a bath into the page ground is the only gradient the world uses.
- **Don't** cast a hard offset shadow; the only shadows are the two lift shadows, with blur, in lamp black and indigo.
- **Don't** raise a pigment's saturation when moving it to the bath, and don't lift a large indigo field — use the field pair.
- **Don't** set the bath's ground coat to the sheet's paper value, or dress a product plate in the page's paper tokens.
- **Don't** add stock product photography; catalogue imagery is authored and deterministic.
- **Don't** add a scrolling marquee or per-section entrance animation.
- **Don't** use emoji or mixed-weight glyph icons; icons are lucide or authored SVG at a consistent 1.5–1.75 stroke.
- **Don't** thicken a border, add a second accent colour to a badge set, or introduce a boxed input to layout chrome.
