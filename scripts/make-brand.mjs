/*
  Turn the owner's bull illustration into the brand assets.

    npm run brand:build

  Input: brand/bull.(png|jpg|jpeg|webp) — the illustration as supplied, red on white. (The file
         the owner supplied is a JPEG named .png; sharp reads it by its content, not its name.)
  Output:
    public/brand/bull.webp  the bull on transparency, 320px wide, used by <BullMark>
    app/icon.png            the favicon: the bull alone on transparency, which Next links itself
    app/apple-icon.png      the iOS home-screen icon: the bull on white, 180px

  THE LOGO IS THE BULL AND NOTHING ELSE. The owner asked for the bull alone, in its own colours,
  with no coin, ring or frame around it. This script therefore changes no colour in the drawing:
  it only removes the white it was drawn on, so the bull stands on whatever is behind it.

  WHY FLOOD-FILL THE BACKGROUND. Knocking out every near-white pixel would also punch holes in the
  bull wherever the drawing itself is white — the eyes, highlights on the horns. Only near-white
  pixels CONNECTED TO THE EDGE of the image are background.

  WHY UN-MIX THE EDGE RATHER THAN FADE IT. A pixel on the boundary is a blend of the drawing and
  the white behind it: a black outline against white is grey, red against white is pink. Keeping
  those colours and just lowering their opacity leaves a pale halo, which on the dark theme is the
  first thing you see. So each edge pixel's opacity is estimated from how much white it holds, and
  that white is then subtracted back out — grey resolves to translucent black, pink to translucent
  red — which is the colour the drawing actually had at that point.

  Idempotent: re-running overwrites the outputs from the same source.
*/

import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SOURCE_DIR = 'brand';
const OUT_BULL = 'public/brand/bull.webp';

/*
  The darkest a channel gets in the drawing's own inks (black line work, deep red). Used to turn
  "how much white is in this edge pixel" into an opacity: a pixel whose lowest channel is at this
  floor is all drawing, and one at 255 is all background.
*/
const INK_FLOOR = 15;

function findSource() {
  if (!existsSync(SOURCE_DIR)) return null;
  const file = readdirSync(SOURCE_DIR).find((f) => /^bull\.(png|jpe?g|webp)$/i.test(f));
  return file ? join(SOURCE_DIR, file) : null;
}

async function cutOutBull(source) {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: w, height: h } = info;

  /* Near-white: bright, and nearly grey. A pale gold horn is bright but not grey, so it stays. */
  const nearWhite = (i) => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const min = Math.min(r, g, b);
    return min > 222 && Math.max(r, g, b) - min < 32;
  };

  /* Background = near-white pixels reachable from the border. Iterative, to spare the stack. */
  const background = new Uint8Array(w * h);
  const queue = [];
  const seed = (x, y) => {
    const p = y * w + x;
    if (!background[p] && nearWhite(p * 4)) {
      background[p] = 1;
      queue.push(p);
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x, 0);
    seed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    seed(0, y);
    seed(w - 1, y);
  }
  while (queue.length) {
    const p = queue.pop();
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) seed(x - 1, y);
    if (x < w - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < h - 1) seed(x, y + 1);
  }

  /*
    Only pixels directly next to the background are treated as edge. A wider band would reach
    into the drawing — the pale horns sit right at the silhouette — and un-mixing a cream horn
    as though it were white-contaminated ink darkens it.
  */
  const touchesBackground = (x, y) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && background[ny * w + nx]) return true;
      }
    }
    return false;
  };

  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const i = p * 4;
      if (background[p]) continue; /* stays fully transparent */

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      /* The drawing, exactly as supplied. */
      if (!touchesBackground(x, y)) {
        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
        out[i + 3] = 255;
        continue;
      }

      /*
        An edge pixel P is a mix of ink F and white: P = a*F + (1-a)*255. Its lowest channel says
        how much white it holds, which gives the opacity a; solving for F removes the white. Grey
        (black ink over white) comes back as translucent black, pink as translucent red.
      */
      const a = Math.max(0, Math.min(1, (255 - Math.min(r, g, b)) / (255 - INK_FLOOR)));
      if (a < 0.02) continue;
      const unmix = (c) => Math.max(0, Math.min(255, Math.round((c - (1 - a) * 255) / a)));

      out[i] = unmix(r);
      out[i + 1] = unmix(g);
      out[i + 2] = unmix(b);
      out[i + 3] = Math.round(a * 255);
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .trim()
    .resize(512, 512, { fit: 'inside' })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * The bull centred on a square canvas, for the icons. `background` is transparent for the
 * favicon, which a browser draws on its own tab colour. The home-screen icon gets white, because
 * iOS paints a transparent apple-touch-icon onto black, and the bull's black outline vanishes.
 */
async function squareIcon(bull, size, background, fill) {
  const inner = Math.round(size * fill);
  const scaled = await sharp(bull).resize(inner, inner, { fit: 'inside' }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: scaled, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  const source = findSource();
  if (!source) {
    console.error(
      `No source image. Save the bull illustration as ${SOURCE_DIR}/bull.png (or .jpg / .webp) and run this again.`
    );
    process.exit(1);
  }

  console.log(`Source: ${source}`);
  const bull = await cutOutBull(source);

  /*
    The served file is small on purpose: it is in the header of every page. The header never
    shows the bull wider than about 132px, so 320px covers a 2x screen there and a 3x phone at its
    smaller mobile size. A 512px PNG of the cut-out was 396 KB; WebP keeps the transparency at a
    fraction of that. The 512px cut-out stays in memory for the icons.
  */
  mkdirSync('public/brand', { recursive: true });
  const served = await sharp(bull)
    .resize(320, 320, { fit: 'inside' })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toBuffer();
  await sharp(served).toFile(OUT_BULL);
  const { width, height } = await sharp(served).metadata();
  console.log(`  ${OUT_BULL}  ${width}x${height}  ${(served.length / 1024).toFixed(0)} KB`);
  console.log(`  (BULL_WIDTH / BULL_HEIGHT in components/brand/bull-mark.tsx must be ${width} / ${height})`);

  await sharp(await squareIcon(bull, 512, { r: 0, g: 0, b: 0, alpha: 0 }, 1)).toFile('app/icon.png');
  console.log('  app/icon.png  512px');

  await sharp(await squareIcon(bull, 180, '#ffffff', 0.84)).toFile('app/apple-icon.png');
  console.log('  app/apple-icon.png  180px');

  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
