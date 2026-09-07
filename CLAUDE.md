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

**Client components read a context, not the database.** [components/providers/catalogue-provider.tsx](components/providers/catalogue-provider.tsx) receives products, categories and brands from the root layout and exposes `useProducts()`, `useCategories()`, `useBrands()`. This ships the whole catalogue in the RSC payload — fine at 12 products, wrong at a few hundred; at that point give the provider a summary projection and let product pages fetch full records server-side.

**Referential integrity surfaced a real bug.** Two products carry brand "MrAnabolics" (slug `mranabolics`) that never had a row in the brands array — the hand-written data held that contradiction silently, a foreign key cannot. The seed derives any brand a product actually references rather than editing product copy, which is why there are 9 brands and a `/brands/mranabolics` page.

Product records are dense; [lib/data/products.ts](lib/data/products.ts) builds them from local helpers (`img(pexelsId)`, `sampleReviews`, `baseFaqs`, `sharedSpecs`) — reuse them when adding seed products. Images are remote Pexels URLs, which is why `next.config.js` sets `images.unoptimized: true`.

`getRelatedProducts` degrades relatedness deliberately — same category, then same manufacturer, then the rest of the catalogue — so a row of four always fills. Several categories hold only one product.

**Server/client split.** This is the load-bearing rule. Routes are **server components** that own metadata and JSON-LD; interactivity lives in a client child:

- `app/product/[slug]/page.tsx` → `components/product/product-detail.tsx`
- `app/shop/page.tsx` → `components/shop/shop-browser.tsx` (in `<Suspense>`, because it reads `useSearchParams`)
- `app/account/page.tsx` → `components/account/account-view.tsx` (same reason)

`app/page.tsx`, `/categories`, `/brands`, `/brands/[slug]`, `/blog`, `/blog/[slug]`, `/faq`, `/about` are server components. `/contact`, `/auth`, `/checkout` are still client components — they are pure forms with no metadata needs beyond the layout default.

**Adding a route with SEO means starting from a server page.** `export const metadata` in a `'use client'` file is a build error, not a silent no-op. Dynamic routes use `generateMetadata`, and brands and journal posts still enumerate themselves with `generateStaticParams`.

**Product pages deliberately do NOT.** `generateStaticParams` in `app/(storefront)/product/[slug]/page.tsx` returns an empty array, so the ~790 product pages are rendered on first request and cached by `revalidate`, not built ahead of time. Enumerating them made the build prerender 882 pages, each reading Neon — a deploy with 792 chances to fail on a database that suspends when idle, and it did fail exactly that way. The build is now 89 pages. **Nothing about SEO changed:** the first response is still fully server-rendered with its title, description and JSON-LD, `/sitemap.xml` still lists all 856 URLs, and an unknown slug still 404s. What changed is only when the HTML is produced.

`/sitemap.xml` is `force-dynamic` for the same reason — it enumerates the whole catalogue from four reads, and doing that inside Next's static-generation budget failed a build on its own while every other page passed. `next.config.js` also raises `staticPageGenerationTimeout` to 180s: headroom for a cold Neon start, not a fix for slow data.

**Structured data** is emitted as `<script type="application/ld+json">` from server components so it lands in the first response. Product pages carry Product + Offer + AggregateRating + Review + BreadcrumbList + FAQPage. Verify changes against the built HTML in `.next/server/app/`, not the dev DOM.

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
gone; `prisma/seed.ts` now seeds only blog, testimonials and FAQs.

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

[components/ebru/marble-bath.tsx](components/ebru/marble-bath.tsx) renders it. **Index 0 of `pigments` is the coat, not an ink.** `density` (0–1) trades fidelity for time — the hero runs 1, decorative fields run 0.45–0.7. Composition is lazy via IntersectionObserver, so a dozen baths don't block the main thread. Pass a stable `pigments` array reference; inline arrays re-run the effect every render.

**Catalogue imagery is authored, not photographed.** [components/product/product-plate.tsx](components/product/product-plate.tsx) draws each product as its shipping vessel on a floated ground in the category pigment, deterministic per slug. There is no product photography in this build, and the footer disclosure says so — if you reintroduce photos, update that text. Journal editorial photography is real stock printed through the `.duotone` SVG press filters defined in `app/layout.tsx`.

**Hairline grids.** Sections use `grid gap-px bg-rule`, where the rules are the container colour showing through the gap. A short final row therefore leaves a bare rule-coloured box — always close it with `<GridFillers>` ([components/layout/grid-fillers.tsx](components/layout/grid-fillers.tsx)) or use `<ProductGrid>`, which does it for you.

`GridFillers` takes one tier per breakpoint that changes the column count, because a filler that closes the row at one width is wrong at the next. `ProductGrid` steps **2 / 3 / 4** (`md`, `xl`) rather than jumping 2 → 4: at 1024px four columns put each card near 240px and wrapped most product names onto three lines. Changing a column count means changing the card's `sizes` in the same commit — a stale `sizes` is how a 1200w file lands in a 190px thumbnail.

**Craft rules this build holds to** (from the Impeccable craft floor — violating them is a regression):
- Chips and cards sitting over live pigment are **opaque**. Translucent ones lost legibility against the field.
- No kicker/eyebrow labels above headings. `SectionHeading` has no `eyebrow` prop by design.
- No glass/blur as decoration, no gradient text, no glowing accents. Shadows carry offset *and* blur.
- **There is no motion.** The build carried a hero reveal, image zooms on hover, card lifts, arrow slides and dot pops; all of it is gone at the user's direction. `MarbleBath` still accepts `animate`, but it defaults to `false` — the bath paints composed. Hover still responds, in colour only. `framer-motion` is in `package.json` and imported by nothing; the client bundle does not carry it. There is no scrolling marquee.
- Icons are lucide or authored SVG at consistent stroke weight — never emoji.
- Browser surfaces (selection, caret, scrollbars, focus rings, tabular numerals) are themed in `globals.css`.

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

## Auth / Supabase status (branch `feature/supabase`)

`@supabase/supabase-js` is installed and `.env.local` declares `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (both empty), but **no source file imports Supabase**. `/auth`, `/account`, and `/checkout` are UI shells that say plainly in the interface that nothing is connected — keep that honesty if you wire a backend, and remove the notices only when the flow is genuinely real.

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

The menu is Dashboard, Products, Orders, Delivery, Discounts, CRM, Audience (Analytics,
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

- **A sleeping Neon endpoint fails the whole build, and the catalogue now retries for it.**
  Neon suspends when idle and refuses the connection that wakes it. The admin survives that
  because every action goes through `runAction`; a static build has nobody to press the button
  again, so one cold start took down all 882 pages with `PrismaClientInitializationError`.
  `withWakeRetry` in [lib/db/catalogue.ts](lib/db/catalogue.ts) retries a CONNECTION failure
  four times with backoff, and rethrows anything else immediately — retrying a constraint
  violation only fails slower. If you add another prerendered read that talks to Postgres
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
