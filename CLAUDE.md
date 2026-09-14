# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # next dev
npm run build      # next build
npm run start      # serve production build
npm run lint       # next lint (next/core-web-vitals)
npm run typecheck  # tsc --noEmit
```

`next.config.js` sets `eslint.ignoreDuringBuilds: true`, so a green `build` proves nothing about lint — run `lint` and `typecheck` explicitly before considering a change done. No test framework is configured.

Windows note: several source files use CRLF. A `String.replace` with an LF-only multi-line needle will silently fail to match — normalize line endings in the needle, or use `sed`/the Edit tool.

## What this is

MrAnabolics — a Next.js 13.5 App Router storefront, originally scaffolded from the Bolt `nextjs-shadcn` template. **Deployed to Vercel** from `main`.

It is no longer the front-end-only prototype that sentence used to describe. It has a Neon Postgres database read through Prisma, a dozen route handlers under `app/api/`, server actions behind every admin screen, and a full back office at `/admin`. If you are reading this file to find out what exists, read the section headings: the catalogue, the CRM, orders, and "The admin, in full" are each real subsystems.

It is explicitly a **portfolio / demo build**. `PRODUCT.md` is the authority on product truth and records which content is synthetic. All reviews, testimonials, ratings, purity figures, order history, and shipping claims are authored fixtures and are **labelled as such in the UI**. Preserve those labels — do not present fixture data as fact, and do not invent commercial claims.

## Architecture

**Data layer — Neon Postgres via Prisma.** The catalogue lives in the database. [prisma/schema.prisma](prisma/schema.prisma) models Product (owning Specification, ProductFaq and Review rows), Category, Brand, BlogPost, Testimonial and Faq.

All reads go through [lib/db/catalogue.ts](lib/db/catalogue.ts), which returns the **same flat shapes** declared in [lib/types.ts](lib/types.ts) that the old arrays returned — so the storage change stops at that one file and no UI component knows about Prisma. It starts with `import 'server-only'`: importing it from a client component is a build error, not a runtime attempt to open a database connection in the browser.

[lib/data/](lib/data/) is now **seed source only**. It is the input to `prisma/seed.ts` and must not be imported by app code; the seed treats those arrays as the authority, so product copy stays verbatim.

```bash
npm run db:push     # sync schema to Neon (uses DIRECT_URL — PgBouncer cannot run DDL)
npm run db:seed     # idempotent upsert from lib/data
npm run db:studio   # browse the data
```

**Two connection strings.** `DATABASE_URL` is the pooled endpoint and carries `pgbouncer=true&connection_limit=1`; `DIRECT_URL` is the same database without `-pooler`, for migrations. Both live in `.env`, which is gitignored — `.env.example` is the tracked template. Never put a database URL behind `NEXT_PUBLIC_`; that ships it to the browser.

**Reads are memoised per process, not per page.** The storefront layout needs the catalogue on every route it renders. Querying per page made the build take minutes and then fail with `ECONNRESET`. `unstable_cache` did **not** dedupe across prerenders in Next 13.5, so `catalogue.ts` uses a small per-closure TTL memo (60s) instead, and every derived read — by slug, by category, by brand, related — filters that one list in memory. `next.config.js` also sets `experimental.cpus: 1`, because parallel prerender workers each opened their own connection and Neon reset them.

**Client components read a context, not the database.** [components/providers/catalogue-provider.tsx](components/providers/catalogue-provider.tsx) receives the catalogue from the **storefront** layout (`app/(storefront)/layout.tsx`, not the root one — the admin must not pay for this query) and exposes `useProducts()`, `useCategories()`, `useBrands()`. What it ships is the `ProductSummary` projection, not the full record: at ~790 products the full shape was megabytes of RSC payload on every page. See "The catalogue is the photo library". A second, smaller provider — [components/providers/settings-provider.tsx](components/providers/settings-provider.tsx) — carries the handful of site settings client components need.

**Referential integrity surfaced a real bug.** Two products carry brand "MrAnabolics" (slug `mranabolics`) that never had a row in the brands array — the hand-written data held that contradiction silently, a foreign key cannot. The seed derives any brand a product actually references rather than editing product copy, which is why there are 9 brands and a `/brands/mranabolics` page.

`lib/data/{products,categories,brands}.ts` are **gone**, along with the 12 template fixture products they held. The catalogue is generated from the store's own photographs — see "The catalogue is the photo library". `lib/data/` still holds `blog.ts`, `testimonials.ts` and `faqs.ts`, which `prisma/seed.ts` reads and which remain hand-written.

`getRelatedProducts` degrades relatedness deliberately — same category, then same manufacturer, then the rest of the catalogue — so a row of four always fills. Several categories hold only one product.

**Server/client split.** This is the load-bearing rule. Routes are **server components** that own metadata and JSON-LD; interactivity lives in a client child:

- `app/product/[slug]/page.tsx` → `components/product/product-detail.tsx`
- `app/shop/page.tsx` → `components/shop/shop-browser.tsx` (in `<Suspense>`, because it reads `useSearchParams`)
- `app/account/page.tsx` → `components/account/account-view.tsx` (same reason)

`app/page.tsx`, `/categories`, `/brands`, `/brands/[slug]`, `/blog`, `/blog/[slug]`, `/faq`, `/about` are server components. `/contact`, `/auth`, `/checkout` are still client components — they are pure forms with no metadata needs beyond the layout default.

**Adding a route with SEO means starting from a server page.** `export const metadata` in a `'use client'` file is a build error, not a silent no-op. Dynamic routes use `generateMetadata`, and brands and journal posts still enumerate themselves with `generateStaticParams`.

**Product pages deliberately do NOT.** `generateStaticParams` in `app/(storefront)/product/[slug]/page.tsx` returns an empty array, so the ~790 product pages are rendered on first request and cached by `revalidate`, not built ahead of time. Enumerating them made the build prerender 882 pages, each reading Neon — a deploy with 792 chances to fail on a database that suspends when idle, and it did fail exactly that way. The build is now 89 pages. **Nothing about SEO changed:** the first response is still fully server-rendered with its title, description and JSON-LD, `/sitemap.xml` still lists all 856 URLs, and an unknown slug still 404s. What changed is only when the HTML is produced.

`/sitemap.xml` is `force-dynamic` for the same reason — it enumerates the whole catalogue from four reads, and doing that inside Next's static-generation budget failed a build on its own while every other page passed. `next.config.js` also raises `staticPageGenerationTimeout` to 180s: headroom for a cold Neon start, not a fix for slow data.

**Structured data** is emitted as `<script type="application/ld+json">` from server components so it lands in the first response. Product pages carry Product + Offer + BreadcrumbList, plus AggregateRating + Review **only where approved reviews exist** and FAQPage only where the product has FAQs — a rating of 0 from 0 reviews is not a rating, and search engines flag it as invalid. The breadcrumb carries the compound group when the category has one. Verify changes against the built HTML in `.next/server/app/`, not the dev DOM.

**Canonical host** lives once in [lib/site.ts](lib/site.ts) as `SITE.url`, consumed by `metadataBase`, `app/robots.ts`, and `app/sitemap.ts`. It used to be hardcoded in three places. `robots.ts` disallows `/account`, `/checkout`, `/auth`, and the sitemap deliberately omits them.

**Global state.** [components/providers/store-provider.tsx](components/providers/store-provider.tsx) is the only store: cart, wishlist, and the open state of the cart drawer and search dialog. It persists to `localStorage` under `mranabolics-cart` / `mranabolics-wishlist`, gated behind a `hydrated` flag so the initial empty state never overwrites saved data — preserve that gate when adding persisted fields. `useStore()` throws outside the provider.

**Layout shell.** [app/layout.tsx](app/layout.tsx) mounts `AnnouncementBar`, `SiteHeader`, `main`, `SiteFooter`, plus `CartDrawer` and `SearchDialog` at the root. Overlays open from anywhere via `setCartOpen` / `setSearchOpen`, never by rendering a second instance. The first child of `<body>` is the Impeccable direction contract as an HTML comment — it must survive the production build; grep the built output for `39094e04` if you touch the layout.

## Images: Cloudinary

Delivery goes through Cloudinary. Only `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set — the cloud name is public (it is in every image URL) and is all that serving requires. **The API secret is not in this project and must never be**, least of all behind a `NEXT_PUBLIC_` prefix, which inlines a value into the browser bundle. Uploads would need it, and would live in a route handler.

**Custom loader, not Next's optimiser.** [next.config.js](next.config.js) sets `images.loader: 'custom'` pointing at [lib/cloudinary-loader.ts](lib/cloudinary-loader.ts). `next/image` still generates a responsive srcset, but every candidate is a Cloudinary transformation — so the origin never resizes anything and the host's own image optimiser is never invoked. That is the point on any serverless host: Vercel bills image optimisation per source image, and this route bypasses it entirely. This replaced `images.unoptimized: true`, which existed only because images were hot-linked and Next could not process them.

**Two delivery types, one helper.** [lib/cloudinary.ts](lib/cloudinary.ts) decides by shape:

- a value starting with `http` → **fetch** delivery. Cloudinary pulls, optimises and edge-caches the remote original. No upload, no credentials. This is how journal photography is served, and it is why **the database still stores origin URLs** — records stay portable and delivery is a rendering concern, not a data one.
- anything else → **upload** delivery, treated as a public ID. Uploading real product photography means storing public IDs in Postgres; the helper switches automatically with no component changes.

Without a cloud name every helper returns the source URL untouched, so the site renders correctly with Cloudinary unconfigured — a missing env var costs quality, never the page.

**Catalogue imagery is real raster, generated and uploaded.** `npm run images:generate` renders each product plate to a 1200x1300 PNG with sharp, uploads it to `mranabolics/products/<slug>`, and writes the public ID into `Product.images`. Idempotent: the public ID is the slug and the upload is `overwrite + invalidate`, so re-running replaces the asset and clears the edge cache rather than accumulating copies. Plate colours are parsed out of `app/globals.css` at generation time, so the tokens stay the single source of truth.

[lib/plate-svg.ts](lib/plate-svg.ts) holds the geometry once. The rasteriser renders it with literal hex; `ProductPlate` renders the same function with CSS-variable colours as a **fallback** for a product with no uploaded image. Two copies of that geometry would drift.

**The marking is DOM text, never baked into the raster.** Burning it in would ship whatever mono font existed on the build machine (JetBrains Mono is loaded by next/font in the browser and is not installed on the OS), and text inside an image cannot be selected, translated or read aloud. The design hook caught exactly this. Keeping it live also means a spec change relabels every surface with no regeneration.

**Upload path.** [lib/cloudinary-upload.ts](lib/cloudinary-upload.ts) is the implementation and carries **no** `server-only` guard, because build scripts run in plain Node where that guard throws. App code imports [lib/cloudinary-server.ts](lib/cloudinary-server.ts), which adds it. The secret is protected either way — Next only inlines `NEXT_PUBLIC_*` into client bundles — so the guard is defence in depth, not the primary control.

[app/api/upload/route.ts](app/api/upload/route.ts) is **gated on `ADMIN_UPLOAD_TOKEN` and fails closed when it is unset.** An open upload route lets anyone fill the account and host arbitrary files on the domain. Two modes: multipart (file passes through the server, 10MB cap, image types only) and `{ mode: "sign" }` (returns a short-lived signature so the browser uploads straight to Cloudinary and the file never touches the server). Swap the token check for a session check when auth lands.

**Scripts must load `.env` explicitly** — `node --env-file=.env --import tsx …`. An earlier version only worked because importing `PrismaClient` loads `.env` as a side effect, which broke the moment a script did not touch Prisma.

**`sizes` is load-bearing.** Every `<Image fill>` sets it. It tells the browser which srcset candidate to take before layout, and getting it wrong pulls a 3840w file into a 112px thumbnail. Measured: a card at 431px correctly requests the 640w WebP at ~15KB, against a 72KB JPEG origin.

**The photo library lives under `mranabolics/library/`, never `mranabolics/products/`.** Real product
photography (the `mranabolic files` folder: `<category>/<subcategory>/<Name - Brand>.<ext>`) is
uploaded by `npm run images:upload-library -- "<folder>"`, which mirrors the folder tree into
Cloudinary as `mranabolics/library/<category>/<subcategory>/<name-slug>` and writes
[prisma/image-library.json](prisma/image-library.json): public ID, delivery URL, parsed brand,
dimensions and an MD5 per file. It keeps the products folder untouched because that folder's
public IDs are product slugs with `overwrite: true` — uploading library files there under guessed
names is how one product's image silently replaces another's. Attaching a library image to a
product is a separate step: copy the public ID into `Product.images`.

The script refuses to run if two files would slugify to the same public ID, keeps the source
format rather than `uploadBuffer`'s PNG default, and is resumable — the manifest records each
source file's size and mtime, so a re-run uploads only what changed (`--force` re-uploads all,
`--dry-run` prints the plan). Each asset is tagged `library`, its category and subcategory, so the
Media Library can be filtered the same way the folder is.

## The catalogue is the photo library

**Products come from the store's own photographs, not from hand-written arrays.** The folder
`mranabolic files` is the taxonomy: its top level is the category, its second level (where there
is one) is the compound group, and each named file is a product. `npm run db:seed-catalogue`
([prisma/seed-catalogue.ts](prisma/seed-catalogue.ts)) reads [prisma/image-library.json](prisma/image-library.json)
against [lib/catalogue/taxonomy.ts](lib/catalogue/taxonomy.ts) and writes Category, Brand and
Product rows — 9 categories, 41 manufacturers, ~790 products, each with its photograph as
`images[0]`. The 12 template fixture products and `lib/data/{products,categories,brands}.ts` are
gone; `prisma/seed.ts` now seeds only testimonials and FAQs (the journal has its own seed — see "The journal").

**What the seed refuses to invent.** No ratings, review counts or reviews (zero and empty — the
product page hides the review block and says "No reviews yet"; the JSON-LD omits
`aggregateRating`). No dosing. No copy beyond what the file name and folder state. It DOES set
placeholder prices from `baselinePrice()` in the taxonomy, because a shop with no prices cannot
be browsed; the footer disclosure says so, and the admin's inline price editor is where real
prices go. Merchandising flags (best seller / new / deal / trending) are the first four listings
of each group, deterministically — a starting position for staff to change, not a judgement.

**Name parsing is the fragile part.** Files are `Name - Brand.ext`, inconsistently. `splitTitle`
recognises the manufacturer by matching the END of the title against `BRAND_ALIASES` (longest
alias first, after collapsing case and punctuation), so a dash inside a product name cannot be
mistaken for the separator and "Hilma Pharma" / "Hima Biocare" fold onto one brand. A strength
is the LAST number standing on its own — "CJC-1295", "MK677", "3-Test" are names — with a
short exclusion list (`NUMBER_IS_NAME`) for peptides whose number IS the name ("BPC 157").
Files named by a 32-hex hash are skipped; 35 are byte-identical to a named file, 10 have no
named twin. `--dry-run` prints every parsed row without touching the database; use it before
adding aliases.

**Two levels, one `Category` table.** `Product.subcategory` / `subcategoryName` carry the second
folder level as plain columns rather than a table, because the list is small and only ever
filters within a category. `/shop?category=x&group=y` is the address; the shop browser derives
the group list from the products themselves and drops `group` whenever `category` changes.
Product breadcrumbs (visible and JSON-LD) carry the group. `ContactStage` still has no CUSTOMER.

**The browser gets a projection.** With ~800 products the full record in the RSC payload was
megabytes on every page, so the storefront layout now ships `ProductSummary` (lib/types.ts) through
the catalogue provider — id, names, slugs, price, flags, short description, first image, first
specification. Cards, search, filters and the cart are typed against it; the product page reads
the full `Product` server-side. If the catalogue grows again, the next step is a route handler
for search so the browser holds nothing.

**Photographs and plates coexist.** `isPhotograph()` in product-plate.tsx tells them apart by
public-ID prefix (`mranabolics/library/` vs `mranabolics/products/`). Photographs render
`object-contain` with no marking overlay (their label is in the picture; 17% are not square and
a cover crop took their caps off); plates keep `object-cover` and the live marking. The gallery
caption switches with them. `npm run images:generate` now skips any product that already has a
photograph — rendering a plate for one would overwrite the photo's public ID.

**Seeding Neon in bulk means `createMany`, and existing rows are left alone.** One statement per
row through the pooler — even inside a batched `$transaction([...])` — was 792 × 3 statements at
~1.2s each, three quarters of an hour. The seed writes products with `createMany` a hundred at a
time, reads their ids back in one query, and `createMany`s the specifications: about twenty round
trips. It re-checks slugs against the database at the moment of each flush, because a run
interrupted mid-batch keeps landing rows after the next run has looked. A row that already
exists is NOT rewritten — after the first run the admin owns prices, stock and flags, and a re-run
must add new photographs without undoing that work; `--refresh` forces the slow per-row rewrite
when the taxonomy or copy generator changes. If you stop a seed with TaskStop, check for the
orphaned `node … seed-catalogue.ts` process before starting another: two writers collide on
the unique slug and the second one dies mid-batch.

Category pigments: the `--cat-*` tokens in globals.css and `vesselFor()` in plate-svg.ts are
keyed to the nine real slugs; a category added to the taxonomy needs both.
## The design system: ebru

The visual world is **ebru** (Turkish paper marbling), chosen by the user. Read the direction contract in `app/layout.tsx` before making visual decisions; `DESIGN.md` records the system as built.

**Two substrates, one pigment set.** Light is the lifted sheet (warm handmade paper); dark is the bath (thickened water). These are the *same world under different light*, not an inverted palette. Both are defined in [app/globals.css](app/globals.css) from one historical pigment set — indigo, madder, saffron, verdigris, lamp black. Light is the default; `next-themes` runs with `enableSystem={false}` because the brief explicitly rejected dark-first.

**Tokens.** The shadcn contract (`--background`, `--primary`, `--border`, …) is preserved and mapped onto world tokens, so all 40 `components/ui/*` primitives keep working. Prefer the world tokens in new code: `bg-paper`, `bg-card`, `text-ink`, `text-ink-soft`, `text-ink-faint`, `border-rule`, `border-rule-strong`, `text-pigment-indigo`, `pigment-madder`, `pigment-saffron`, `pigment-verdigris`.

Four token distinctions exist because collapsing them visibly broke the build during review — do not merge them back:

| Token | Why it is separate |
|---|---|
| `--size-coat` | The bath's ground coat. Deliberately **not** the sheet's value; when it was `--paper-raised`, ~48% of the hero field read as bare paper. |
| `--field-indigo` / `--on-field` | Large indigo **fields** go deeper on dark while text and rules lift. Lifting the field turned bands into pale blocks brighter than their own page. |
| `--plate-size` / `--plate-band` | Product plates need their own tones; reusing page paper made every band dark-on-dark and collapsed the dark plates to bare outlines. |
| `--cat-*` | Dark values track the **light** theme's saturation. Raising saturation as well as lightness turned madder into hot orange and verdigris into lime. |

`--plate-ink` runs the other way: it is defined **once, on bare `:root`, and never redefined for dark**. The plate raster is generated from the light tokens and uploaded, so it stays a pale sheet on a dark page; an ink that lifted with the substrate put pale text on it and the marking dropped to 1.9:1. `ProductPlate` therefore picks its ink by render path — `text-plate-ink` over the raster, `text-ink-soft` over the inline SVG, which *is* drawn live from the flipping `--plate-*` tokens.

**Category pigments.** Each of the 11 categories owns one colour, used identically in nav, filters, product-card plate rules, and breadcrumbs. Always go through `categoryPigment(slug)` from `lib/site.ts` — the raw `--cat-*` tokens are bare HSL triplets and are **not valid CSS colours** until wrapped in `hsl()`. Using the token directly paints nothing, silently.

**Marbling engine.** [components/ebru/marbling.ts](components/ebru/marbling.ts) is a real area-preserving displacement model (drop + tine), not a texture — Float32Array points, per-blot bounding boxes, and a displacement cutoff make the density affordable. Drop radius is **solved from a coverage target** (`N·πr² = 3·area`), never keyed to canvas size: keying it to `unit` made small canvases render nearly bare. `composeSheet` lays the ground coat, throws battal contacts, combs both axes, then places one `swirl()` (bülbül yuvası) at a fixed position rather than a rolled one.

[components/ebru/marble-bath.tsx](components/ebru/marble-bath.tsx) renders it. **Index 0 of `pigments` is the coat, not an ink.** `density` (0–1) trades fidelity for time — decorative fields run 0.45–0.7. The hero used to open on a bath at density 1 that the visitor could comb (`interactive`); at the owner's direction the hero no longer has a bath at all — see "The hero's right-hand column is the promotion". `interactive` is now used by nothing, and the home page's first marbling is further down. Composition is lazy via IntersectionObserver, so a dozen baths don't block the main thread. Pass a stable `pigments` array reference; inline arrays re-run the effect every render.

**Catalogue imagery is the store's own photography, with an authored fallback.** Every product in the catalogue carries a photograph from the store's files (see "The catalogue is the photo library"). [components/product/product-plate.tsx](components/product/product-plate.tsx) still draws a product as its shipping vessel on a floated ground in the category pigment, deterministic per slug — but only for a product with no photograph, and the gallery caption says which one the visitor is looking at. The footer disclosure was updated to match. Journal editorial photography is real stock printed through the `.duotone` SVG press filters defined in `app/layout.tsx`.

**Hairline grids.** Sections use `grid gap-px bg-rule`, where the rules are the container colour showing through the gap. A short final row therefore leaves a bare rule-coloured box — always close it with `<GridFillers>` ([components/layout/grid-fillers.tsx](components/layout/grid-fillers.tsx)) or use `<ProductGrid>`, which does it for you.

`GridFillers` takes one tier per breakpoint that changes the column count, because a filler that closes the row at one width is wrong at the next. `ProductGrid` steps **2 / 3 / 4** (`md`, `xl`) rather than jumping 2 → 4: at 1024px four columns put each card near 240px and wrapped most product names onto three lines. Changing a column count means changing the card's `sizes` in the same commit — a stale `sizes` is how a 1200w file lands in a 190px thumbnail.

**Craft rules this build holds to** (from the Impeccable craft floor — violating them is a regression):
- Chips and cards sitting over live pigment are **opaque**. Translucent ones lost legibility against the field.
- No kicker/eyebrow labels above headings. `SectionHeading` has no `eyebrow` prop by design.
- No glass/blur as decoration, no gradient text, no glowing accents. Shadows carry offset *and* blur.
- **There is no motion.** The build carried a hero reveal, image zooms on hover, card lifts, arrow slides and dot pops; all of it is gone at the user's direction. `MarbleBath` still accepts `animate`, but it defaults to `false` — the bath paints composed. Hover still responds, in colour only. `framer-motion` is in `package.json` and imported by nothing; the client bundle does not carry it. There is no scrolling marquee.
- Icons are lucide or authored SVG at consistent stroke weight — never emoji.
- Browser surfaces (selection, caret, scrollbars, focus rings, tabular numerals) are themed in `globals.css`.

**The logo is the owner's bull, alone, and it sits outside the palette on purpose.** [components/brand/bull-mark.tsx](components/brand/bull-mark.tsx) renders the owner's red bull illustration on transparency, with nothing around it. A first version put it on a gold coin with a drip; the owner asked for the bull only, so the coin, the gold and their `ignoreValues` are gone. It replaced the ebru drop mark everywhere: header, footer, sign-in, account, the checkout "placed" screen and the admin login. It is a `next/image` with `unoptimized`, and that flag is load-bearing: the Cloudinary loader treats any non-http `src` as a public ID.

**In the header the bull hangs below the bar.** That is the owner's reference: the head sits in the header and the folded arms hang over the page. The in-flow span holds the bull's place at the row's height, and the bull is positioned inside it, taller than it. It overhangs about 31px on desktop, 20px once the page has scrolled, and 16px on phones. The bull is `pointer-events-none`, so the overhang does not swallow clicks meant for the page. Two consequences to keep in mind:

- **A strip directly under the header must clear the arms.** The breadcrumb bars on product, brand and journal pages use `UNDER_HEADER_INSET` from [lib/site.ts](lib/site.ts): from `sm` the text starts right of the bull, and on phones it starts a little lower. A new page that puts text at the top-left under the header needs the same. The constant lives in `lib/site.ts` and not in the header because a string imported from a `'use client'` module into a server page is a client reference, not the string.
- **The phone header is sized to fit a 360px screen exactly.** The row has an 80px bull, the name at `text-base`, and the three buttons, with tighter gaps below `sm`. Widening any of them brings back horizontal scrolling at 360px.

`npm run brand:build` ([scripts/make-brand.mjs](scripts/make-brand.mjs)) turns `brand/bull.png` (the supplied file; it is really a JPEG) into `public/brand/bull.webp`, `app/icon.png` and `app/apple-icon.png`. It changes no colour. It only removes the white the bull was drawn on: a flood fill from the image border, so white inside the drawing survives, and the one-pixel edge is "un-mixed" so the dark theme shows no pale halo. The served bull is 320px WebP, about 25 KB. A 512px PNG was 396 KB, which is a lot for a logo on every page. The favicon is the bull on transparency; the home-screen icon is the bull on white, because iOS paints a transparent one onto black. Re-run the script if the source image changes. The outputs are committed, and `BULL_WIDTH`/`BULL_HEIGHT` in bull-mark.tsx must match what it prints.

The illustration looks like a widely sold stock drawing. Most stock licences forbid using an image as a logo or trademark. Before this is anything more than a demo, the owner should confirm the licence or commission an original mark.

**Type.** Familjen Grotesk (`font-display`), Archivo (`font-sans`), JetBrains Mono (`font-mono`, for assay figures, prices, labels). Mono is for data and measurement, not for a "technical" costume. Use `.tabular` on numbers that align.

## The admin: a second, borrowed design system

**`/admin` does not run on ebru. It runs on wp-admin.** The user asked for the WordPress
dashboard, so [app/admin/wp-admin.css](app/admin/wp-admin.css) is a transcription of the
WordPress "fresh" scheme (5.7+): `#1d2327` menu, `#2271b1` accent, `#f0f0f1` field,
`#c3c4c7` borders, system font stack at 13px. Values are literal rather than derived from
our palette, because deriving them is how a copy drifts into an approximation.

**Every rule is scoped under `.wp-admin`, and that scope is load-bearing.** The two systems
define overlapping ideas — border, background, muted text — with incompatible values, so an
unscoped `--border` would poison both. The class is applied once in
`app/admin/(dashboard)/layout.tsx` and once in `app/admin/login/page.tsx` (that route sits
outside the dashboard layout, so it imports the sheet itself or renders unstyled).

**Component classes lose to Tailwind utilities unless you help them.** Next emits layout CSS
*after* the Tailwind sheet, so `.wp-input { width: 100% }` and a `w-[4.5rem]` utility tie on
specificity and the later one wins — which is the stylesheet. That rendered the inline stock
field full width and left the mobile-only menu toggle on desktop. The fix is the override
block at the foot of wp-admin.css: `.wp-admin .wp-w-auto`, `.wp-input-narrow`,
`.wp-hide-desktop` are one class more specific, so they win on merit rather than order.
Reach for those rather than a Tailwind width or `!important`.

**783px, not 768px.** wp-admin switches to the off-canvas menu at 783px; Tailwind's `md` is
768. Mixing them strands the menu toggle in a 15px band with no way to open navigation. Use
`min-[783px]:` or the `wp-hide-*` classes, never `md:`.

**The design hook is off for the admin.** `app/admin/**` and `components/admin/**` are in
`detector.ignoreFiles` in `.impeccable/config.json`. Every colour and size there is outside
DESIGN.md *by design* — that is what importing another product's interface means. Do not
"fix" those findings back toward ebru tokens.

**What is mapped onto what.** WordPress's chrome is wired to real functions, not reproduced as
ornament: the comment bubble counts `Review` rows, "+ New" opens Add Product, and the Quick
Draft widget is a working create form that posts through the same `createProduct` action as
the full screen, so there is one validation path. The list table keeps the two behaviours that
are correctness rather than style — selection pruned on filter change, and delete confirming
by name.

**Attaching a picture: create first, upload second.** The Cloudinary public ID *is* the
product slug and uploads are `overwrite: true`, so uploading before the row exists means
uploading under a guessed slug — and a guess that collided would silently replace another
product's image. [components/admin/attach-image.ts](components/admin/attach-image.ts) therefore
creates the product, takes the unique slug the server actually assigned, and only then uploads.
[components/admin/image-field.tsx](components/admin/image-field.tsx) holds the File in memory
with an object-URL preview until that point; it does not upload on selection. Both add flows
(Add New and the dashboard's Quick Add) and the edit screen go through this one path.

The upload route keeps the source container — `FORMAT_FOR[file.type]` — instead of
`uploadBuffer`'s `format: 'png'` default. PNG is right for the generated plates, which are flat
vector art; re-encoding a photograph to PNG can triple it, and the plan has a storage cap.
Delivery still negotiates AVIF/WebP per request through `f_auto`.

**Harnesses.** All of them take `--env-file=.env`, because the admin sign-in comes from
`ADMIN_EMAIL` / `ADMIN_PASSWORD` there and none of them carries a fallback literal.
`node --env-file=.env .impeccable/wp-shot.mjs '[{"name":..,"path":..,"width":..}]'` logs in and
captures admin screens, failing loudly if it lands on the login page or finds no stylesheet.
`node --env-file=.env .impeccable/wp-e2e.mjs` creates a product through Quick Add, asserts it
reaches the list table, the right category and the public product page, then deletes it again —
confirming the delete against the database rather than against the re-rendered table.
`node --env-file=.env .impeccable/wp-upload-e2e.mjs` does the same with a file attached, following
it into Cloudinary, into the Neon row, back into the list as a thumbnail and onto the storefront,
then deletes both the row and the asset.

When writing an assertion like this, watch the URL pattern: `/admin/products/[^/]+$` matches
`/admin/products/new` as readily as `/admin/products/<id>`, so a wait on it resolves instantly on
the page you are already standing on and every later check runs against a half-finished state.
That produced three convincing false failures before it was spotted.

## Customer accounts

`/auth` and `/account` are **real**. The "nothing is connected" notice is gone from both, because
the project's rule is that such a notice comes off only when the flow genuinely works — and it is
still there on **forgot password**, which cannot work: a reset link is an email and this build
sends none. That form points at `/contact` instead.

**The security boundary is two constants, not a conditional.** `lib/account/session.ts` is a
near-copy of `lib/auth/session.ts` differing in the cookie name (`mranabolics_account`) and the
JWT **audience** (`mranabolics:account`). Because `jwtVerify` is given an audience, a customer
token is *cryptographically refused* by the admin reader rather than merely failing a role check.
One module with a `role` field in the payload would put that boundary behind an `if`, and an `if`
is something a later refactor can get wrong. `account-e2e.mjs` asserts a customer session hitting
`/admin` is bounced.

**A `Customer` points at a `Contact`; it does not duplicate one.** Registering upserts the contact
by email, so an order recorded by phone before the person ever opened an account still appears in
their history — `/account` finds orders through `contactId`, not through the customer row.

**Opening an account is not marketing consent.** Registration writes no `Subscriber`, and the
suite asserts it. The newsletter box is separate and carries its own consent sentence. This is the
same rule `lib/crm/contacts.ts` keeps by having no "create and subscribe" helper.

**Sign-in never says which half was wrong**, and spends the same time either way — a dummy bcrypt
compare runs when the address is unknown, so the timing does not leak what the shared message
hides. Registration is the deliberate exception: it *does* reveal that an address is taken,
because the alternative is somebody holding a password that will never work with no way to find
out why. Every service that hides this sends an email instead, and this one cannot. Rate limiting
is the mitigation.

`window.location.assign` after a successful sign-in, never `router.push`: the session arrives as a
`Set-Cookie` and every server component has to run again. A client push re-uses the RSC payload
rendered for an anonymous visitor, and the header keeps saying "Sign in" to somebody who just did.

```bash
node --env-file=.env .impeccable/account-e2e.mjs   # needs the app running
```

## The journal

The journal (`/blog`, and the section near the foot of the home page) is six sourced articles written for search: reading a certificate of analysis (featured), spotting counterfeit steroids, what HPLC and mass spectrometry can prove, whether SARMs are legal, steroid law in the US/UK/Canada/Australia, and the health risks. The editorial policy they follow is on the About page (`/about#editorial-policy`) and is binding on any new article: **every factual claim cited to a primary source, no dosing or protocols, the byline is the organisation, dates are real.**

**Where it lives.** Each body is Markdown at `content/journal/<slug>.md`; its title, search title and description, photograph, FAQs and numbered sources are in [lib/data/journal.ts](lib/data/journal.ts). `npm run db:seed-journal` writes them to Neon and **refuses the whole run** if a `[^n]` has no source, a source is never cited, a `[[figure:key]]` does not exist, more than one article is featured, or an excerpt exceeds 165 characters. Existing rows are skipped unless `--refresh`, because the admin can edit them; `--dry-run` writes nothing. The Markdown dialect and renderer are [components/journal/article-body.tsx](components/journal/article-body.tsx) — no HTML injection. Figures are drawn in [components/journal/figures.tsx](components/journal/figures.tsx) as live text, not images.

**Retired addresses.** The six template posts (a PCT "protocol", a stack-design guide, and four unsourced five-sentence pieces) contradicted the policy and are off the site. Their text is kept verbatim in `lib/data/blog.ts`. [content/journal/retired.json](content/journal/retired.json) is read by BOTH `next.config.js` (permanent redirect to the closest replacement) and the journal seed (deletes the row, and refuses to publish an article at a retired slug or redirect to one that does not exist). `prisma/seed.ts` no longer touches blog posts — it used to upsert them, which would have republished a withdrawn article behind its own redirect.

**Research that failed, and why the topics are what they are.** Sources for law were read from the legislation itself (govinfo, legislation.gov.uk, laws-lois.justice.gc.ca, legislation.gov.au, Queensland legislation); secondary legal summaries were vendor blogs. Research on dosing, PCT, esters and peptides was deliberately not pursued. Things checked and found to be commonly misstated: the UK personal-import exemption has covered **in-person carriage only** since 23 April 2012 (SI 2012/973); Australian steroid imports are Schedule **7A** (reg 5G) of the Customs (Prohibited Imports) Regulations, not Schedule 8; Queensland lists steroids in Schedule **1** Part 2 of the Drugs Misuse Regulation. FAQ rich results no longer show in Google, so the FAQPage markup is harmless but buys nothing.

**Before publishing more.** WADA publishes a new Prohibited List each autumn and the Poisons Standard is reissued; the SARMs and law articles name the 2026 instruments and should be re-checked and their `updated` date set when those change. Photographs are Pexels (free licence), credited under each lead image. `SITE.url` comes from `NEXT_PUBLIC_SITE_URL`, else Vercel's production domain — set it when a custom domain exists, before submitting the sitemap to Search Console, or every canonical link points at `*.vercel.app`.

The announcement bar setting still reads "Certificates of analysis now published with every batch", which the build does not do and which the certificate article now teaches readers to check. It is an admin setting (Email screen), not code.

## Live chat

A chat button sits on every storefront page ([components/chat/chat-widget.tsx](components/chat/chat-widget.tsx), mounted in the storefront layout behind the `chat_enabled` setting). It opens **empty**: no greeting, no suggested questions. Two modes, always visible and switchable: **Agent** (indigo) answers at once; **Support** (verdigris) goes to `/admin/chat`, where a person replies. Visitor bubbles are `bg-ink`, agent `bg-paper-sunk`, staff tinted verdigris with a border; all carry a time.

**A visitor is a token.** `/api/chat/visitor/message` sets `mra_chat`, a random 256-bit value, httpOnly and scoped to `/api/chat`; only its SHA-256 is stored (`ChatConversation.tokenHash`). The conversation is reachable only through that cookie — there is no id in any visitor URL. A browser that never wrote has no cookie, and its polls never touch the database.

**Polling, not sockets**, because Vercel functions cannot hold one open. The open widget asks `GET /api/chat/visitor/messages?after=<last createdAt>` every 2s while the tab is visible (`gte`, deduped by id); closed, every 20s and only for a browser that has chatted. The admin inbox polls the open thread every 3s and the list every 8s, both paused when the tab is hidden. `lastVisitorAt` vs `staffReadAt` is what "unread" means.

**Status is who acts next:** AGENT (only the bot so far), OPEN (waiting on a person — the menu bubble counts these), ANSWERED, CLOSED. Writing to Support always sets OPEN; writing to the agent never pulls a thread a person is handling back to AGENT. Messages are append-only. Staff replies store `staffEmail`, but the visitor's DTO never carries it — they see "Support".

**The agent answers from the store, not from memory** ([lib/chat/agent.ts](lib/chat/agent.ts)): delivery zones via `zoneForCountry`/`listDeliveryZones`, the payment methods table (and says plainly none is connected), the catalogue projection, and the advertised code only. With `ANTHROPIC_API_KEY` set, Claude (`CHAT_AGENT_MODEL`, default `claude-opus-5`, effort low, server-side refusal fallbacks) writes the reply from those facts and nothing else, and any link it writes off-site is reduced to its label. Without a key, or on any API failure or refusal, a rule-based answerer replies from the same facts. **Dosing/cycle/"is it safe for me" questions never reach the model** — a fixed reply points to a doctor and the health article. "Is this legit" gets the honest demo-build answer.

**Leaving an address is not consent.** `/api/chat/visitor/details` upserts a Contact (`firstSource: live chat`), records `CHAT_STARTED` once, joins the analytics visitor — and has no path to `Subscriber`. It answers the same for known and unknown addresses. All three visitor routes rate-limit per IP (in memory, per instance; Agent replies more tightly, since they can call a paid API) and carry a `website` honeypot that answers like a success.

**Chat actions do not `revalidatePath`.** The inbox refreshes itself and the page is force-dynamic; revalidating made every Send re-render the whole admin layout — eight pooled reads — before answering, and the button sat on "Sending…" long after the reply was saved. `replyToChatAction` returns the saved message so the inbox shows it without another fetch.

```bash
BASE=http://localhost:3210 node --env-file=.env .impeccable/chat-e2e.mjs
```

It asserts the cookie flags, that another browser sees nothing, the fixed refusals, the honeypot, that leaving an address writes no Subscriber, and that a reply sent through the real admin reaches the visitor's poll without the admin's address. Two traps it fell into: a page-wide `getByText` for the reply matched the **draft still in the textarea** (React writes a controlled textarea's value into its text content), so look inside the thread's live region; and from a development machine a Neon round trip is ~1.9s, so a reply can take ten seconds locally that takes a fraction of one on Vercel.

## The home page is a selection, not the shop

Three sections rendered their **entire** filtered set, which was invisible at twelve fixture
products and became a thirty-five-screen page once the real catalogue arrived: 42 best sellers,
39 deals and 41 manufacturers, together 63% of the page. Each is capped now, with a link through
to the full list — `ProductsSection` takes a `limit` (8, which fills whole rows at every column
count), `PopularBrands` shows 8, `WeeklyDeals` shows a lead plus 6.

The counts in the copy stay TRUE while the display is capped. "39 compounds marked down" above six
of them, with "Everything on offer" beside it, is the honest pairing.

| | before | after |
|---|---|---|
| mobile (390px) | 29,504px — 35 screens | 15,559px — 18.4 |
| desktop (1440px) | 21,420px — 22.5 screens | 11,265px — 11.9 |

**Category tiles and the two doors show real stock, not marbling.** Six abstract swirls labelled
"Injectables" answered no question a shopper has. Each tile is four photographs sampled EVENLY
across its category — products are ordered by group, so the first four in "Injectables" are four
vials of one compound and photograph as one product repeated. Photographs sit *above* the copy,
never behind it: text over a picture is the easiest way to lose a paragraph.

## The hero's right-hand column is the promotion

The hero's right column was a live marbling bath the visitor could comb, with a small card in its
corner showing `products[0]` — whichever product sorted first, for no stated reason, and a crash on
an empty catalogue. At the owner's direction the column is now the offer itself:
[components/home/hero-offer.tsx](components/home/hero-offer.tsx) is a full-height panel with the
product photograph at a size that sells it, the price and the saving, stock, **Add to cart**, and a
link through. It sits flush on the plain paper: the owner had the marbling removed from the hero
entirely, first the combable bath and then the band of it left framing the panel. With nothing
behind it the panel carries no border or shadow — the hero's own rules divide it from the headline
(a top rule below `lg`, the headline column's right rule from `lg`) — and its side padding matches
the headline column's gutters (`px-4 sm:px-6 lg:px-10`) so both halves sit on one grid. The
category pigment survives as the hairline along the top of the offer, as on every product card.

The photograph is `mix-blend-multiply` in the light theme. The pack shots are photographed on
white, and at hero size the white read as a rectangle pasted inside the warmer paper box; multiply
turns white into the paper so the pack sits on the sheet. It is `dark:mix-blend-normal`, because
multiplying onto a dark ground sinks the photo into it, and it is applied to photographs only — a
drawn plate carries its own ground colour. Any new surface showing pack shots large should do the
same; at thumbnail size the rectangle is not noticeable and product cards leave it alone.

Below `lg` the panel sizes to its content with a fixed 5:4 photograph. From `lg` the column has a
real height and the photograph grows into whatever the text leaves — `flex-1` and `aspect-auto`
only arrive at that breakpoint, because `flex: 1 1 0%` in a column of indefinite height can collapse
the box it is meant to size, and a percentage `h-full` does not resolve against a parent that only
has a `min-height`.

Both of its inputs are things an administrator controls rather than things this file decides:

- **Deals.** Products flagged `isDeal` whose compare-at price is above the price, ordered by the
  share of the price saved, capped at six, chosen in `app/(storefront)/page.tsx`. A product
  flagged "on offer" with no real markdown is left out: an "On offer" badge over a price that
  never changed is a claim with nothing under it. With no deals at all, the card shows a real
  product with no offer framing.
- **A code**, from the `hero_promo_code` setting (Settings → Commerce). `advertisedDiscount()` in
  [lib/discounts/index.ts](lib/discounts/index.ts) takes a *named* code and never chooses one:
  "show whichever codes are active" would publish codes handed out privately to one customer on
  the busiest page of the site. It applies the checkout's own rules minus the basket, so a
  paused, not-yet-started, expired or used-up code is not advertised — and it states every
  condition the till will enforce (minimum spend, category) beside the headline.

**Stepped by the visitor, never on a timer.** This build has no motion, and content that advances
on its own also fails WCAG 2.2.2 — the price is pulled away from someone reading it. It follows the
WAI-ARIA carousel pattern: a labelled region with `aria-roledescription="carousel"`, each slide
announced as "2 of 6", previous/next buttons *and* the arrow keys, and a polite live region on the
counter. The panel is not one big link: it holds buttons, and a button inside an `<a>` is invalid
HTML that also navigates on every press. The photograph is a second link to the product, taken out
of the tab order so a keyboard user meets one link per product, not two.

"Third-party assayed" is gone from it — the catalogue holds no assay for these products. The home
page also passes `ProductSummary`, not `Product`, into its client components now; the full records
put long copy, FAQs and reviews for 81 products into the payload, and the HTML fell from 1.28 MB
to 928 KB when they came out.

**The reference prices are placeholders.** The seed set each group's third listing to a
compare-at price 15% above its price, so the "was" figures this card promotes were never charged.
Before any real sale, a strikethrough has to be a price that was actually charged — under EU
Omnibus rules the lowest in the preceding 30 days — or the offer is a misleading one.

```bash
BASE=http://localhost:3210 node --env-file=.env .impeccable/hero-offer-e2e.mjs
```

It names a probe code, confirms it is advertised with its minimum spend, then pauses it and uses it
up and confirms it disappears each time — polling, because the page and the settings are both
cached for 60 seconds. Two things it learned the hard way:

- **A disappearance check that runs after the appearance failed passes for free.** An early run
  reported "a paused code stops being advertised" as a PASS when the code had never appeared. The
  dependent checks are now skipped and counted as failures if the first one fails.
- **Cleanup that swallows its errors plants test data in production.** The database dropped out
  mid-run, the probe's delete failed inside `.catch(() => {})`, and every later run read the leftover
  as "the setting somebody had before" and restored it. Cleanup now retries, reports failure loudly,
  refuses to restore a value it wrote itself, and sweeps earlier probes by their own marker.

It also distinguishes a broken rule from a server that cannot regenerate the page: a page that
answers `x-nextjs-cache: STALE` throughout is a server that cannot reach the database, and the suite
says INCONCLUSIVE rather than blaming the card.

## Measuring a page, and the traps under it

`.impeccable/shoot.mjs` cannot capture the home page — it waits for `networkidle`, which never
arrives while the marbling canvases compose lazily and the visit tracker posts. `shoot-lazy.mjs`
scrolls the page to settle every lazy canvas and captures without that wait.

`.impeccable/measure-sections.mjs` reports section heights, shares and horizontal overflow,
because a 29,000px screenshot is unreadable as evidence — you cannot see a proportion problem by
scrolling a picture of a scroll.

**It refuses to measure a dev server or a page whose CSS is not applying**, and that guard is
there because both produced convincing nonsense:

- a dev server emits `/_next/static/css/app/layout.css?v=…` rather than a hashed file, and its
  chunk output can be stale after an interrupted build — which collapses every flex and grid, so
  the numbers look like a triumph because sections with no layout are short;
- the port may belong to an entirely different project.

**Never kill `next build` mid-compile.** A `pkill` on a running build poisons `.next/cache`; the
next build then reports "compiled successfully" and silently emits **stale chunks**. Several
rounds of measurement went into a page that did not contain the changes being measured. If a build
must be stopped, `rm -rf .next` before the next one.

**The build needs Google Fonts reachable.** `next/font` fetches Familjen Grotesk, Archivo and
JetBrains Mono at build time and a socket hang-up is fatal — `Failed to compile`, not a fallback.
The dev server degrades to a system font instead, so this only bites in `build`.

## Auth / Supabase status

`@supabase/supabase-js` is installed and `.env.local` declares `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (both empty), but **no source file imports Supabase and nothing needs it**. Customer accounts are implemented directly against Postgres — see "Customer accounts" above. The dependency is dead weight: remove it rather than wiring it, unless something genuinely calls for Supabase.

`/checkout` is still a UI shell where payment is concerned, and says so at the point of entry. `/auth` and `/account` are no longer shells. Keep that distinction honest: a notice comes off only when the flow behind it actually works.

## Checkout and marketing consent

**Payment is not connected, and that is a decision rather than an unfinished task.**
[components/checkout/payment-methods.tsx](components/checkout/payment-methods.tsx) offers card,
Cash App and crypto (BTC/ETH/USDT), and each panel says at the point of entry that nothing is
wired. The crypto panel deliberately shows **no wallet address**: a plausible-looking string
there is the most dangerous thing the page could contain, because someone would send real money
to an address that is either nobody's or somebody else's. This catalogue is controlled
substances and prescription-only medicines; connecting a live rail is not a matter of filling
in a constant.

**Email capture is consent-first, because the alternative does not work.** There is no way to
read an address off a visitor who never types one, and mailing people who did not opt in breaks
GDPR/PECR and CAN-SPAM — which costs the sending domain its reputation and takes deliverability
for the people who *did* subscribe with it.

Three capture points, one path: the newsletter band, [components/marketing/exit-capture.tsx](components/marketing/exit-capture.tsx),
and the consent box at checkout, all through
[components/marketing/use-subscribe.ts](components/marketing/use-subscribe.ts) →
`POST /api/subscribe` → [lib/marketing/subscribe.ts](lib/marketing/subscribe.ts). Rules the
schema and the route enforce together:

- **A row cannot exist without consent evidence.** `consentText` stores the literal sentence
  shown at the time, from [lib/marketing/consent.ts](lib/marketing/consent.ts), which both the
  form and the server import so they cannot drift. Add new wording rather than editing existing
  wording — past rows must keep what their subscriber actually agreed to.
- **The consent flag is re-checked server-side.** A client posting directly has shown nobody a
  checkbox.
- **The route never reveals whether an address is already on the list.** "Already subscribed" is
  a membership oracle: it turns the form into a way to test who shops here.
- **Unsubscribe is by random token, never by address** — a token derived from the email would
  let anyone unsubscribe anyone. GET confirms, POST acts, because mail scanners prefetch links
  and a GET that unsubscribes gets fired by them.
- **There is no admin "add subscriber".** A row an administrator typed has no consent behind it.
  `unsubscribeSubscriber` is one-way for the same reason.

`SUBSCRIBER_IP_SALT` salts the IP hash kept as origin evidence. Unset is safe — the hash is
omitted rather than falling back to an unsalted digest, which for an IPv4 address is reversible
by brute force and so only looks like protection.

`node --env-file=.env .impeccable/marketing-e2e.mjs` asserts all of the above, including the
refusals, and gives each check its own `x-forwarded-for` so the suite does not trip its own rate
limiter — a test that depends on how recently it last ran is worse than no test.

**Neon's unpooled host is unreachable on this project**, so `npm run db:push` fails with P1001.
`db push` is not migration-based and takes no advisory locks, so it runs fine through the pooler:
point `DIRECT_URL` at the pooled URL for that one command. Real migrations would still need a
reachable direct endpoint.

## The CRM

**`Contact` and `Subscriber` are separate tables, and that separation is the whole design.**
`Subscriber` is a *marketing consent record* — the schema offers no way to write one without
evidence someone ticked a box. `Contact` is *the person*. Somebody who writes to support has a
real relationship with the business and has consented to nothing; collapsing the two would force
a choice between refusing to record that enquiry and manufacturing consent for it.

So **a Contact row is never permission to email anyone.** The linked `Subscriber` is the only
thing that grants that, and `marketingConsent()` in [lib/crm/contacts.ts](lib/crm/contacts.ts) is
the only way to ask. It is a function rather than a boolean column because a flag copied onto the
contact goes stale the moment someone unsubscribes, and the failure mode is mailing people who
opted out.

[lib/crm/contacts.ts](lib/crm/contacts.ts) is the write path: `upsertContact`, `recordActivity`,
`attachContactForSubscriber`. There is deliberately **no** "add contact and subscribe them"
helper — the moment one exists, somebody calls it from a form that showed no checkbox.

Staff **can** add a contact by hand at `/admin/contacts/new`, which is ordinary CRM work: you met
them, they rang you. `createContact` stamps `firstSource` as `added by staff` and has no path to
the subscriber table, so a typed-in row can never later be mistaken for someone who opted in. The
screen says so before it asks for anything, and there is no consent checkbox on it — a box an
administrator ticks on someone's behalf is evidence of nothing.

**Deleting a contact keeps their Subscriber row.** That row is the suppression record: deleting it
would make an opt-out reversible by the next sign-up. What deletion does do is end live consent —
a SUBSCRIBED contact is unsubscribed as part of the delete, because removing someone from the CRM
while still mailing them is incoherent, and fewer emails is always the safe direction. Enquiries,
notes and activity cascade away with the person.

**No interactive transactions in this area, deliberately.** `prisma.$transaction(async tx => …)`
holds a connection open across several remote round trips; against Neon behind PgBouncer that blew
Prisma's 5s ceiling and then deadlocked two admin writes against each other. Everything here is
either a single nested write (atomic on its own) or a batched `prisma.$transaction([...])`, which
is one round trip. `recordActivity` nests the activity row into the `lastActivityAt` bump for the
same reason. If you add a CRM write, follow that shape.

**`ContactActivity` is append-only.** Nothing edits or deletes a row; a timeline you can rewrite
answers no question you would ask a timeline. Consent events land there too, which is what lets
"when did they opt in, and from where" be answered on one screen. Each summary is written for a
human *at the point it happens* — reconstructing a sentence later from a type and a foreign key
is how timelines end up saying "status changed" and nothing else.

**Enquiries.** `/contact` now posts to [app/api/enquiry/route.ts](app/api/enquiry/route.ts) →
[lib/crm/enquiries.ts](lib/crm/enquiries.ts). Rules it holds, all covered by the harness:

- **An enquiry never touches the subscriber table.** Replying to someone who wrote to you is
  correspondence and needs no opt-in; it is also not permission to send anything else.
- Subjects come from [lib/crm/subjects.ts](lib/crm/subjects.ts), imported by both the form and
  the route — the same trick as `consent.ts`, for the same reason.
- Rate limited per IP, and it carries a **honeypot** that answers exactly like a success. Telling
  a bot it was caught is telling it how to pass.
- It never reveals whether an address is already known, for the same membership-oracle reason
  `/api/subscribe` does not.

`handledAt` is stamped once, when an enquiry first leaves the open states, and reopening never
clears it — how long somebody waited for an answer is a fact.

The contact form's "not connected" notice is **gone, because it is no longer true**. It now says
the message is stored and reaches the queue but no automatic email is sent. Keep that precise: a
reply comes from a person, in a mail client, because this build sends no email.

`/api/admin/contacts.csv` exports the current tab. It carries a **`marketing_consent`** column
derived from the linked Subscriber, never from the contact — a contact export that travels without
it is how a CRM list ends up loaded into a sending platform as though every row were mailable.

**Admin screens** are `/admin/contacts`, `/admin/contacts/new`, `/admin/contacts/[id]` and
`/admin/enquiries`, under a CRM menu group whose bubble counts enquiries awaiting a person — the
position wp-admin uses for comments awaiting moderation. Both list tables are WP_List_Table shaped
and keep the behaviours products-table.tsx calls correctness rather than style: selection pruned
when the visible rows change, and delete naming what it is about to remove. On the contact screen the consent panel comes first and is stated
in a sentence, because "SUBSCRIBED" sitting next to a stage of "Qualified" invites reading a
staff judgement and a person's own decision as the same kind of fact.

`ContactStage` deliberately has **no CUSTOMER value**: no order can be placed on this build, so
that stage could only ever be asserted, never earned.

Admin forms use `onSubmit` + `new FormData(event.currentTarget)`, never `<form action={fn}>` with a
client function. This is React 18: that is a React 19 feature and here it fails silently — the
button looks like it worked and no row is ever written.

```bash
npm run db:backfill-crm   # one-off: give pre-existing subscribers a contact. Idempotent.
node --env-file=.env .impeccable/crm-e2e.mjs           # the public path and its refusals
node --env-file=.env .impeccable/crm-admin-e2e.mjs     # the admin: add by hand, select-all, delete
node --env-file=.env .impeccable/crm-controls-e2e.mjs  # every control, checked against the database
```

`crm-e2e.mjs` asserts the refusals and the honeypot, and above all that a submitted enquiry leaves
**no** subscriber row and **no** `SUBSCRIBED` activity behind. `crm-admin-e2e.mjs` drives the real
admin and asserts the two things that would be expensive to get wrong: adding a contact by hand
writes no consent, and deleting a subscribed contact leaves the suppression record standing.

Both admin harnesses wait on a heading rather than `waitForURL` after a delete or a create:
`router.push` is a client-side transition, so no `load` event fires and `waitForURL` times out on a
flow that worked perfectly.

Note for anyone editing the other harnesses: subscribing now also creates a contact, so
`marketing-e2e.mjs` cleans up `@example.test` contacts as well. A suite that removes only the
subscriber leaves an orphan person behind and the contact list fills with probes.

## Orders

**The `Order` model has no payment fields, and that is the design rather than a gap.** No amount
paid, no transaction id, no gateway reference, no payment status. This build collects no money, so
a half-present payment column would be worse than none: it invites a screen that says "paid" on
the strength of somebody ticking it. `orders-e2e.mjs` asserts the absence against
`information_schema`, not against the Prisma client, so a column added later fails the suite.

What the model does cover is everything after the money question — what was ordered, at what price,
where it is going, and how far along it is.

**The storefront checkout does not create orders.** It cannot take payment, so there is nothing for
it to complete. Orders are recorded from `/admin/orders/new`, which is the back-office path for one
placed by phone or email. `/checkout` keeps its existing notices; do not wire it to `createOrder`
without dealing with payment first.

**Lines are snapshots.** `OrderItem` copies the product's name, slug and unit price at the moment
the line is created and never reads them back through the relation. Renaming or repricing a product
must not restate what somebody bought last month — which is also why `productId` is nullable and
`onDelete: SetNull`: deleting a product blanks the link rather than destroying the record of the
sale. Totals are stored for the same reason, never recomputed from today's catalogue.

**The delivery address is captured onto the order,** not read from the contact at render time.
People move; where a past parcel went is a fact about that parcel.

**Milestone stamps are set once.** `confirmedAt`, `shippedAt` and `cancelledAt` are written the
first time an order reaches each state and are never cleared by moving it back — the same rule as
`handledAt` on `Enquiry`. How long something took is a fact.

`reference` (`MRA-XXXXXX`) exists because `id` is a cuid nobody can read down a phone line. Its
alphabet omits O/0 and I/1/l, and `uniqueReference()` retries on collision rather than trusting
randomness.

Order milestones also land on the customer's `ContactActivity` timeline (`ORDER_PLACED`,
`ORDER_STATUS_CHANGED`), so one screen answers the whole relationship. Deleting an order leaves
those lines: the order existed, and the timeline is append-only.

```bash
node --env-file=.env .impeccable/orders-e2e.mjs
```

## The admin, in full

The menu is Dashboard, Products, Orders, Live Chat, Delivery, Discounts, CRM, Audience (Analytics,
Subscribers, Messages, Campaigns), Reviews, Search, Media, Journal, Payments, Email, Settings.
`components/admin/wp-chrome.tsx` owns it; a section whose highlight covers more routes than its
own href needs an entry in `FAMILIES` (Products, CRM and Audience each have one). The bar bubble
counts **pending reviews** and links to the moderation queue, which is the position wp-admin uses
for comments awaiting moderation. Menu bubbles count open enquiries, open orders and pending
reviews — things a person still has to act on, never totals.

Each area owns its own action file (`discount-actions.ts`, `delivery-actions.ts`,
`review-actions.ts`, `campaign-actions.ts`, `message-actions.ts`, `settings-actions.ts`,
`analytics-actions.ts`). They are separate so that a change to one area cannot break another's
imports, and every one of them follows the same three rules: `requireAdmin()` first inside the
action, `{ok}|{ok:false,error}` back, and `runAction` at every call site.

### Analytics, and what is deliberately not collected

**A visitor is a random token in a first-party cookie and nothing else.** `mra_vid` is generated
server-side by `/api/track`; it is not derived from an IP, a fingerprint or anything about the
person, so clearing cookies genuinely resets it. **No raw IP is stored on `Visitor` or
`PageView`.** Country comes from the CDN's own geo header (`x-vercel-ip-country`, `x-nf-geo`,
`cf-ipcountry`) or is null. Referrers are reduced to a bare hostname before storage — a full
referrer URL can carry someone else's query string, which is their data leaking into ours — and
query strings are stripped from the path.

`Visitor.contactId` is written in exactly one kind of moment: somebody typed their own address
into the newsletter or the contact form and submitted it. `lib/analytics/identify.ts` does it
from `/api/subscribe` and `/api/enquiry`, scoped to rows where `contactId` is still null so the
first identification wins and a shared browser cannot reassign an earlier person's history.
Analytics never works out who somebody is; the person tells it. That module is separate from
`track.ts` on purpose — the tracker must not be able to do this on its own.

The whole thing is behind the `analytics_enabled` setting, checked in `recordView`/`recordSearch`
*and* at the mount point in the storefront layout. `/api/track` always answers 204 and never
throws: a failed analytics write must never be the reason a page misbehaves.

`/admin/search` is the more valuable of the two screens. A term that returned nothing is a
customer telling you in their own words what they came for and could not find — the only
analytics row that names a gap in the catalogue rather than describing traffic. Searches are
reported by `components/analytics/use-search-log.ts`, debounced ~900ms so "test" arrives as one
row rather than four prefixes, and deduplicated per mount.

### Discounts

`evaluateDiscount` is the only door. It runs server-side at `/api/discount/validate` and again
when an order is recorded, because **a price the browser works out is a price the browser can
change** — the checkout hook holds a quote, never an authority. The clock beats the status
column: a past `endsAt` is refused even while the row still says ACTIVE, so `expireDiscountsPastEnd()`
is housekeeping rather than enforcement.

**`not-found` and `expired` are the same sentence to a shopper.** Distinguishing them turns the
box into a way to enumerate live codes — the same reasoning that stops `/api/subscribe` revealing
whether an address is on the list. The true reason is exported separately for admin surfaces.
Do not let a later "clearer error messages" pass split them.

`Order.discountCode` and `Order.discountTotal` are snapshots, like the line prices: editing or
deleting a `Discount` later must not restate what an order was actually given. Neither is a
payment field — they record what was charged, not what was collected, and `orders-e2e.mjs` still
passes its column check.

**`createOrder` re-evaluates the code and is the only place the money is decided.** The admin form
posts a CODE, never an amount; `lib/orders/orders.ts` calls `evaluateDiscount` again against the
live table, applies it, and only then calls `redeemDiscount` — after the order row exists, so a
crash between the two undercounts rather than consuming a limited code on an order that never
landed. A code that has lapsed between quoting and saving does **not** fail the order: somebody is
on the phone, and refusing to record what they bought is the wrong trade, so it is simply not
applied.

`/admin/orders/new` renders a capped, searchable slice of the catalogue rather than all ~790
products. Any product with a quantity on it stays listed whatever the search says — the server
pairs `productId` and `quantity` by index across the rendered inputs, so a row that is filtered
out is a line that was never ordered.

### Delivery

A named zone beats the catch-all regardless of `position`; `position` only breaks ties between
two zones that both name the country. An **empty `countries` list is the rest-of-world zone**, and
deactivating a zone hands its countries back to that catch-all rather than blackholing them.
`/admin/delivery` warns when there is no active catch-all, when there are two, when two active
zones claim the same country, and when a zone has no active rate — each of those is a state where
some customer is offered nothing and nobody would otherwise notice.

`quoteDelivery` returns `{ zone, options }` rather than a bare array, because "no zone covers this
country" and "the zone covers it but this basket qualifies for nothing" need different copy. The
preview panel on the admin screen is what makes a rates table trustworthy: without it nobody can
tell whether the zones actually work.

### Reviews

**An unapproved review is never visible, and the star rating never counts one.** Both halves
matter. `lib/db/catalogue.ts` filters `reviews` on `status: 'APPROVED'` in `productInclude`, and
`Product.rating`/`reviewCount` are recomputed from approved rows only — reading every row while
the rating counted approved ones would put the two into permanent disagreement, which is exactly
what moderation exists to prevent. On a controlled-substance catalogue an unreviewed "cured my X"
is a claim the shop is publishing, whoever typed it.

`/api/review` rate-limits per IP, hashes the address with `lib/ip-hash.ts` and carries a honeypot
that answers exactly like a success. It **never touches the subscriber table**: writing a review
is not consent to be emailed. `moderatedAt`/`moderatedBy` are re-stamped on every decision, unlike
`Enquiry.handledAt` and the order milestones — those record how long somebody waited, which is a
fact; this records who is answerable for what is on the page now.

### Campaigns and Messages

**There is no Send button anywhere, because this build sends no email.** A campaign is written and
its audience counted; when a person sends it from a real platform they *record* that — the control
says "Record as sent" and asks who and through what. `setCampaignStatus` refuses SENT outright;
SENT is reachable only through `recordCampaignSent(id, sentVia)`, which stamps `sentBy` from the
session and snapshots `recipientCount`. A status dropdown offering "Sent" would let somebody assert
a send with no author and no platform.

`segmentWhere()` in `lib/campaigns/index.ts` is the only place `status: 'SUBSCRIBED'` appears, and
every exported query goes through it — a segment's own clause is ANDed on and **cannot widen the
set**. An unsubscribed address is unreachable from campaigns by construction, not by a filter
someone might forget. Editing a READY campaign drops it back to DRAFT; editing a SENT one is
refused, because its words are the record of what reached people.

Recording a message appends a `MESSAGE_RECORDED` line to the contact timeline with a summary
written for a human at the point it happens. Deleting the message leaves that line standing —
`ContactActivity` is append-only.

### Payments, Email, Settings

`lib/settings.ts` is the only way to read or write a setting, and it is a **declared registry**: a
key that is not in `SETTINGS` cannot be read or written, so a typo is a missing entry rather than a
silently empty value. Every key has a default and `getSettingsSafe()` falls back to it, so a fresh
database — or a sleeping one — renders the site correctly with no settings rows at all.

A settings form posts a hidden `__fields` manifest naming the keys it rendered. Without it,
"absent from the FormData" and "set to empty" are indistinguishable, and saving the Email screen
would blank the announcement bar. It also settles the checkbox problem: an unticked box sends
nothing at all. `saveSettings` validates before writing, so one bad number cannot half-save.

**`/admin/payments` controls whether a method is LISTED, never whether it can take money.**
`connected` is false on every row and no screen can set it. There is deliberately no field for a
wallet address, a merchant id or an API key, and adding one is not a small change: an address
stored there that is nobody's — or somebody else's — is the most expensive mistake this page could
make. The checkout panels now render their notice from the database, so the sentence a customer
reads at the point of entry is the one an administrator wrote.

The System box on `/admin/settings` reports **set / not set, never a value**, and the database
*host* only. A connection string on screen is a leak.

```bash
npm run db:seed-operations   # payment methods + delivery zones. Idempotent, edits preserved.

node --env-file=.env .impeccable/admin-areas-e2e.mjs      # the invariants, against the database
node --env-file=.env .impeccable/admin-screens-e2e.mjs    # every screen loads and is in the menu
node --env-file=.env .impeccable/discount-order-e2e.mjs   # a discount actually applies to an order
```

**Every harness needs `--env-file=.env` now, including the ones that do not touch Postgres.** The
admin sign-in comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD` there, and the harnesses refuse to run
without them rather than falling back to a literal — a password committed to a repository is a
password nobody can rotate without a commit, private repo or not. `.env.example` documents the
two keys.

`discount-order-e2e.mjs` is the one that proves the feature is *connected* rather than merely
present: everything else about discounts can pass while the order is still written at full price
with no redemption recorded, which is exactly the state it was written to catch. It records an
order through the real admin and then checks the money, the snapshot, and the counter.

**Both browser suites navigate with `waitUntil: 'networkidle'`, and that is not incidental.**
Typing into an admin form before React has hydrated sets the DOM value without React seeing the
change event — the quantity is invisible to the component, the submit button never unlocks, and
the failure reads as a broken form rather than a racing test. The same trap sends the login form
to `/api/admin/login` as a bare POST, which answers JSON and strands the browser on the endpoint.

Settings are not seeded: the registry's defaults already cover an unwritten key, and writing them
into the table would only create rows nobody chose.

`admin-areas-e2e.mjs` asserts against Postgres rather than importing `lib/*` — those modules begin
with `import 'server-only'` and throw in plain Node, and a harness that imported the
implementation could only prove it agrees with itself. It re-derives each rule instead: the rating
from approved rows, the delivery coverage from the zone table, the absence of an IP column from
`information_schema`. It leaves the database as it found it.

## Every admin action is wrapped in `runAction`

[components/admin/run-action.ts](components/admin/run-action.ts) exists because of a failure mode
that made the admin look broken while every line of it was correct.

Admin actions return `{ok:true} | {ok:false,error}` for expected failures. But a server action can
also **reject**, and against Neon that is routine: the endpoint suspends when idle and refuses the
first connection that wakes it, so an admin left open for ten minutes hits it on the next click. A
handler shaped like

```ts
setBusy(true);
const result = await someAction(...);
setBusy(false);            // never runs
```

then leaves the button stuck on "Saving…", shows no message, and writes nothing — indistinguishable
from a control that silently does not work. Wrap every action call:

```ts
const result = await runAction(() => someAction(...));
```

That turns a rejection into an ordinary `{ok:false}` the existing notice UI already renders. Every
call site across the admin goes through it; add new ones the same way.

**This drifted once and was worth catching.** Ten call sites had been added without the wrapper —
including the entire product path (`products-table`, `product-form`, `product-create-form`,
`wp-quick-product`), `subscribers-table`, and `attach-image`, plus `inline-editor`, which is the
edit control for Categories, Manufacturers *and* the Journal, so one unwrapped call there froze
three screens. Two of them are the shapes to watch for, because neither looks like a call site:

- a helper module that calls an action on a component's behalf (`attach-image.ts`);
- a component that receives the action as a **prop** (`inline-editor.tsx`), where the call reads
  `action(form)` and greps for the action's name find nothing.

To check the rule holds, look for an `await` on anything from `@/app/admin/*actions` that is not
inside `runAction(() => ...)`. Note that a wrapped call must read its FormData *before* the await:
`event.currentTarget` is null by the time a promise resolves.

## Gotchas

- **The build wakes the database before it starts.** `prebuild` runs `scripts/wake-db.mjs`,
  which issues one `select 1` and retries with backoff for about a minute. This exists because
  `withWakeRetry` gives up after four attempts, and a branch asleep for days takes longer than
  that: the observed failure was 737 `Can't reach database server` errors and an eighteen-minute
  build that produced 3 of 792 product pages. The script is deliberately NON-FATAL — if the
  database still will not answer, the build starts anyway and the per-read retry may yet succeed.
  It loads `.env` itself, because `prebuild` runs before Next has loaded anything.
- **A sleeping Neon endpoint fails the whole build, and the catalogue now retries for it.**
  Neon suspends when idle and refuses the connection that wakes it. The admin survives that
  because every action goes through `runAction`; a static build has nobody to press the button
  again, so one cold start took down all 882 pages with `PrismaClientInitializationError`.
  `withWakeRetry` in [lib/db/catalogue.ts](lib/db/catalogue.ts) retries a CONNECTION failure
  with backoff, and rethrows anything else immediately — retrying a constraint violation only
  fails slower. **How patient it is depends on the phase.** A live request gets four attempts and
  about ten seconds of backoff, because a visitor is waiting. A build keeps retrying until a
  100-second **deadline**, keyed on `NEXT_PHASE === 'phase-production-build'`, which Next sets
  before it spawns the page workers.

  It is a deadline because a count was tried first and made builds worse. On this connection a
  failed connect takes about fifteen seconds, so "seven attempts" could run to 160 seconds on one
  read. Pages render in a single worker (`cpus: 1`), and Next kills that worker when nothing
  completes for `staticPageGenerationTimeout` (180s) — so every page in its queue restarted twice
  and the build died on the third. How long one attempt takes depends on the network; only elapsed
  time bounds anything. Keep the deadline well under the page timeout, or raise both together. If you add another prerendered read that talks to Postgres
  directly, give it the same treatment or a `.catch` fallback, as `/checkout` has.

- **Do not run `next build` while `next dev` is running.** They share `.next`, and the dev
  server then serves corrupted chunks — the same failure documented below for clearing `.next`
  mid-start. Stop the dev server first and let it exit.

- **`String.replace` with a replacement STRING interprets `$` patterns.** `$&`, `` $` ``, `$'`
  and `$1` are substitutions, not literals — and `` $` `` means *the entire string before the
  match*. A patch script that wrote a regex containing `` [^/]+$` `` into this file spliced the
  whole document into its own middle, silently and convincingly. Always pass a replacer
  **function** (`s.replace(from, () => to)`) when the replacement text is not a literal you
  control. The same applies to patch scripts under `/tmp`: a quoted bash heredoc has also
  repeatedly eaten a backslash on the way in, turning `\s` into `s` so a regex matched nothing
  while reporting success. Prefer the Edit tool, or plain string `split`/`join`, over regexes
  written through a heredoc.

- `project-tree.txt` is a 2.8 MB generated dump including `node_modules` paths. Exclude it from repo-wide greps.
- The Next dev server corrupts its chunk output after large config changes; symptom is a page that renders but never hydrates, with `main-app.js` 404ing. Fix: kill the server, `rm -rf .next`, restart — but **stop the server first and let it exit**. Clearing `.next` while it is starting corrupts the vendor chunks and serves a 404 stylesheet, which renders the site as raw unstyled HTML. Stale dev compile errors also cascade transient 500s onto unrelated routes — trust `npm run build`, not a single dev-server status code.
- Screenshotting this site has two traps, both handled in `.impeccable/shoot.mjs`: `next-themes` reads `localStorage` once on mount, so a theme class injected after load is silently reverted (seed it before navigation); and an unstyled page photographs like a design catastrophe when it is really a broken server. The harness asserts both the applied theme and the presence of a stylesheet, and fails rather than producing misleading evidence.
- `components/ui/*` are stock shadcn primitives; compose them in `components/product/`, `components/home/`, etc. rather than editing them.
