/*
  Build the catalogue from the store's own product photographs.

  Input:  prisma/image-library.json — written by `npm run images:upload-library`, one entry per
          file in the `mranabolic files` folder, with its Cloudinary public ID.
          lib/catalogue/taxonomy.ts — the folder tree as categories and compound groups.
  Output: Category, Brand and Product rows in Neon, one product per named photograph, each in
          the category and group its folder gave it, with the photograph as its image.

  What it refuses to invent:
  - No ratings, review counts or reviews. Those are zero and empty, and the storefront hides
    the review block when there is nothing to show.
  - No dosing. Directions say to follow the manufacturer's label.
  - No product copy beyond what the file name and folder state: the name, the manufacturer,
    the group, and a strength transcribed from the number in the name.
  Prices: a brand-new product (a photograph added to the folder) starts at baselinePrice() from
  the taxonomy, because the files carry no price and a product cannot be listed without one.
  That is the ONLY time a generated price is written. Existing products keep the prices set in
  the admin, which are the store's real prices; neither a re-run nor --refresh touches them.

  Skipped on purpose:
  - Files named by a hash rather than a product. 35 of those are byte-identical to a named
    file elsewhere in the folder and 10 have no named twin; a product called
    "0016f59d9d13ffd8…" is not a product. They are listed in the run report.
  - A second copy of the same name + manufacturer + group.

  Idempotent: keyed on slug, so re-running updates in place. The 12 hand-written fixture
  products from the original template, and any category or brand left with no products, are
  removed — the photographs are the catalogue now.

  Run: npm run db:seed-catalogue
*/

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  CATEGORIES,
  SUBCATEGORIES,
  BRAND_ALIASES,
  UNLISTED_BRAND,
  COMPOUND_BY_NAME,
  formFor,
  strengthUnitFor,
  baselinePrice,
} from '../lib/catalogue/taxonomy';
import type { LibraryEntry } from './upload-library';

const prisma = new PrismaClient();

/** The original template's fixture products. Their plates live in mranabolics/products/. */
const FIXTURE_SLUGS = [
  'testosterone-enanthate-300',
  'trenbolone-acetate-100',
  'anavar-oxandrolone-10',
  'ostarine-mk-2866-25',
  'nolvadex-tamoxifen-20',
  'bpc-157-5mg',
  'clenbuterol-40',
  'anastrozole-1mg',
  'sustanon-350',
  'mass-stack-pro',
  'injectable-supply-kit',
  'rad140-testolone-15',
];

function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const isHashName = (title: string) => /^[0-9a-f]{32}( \(\d+\))?$/i.test(title);

/** Fold a manufacturer string onto its canonical spelling, or null if unknown. */
function canonicalBrand(raw: string): string | null {
  const key = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  return BRAND_ALIASES[key] ?? null;
}

/**
 * Split "Name - Brand" into its parts, tolerating the file names' inconsistencies:
 * "Andarine 25- Intex Pharma", "Testosterone - Trenbolone 150 Beligas Pharmaceuticals",
 * "Zoretanin 10 mg Drogsan". The manufacturer is recognised by matching the END of the title
 * against the alias table, longest alias first, so a dash inside the product name cannot be
 * mistaken for the separator.
 */
function splitTitle(title: string): { name: string; brand: string | null } {
  /* Compact the title to [a-z0-9], remembering where each kept character came from. */
  const lower = title.toLowerCase();
  let flat = '';
  const origin: number[] = [];
  for (let i = 0; i < lower.length; i++) {
    if (/[a-z0-9]/.test(lower[i])) {
      flat += lower[i];
      origin.push(i);
    }
  }

  const aliases = Object.keys(BRAND_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    if (!flat.endsWith(alias)) continue;
    const cut = origin[flat.length - alias.length];
    const name = title
      .slice(0, cut)
      .replace(/[\s-]+$/g, '')
      .replace(/\s+-\s+(?=\d)/g, ' ') // "Cypionate - 200" -> "Cypionate 200"
      .replace(/\s+-\s+/g, '-') // "Testosterone - Trenbolone" -> "Testosterone-Trenbolone"
      .replace(/\s+/g, ' ')
      .trim();
    if (name) return { name, brand: BRAND_ALIASES[alias] };
  }

  const m = title.match(/^(.*\S)\s*-\s*(\S.*)$/);
  if (m) {
    const known = canonicalBrand(m[2]);
    if (known) return { name: m[1].trim(), brand: known };
  }
  return { name: title.replace(/\s+/g, ' ').trim(), brand: null };
}

/**
 * Names where the number IS the name — a peptide code, not a strength. "BPC 157" is not
 * 157 of anything.
 */
const NUMBER_IS_NAME =
  /\b(BPC[ -]?157|PT[ -]?141|TB[ -]?500|Follist\w*\s*344|GHRP[ -]?[26]|PNC[ -]?27|Accu Check Go 50)\s*$/i;

/**
 * The strength transcribed from the name: the LAST number that stands on its own — not
 * joined to a letter or a hyphen, as in "CJC-1295", "MK677", "Fragment 176-191", "3-Test".
 * A following unit is kept; "10.000" is read as ten thousand, as the file that wrote it meant.
 */
function strengthFrom(name: string): string | null {
  if (NUMBER_IS_NAME.test(name)) return null;
  const re = /(?<![\w.-])(\d+(?:[.,]\d+)?)(?:\s*(mg|mcg|iu|i\.u\.?|ml))?(?![\w-])/gi;
  let last: RegExpExecArray | null = null;
  for (let m = re.exec(name); m; m = re.exec(name)) last = m;
  if (!last) return null;

  let value = last[1].replace(',', '.');
  if (/^\d{1,3}\.\d{3}$/.test(value)) value = value.replace('.', '');
  const unit = last[2] ? last[2].toLowerCase().replace(/\./g, '') : null;
  return unit ? `${value} ${unit}` : value;
}

type Built = {
  slug: string;
  name: string;
  brand: string;
  brandSlug: string;
  category: string;
  subcategory: string | null;
  subcategoryName: string | null;
  price: number;
  compareAtPrice: number | null;
  description: string;
  longDescription: string;
  directions: string;
  shipping: string;
  returns: string;
  benefits: string[];
  ingredients: string[];
  images: string[];
  specifications: { label: string; value: string }[];
  isNew: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
  isDeal: boolean;
  source: string;
};

function build(entry: LibraryEntry, categoryName: string): Built | null {
  if (isHashName(entry.title)) return null;

  const { name, brand } = splitTitle(entry.title);
  const brandName = brand ?? UNLISTED_BRAND;
  const brandSlug = slugify(brandName);

  const subKey = `${entry.category}/${entry.subcategory ?? ''}`;
  const sub = entry.subcategory ? SUBCATEGORIES[subKey] : undefined;
  if (entry.subcategory && !sub) {
    throw new Error(`No taxonomy entry for folder ${subKey} — add it to lib/catalogue/taxonomy.ts`);
  }

  const form = formFor(entry.category, entry.subcategory);
  const rawStrength = strengthFrom(name);
  const unit = strengthUnitFor(entry.category, entry.subcategory);
  const strength = !rawStrength
    ? null
    : /[a-z]/.test(rawStrength)
      ? rawStrength
      : unit
        ? `${rawStrength} ${unit}`
        : null;

  const compound =
    sub?.compound ??
    COMPOUND_BY_NAME.find(([pattern]) => pattern.test(name))?.[1] ??
    null;

  const group = sub ? `${sub.name}, in ${categoryName}` : categoryName;

  const specifications = [
    ...(strength ? [{ label: 'Strength', value: strength }] : []),
    { label: 'Form', value: form },
    ...(sub ? [{ label: 'Group', value: sub.name }] : []),
    { label: 'Manufacturer', value: brandName },
    ...(compound ? [{ label: 'Compound', value: compound }] : []),
  ];

  const description = `${name} by ${brandName}. ${form}, listed under ${group}.`;

  const longDescription =
    `${name} is a ${brandName} product in the ${categoryName} range` +
    (sub ? `, grouped with the other ${sub.name} listings` : '') +
    `. What is shown here comes from the product as photographed and from its listing name: ` +
    (strength
      ? `the strength of ${strength} is transcribed from the name and should be confirmed against the label. `
      : `confirm concentration and count against the label. `) +
    `This catalogue adds no claims of its own about purity, effect or dosing.`;

  const benefits = [
    `Listed under ${group}`,
    `Manufacturer: ${brandName}`,
    ...(strength ? [`Strength as labelled: ${strength}`] : []),
    ...(compound ? [`Active compound: ${compound}`] : []),
  ];

  const price = baselinePrice(entry.category, entry.subcategory);
  /* Deterministic spread so the list is not one flat price; derived from the slug, not random. */
  let h = 0;
  for (const ch of `${name}|${brandName}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const spread = (h % 5) * 5;

  return {
    slug: `${slugify(name)}-${brandSlug}`,
    name,
    brand: brandName,
    brandSlug,
    category: entry.category,
    subcategory: entry.subcategory,
    subcategoryName: sub?.name ?? null,
    price: price + spread,
    compareAtPrice: null,
    description,
    longDescription,
    directions:
      'Follow the directions on the manufacturer’s label; this listing adds no dosing guidance.',
    shipping: 'Ships within 24 hours in discreet packaging. Tracked delivery available.',
    returns: 'Unopened, sealed products may be returned within 14 days.',
    benefits,
    ingredients: [compound ?? `As labelled by ${brandName}`],
    images: [entry.publicId],
    specifications,
    isNew: false,
    isBestSeller: false,
    isTrending: false,
    isDeal: false,
    source: entry.source,
  };
}

async function main() {
  const manifestPath = join(__dirname, 'image-library.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { entries: LibraryEntry[] };
  console.log(`Read ${manifest.entries.length} library entries from prisma/image-library.json`);

  const categoryOrder = new Map(CATEGORIES.map((c, i) => [c.slug, i]));
  const categoryName = new Map(CATEGORIES.map((c) => [c.slug, c.name]));
  for (const e of manifest.entries) {
    if (!categoryOrder.has(e.category)) {
      throw new Error(`Folder "${e.category}" has no category in lib/catalogue/taxonomy.ts`);
    }
  }

  /* --- Build ------------------------------------------------------------------------ */
  const built: Built[] = [];
  const skippedHashes: string[] = [];
  const skippedDuplicates: string[] = [];
  const seen = new Map<string, Built>();

  const ordered = manifest.entries.slice().sort((a, b) => a.source.localeCompare(b.source));
  for (const entry of ordered) {
    const product = build(entry, categoryName.get(entry.category)!);
    if (!product) {
      skippedHashes.push(entry.source);
      continue;
    }
    const prior = seen.get(product.slug);
    if (prior) {
      if (prior.category === product.category && prior.subcategory === product.subcategory) {
        skippedDuplicates.push(`${entry.source}  (same as ${prior.source})`);
        continue;
      }
      /* Same name and maker filed under two folders: keep both, distinguished by the folder. */
      product.slug = `${product.slug}-${product.subcategory ?? product.category}`;
      if (seen.has(product.slug)) {
        skippedDuplicates.push(`${entry.source}  (same as ${seen.get(product.slug)!.source})`);
        continue;
      }
    }
    seen.set(product.slug, product);
    built.push(product);
  }

  /*
    Merchandising flags, so the home page's "best sellers", "newly floated" and "on offer"
    sections have something to show. Deterministic: the first listing of each group is a
    best seller, the second is new, the third is on offer at a 15% mark-up struck through.
    Staff change these in the admin; this is a starting position, not a judgement.
  */
  const byGroup = new Map<string, Built[]>();
  for (const p of built) {
    const key = `${p.category}/${p.subcategory ?? ''}`;
    byGroup.set(key, [...(byGroup.get(key) ?? []), p]);
  }
  for (const group of byGroup.values()) {
    if (group[0]) group[0].isBestSeller = true;
    if (group[1]) group[1].isNew = true;
    if (group[2]) {
      group[2].isDeal = true;
      group[2].compareAtPrice = Math.round(group[2].price * 1.15);
    }
    if (group[3]) group[3].isTrending = true;
  }

  /* Sort: category order, then group name, then product name. This is `position`. */
  built.sort((a, b) => {
    const c = categoryOrder.get(a.category)! - categoryOrder.get(b.category)!;
    if (c) return c;
    const g = (a.subcategoryName ?? '').localeCompare(b.subcategoryName ?? '');
    if (g) return g;
    return a.name.localeCompare(b.name);
  });

  console.log(
    `Built ${built.length} products; skipped ${skippedHashes.length} hash-named files and ${skippedDuplicates.length} duplicates.`
  );

  if (process.argv.includes('--dry-run')) {
    for (const p of built) {
      console.log(
        `${p.slug.padEnd(52)} ${p.name.padEnd(36)} ${p.brand.padEnd(26)} ${p.category}/${p.subcategory ?? '-'}  ${p.specifications[0]?.value ?? ''}  $${p.price}`
      );
    }
    const unlisted = built.filter((p) => p.brand === UNLISTED_BRAND).map((p) => p.source);
    console.log(`\nUnlisted manufacturer (${unlisted.length}): ${unlisted.join(' | ')}`);
    console.log(`Duplicates (${skippedDuplicates.length}):\n  ${skippedDuplicates.join('\n  ')}`);
    return;
  }

  /* --- Categories --------------------------------------------------------------------- */
  const categoryIds = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const listed = built.filter((p) => p.category === c.slug).length;
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, description: c.description, icon: c.icon, productCount: listed, position: i },
      update: { name: c.name, description: c.description, icon: c.icon, productCount: listed, position: i },
    });
    categoryIds.set(c.slug, row.id);
  }
  console.log(`  categories   ${CATEGORIES.length}`);

  /* --- Brands ------------------------------------------------------------------------- */
  const brandNames = new Map<string, string>();
  for (const p of built) brandNames.set(p.brandSlug, p.brand);
  const brandList = [...brandNames.entries()].sort((a, b) => {
    /* Most listings first, the unlisted bucket last. */
    if (a[0] === slugify(UNLISTED_BRAND)) return 1;
    if (b[0] === slugify(UNLISTED_BRAND)) return -1;
    const ca = built.filter((p) => p.brandSlug === a[0]).length;
    const cb = built.filter((p) => p.brandSlug === b[0]).length;
    return cb - ca || a[1].localeCompare(b[1]);
  });

  const brandIds = new Map<string, string>();
  for (const [i, [slug, name]] of brandList.entries()) {
    const listed = built.filter((p) => p.brandSlug === slug).length;
    const description =
      name === UNLISTED_BRAND
        ? 'Products whose photographs carry no manufacturer name.'
        : `Products carrying the ${name} label, as photographed for this catalogue.`;
    const row = await prisma.brand.upsert({
      where: { slug },
      create: { slug, name, description, productCount: listed, position: i },
      update: { name, description, productCount: listed, position: i },
    });
    brandIds.set(slug, row.id);
  }
  console.log(`  brands       ${brandList.length}`);

  /* --- Products ----------------------------------------------------------------------- */
  /*
    Neon is ~1.2s away per round trip, and even a batched `$transaction([...])` of nested
    creates still runs one statement per row — 792 products × 3 statements was 45 minutes.
    So the bootstrap path is `createMany`: one statement for a hundred products, one query to
    read their ids back, one statement for their specifications. Twenty-odd trips in all.

    Rows that already exist are LEFT ALONE. After the first run the admin owns them — prices,
    stock, flags — and a re-run must not undo that work. A re-run therefore adds what is new
    (a file added to the folder) and touches nothing else. `--refresh` forces the slow per-row
    rewrite of existing products' COPY for the case where the taxonomy or the copy generator
    changed — never their prices, stock, flags or ratings, and never a row re-filed by hand.
  */
  const BATCH = 100;
  const refresh = process.argv.includes('--refresh');
  const existingRows = new Map(
    (await prisma.product.findMany({ select: { slug: true, categoryId: true, subcategory: true } })).map((r) => [
      r.slug,
      r,
    ])
  );
  const existingSlugs = new Set(existingRows.keys());
  let created = 0;
  let updated = 0;
  let skipped = 0;

  type Row = Parameters<typeof prisma.product.createMany>[0] extends { data: infer D }
    ? D extends readonly (infer R)[]
      ? R
      : never
    : never;
  let pendingRows: Row[] = [];
  let pendingSpecs = new Map<string, { label: string; value: string }[]>();

  const flush = async () => {
    if (!pendingRows.length) return;
    /*
      Re-check against the database at the moment of writing, not just at the start of the run:
      a previous run interrupted mid-batch can leave its rows landing after this run's first
      look, and a unique-slug failure then throws away the whole batch.
    */
    const alreadyThere = new Set(
      (
        await prisma.product.findMany({
          where: { slug: { in: pendingRows.map((r) => r.slug) } },
          select: { slug: true },
        })
      ).map((r) => r.slug)
    );
    const fresh = pendingRows.filter((r) => !alreadyThere.has(r.slug));
    created -= alreadyThere.size;
    skipped += alreadyThere.size;
    if (!fresh.length) {
      pendingRows = [];
      pendingSpecs = new Map();
      return;
    }
    await prisma.product.createMany({ data: fresh });
    const ids = await prisma.product.findMany({
      where: { slug: { in: fresh.map((r) => r.slug) } },
      select: { id: true, slug: true },
    });
    const specRows = ids.flatMap(({ id, slug }) =>
      (pendingSpecs.get(slug) ?? []).map((s, position) => ({ ...s, position, productId: id }))
    );
    if (specRows.length) await prisma.specification.createMany({ data: specRows });
    pendingRows = [];
    pendingSpecs = new Map();
  };

  for (const [i, p] of built.entries()) {
    const scalars = {
      name: p.name,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      rating: 0,
      reviewCount: 0,
      inStock: true,
      stockCount: 25,
      isNew: p.isNew,
      isBestSeller: p.isBestSeller,
      isTrending: p.isTrending,
      isDeal: p.isDeal,
      description: p.description,
      longDescription: p.longDescription,
      directions: p.directions,
      shipping: p.shipping,
      returns: p.returns,
      benefits: p.benefits,
      ingredients: p.ingredients,
      images: p.images,
      categoryId: categoryIds.get(p.category)!,
      subcategory: p.subcategory,
      subcategoryName: p.subcategoryName,
      brandId: brandIds.get(p.brandSlug)!,
      position: i,
    };

    if (existingSlugs.has(p.slug)) {
      const current = existingRows.get(p.slug);
      const refiled =
        !!current && (current.categoryId !== scalars.categoryId || current.subcategory !== scalars.subcategory);
      if (refresh && !refiled) {
        /*
          --refresh rewrites COPY only. Prices are the store's real prices and belong to the admin,
          as do stock, flags, ratings and position — so none of them is in this update, and a
          refresh can never put a generated baseline price back over a price somebody set.
          A row re-filed by hand (category or group no longer what its folder says) is skipped
          whole: rewriting it would undo the correction.
        */
        const {
          price: _price,
          compareAtPrice: _compareAt,
          rating: _rating,
          reviewCount: _reviews,
          inStock: _inStock,
          stockCount: _stock,
          isNew: _new,
          isBestSeller: _best,
          isTrending: _trending,
          isDeal: _deal,
          position: _position,
          ...copy
        } = scalars;
        /* Specification rows are replaced wholesale: they have no identity of their own. */
        await prisma.product.update({
          where: { slug: p.slug },
          data: {
            ...copy,
            specifications: {
              deleteMany: {},
              create: p.specifications.map((s, position) => ({ ...s, position })),
            },
          },
        });
        updated++;
      } else {
        skipped++;
      }
    } else {
      pendingRows.push({ slug: p.slug, ...scalars });
      pendingSpecs.set(p.slug, p.specifications);
      created++;
      if (pendingRows.length >= BATCH) await flush();
    }

    if ((i + 1) % 100 === 0) console.log(`  … ${i + 1}/${built.length}`);
  }
  await flush();
  console.log(
    `  products     ${built.length} (${created} created, ${updated} refreshed, ${skipped} already present and left as the admin has them)`
  );

  /* --- Retire the template fixtures and anything left empty ----------------------------- */
  const removedFixtures = await prisma.product.deleteMany({
    where: { slug: { in: FIXTURE_SLUGS.filter((s) => !seen.has(s)) } },
  });
  const emptyCategories = await prisma.category.deleteMany({
    where: { products: { none: {} }, slug: { notIn: CATEGORIES.map((c) => c.slug) } },
  });
  const emptyBrands = await prisma.brand.deleteMany({
    where: { products: { none: {} }, slug: { notIn: [...brandIds.keys()] } },
  });
  console.log(
    `  removed      ${removedFixtures.count} fixture products, ${emptyCategories.count} empty categories, ${emptyBrands.count} empty brands`
  );

  /* --- Report ------------------------------------------------------------------------- */
  console.log('\nPer category:');
  for (const c of CATEGORIES) {
    const inCat = built.filter((p) => p.category === c.slug);
    const groups = new Map<string, number>();
    for (const p of inCat) groups.set(p.subcategoryName ?? '—', (groups.get(p.subcategoryName ?? '—') ?? 0) + 1);
    console.log(`  ${c.name.padEnd(20)} ${String(inCat.length).padStart(4)}   ${[...groups.entries()].map(([g, n]) => `${g} ${n}`).join(' · ')}`);
  }
  const unlisted = built.filter((p) => p.brand === UNLISTED_BRAND);
  if (unlisted.length) {
    console.log(`\nNo manufacturer in the file name (${unlisted.length}):`);
    for (const p of unlisted) console.log(`  ${p.source}`);
  }
  if (skippedHashes.length) {
    console.log(`\nSkipped, named by hash rather than product (${skippedHashes.length}):`);
    for (const s of skippedHashes) console.log(`  ${s}`);
  }
  if (skippedDuplicates.length) {
    console.log(`\nSkipped, duplicate of another file (${skippedDuplicates.length}):`);
    for (const s of skippedDuplicates) console.log(`  ${s}`);
  }
  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
