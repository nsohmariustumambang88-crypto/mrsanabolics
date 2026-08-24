import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

/*
  Capture validity, per the finish rules: settle entrance motion before shooting, capture
  full-page from the document top, and never send a half-loaded frame onward.
*/

const BASE = process.env.BASE ?? 'http://localhost:3000';
const OUT = '.impeccable/review';
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

  /*
    Seed the theme BEFORE the document loads. next-themes reads localStorage once on mount and
    then owns the class, so setting it after hydration is silently reverted — which produced a
    "dark" capture byte-identical to the light one.
  */
  await context.addInitScript((scheme) => {
    try {
      localStorage.setItem('theme', scheme);
    } catch {}
  }, t.scheme ?? 'light');

  const page = await context.newPage();

  await page.goto(BASE + t.path, { waitUntil: 'networkidle', timeout: 60000 });

  /*
    Stylesheet check. A dev server whose .next was cleared mid-start serves the document with
    a 404 stylesheet, and the page screenshots as raw unstyled HTML — evidence that looks like
    a catastrophic design failure and is actually a broken server. Fail the capture instead.
  */
  const styled = await page.evaluate(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    const sheets = document.styleSheets.length;
    return { bg, sheets };
  });
  if (styled.sheets === 0 || styled.bg === 'rgba(0, 0, 0, 0)') {
    throw new Error(
      `unstyled page on ${t.name}: ${styled.sheets} stylesheets, body bg ${styled.bg}`
    );
  }

  /* Confirm the substrate actually took; a mislabelled capture invalidates the whole round. */
  const applied = await page.evaluate(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
  if (applied !== (t.scheme ?? 'light')) {
    throw new Error(
      `theme mismatch on ${t.name}: asked for ${t.scheme ?? 'light'}, page is ${applied}`
    );
  }

  /*
    Scroll the whole document once (lazy pass) so lazily-loaded images and viewport-gated
    canvases actually commit before capture. A full-page screenshot does not trigger them,
    and an unloaded well photographs identically to a broken one.
  */
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
  });
  await page.waitForTimeout(2200);
  await page.evaluate((y) => window.scrollTo(0, y ?? 0), t.scrollTo ?? 0);
  await page.waitForTimeout(400);

  const file = `${OUT}/${t.name}.png`;
  await page.screenshot({ path: file, fullPage: t.full ?? false });
  console.log(`${file}  ${t.width}x${t.height}  ${applied}  ${t.path}`);

  await context.close();
}

await browser.close();
