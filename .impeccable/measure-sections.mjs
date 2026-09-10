import { chromium } from 'playwright-core';

/*
  Measure what a page actually costs the reader, section by section, at real widths.

  A full-page screenshot of the home page is 29,000px tall on a phone, which is unreadable as
  evidence — you cannot see a proportion problem by scrolling a picture of a scroll. Numbers
  can: section height, share of the page, and how many phone screens each one occupies.

  Also reports horizontal overflow, which is the one responsive fault that is always a bug
  rather than a judgement — the body must never scroll sideways.

    node .impeccable/measure-sections.mjs 390 1440
*/

const BASE = process.env.BASE ?? 'http://localhost:3100';
const PATH = process.env.PATH_UNDER_TEST ?? '/';
const widths = process.argv.slice(2).map(Number).filter(Boolean);
if (!widths.length) widths.push(390, 1440);

const browser = await chromium.launch();

for (const width of widths) {
  const context = await browser.newContext({
    viewport: { width, height: width < 700 ? 844 : 950 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(BASE + PATH, { waitUntil: 'domcontentloaded', timeout: 90000 });

  /*
    Refuse to measure anything but a production build with its CSS actually applied.

    Both halves of this have already produced convincing nonsense. A dev server emits
    `/_next/static/css/app/layout.css?v=…` rather than a hashed file, and its chunk output can
    be stale or broken after an interrupted build — which collapses every flex and grid on the
    page. The measurements then look like a dramatic improvement, because sections with no
    layout are short. It is also entirely possible to measure a DIFFERENT project's dev server
    that happens to hold the port.

    So: assert the stylesheet is a hashed production one, and assert a core utility really
    resolves. Failing loudly beats a number that means nothing.
  */
  const sanity = await page.evaluate(() => {
    const hrefs = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(
      (l) => l.getAttribute('href') ?? ''
    );

    /* Does `flex` actually compute? Probe with a throwaway node rather than trusting a class. */
    const probe = document.createElement('div');
    probe.className = 'flex';
    document.body.appendChild(probe);
    const display = getComputedStyle(probe).display;
    probe.remove();

    return { hrefs, display, sheets: document.styleSheets.length };
  });

  const isDevCss = sanity.hrefs.some((h) => h.includes('layout.css?v='));
  if (isDevCss) {
    throw new Error(
      `${BASE} is a DEV server (${sanity.hrefs.join(', ')}). Measure a production build: ` +
        'npm run build && npx next start -p <port>'
    );
  }
  if (sanity.display !== 'flex') {
    throw new Error(
      `Tailwind utilities are not applying at ${BASE} (.flex computed "${sanity.display}", ` +
        `${sanity.sheets} stylesheets). The build or the server is broken — measuring it would ` +
        'report collapsed sections as an improvement.'
    );
  }

  /* Walk the page so lazily-composed canvases settle to their real height. */
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);

  const report = await page.evaluate(() => {
    const main = document.querySelector('main');
    const sections = Array.from(main?.children ?? []);
    const total = document.body.scrollHeight;

    const rows = sections.map((el) => {
      const rect = el.getBoundingClientRect();
      /* The first heading is the most reliable human name for a section. */
      const heading = el.querySelector('h1, h2, h3');
      return {
        label: (heading?.textContent ?? el.tagName.toLowerCase()).trim().slice(0, 42),
        height: Math.round(rect.height),
      };
    });

    /* Anything sticking out past the viewport horizontally. */
    const overflowing = Array.from(document.querySelectorAll('main *'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1);
      })
      .slice(0, 6)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} → ${Math.round(r.left)}..${Math.round(r.right)}`;
      });

    return {
      total,
      docScrollWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      rows,
      overflowing,
    };
  });

  const screens = (report.total / (width < 700 ? 844 : 950)).toFixed(1);
  console.log(`\n=== ${width}px — page ${report.total}px (${screens} screens) ===`);
  console.log(
    report.docScrollWidth > report.viewport
      ? `  ⚠ HORIZONTAL OVERFLOW: document ${report.docScrollWidth}px vs viewport ${report.viewport}px`
      : '  no horizontal overflow'
  );
  for (const el of report.overflowing) console.log(`     overflowing: ${el}`);

  for (const row of report.rows) {
    const share = ((row.height / report.total) * 100).toFixed(1).padStart(5);
    const bar = '█'.repeat(Math.max(1, Math.round((row.height / report.total) * 60)));
    console.log(`  ${String(row.height).padStart(6)}px ${share}%  ${bar} ${row.label}`);
  }

  await context.close();
}

await browser.close();
