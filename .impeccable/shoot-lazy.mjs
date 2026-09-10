import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

/*
  A capture that does not wait on networkidle.

  The home page never reaches it: the marbling canvases compose lazily behind an
  IntersectionObserver and the visit tracker posts on mount, so the network is never quiet for
  500ms. shoot.mjs is right to demand it for a static page and wrong for this one. Here we wait
  for the document, scroll the whole page to trigger every lazy canvas, then settle.
*/

const BASE = process.env.BASE ?? 'http://localhost:3100';
const OUT = process.env.OUT ?? '.impeccable/review';
mkdirSync(OUT, { recursive: true });

const targets = JSON.parse(process.argv[2] ?? '[]');
const browser = await chromium.launch();

for (const t of targets) {
  const context = await browser.newContext({
    viewport: { width: t.width, height: t.height },
    deviceScaleFactor: 1,
    colorScheme: t.scheme ?? 'light',
    reducedMotion: 'reduce',
  });
  await context.addInitScript((scheme) => {
    try {
      localStorage.setItem('theme', scheme);
    } catch {}
  }, t.scheme ?? 'light');

  const page = await context.newPage();
  await page.goto(BASE + t.path, { waitUntil: 'domcontentloaded', timeout: 90000 });

  /* Same stylesheet guard shoot.mjs uses: an unstyled page photographs as a design disaster
     when it is really a broken server. */
  const styled = await page.evaluate(() => ({
    bg: getComputedStyle(document.body).backgroundColor,
    sheets: document.styleSheets.length,
  }));
  if (styled.sheets === 0 || styled.bg === 'rgba(0, 0, 0, 0)') {
    throw new Error(`${t.name}: page is unstyled (sheets=${styled.sheets}) — server is broken`);
  }

  /* Walk the page so every lazy canvas and image enters the viewport at least once. */
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 220));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 400));
  });

  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(1200);

  const height = await page.evaluate(() => document.body.scrollHeight);
  await page.screenshot({ path: `${OUT}/${t.name}.png`, fullPage: t.full !== false });
  console.log(`${t.name}  ${t.width}x${t.height}  page height ${height}px`);
}

await browser.close();
