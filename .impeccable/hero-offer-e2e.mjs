import { PrismaClient } from '@prisma/client';

/*
  The hero's offer card, checked against a running production build.

  The rule that matters most is not that a code appears — it is that a code STOPS appearing the
  moment the checkout would refuse it. A promotion for a paused code is worse than no promotion:
  it spends a shopper's trust on the one line they will actually try. So this names a probe code
  in settings, confirms it is advertised with its minimum spend stated, pauses it, and confirms
  it is gone — without anybody touching the setting in between.

  The home page is statically generated and revalidated every 60 seconds, and settings are
  memoised for 60 as well, so every check POLLS the page rather than waiting a fixed time: a
  fixed sleep either wastes a minute or reports a working rule as broken.

  Also asserts what the card no longer does: claim "Third-party assayed" for products the
  catalogue holds no assay for.

  Leaves the database as it found it, including a hero_promo_code somebody had already set.

    npm run build && npx next start -p 3210
    BASE=http://localhost:3210 node --env-file=.env .impeccable/hero-offer-e2e.mjs
*/

const BASE = process.env.BASE ?? 'http://localhost:3210';
const prisma = new PrismaClient();
const CODE = `PROBEHERO${Date.now().toString(36).toUpperCase()}`;

const fails = [];
const ok = (label, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!pass) fails.push(label);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The page, and what Next's cache said about it: HIT, STALE, MISS or REVALIDATED. */
async function home() {
  const response = await fetch(`${BASE}/`);
  return { html: await response.text(), cache: response.headers.get('x-nextjs-cache') ?? '' };
}

/**
 * Request the page until `predicate` holds, or give up after `seconds`.
 *
 * Also records whether the page was EVER regenerated while waiting. A page that answers STALE on
 * every request is one whose background regeneration keeps failing — in practice, a database the
 * server cannot reach. That says nothing about the rule under test, and reporting it as "the code
 * never appeared" once sent this investigation after the wrong cause. `regenerated: false` is the
 * signal to call the result inconclusive rather than failed.
 */
async function waitForPage(predicate, seconds) {
  const started = Date.now();
  let last = { html: '', cache: '' };
  let regenerated = false;
  while (Date.now() - started < seconds * 1000) {
    last = await home();
    if (last.cache !== 'STALE') regenerated = true;
    if (predicate(last.html)) {
      return { html: last.html, waited: Math.round((Date.now() - started) / 1000), regenerated: true };
    }
    await sleep(8000);
  }
  return { html: last.html, waited: seconds, timedOut: true, regenerated };
}

let priorSetting = null;
let discountId = null;

try {
  /* A production build, not somebody's dev server on the same port. */
  const { html: first } = await home();
  ok(
    'the page under test is a production build',
    !/layout\.css\?v=/.test(first) && /\/_next\/static\/css\/[0-9a-f]+\.css/.test(first)
  );

  /* ------------------------------------------------------------ the card, as shipped */

  const dealsWithMarkdown = await prisma.product.count({ where: { isDeal: true } });
  ok('the catalogue has deals to promote', dealsWithMarkdown > 0, `${dealsWithMarkdown} flagged`);

  ok('the card is framed as an offer', first.includes('On offer'));
  ok('the visitor can step between offers', first.includes('aria-label="Next offer"'));
  ok(
    'it links through to every offer',
    first.includes('href="/shop?filter=deals"')
  );
  ok(
    'the unsupported assay claim is gone from the card',
    !first.includes('Third-party assayed')
  );

  /* -------------------------------------------------- a named, redeemable code appears */

  priorSetting = await prisma.siteSetting.findUnique({ where: { key: 'hero_promo_code' } });

  const discount = await prisma.discount.create({
    data: {
      code: CODE,
      description: 'Harness probe for the hero offer card',
      type: 'PERCENTAGE',
      value: '10',
      status: 'ACTIVE',
      minSubtotal: '50',
    },
  });
  discountId = discount.id;

  await prisma.siteSetting.upsert({
    where: { key: 'hero_promo_code' },
    create: { key: 'hero_promo_code', value: CODE, updatedBy: 'hero-offer-e2e' },
    update: { value: CODE, updatedBy: 'hero-offer-e2e' },
  });

  const shown = await waitForPage((html) => html.includes(CODE), 240);

  if (shown.timedOut && !shown.regenerated) {
    /* The server never produced a fresh page at all: nothing below can be concluded. */
    throw new Error(
      'INCONCLUSIVE — the home page answered STALE for four minutes, so the server never ' +
        'regenerated it. That is a server that cannot reach the database, not a result about ' +
        'the offer card. Check the server log for "Can\'t reach database server" and re-run.'
    );
  }

  ok(
    'a named, active code is advertised',
    !shown.timedOut,
    shown.timedOut ? 'the page regenerated but never showed it' : `after ${shown.waited}s`
  );

  /*
    Everything after this depends on the code having appeared. If it never did, "it disappeared"
    would pass for free — a check that cannot fail is not a check, and an earlier run of this
    suite reported three passes that meant nothing for exactly that reason.
  */
  if (!shown.timedOut) {
    ok('its headline is stated', shown.html.includes('10% off'));
    ok(
      'its minimum spend is stated, so the headline cannot mislead',
      shown.html.includes('on orders over $50.00')
    );
    const around = shown.html.slice(
      Math.max(0, shown.html.indexOf(CODE) - 400),
      shown.html.indexOf(CODE) + 400
    );
    ok('the usage count is never exposed', !/usage|claimed|left to claim|remaining/i.test(around));

    /* -------------------------------------- the same code, paused, disappears on its own */

    await prisma.discount.update({ where: { id: discountId }, data: { status: 'PAUSED' } });

    const gone = await waitForPage((html) => !html.includes(CODE), 240);
    ok(
      'a paused code stops being advertised without anyone touching the setting',
      !gone.timedOut,
      gone.timedOut
        ? gone.regenerated
          ? 'the page regenerated and still advertised it'
          : 'INCONCLUSIVE — the page never regenerated'
        : `after ${gone.waited}s`
    );

    /* ---------------------------------------- and a code that is used up does too */

    /* Re-advertise first, so "not shown" below is caused by the limit and nothing else. */
    await prisma.discount.update({ where: { id: discountId }, data: { status: 'ACTIVE' } });
    const back = await waitForPage((html) => html.includes(CODE), 240);
    ok('re-activating the code brings it back', !back.timedOut);

    await prisma.discount.update({
      where: { id: discountId },
      data: { usageLimit: 1, usageCount: 1 },
    });
    const usedUp = await waitForPage((html) => !html.includes(CODE), 240);
    ok(
      'a code that is fully claimed stops being advertised',
      !usedUp.timedOut,
      usedUp.timedOut ? 'still advertised' : `after ${usedUp.waited}s`
    );
  } else {
    ok('the disappearance checks could run', false, 'skipped — the code never appeared');
  }
} catch (error) {
  console.error(error);
  fails.push('the suite threw');
} finally {
  /*
    Cleanup is retried and its failure is REPORTED, never swallowed.

    The first version ended every write here in `.catch(() => {})`. When the database dropped out
    mid-run, the delete failed silently, a probe code and a probe setting stayed in production, and
    every later run then read that leftover as "the setting somebody had before" and restored it
    faithfully. A harness that leaves rows behind without saying so is how test data ends up on a
    live storefront.
  */
  const cleanup = async (label, fn) => {
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await fn();
        return;
      } catch (error) {
        if (attempt === 4) {
          console.error(`CLEANUP FAILED — ${label}: ${String(error?.message ?? error).split('\n')[0]}`);
          fails.push(`cleanup: ${label}`);
          return;
        }
        await sleep(attempt * 3000);
      }
    }
  };

  if (discountId) {
    await cleanup(`delete probe discount ${CODE}`, () =>
      prisma.discount.deleteMany({ where: { id: discountId } })
    );
  }

  /*
    Put the setting back exactly as it was — including somebody's real promotion — UNLESS the
    "prior" value was itself written by this harness. That is a leftover from a run whose cleanup
    failed, and restoring it would re-plant the probe it names.
  */
  const priorIsOurs = priorSetting?.updatedBy === 'hero-offer-e2e';
  if (priorSetting && !priorIsOurs) {
    await cleanup('restore hero_promo_code', () =>
      prisma.siteSetting.update({
        where: { key: 'hero_promo_code' },
        data: { value: priorSetting.value, updatedBy: priorSetting.updatedBy },
      })
    );
  } else {
    await cleanup('remove probe hero_promo_code', () =>
      prisma.siteSetting.deleteMany({ where: { key: 'hero_promo_code' } })
    );
  }

  /* Anything an earlier, failed run left behind goes too. Probes only, by their own marker. */
  await cleanup('sweep earlier probe codes', () =>
    prisma.discount.deleteMany({
      where: {
        code: { startsWith: 'PROBEHERO' },
        description: 'Harness probe for the hero offer card',
      },
    })
  );

  await prisma.$disconnect();

  console.log('');
  if (fails.length) {
    console.log(`${fails.length} failed:`);
    for (const f of fails) console.log(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log('All checks passed.');
  }
}
