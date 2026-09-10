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
- Cart and wishlist persist client-side across sessions; checkout is a five-step wizard (Shipping → Billing → Review → Payment → Confirmation). Delivery options and discount codes are quoted by the server against the administered tables; payment methods and their notices are read from the database.
- `/blog` carries editorial content; `/faq`, `/about`, `/contact` carry trust and support content.
- Account area is tab-driven via `?tab=`.

## Capabilities and Constraints

- **Stack:** Next.js 13.5 App Router, TypeScript (strict), Tailwind + shadcn/ui, Prisma against Neon Postgres, deployed to Vercel from `main`. Route handlers under `app/api/` and server actions behind every admin screen.
- **Data:** Neon Postgres via Prisma. The catalogue — 9 categories, 41 manufacturers, ~790 products — is built from the store's own product photographs (`npm run db:seed-catalogue`); blog posts, testimonials and FAQs still come from `lib/data/`.
- **Images:** product photographs uploaded to Cloudinary under `mranabolics/library/`, mirroring the source folder; journal photography is stock, fetched through Cloudinary.
- **Auth is implemented** for customers: register and sign in write a Customer row (bcrypt, HttpOnly session cookie) and link the person to their CRM contact. Password reset is not, because it needs email, and the form says so. Supabase is installed but unused.
- **SEO:** fixed. Routes are server components that own their metadata and emit JSON-LD in the first response; interactivity lives in client children. Product pages carry Product, Offer, BreadcrumbList and — only where reviews exist — AggregateRating and Review. Product pages are deliberately **not** pre-rendered: they render on first request and are cached by `revalidate`, so a deploy does not depend on 792 database reads succeeding. The first response is still fully server-rendered, and `/sitemap.xml` still lists every URL.
- **Undecided:** payment processing is unbuilt, and deliberately so — see the note on the Order model. Everything else is built: customer accounts, orders, delivery rates, discounts, review moderation, analytics, campaigns and site settings, all administered at /admin.

## Brand Commitments

- **Name:** MrAnabolics. Fixed.
- **Product catalog:** the photographed catalogue and its folder taxonomy are the product truth. Product names and manufacturers are transcribed from the file names; copy is generated from the folder, the name and the manufacturer and adds no claims. The blog content is fixed and must survive verbatim.
- **Open:** color, typography, layout, component language, and the existing dark-only treatment carry no commitment and may be replaced.

## Evidence on Hand

- Real: the product photographs, their names and manufacturers, and the category/compound-group taxonomy (all from the store's own files).
- **Synthetic and must be labeled as such:** all prices (placeholders pending review), all testimonials, the "over 40 countries" shipping claim, and any review or rating that appears. Photographed products carry no reviews or ratings at all. These are demo fixtures authored for a portfolio build, not verified business facts.
- No real logo, lab certificates, or customer data exist. Catalogue imagery is the store's own product photography; a product with no photograph falls back to a drawn vessel plate in its category pigment, labelled as such. Editorial imagery on the journal remains stock photography.
- This project is a **portfolio / demo template**. Nothing here is a live commercial offer; any real deployment would require the claims above to be replaced with verified material and reviewed for jurisdictional compliance.

## Product Principles

1. **Evidence outranks atmosphere.** Specs, ingredients, and testing claims are the product's real argument; the design surfaces them rather than decorating around them.
2. **Two doors, one catalog.** Every browsing surface must offer both a goal-led path and a compound-led path without duplicating inventory.
3. **Legibility is the trust signal.** In a category built on skepticism, information that is easy to read and verify does more for conviction than persuasion styling.
4. **Nothing claims what it cannot show.** Synthetic demonstration content is authored at full fidelity and labeled; commercial and factual claims are never invented.
5. **The catalog is the constant.** Content survives every visual change; the visual system serves the catalog, never the reverse.

## Accessibility & Inclusion

No user-specific requirement was established. Baseline: WCAG 2.2 AA contrast in both light and dark themes, full keyboard operability of cart, search, filters, and checkout, and respect for `prefers-reduced-motion` (already honored by the existing motion wrappers).
