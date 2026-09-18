/*
  Proves prisma/import-from-neon.ts against two scratch schemas, without touching live data.

    node --env-file=.env .impeccable/import-neon-e2e.mjs

  It builds `import_test_src` (standing in for Neon) and `import_test_dst` (standing in for the
  new database) on the server DIRECT_URL points at, copies the seeded catalogue into both, gives
  every seeded row in the target a DIFFERENT id (as two separate seeds would), writes the kind of
  rows the live site produces into the source, runs the import as a dry run and then for real
  twice, and checks the result. Both schemas are dropped at the end whatever happens.
*/

import { spawnSync } from 'node:child_process';
import pkg from '@prisma/client';

const { PrismaClient } = pkg;

const DIRECT = process.env.DIRECT_URL;
if (!DIRECT) {
  console.error('DIRECT_URL is not set. Run with --env-file=.env.');
  process.exit(1);
}

const SRC_SCHEMA = 'import_test_src';
const DST_SCHEMA = 'import_test_dst';
const withSchema = (url, schema) => {
  const u = new URL(url);
  u.searchParams.set('schema', schema);
  /*
    Few connections per client. This runs on the session pooler, which holds a real server
    connection per client connection and allows only ~15 on the free plan. Three clients here plus
    two in each import run exhausted it, and the failure reads as "can't reach database".
  */
  u.searchParams.set('connection_limit', '2');
  return u.toString();
};
const SRC = withSchema(DIRECT, SRC_SCHEMA);
const DST = withSchema(DIRECT, DST_SCHEMA);

const admin = new PrismaClient({ datasources: { db: { url: withSchema(DIRECT, 'public') } } });
const src = new PrismaClient({ datasources: { db: { url: SRC } } });
const dst = new PrismaClient({ datasources: { db: { url: DST } } });

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  — ${detail}`}`);
}

function run(cmd, args, env) {
  /* One command string, not an argument array: Windows needs a shell to find npx, and Node warns when an array is passed with a shell. */
  const r = spawnSync([cmd, ...args].join(' '), { env: { ...process.env, ...env }, encoding: 'utf8', shell: true });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.replace(/postgres(ql)?:\/\/\S+/g, '<url>');
  return { code: r.status, out };
}

/** Seeded tables with no enum columns, so a plain INSERT … SELECT works across schemas. */
const SEEDED = [
  'categories', 'brands', 'products', 'specifications', 'product_faqs',
  'blog_posts', 'payment_methods', 'delivery_zones', 'delivery_rates',
];
/** Seeded tables whose ids the target re-issues; children follow through ON UPDATE CASCADE. */
const REISSUED = ['categories', 'brands', 'products', 'blog_posts', 'payment_methods', 'delivery_zones'];

async function dropSchemas() {
  for (const s of [SRC_SCHEMA, DST_SCHEMA]) await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${s}" CASCADE`);
}

async function setup() {
  await dropSchemas();
  for (const url of [SRC, DST]) {
    const r = run('npx', ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'], {
      DATABASE_URL: url,
      DIRECT_URL: url,
    });
    if (r.code !== 0) throw new Error(`db push failed:\n${r.out}`);
  }
  for (const schema of [SRC_SCHEMA, DST_SCHEMA]) {
    for (const t of SEEDED) {
      await admin.$executeRawUnsafe(`INSERT INTO "${schema}"."${t}" SELECT * FROM "public"."${t}"`);
    }
    /* Every seeded row starts "never edited". */
    for (const t of ['categories', 'brands', 'products', 'blog_posts', 'payment_methods', 'delivery_zones', 'delivery_rates']) {
      await admin.$executeRawUnsafe(`UPDATE "${schema}"."${t}" SET "updatedAt" = "createdAt"`);
    }
  }
  for (const t of REISSUED) {
    await admin.$executeRawUnsafe(`UPDATE "${DST_SCHEMA}"."${t}" SET id = 'd_' || id`);
  }
}

async function main() {
  console.log('Building scratch schemas…');
  await setup();

  const [p1, p2, p3] = await src.product.findMany({ orderBy: { slug: 'asc' }, take: 3 });
  const dstP = async (slug) => dst.product.findUnique({ where: { slug } });
  const p3Before = await dstP(p3.slug);
  check('target has re-issued ids', (await dstP(p1.slug)).id === `d_${p1.id}`);

  /* ---- what the live site wrote to "Neon" ---- */
  await src.product.update({ where: { id: p1.id }, data: { price: 12.34, stockCount: 7 } });
  await src.product.update({ where: { id: p2.id }, data: { price: 55.55 } });
  await dst.product.update({ where: { slug: p2.slug }, data: { price: 66.66 } }); // edited after the switch

  const newProduct = await src.product.create({
    data: {
      ...Object.fromEntries(
        Object.entries(p1).filter(([k]) => !['id', 'slug', 'createdAt', 'updatedAt'].includes(k))
      ),
      slug: 'import-test-new-product',
      name: 'Import test product',
      specifications: { create: [{ label: 'Test', value: '1' }] },
    },
  }).catch(async () =>
    /* Specification may have other required fields; fall back to the product alone. */
    src.product.create({
      data: {
        ...Object.fromEntries(
          Object.entries(p1).filter(([k]) => !['id', 'slug', 'createdAt', 'updatedAt'].includes(k))
        ),
        slug: 'import-test-new-product',
        name: 'Import test product',
      },
    })
  );

  const article = await src.blogPost.findFirst({ orderBy: { slug: 'asc' } });
  await src.blogPost.update({ where: { id: article.id }, data: { excerpt: 'Edited on Neon.' } });

  const method = await src.paymentMethod.findFirst({ orderBy: { key: 'asc' } });
  await src.paymentMethod.update({ where: { id: method.id }, data: { notice: 'Edited on Neon.' } });

  const zone = await src.deliveryZone.findFirst({ orderBy: { position: 'asc' } });
  await src.deliveryZone.update({ where: { id: zone.id }, data: { name: 'Edited zone on Neon' } });

  await src.siteSetting.create({ data: { key: 'test_only_neon', value: 'neon' } });
  await src.siteSetting.create({ data: { key: 'test_both', value: 'neon' } });
  await dst.siteSetting.create({ data: { key: 'test_both', value: 'supabase' } });

  await src.adminUser.create({ data: { email: 'second-admin@example.test', passwordHash: 'x' } });

  const a = await src.contact.create({ data: { email: 'a-only@example.test', firstSource: 'test' } });
  const bSrc = await src.contact.create({ data: { email: 'both@example.test', firstSource: 'test' } });
  const bDst = await dst.contact.create({ data: { email: 'both@example.test', firstSource: 'test' } });

  await src.subscriber.create({
    data: { email: 'a-only@example.test', source: 'test', consentText: 'yes', unsubscribeToken: 'tok-a', contactId: a.id },
  });
  await src.subscriber.create({
    data: { email: 'both@example.test', source: 'test', consentText: 'yes', unsubscribeToken: 'tok-b-src', status: 'UNSUBSCRIBED', contactId: bSrc.id },
  });
  await dst.subscriber.create({
    data: { email: 'both@example.test', source: 'test', consentText: 'yes', unsubscribeToken: 'tok-b-dst', status: 'SUBSCRIBED', contactId: bDst.id },
  });
  await src.customer.create({ data: { email: 'a-only@example.test', passwordHash: 'x', contactId: a.id } });

  await src.enquiry.create({
    data: { contactId: bSrc.id, name: 'B', email: 'both@example.test', subject: 'Other', message: 'hello' },
  });
  await src.contactNote.create({ data: { contactId: bSrc.id, body: 'note', authorEmail: 'staff@example.test' } });

  const order = (reference, contactId) => ({
    reference, contactId, shipName: 'T', shipLine1: '1 St', shipCity: 'X', shipPostcode: 'X1',
    shipCountry: 'GB', subtotal: 10, shipping: 0, total: 10,
  });
  const oA = await src.order.create({ data: order('MRA-TST001', a.id) });
  await src.orderItem.create({
    data: { orderId: oA.id, productId: p1.id, name: p1.name, slug: p1.slug, unitPrice: 10, quantity: 1, lineTotal: 10 },
  });
  await src.orderEvent.create({ data: { orderId: oA.id, summary: 'Order placed' } });
  await src.order.create({ data: order('MRA-TST002', bSrc.id) });
  await src.order.create({ data: order('MRA-TST003', a.id) });
  await dst.order.create({ data: order('MRA-TST003', bDst.id) }); // same reference, different order

  await src.review.create({
    data: { productId: p1.id, author: 'R', rating: 4, date: new Date(), title: 't', body: 'b', status: 'APPROVED' },
  });

  await src.discount.create({ data: { code: 'TESTONLY', type: 'PERCENTAGE', value: 10, categoryId: p1.categoryId } });
  const bothSrc = await src.discount.create({ data: { code: 'TESTBOTH', type: 'FIXED', value: 5, usageCount: 1 } });
  const bothDst = await dst.discount.create({ data: { code: 'TESTBOTH', type: 'FIXED', value: 5, usageCount: 1 } });
  await src.discountRedemption.create({ data: { discountId: bothSrc.id, amount: 5, contactId: a.id } });
  await dst.discountRedemption.create({ data: { discountId: bothDst.id, amount: 5 } });

  const visitor = await src.visitor.create({ data: { token: 'vtok-src', contactId: a.id } });
  await src.pageView.create({ data: { visitorId: visitor.id, path: '/shop' } });
  const convo = await src.chatConversation.create({ data: { tokenHash: 'hash-src', contactId: a.id } });
  await src.chatMessage.create({ data: { conversationId: convo.id, role: 'VISITOR', mode: 'SUPPORT', body: 'hi' } });

  const env = { NEON_DATABASE_URL: SRC, DATABASE_URL: DST, IMPORT_ALLOW_SAME_HOST: '1' };
  const importer = (extra) => run('node', ['--import', 'tsx', 'prisma/import-from-neon.ts', ...extra], env);

  /* ---- dry run writes nothing ---- */
  const contactsBefore = await dst.contact.count();
  const dry = importer([]);
  check('dry run exits cleanly', dry.code === 0, dry.out.slice(-600));
  check('dry run wrote nothing', (await dst.contact.count()) === contactsBefore && (await dst.order.count()) === 1);

  /* ---- apply ---- */
  const first = importer(['--apply']);
  check('import exits cleanly', first.code === 0, first.out.slice(-1200));

  const d1 = await dstP(p1.slug);
  check('an edit made on Neon is copied', Number(d1.price) === 12.34 && d1.stockCount === 7, `price ${d1.price}`);
  check('an edit made after the switch is kept', Number((await dstP(p2.slug)).price) === 66.66);
  check('an untouched product is left alone', Number((await dstP(p3.slug)).price) === Number(p3Before.price));
  const dNew = await dstP('import-test-new-product');
  const dCat = await dst.category.findUnique({ where: { id: dNew?.categoryId ?? '' } });
  check('a product created on Neon is created, with its category re-pointed', !!dNew && dCat?.id.startsWith('d_'));

  check('an article edited on Neon is NOT copied by default', (await dst.blogPost.findUnique({ where: { slug: article.slug } })).excerpt !== 'Edited on Neon.');
  check('…but it is reported', /differs on Neon/.test(first.out), first.out.slice(-800));
  const dMethod = await dst.paymentMethod.findUnique({ where: { key: method.key } });
  check('a payment notice edited on Neon is copied, still not connected', dMethod.notice === 'Edited on Neon.' && dMethod.connected === false);
  check('untouched delivery zones are replaced by Neon\'s', (await dst.deliveryZone.count({ where: { name: 'Edited zone on Neon' } })) === 1);

  check('a setting only Neon had is created', (await dst.siteSetting.findUnique({ where: { key: 'test_only_neon' } }))?.value === 'neon');
  check('a setting both had keeps the newer value', (await dst.siteSetting.findUnique({ where: { key: 'test_both' } }))?.value === 'supabase');
  check('a second admin is created', !!(await dst.adminUser.findUnique({ where: { email: 'second-admin@example.test' } })));

  check('a new contact is created', !!(await dst.contact.findUnique({ where: { email: 'a-only@example.test' } })));
  check('a returning contact is not duplicated', (await dst.contact.count({ where: { email: 'both@example.test' } })) === 1);
  check('the newer consent decision wins', (await dst.subscriber.findUnique({ where: { email: 'both@example.test' } })).status === 'SUBSCRIBED');
  check('a new subscriber is created and linked', !!(await dst.subscriber.findUnique({ where: { email: 'a-only@example.test' } }))?.contactId);
  check('a customer account is created', !!(await dst.customer.findUnique({ where: { email: 'a-only@example.test' } })));
  check('an enquiry follows the returning contact', (await dst.enquiry.count({ where: { contactId: bDst.id } })) === 1);
  check('a note follows the returning contact', (await dst.contactNote.count({ where: { contactId: bDst.id } })) === 1);

  const dOrderA = await dst.order.findUnique({ where: { reference: 'MRA-TST001' }, include: { items: true, events: true } });
  check('an order is copied with its line and event', dOrderA?.items.length === 1 && dOrderA?.events.length === 1);
  check('the order line points at the target\'s product', dOrderA?.items[0].productId === d1.id);
  check('an order for a returning contact follows them', (await dst.order.findUnique({ where: { reference: 'MRA-TST002' } }))?.contactId === bDst.id);
  check('an order whose reference is taken is skipped, not merged', (await dst.order.findUnique({ where: { reference: 'MRA-TST003' } }))?.contactId === bDst.id);

  const rated = await dstP(p1.slug);
  check('the rating is recomputed from approved reviews', rated.reviewCount === 1 && rated.rating === 4);
  const tOnly = await dst.discount.findUnique({ where: { code: 'TESTONLY' } });
  check('a discount\'s category is re-pointed', tOnly?.categoryId === d1.categoryId);
  check('a code used on both sides counts both uses', (await dst.discount.findUnique({ where: { code: 'TESTBOTH' } })).usageCount === 2);
  check('visits are copied', (await dst.pageView.count()) === 1);
  check('a chat is copied with its message', (await dst.chatMessage.count()) === 1);

  /* ---- a second run changes nothing ---- */
  const counts = async () => Promise.all([dst.contact.count(), dst.order.count(), dst.orderItem.count(), dst.pageView.count(), dst.chatMessage.count(), dst.product.count()]);
  const before = JSON.stringify(await counts());
  const second = importer(['--apply']);
  check('a second run exits cleanly', second.code === 0, second.out.slice(-600));
  check('a second run adds nothing', JSON.stringify(await counts()) === before);
  check('a second run leaves the usage count alone', (await dst.discount.findUnique({ where: { code: 'TESTBOTH' } })).usageCount === 2);

  const withJournal = importer(['--apply', '--include-journal']);
  check('--include-journal copies an article edited only on Neon',
    withJournal.code === 0 && (await dst.blogPost.findUnique({ where: { slug: article.slug } })).excerpt === 'Edited on Neon.',
    withJournal.out.slice(-600));
}

main()
  .catch((error) => {
    console.error(String(error?.message ?? error).replace(/postgres(ql)?:\/\/\S+/g, '<url>'));
    results.push({ name: 'the suite threw', ok: false });
  })
  .finally(async () => {
    await src.$disconnect();
    await dst.$disconnect();
    await dropSchemas().catch((e) => console.error('CLEANUP FAILED — drop the import_test_* schemas by hand:', e.message));
    await admin.$disconnect();
    const failed = results.filter((r) => !r.ok);
    console.log(failed.length ? `\n${failed.length} failed.` : `\nAll ${results.length} checks passed.`);
    process.exit(failed.length ? 1 : 0);
  });
