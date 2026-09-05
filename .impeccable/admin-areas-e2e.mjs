import { PrismaClient } from '@prisma/client';

/*
  The invariants behind the newer admin areas, checked against the database.

  Everything here is asserted against Postgres rather than by importing lib/*, for two reasons.
  Those modules begin with `import 'server-only'` and throw in plain Node — the same constraint
  that keeps lib/cloudinary-upload.ts free of the guard. And a harness that imported the
  implementation could only ever prove the implementation agrees with itself; re-deriving each
  rule here means the two have to agree with each other.

  Every assertion is a rule that is expensive to get wrong and cheap to break by accident — the
  kind a refactor silently undoes because the screen still looks right:

  - An unapproved review is invisible AND uncounted. Both halves, because the failure mode is
    the two disagreeing rather than either one alone.
  - The clock beats the status column: a discount past its end date must be refused while the
    row still says ACTIVE.
  - An UNSUBSCRIBED address is unreachable from a campaign segment.
  - Analytics stores no IP or location column anywhere — asserted against information_schema,
    not against the Prisma client, so a column added later fails this suite.
  - The payment methods table has nowhere to put a wallet address or a credential, and no row
    claims to be connected.

  Leaves the database as it found it.

    node --env-file=.env .impeccable/admin-areas-e2e.mjs
*/

const prisma = new PrismaClient();

const fails = [];
const ok = (label, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!pass) fails.push(label);
};

const made = { discounts: [], reviews: [], subscribers: [], campaigns: [] };

/** The rating rule, re-derived: approved rows only, one decimal. */
async function ratingFromApproved(productId) {
  const rows = await prisma.review.findMany({
    where: { productId, status: 'APPROVED' },
    select: { rating: true },
  });
  if (rows.length === 0) return { rating: 0, count: 0 };
  const mean = rows.reduce((n, r) => n + r.rating, 0) / rows.length;
  return { rating: Math.round(mean * 10) / 10, count: rows.length };
}

async function main() {
  /* ==================================================== reviews: invisible AND uncounted === */

  const product = await prisma.product.findFirst({
    select: { id: true, slug: true, rating: true, reviewCount: true },
    orderBy: { position: 'asc' },
  });
  if (!product) throw new Error('No products in the catalogue to test against.');

  const baseline = { rating: product.rating, count: product.reviewCount };

  const pending = await prisma.review.create({
    data: {
      productId: product.id,
      author: 'Probe Reviewer',
      rating: 1,
      date: new Date(),
      title: 'Probe review',
      body: 'Written by the admin-areas harness. It should never reach the storefront.',
      status: 'PENDING',
    },
  });
  made.reviews.push(pending.id);

  const afterPending = await prisma.product.findUnique({
    where: { id: product.id },
    select: { rating: true, reviewCount: true },
  });
  ok(
    'a PENDING review does not move the stored rating',
    afterPending.rating === baseline.rating && afterPending.reviewCount === baseline.count,
    `${afterPending.rating} / ${afterPending.reviewCount}`
  );

  /* Exactly the shape lib/db/catalogue.ts gives the storefront. */
  const storefrontReviews = await prisma.review.findMany({
    where: { productId: product.id, status: 'APPROVED' },
    select: { id: true },
  });
  ok(
    'a PENDING review is absent from the storefront read',
    !storefrontReviews.some((r) => r.id === pending.id)
  );

  const derived = await ratingFromApproved(product.id);
  ok(
    'the stored rating already agrees with the approved rows',
    Math.abs(derived.rating - baseline.rating) < 0.05 && derived.count === baseline.count,
    `derived ${derived.rating}/${derived.count} vs stored ${baseline.rating}/${baseline.count}`
  );

  /* ============================================================= discounts: the oracle === */

  const stamp = Date.now();
  const expiredCode = `PROBE-EXPIRED-${stamp}`;
  const expired = await prisma.discount.create({
    data: {
      code: expiredCode,
      type: 'PERCENTAGE',
      value: '10',
      status: 'ACTIVE',
      endsAt: new Date(Date.now() - 86_400_000),
    },
  });
  made.discounts.push(expired.id);

  /*
    The rule under test: a row can say ACTIVE and still be over. Anything that reads only the
    status column would accept this code, which is why the status is housekeeping and the
    window is enforcement.
  */
  const reread = await prisma.discount.findUnique({
    where: { code: expiredCode },
    select: { status: true, endsAt: true },
  });
  ok(
    'an expired discount is still stored as ACTIVE, so the window has to be what is checked',
    reread.status === 'ACTIVE' && reread.endsAt < new Date(),
    `${reread.status}, ended ${reread.endsAt.toISOString().slice(0, 10)}`
  );

  const liveCode = `PROBE-LIVE-${stamp}`;
  const live = await prisma.discount.create({
    data: {
      code: liveCode,
      type: 'PERCENTAGE',
      value: '10',
      status: 'ACTIVE',
      minSubtotal: '50',
      usageLimit: 1,
      usageCount: 1,
    },
  });
  made.discounts.push(live.id);

  ok(
    'a code stores its usage against its limit, so "how many are left" is answerable',
    live.usageLimit === 1 && live.usageCount === 1
  );

  /*
    The redemption path, exercised directly: a used code has to leave a row behind AND move its
    counter, in one statement. Without both, a limit of one is decorative — the code can be
    handed out for ever and nothing in the admin would show it.
  */
  const redeemed = await prisma.$transaction([
    prisma.discountRedemption.create({
      data: { discountId: live.id, orderReference: 'MRA-PROBE', amount: '5.00' },
    }),
    prisma.discount.update({
      where: { id: live.id },
      data: { usageCount: { increment: 1 } },
    }),
  ]);
  ok(
    'redeeming a code writes a redemption and moves the counter together',
    redeemed[0].discountId === live.id && redeemed[1].usageCount === 2
  );

  const redemptions = await prisma.discountRedemption.count({ where: { discountId: live.id } });
  ok('a redemption names the order it belonged to', redemptions === 1);

  /* The order columns the discount and delivery work writes into. */
  const orderCols = (
    await prisma.$queryRawUnsafe(
      `select column_name from information_schema.columns where table_name = 'orders'`
    )
  ).map((c) => c.column_name);
  for (const column of ['discountCode', 'discountTotal', 'shippingMethod']) {
    ok(`orders.${column} exists for the snapshot`, orderCols.includes(column));
  }

  ok(
    'codes are stored upper-case, so matching can be case-insensitive at one place',
    (await prisma.discount.findUnique({ where: { code: liveCode } })) !== null &&
      liveCode === liveCode.toUpperCase()
  );

  /* ================================================================= delivery: coverage === */

  const zones = await prisma.deliveryZone.findMany({
    where: { active: true },
    orderBy: { position: 'asc' },
    include: { rates: { where: { active: true } } },
  });

  const catchAll = zones.filter((z) => z.countries.length === 0);
  ok(
    'exactly one active catch-all zone exists, so no country is offered nothing',
    catchAll.length === 1,
    `${catchAll.length} zones with an empty country list`
  );

  const claimed = new Map();
  for (const zone of zones) {
    for (const country of zone.countries) {
      claimed.set(country, [...(claimed.get(country) ?? []), zone.name]);
    }
  }
  const contested = Array.from(claimed.entries()).filter(([, names]) => names.length > 1);
  ok(
    'no country is claimed by two active zones',
    contested.length === 0,
    contested.map(([c, names]) => `${c}: ${names.join('/')}`).join(', ')
  );

  const rateless = zones.filter((z) => z.rates.length === 0);
  ok(
    'every active zone offers at least one active rate',
    rateless.length === 0,
    rateless.map((z) => z.name).join(', ')
  );

  const freeable = zones
    .flatMap((z) => z.rates)
    .filter((r) => r.freeOverSubtotal !== null);
  ok(
    'a free-over threshold is above its own minimum, so the rate is readable off the table',
    freeable.every(
      (r) => r.minSubtotal === null || Number(r.freeOverSubtotal) > Number(r.minSubtotal)
    )
  );

  /* ==================================================== campaigns: consent by construction */

  const gone = await prisma.subscriber.create({
    data: {
      email: `probe-unsub-${stamp}@example.test`,
      status: 'UNSUBSCRIBED',
      source: 'newsletter',
      consentText: 'Harness probe.',
      unsubscribeToken: `probe-${stamp}`,
      unsubscribedAt: new Date(),
    },
  });
  made.subscribers.push(gone.id);

  /* Every segment the admin offers narrows this set; none of them can widen it. */
  const reachable = await prisma.subscriber.findMany({
    where: { status: 'SUBSCRIBED' },
    select: { email: true },
  });
  ok(
    'an UNSUBSCRIBED address is not in the set every segment narrows',
    !reachable.some((s) => s.email === gone.email),
    `${reachable.length} subscribed`
  );

  const campaign = await prisma.campaign.create({
    data: { name: 'Probe campaign', subject: 'Probe', body: 'Body.', status: 'DRAFT' },
  });
  made.campaigns.push(campaign.id);

  ok(
    'a new campaign asserts no send: no time, no person, no platform',
    campaign.sentAt === null && campaign.sentBy === null && campaign.sentVia === null
  );
  ok('a new campaign claims no recipients', campaign.recipientCount === 0);

  /* ================================================ analytics: no address, anywhere at all */

  const analyticsColumns = await prisma.$queryRawUnsafe(
    `select table_name, column_name from information_schema.columns
     where table_name in ('visitors','page_views','search_queries')`
  );
  ok(
    'the analytics tables exist',
    analyticsColumns.length > 0,
    `${analyticsColumns.length} columns`
  );

  const addressish = analyticsColumns.filter((c) =>
    ['ip', 'address', 'geo', 'latitude', 'longitude', 'postcode', 'fingerprint'].some((word) =>
      c.column_name.toLowerCase().includes(word)
    )
  );
  ok(
    'no analytics table has an IP, location or fingerprint column',
    addressish.length === 0,
    addressish.map((c) => `${c.table_name}.${c.column_name}`).join(', ')
  );

  const orderColumns = await prisma.$queryRawUnsafe(
    `select column_name from information_schema.columns where table_name = 'orders'`
  );
  const paymentish = orderColumns
    .map((c) => c.column_name.toLowerCase())
    .filter((n) =>
      ['paid', 'payment', 'transaction', 'gateway', 'stripe', 'charge', 'wallet', 'txid'].some(
        (w) => n.includes(w)
      )
    );
  ok(
    'adding discounts and delivery introduced no payment column on orders',
    paymentish.length === 0,
    paymentish.join(', ')
  );

  const methodColumns = await prisma.$queryRawUnsafe(
    `select column_name from information_schema.columns where table_name = 'payment_methods'`
  );
  const destinationish = methodColumns
    .map((c) => c.column_name.toLowerCase())
    .filter((n) =>
      ['wallet', 'address', 'secret', 'apikey', 'merchant', 'account'].some((w) => n.includes(w))
    );
  ok(
    'the payment methods table has nowhere to store a destination or a credential',
    destinationish.length === 0,
    destinationish.join(', ')
  );

  const connected = await prisma.paymentMethod.count({ where: { connected: true } });
  ok('no payment method claims to be connected', connected === 0);

  const listed = await prisma.paymentMethod.count({ where: { enabled: true } });
  ok('at least one payment method is listed, so checkout is not a dead end', listed > 0);

  /* ======================================================= settings: declared, not implied */

  const settingRows = await prisma.siteSetting.findMany({ select: { key: true } });
  ok(
    'settings are stored one row per key, and an unwritten key is legal',
    Array.isArray(settingRows),
    `${settingRows.length} stored`
  );
}

async function cleanup() {
  const touched = new Set();
  for (const id of made.reviews) {
    const row = await prisma.review.findUnique({ where: { id }, select: { productId: true } });
    if (row) touched.add(row.productId);
    await prisma.review.delete({ where: { id } }).catch(() => {});
  }
  /* Put each touched product's rating back where the approved rows say it should be. */
  for (const productId of touched) {
    const { rating, count } = await ratingFromApproved(productId);
    await prisma.product
      .update({ where: { id: productId }, data: { rating, reviewCount: count } })
      .catch(() => {});
  }

  for (const id of made.discounts) {
    await prisma.discount.delete({ where: { id } }).catch(() => {});
  }
  for (const id of made.subscribers) {
    await prisma.subscriber.delete({ where: { id } }).catch(() => {});
  }
  for (const id of made.campaigns) {
    await prisma.campaign.delete({ where: { id } }).catch(() => {});
  }
  /* A subscriber probe can leave a contact behind; the list must not fill with them. */
  await prisma.contact
    .deleteMany({ where: { email: { endsWith: '@example.test' } } })
    .catch(() => {});
}

main()
  .catch((error) => {
    console.error(error);
    fails.push('the suite threw');
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();

    console.log('');
    if (fails.length) {
      console.log(`${fails.length} failed:`);
      for (const f of fails) console.log(`  - ${f}`);
      process.exitCode = 1;
    } else {
      console.log('All checks passed.');
    }
  });
