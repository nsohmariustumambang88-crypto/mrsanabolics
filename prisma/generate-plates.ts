/*
  Turn every product plate into a real raster image and put it in Cloudinary.

  The plates were inline SVG rendered per request. That was fine for a demo but they were not
  images in any useful sense: nothing could share them, no Open Graph card could show them,
  and no CDN could cache them. This renders the same geometry to PNG, uploads it under a
  deterministic public ID, and writes that ID back to Postgres.

  Idempotent by construction: the public ID is the product slug, and the upload is
  `overwrite: true, invalidate: true`, so re-running replaces the asset in place and clears
  the edge cache rather than piling up copies.

  Colours are parsed out of app/globals.css rather than restated here — the design tokens stay
  the single source of truth, and a palette change is picked up on the next run.

  Run: npm run images:generate
*/

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';
import { buildPlateSvg, type PlateColors } from '../lib/plate-svg';
import { uploadBuffer, PRODUCT_FOLDER, uploadsConfigured } from '../lib/cloudinary-upload';
import type { Product } from '../lib/types';

const prisma = new PrismaClient();

/* The plate viewBox is 240x260; 5x gives a crisp 1200x1300 without being wasteful. */
const SCALE = 5;

/** `38 24% 90%` -> `#e8e2d6`. The tokens store bare HSL triplets for Tailwind's benefit. */
function hslTripletToHex(triplet: string): string {
  const m = triplet.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) throw new Error(`Unparseable HSL triplet: "${triplet}"`);

  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;

  if (s === 0) {
    const v = Math.round(l * 255);
    return `#${v.toString(16).padStart(2, '0').repeat(3)}`;
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const channel = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };

  const to255 = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${to255(channel(h + 1 / 3))}${to255(channel(h))}${to255(channel(h - 1 / 3))}`;
}

/** Pull the light-theme `:root` tokens straight out of the stylesheet. */
function readTokens(): Map<string, string> {
  const css = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8');
  const rootStart = css.indexOf(':root {');
  const rootEnd = css.indexOf('.dark {');
  const scope = css.slice(rootStart, rootEnd === -1 ? undefined : rootEnd);

  const tokens = new Map<string, string>();
  for (const [, name, value] of scope.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens.set(name, value.trim());
  }
  return tokens;
}

function colorsFor(tokens: Map<string, string>, categorySlug: string): PlateColors {
  const token = (name: string, fallback: string) => {
    const raw = tokens.get(name);
    return raw ? hslTripletToHex(raw) : fallback;
  };

  return {
    ink: token(`cat-${categorySlug}`, token('pig-indigo', '#1b3a63')),
    size: token('plate-size', '#e8e2d6'),
    band: token('plate-band', '#fbf7ef'),
    rule: token('rule-strong', '#c2b8a6'),
    label: token('ink-faint', '#7c8393'),
  };
}

async function main() {
  if (!uploadsConfigured) {
    console.error(
      'Cloudinary uploads are not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, ' +
        'CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env.'
    );
    process.exit(1);
  }

  const tokens = readTokens();
  console.log(`Read ${tokens.size} design tokens from app/globals.css`);

  const all = await prisma.product.findMany({
    include: { category: true, brand: true, specifications: { orderBy: { position: 'asc' } } },
    orderBy: { position: 'asc' },
  });

  /*
    Only products with no picture get a plate. The catalogue now carries real photography
    under mranabolics/library/, and this script writes `images` back — rendering a plate for a
    photographed product would replace the photograph with a drawing. A generated plate is a
    fallback for a product nobody has photographed, not a substitute for one somebody has.
  */
  const rows = all.filter((row) => !row.images[0] || row.images[0].startsWith(PRODUCT_FOLDER));
  console.log(`${all.length - rows.length} products carry photographs and are left alone.`);

  console.log(`Rendering ${rows.length} plates at ${240 * SCALE}x${260 * SCALE} …\n`);

  let totalBytes = 0;

  for (const row of rows) {
    /* buildPlateSvg only needs these fields; the rest of Product is irrelevant to geometry. */
    const product = {
      slug: row.slug,
      name: row.name,
      category: row.category.name,
      categorySlug: row.category.slug,
      specifications: row.specifications.map((s) => ({ label: s.label, value: s.value })),
    } as unknown as Product;

    /*
      Artwork only — no text baked in.

      The marking is rendered as real DOM text over the image instead. Burning it into the
      raster would have meant shipping whatever mono font happened to exist on the build
      machine (not JetBrains Mono, which is loaded by next/font in the browser and is not
      installed on the OS), and text inside an image cannot be selected, translated, read by a
      screen reader, or restyled. It also means a spec change updates the label without
      regenerating a single asset.
    */
    const svg = buildPlateSvg(product, {
      colors: colorsFor(tokens, row.category.slug),
      standalone: true,
      showMarking: false,
    });

    const png = await sharp(Buffer.from(svg), { density: 72 * SCALE })
      .resize(240 * SCALE, 260 * SCALE, { fit: 'fill' })
      .png({ compressionLevel: 9 })
      .toBuffer();

    const uploaded = await uploadBuffer(png, row.slug, { folder: PRODUCT_FOLDER });
    totalBytes += uploaded.bytes;

    /* The database stores the public ID; lib/cloudinary.ts turns it into a delivery URL. */
    await prisma.product.update({
      where: { id: row.id },
      data: { images: [uploaded.publicId] },
    });

    console.log(
      `  ${row.slug.padEnd(32)} ${uploaded.width}x${uploaded.height}  ` +
        `${(uploaded.bytes / 1024).toFixed(0)}KB  -> ${uploaded.publicId}`
    );
  }

  console.log(
    `\nUploaded ${rows.length} plates, ${(totalBytes / 1024 / 1024).toFixed(2)}MB total.`
  );
  console.log('Product.images now holds Cloudinary public IDs.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
