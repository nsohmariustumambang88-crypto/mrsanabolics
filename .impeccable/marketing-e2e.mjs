import { PrismaClient } from '@prisma/client';

/*
  Prove the consent pipeline, including the parts that are supposed to refuse.

  A capture form is easy to make work and easy to make unlawful. Half of these checks assert
  that something is REJECTED — an unticked box, a junk address, an unknown source, a guessed
  unsubscribe token — because those are the failures that turn a list into a liability, and
  they are invisible until someone tests for them.

  Cleans up after itself: every address it creates is removed at the end.
*/

const BASE = 'http://localhost:3000';
const prisma = new PrismaClient();
const fails = [];
const ok = (label, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!pass) fails.push(label);
};

const EMAIL = 'probe-consent@example.test';
const EMAIL2 = 'probe-cart@example.test';

/*
  Each call declares its own X-Forwarded-For so it lands in its own rate-limit bucket.

  Without this the suite competes with its own limiter: the checks share one IP, the seventh
  request in ten minutes gets a 429, and a re-run inside the window fails from the first
  assertion. Tests that quietly depend on how recently they last ran are worse than no tests.
  The limiter is then asserted deliberately, on a bucket of its own, at the end.
*/
let bucket = 0;
const post = (body, ip) =>
  fetch(`${BASE}/api/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip ?? `203.0.113.${(bucket += 1)}`,
    },
    body: JSON.stringify(body),
  });

try {
  /* ---- the refusals ---- */
  let r = await post({ email: EMAIL, source: 'newsletter', consent: false });
  ok('rejects sign-up without consent', r.status === 400, `HTTP ${r.status}`);

  r = await post({ email: 'not-an-address', source: 'newsletter', consent: true });
  ok('rejects a malformed address', r.status === 400, `HTTP ${r.status}`);

  r = await post({ email: EMAIL, source: 'invented-source', consent: true });
  ok('rejects an unknown source', r.status === 400, `HTTP ${r.status}`);

  const none = await prisma.subscriber.count({ where: { email: EMAIL } });
  ok('none of those wrote a row', none === 0, `${none} rows`);

  /* ---- the happy path ---- */
  r = await post({ email: EMAIL, source: 'newsletter', consent: true, path: '/journal' });
  ok('accepts a consented sign-up', r.status === 201, `HTTP ${r.status}`);

  const row = await prisma.subscriber.findUnique({ where: { email: EMAIL } });
  ok('row created with SUBSCRIBED status', row?.status === 'SUBSCRIBED');
  ok(
    'stores the exact consent sentence',
    Boolean(row?.consentText?.includes('unsubscribe at any time')),
    row?.consentText?.slice(0, 46) + '…'
  );
  ok('stores the page it happened on', row?.consentPath === '/journal', row?.consentPath ?? '(null)');
  ok('generates an unsubscribe token', (row?.unsubscribeToken?.length ?? 0) >= 24);

  /* ---- abandoned cart carries the basket value ---- */
  r = await post({
    email: EMAIL2,
    source: 'checkout',
    consent: true,
    path: '/checkout',
    cartValue: 249.5,
  });
  const cartRow = await prisma.subscriber.findUnique({ where: { email: EMAIL2 } });
  ok(
    'checkout capture records the basket value',
    Number(cartRow?.abandonedValue) === 249.5,
    String(cartRow?.abandonedValue)
  );

  /* ---- membership is not leaked ---- */
  const first = await post({ email: EMAIL, source: 'newsletter', consent: true });
  ok(
    'a repeat sign-up answers the same as a new one',
    first.status === 201,
    `HTTP ${first.status} — no "already subscribed" oracle`
  );

  /* ---- unsubscribe ---- */
  const bad = await fetch(`${BASE}/api/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'token=guessed-token-that-is-long-enough',
    redirect: 'manual',
  });
  const stillOn = await prisma.subscriber.findUnique({ where: { email: EMAIL } });
  ok('a guessed token unsubscribes nobody', stillOn?.status === 'SUBSCRIBED', `HTTP ${bad.status}`);

  await fetch(`${BASE}/api/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `token=${encodeURIComponent(row.unsubscribeToken)}`,
    redirect: 'manual',
  });
  const off = await prisma.subscriber.findUnique({ where: { email: EMAIL } });
  ok('the real token unsubscribes', off?.status === 'UNSUBSCRIBED');
  ok('and stamps when it happened', off?.unsubscribedAt != null);

  /* ---- the export is not public ---- */
  const csv = await fetch(`${BASE}/api/admin/subscribers.csv`, { redirect: 'manual' });
  ok('CSV export refuses anonymous requests', csv.status === 401, `HTTP ${csv.status}`);

  /* ---- the limiter, on a bucket of its own ---- */
  const flood = '198.51.100.7';
  const codes = [];
  for (let i = 0; i < 9; i += 1) {
    const res = await post(
      { email: `flood-${i}@example.test`, source: 'newsletter', consent: true },
      flood
    );
    codes.push(res.status);
  }
  ok(
    'rate limiter stops a flood from one address',
    codes.includes(429),
    codes.join(',')
  );
  await prisma.subscriber.deleteMany({ where: { email: { contains: 'flood-' } } });
} finally {
  const gone = await prisma.subscriber.deleteMany({
    where: { email: { in: [EMAIL, EMAIL2] } },
  });
  console.log(`\ncleanup: removed ${gone.count} probe subscriber(s)`);
  await prisma.$disconnect();
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nall checks passed');
process.exit(fails.length ? 1 : 0);
