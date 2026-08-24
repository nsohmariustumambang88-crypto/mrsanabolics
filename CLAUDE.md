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

MrAnabolics — a Next.js 13.5 App Router storefront, originally scaffolded from the Bolt `nextjs-shadcn` template. It is a **front-end-only prototype**: no database, no API routes, no server actions. Deployed to Netlify.

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

**Reads are memoised per process, not per page.** The root layout needs the catalogue on every route and a static build renders 43 of them. Querying per page made the build take minutes and then fail with `ECONNRESET`. `unstable_cache` did **not** dedupe across prerenders in Next 13.5, so `catalogue.ts` uses a small per-closure TTL memo (60s) instead, and every derived read — by slug, by category, by brand, related — filters that one list in memory. `next.config.js` also sets `experimental.cpus: 1`, because parallel prerender workers each opened their own connection and Neon reset them.

**Client components read a context, not the database.** [components/providers/catalogue-provider.tsx](components/providers/catalogue-provider.tsx) receives products, categories and brands from the root layout and exposes `useProducts()`, `useCategories()`, `useBrands()`. This ships the whole catalogue in the RSC payload — fine at 12 products, wrong at a few hundred; at that point give the provider a summary projection and let product pages fetch full records server-side.

**Referential integrity surfaced a real bug.** Two products carry brand "MrAnabolics" (slug `mranabolics`) that never had a row in the brands array — the hand-written data held that contradiction silently, a foreign key cannot. The seed derives any brand a product actually references rather than editing product copy, which is why there are 9 brands and a `/brands/mranabolics` page.

Product records are dense; [lib/data/products.ts](lib/data/products.ts) builds them from local helpers (`img(pexelsId)`, `sampleReviews`, `baseFaqs`, `sharedSpecs`) — reuse them when adding seed products. Images are remote Pexels URLs, which is why `next.config.js` sets `images.unoptimized: true`.

`getRelatedProducts` degrades relatedness deliberately — same category, then same manufacturer, then the rest of the catalogue — so a row of four always fills. Several categories hold only one product.

**Server/client split.** This is the load-bearing rule. Routes are **server components** that own metadata and JSON-LD; interactivity lives in a client child:

- `app/product/[slug]/page.tsx` → `components/product/product-detail.tsx`
- `app/shop/page.tsx` → `components/shop/shop-browser.tsx` (in `<Suspense>`, because it reads `useSearchParams`)
- `app/account/page.tsx` → `components/account/account-view.tsx` (same reason)

`app/page.tsx`, `/categories`, `/brands`, `/brands/[slug]`, `/blog`, `/blog/[slug]`, `/faq`, `/about` are server components. `/contact`, `/auth`, `/checkout` are still client components — they are pure forms with no metadata needs beyond the layout default.

**Adding a route with SEO means starting from a server page.** `export const metadata` in a `'use client'` file is a build error, not a silent no-op. Dynamic routes use `generateStaticParams` + `generateMetadata`; the build pre-renders all 12 products, 8 brands, and 6 posts.

**Structured data** is emitted as `<script type="application/ld+json">` from server components so it lands in the first response. Product pages carry Product + Offer + AggregateRating + Review + BreadcrumbList + FAQPage. Verify changes against the built HTML in `.next/server/app/`, not the dev DOM.

**Canonical host** lives once in [lib/site.ts](lib/site.ts) as `SITE.url`, consumed by `metadataBase`, `app/robots.ts`, and `app/sitemap.ts`. It used to be hardcoded in three places. `robots.ts` disallows `/account`, `/checkout`, `/auth`, and the sitemap deliberately omits them.

**Global state.** [components/providers/store-provider.tsx](components/providers/store-provider.tsx) is the only store: cart, wishlist, and the open state of the cart drawer and search dialog. It persists to `localStorage` under `mranabolics-cart` / `mranabolics-wishlist`, gated behind a `hydrated` flag so the initial empty state never overwrites saved data — preserve that gate when adding persisted fields. `useStore()` throws outside the provider.

**Layout shell.** [app/layout.tsx](app/layout.tsx) mounts `AnnouncementBar`, `SiteHeader`, `main`, `SiteFooter`, plus `CartDrawer` and `SearchDialog` at the root. Overlays open from anywhere via `setCartOpen` / `setSearchOpen`, never by rendering a second instance. The first child of `<body>` is the Impeccable direction contract as an HTML comment — it must survive the production build; grep the built output for `39094e04` if you touch the layout.

## Images: Cloudinary

Delivery goes through Cloudinary. Only `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set — the cloud name is public (it is in every image URL) and is all that serving requires. **The API secret is not in this project and must never be**, least of all behind a `NEXT_PUBLIC_` prefix, which inlines a value into the browser bundle. Uploads would need it, and would live in a route handler.

**Custom loader, not Next's optimiser.** [next.config.js](next.config.js) sets `images.loader: 'custom'` pointing at [lib/cloudinary-loader.ts](lib/cloudinary-loader.ts). `next/image` still generates a responsive srcset, but every candidate is a Cloudinary transformation — so the origin never resizes anything and Netlify's image function is never invoked. This replaced `images.unoptimized: true`, which existed only because images were hot-linked and Next could not process them.

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

**Harnesses.** `node .impeccable/wp-shot.mjs '[{"name":..,"path":..,"width":..}]'` logs in and
captures admin screens, failing loudly if it lands on the login page or finds no stylesheet.
`node .impeccable/wp-e2e.mjs` creates a product through Quick Add, asserts it reaches the list
table, the right category and the public product page, then deletes it again.
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

## Gotchas

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
