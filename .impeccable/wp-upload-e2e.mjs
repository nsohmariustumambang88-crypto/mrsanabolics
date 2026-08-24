import { chromium } from 'playwright-core';
import { PrismaClient } from '@prisma/client';

/*
  Prove the picture path end to end, through the real UI.

  Adds a product on the Add New screen WITH a file attached, then follows that file all the
  way out: into Cloudinary, into the Neon row, back into the admin list as a thumbnail, and
  onto the public product page. Finally deletes both the row and the Cloudinary asset, so the
  catalogue and the asset store are left exactly as they were found.
*/

const BASE = 'http://localhost:3000';
const EMAIL = 'petzyrockchendi@gmail.com';
const PASSWORD = 'harbour-lantern-ferment-1542';
const NAME = 'Upload Probe Compound 998';
const SLUG = 'upload-probe-compound-998';
const FILE = '.impeccable/review/e2e-upload.jpg';

const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const cloudAuth =
  'Basic ' +
  Buffer.from(`${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`).toString(
    'base64'
  );

const prisma = new PrismaClient();
const fails = [];
const ok = (label, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!pass) fails.push(label);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
page.on('dialog', (d) => d.accept());

try {
  await page.goto(BASE + '/admin/login', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type=submit]', { noWaitAfter: true });
  await page.waitForURL(/\/admin(\?|$)/, { timeout: 120000 });

  /* ---- Add New, with a file attached ---- */
  await page.goto(BASE + '/admin/products/new', { waitUntil: 'networkidle' });
  await page.fill('#name', NAME);
  await page.fill('#price', '55.00');
  await page.selectOption('#categoryId', { label: 'Peptides' });
  const brand = await page.locator('#brandId option').nth(1).getAttribute('value');
  await page.selectOption('#brandId', brand);
  await page.fill('#description', 'Temporary row created by the upload check.');
  await page.setInputFiles('#product-image', FILE);

  ok('picker is present on Add New', (await page.locator('label[for="product-image"]').count()) > 0);
  ok(
    'picker shows a local blob preview before upload',
    (await page.locator('img[src^="blob:"]').count()) > 0
  );

  await page.click('button[type=submit]', { noWaitAfter: true });
  /*
    The old wait was /\/admin\/products\/[^/]+$/, which matches /admin/products/new just as
    happily as /admin/products/<id> — so it resolved on the page we were already standing on
    and every later assertion ran before the upload had started. Excluding "new" makes it wait
    for the thing it claims to wait for.
  */
  await page.waitForURL(
    (u) => /\/admin\/products\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith('/new'),
    { timeout: 120000 }
  );
  ok('save lands on the product screen', !page.url().endsWith('/new'), page.url());

  /* ---- it is in Cloudinary ---- */
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload/mranabolics/products/${SLUG}`,
    { headers: { Authorization: cloudAuth } }
  );
  ok('asset exists in Cloudinary', res.status === 200, `HTTP ${res.status}`);
  if (res.status === 200) {
    const a = await res.json();
    ok(
      'stored as jpg, not re-encoded to png',
      a.format === 'jpg',
      `format=${a.format} ${a.width}x${a.height} ${(a.bytes / 1024).toFixed(0)}KB`
    );
  }

  /* ---- it is in Neon ---- */
  const row = await prisma.product.findUnique({
    where: { slug: SLUG },
    select: { id: true, images: true },
  });
  ok(
    'public ID written to the database',
    row?.images?.[0] === `mranabolics/products/${SLUG}`,
    row?.images?.[0] ?? '(none)'
  );

  /* ---- it is pulled back into the admin list ---- */
  await page.goto(`${BASE}/admin/products?q=${encodeURIComponent('Upload Probe')}`, {
    waitUntil: 'networkidle',
  });
  const thumb = page.locator('tbody tr', { hasText: NAME }).first().locator('img');
  const thumbSrc = (await thumb.count()) ? await thumb.getAttribute('src') : '';
  ok(
    'thumbnail renders in the list table',
    Boolean(thumbSrc && thumbSrc.includes('res.cloudinary.com')),
    thumbSrc ? thumbSrc.split('/upload/')[1]?.slice(0, 60) : '(no img)'
  );

  /* ---- and the transformed URL actually serves ---- */
  if (thumbSrc) {
    const img = await fetch(thumbSrc);
    ok(
      'that thumbnail URL serves an image',
      img.status === 200,
      `HTTP ${img.status}, ${img.headers.get('content-type')}, ${(Number(img.headers.get('content-length') ?? 0) / 1024).toFixed(1)}KB`
    );
  }

  /* ---- and it reaches the storefront ---- */
  const pub = await page.goto(`${BASE}/product/${SLUG}`, { waitUntil: 'networkidle' });
  ok('storefront serves the product page', pub?.status() === 200, `HTTP ${pub?.status()}`);
  /* Checking for the slug proved nothing — it is in the URL and the heading too. The delivery
     host is what shows the stored asset is actually being served to visitors. */
  const html = await page.content();
  ok(
    'storefront serves the uploaded asset from Cloudinary',
    html.includes('res.cloudinary.com') && html.includes(SLUG),
    html.includes('res.cloudinary.com') ? 'res.cloudinary.com present' : 'no Cloudinary URL in HTML'
  );
} finally {
  /* ---- clean up both stores ---- */
  const gone = await prisma.product.deleteMany({ where: { slug: SLUG } });
  console.log(`\ncleanup: deleted ${gone.count} product row(s)`);

  const del = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload?public_ids[]=mranabolics/products/${SLUG}`,
    { method: 'DELETE', headers: { Authorization: cloudAuth } }
  );
  console.log(`cleanup: Cloudinary delete HTTP ${del.status}`);

  await prisma.$disconnect();
  await browser.close();
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nall checks passed');
process.exit(fails.length ? 1 : 0);
