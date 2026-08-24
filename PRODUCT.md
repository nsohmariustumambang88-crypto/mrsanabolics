# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two confirmed audiences, served by one catalog with a deliberate split:

- **Technical buyer** — serious lifters and competitors. Research-driven. Compares compounds, concentrations, half-lives, and third-party lab results before buying. Arrives knowing what molecule they want; needs specifications, purity evidence, and dosing detail available without digging.
- **General fitness consumer** — gym-goers buying accessible categories. Wants reassurance, social proof, and easy browsing over technical depth. Arrives by goal ("cutting", "recovery") rather than by compound name.

The design must make the path each one takes obvious from the first viewport rather than averaging them into one undifferentiated grid.

## Product Purpose

A direct-to-consumer storefront for performance supplements. Visitors browse by category, brand, or goal, evaluate a product against its specifications and lab evidence, and complete a purchase. Success is a visitor who understands what a product is, trusts that it is what it claims to be, and completes checkout without leaving to verify elsewhere.

## Positioning

Evidence-forward retail: every product carries a full specification table, ingredient list, batch-level third-party testing claim, and directions — the information a technical buyer would otherwise assemble from forums. The catalog is presented as documented material, not as lifestyle merchandise.

## Operating Context

- Browsing is split across `/shop` (filterable, query-param driven), `/categories`, and `/brands`.
- Evaluation happens on `/product/[slug]`, which carries images, specs, benefits, ingredients, directions, shipping/returns, per-product FAQs, and reviews.
- Cart and wishlist persist client-side across sessions; checkout is a five-step wizard (Shipping → Billing → Review → Payment → Confirmation).
- `/blog` carries editorial content; `/faq`, `/about`, `/contact` carry trust and support content.
- Account area is tab-driven via `?tab=`.

## Capabilities and Constraints

- **Stack:** Next.js 13.5 App Router, TypeScript (strict), Tailwind + shadcn/ui, deployed to Netlify. No database, no API routes, no server actions.
- **Data:** static typed arrays in `lib/data/` (12 products, categories, brands, blog posts, testimonials, FAQs). All lookups synchronous.
- **Images:** remote Pexels URLs; `next.config.js` sets `images.unoptimized: true`.
- **Auth is not implemented.** `/auth` is a UI mock; `@supabase/supabase-js` is installed with empty env vars on branch `feature/supabase`. Nothing imports it yet.
- **Current SEO ceiling:** every route is a client component, so no route can export `metadata` or emit server-rendered JSON-LD. This is a known defect the redesign must fix, not a constraint to preserve.
- **Undecided:** payment processing, order persistence, real inventory, and account backend are all unbuilt.

## Brand Commitments

- **Name:** MrAnabolics. Fixed.
- **Product catalog and copy:** all 12 products, their descriptions, specifications, benefits, ingredients, directions, and the blog content are fixed and must survive the redesign verbatim.
- **Open:** color, typography, layout, component language, and the existing dark-only treatment carry no commitment and may be replaced.

## Evidence on Hand

- Real: the product catalog's structure, specification tables, and category/brand taxonomy.
- **Synthetic and must be labeled as such:** all reviews and reviewer names, all testimonials, the "99.2% purity" lab figure, the "over 40 countries" shipping claim, star ratings, and review counts. These are demo fixtures authored for a portfolio build, not verified business facts.
- No real logo, photography, lab certificates, or customer data exist. Catalogue imagery is drawn in-house as vessel plates — illustrations of the container each compound ships in, in its category pigment — and is labelled as such. Editorial imagery on the journal remains stock photography.
- This project is a **portfolio / demo template**. Nothing here is a live commercial offer; any real deployment would require the claims above to be replaced with verified material and reviewed for jurisdictional compliance.

## Product Principles

1. **Evidence outranks atmosphere.** Specs, ingredients, and testing claims are the product's real argument; the design surfaces them rather than decorating around them.
2. **Two doors, one catalog.** Every browsing surface must offer both a goal-led path and a compound-led path without duplicating inventory.
3. **Legibility is the trust signal.** In a category built on skepticism, information that is easy to read and verify does more for conviction than persuasion styling.
4. **Nothing claims what it cannot show.** Synthetic demonstration content is authored at full fidelity and labeled; commercial and factual claims are never invented.
5. **The catalog is the constant.** Content survives every visual change; the visual system serves the catalog, never the reverse.

## Accessibility & Inclusion

No user-specific requirement was established. Baseline: WCAG 2.2 AA contrast in both light and dark themes, full keyboard operability of cart, search, filters, and checkout, and respect for `prefers-reduced-motion` (already honored by the existing motion wrappers).
