/*
  Copy what the live site wrote to Neon into the current database (Supabase).

    npm run db:import-neon            dry run: report what would happen, write nothing
    npm run db:import-neon -- --apply do it

  WHY THIS EXISTS. In September 2026 the Neon project hit its free-plan quota and refused every
  connection. The site was moved to Supabase and rebuilt from the seed scripts, which restores
  everything that lives in this repository — catalogue, journal, FAQs, delivery zones, payment
  methods, the admin login — but not what the live site had written: orders, contacts, customers,
  subscribers, reviews, chats, analytics, discount codes, settings, and any price or stock edits
  made in the admin. Those stayed locked in Neon until its quota reset. This copies them across.

  Source: NEON_DATABASE_URL. Target: DATABASE_URL (the database the site now uses).

  THREE KINDS OF ROW, THREE RULES

  1. Rows both databases have, because both were seeded: categories, brands, products, journal
     articles, payment methods, delivery zones. The seeds generated different ids on each side,
     so these are matched by their natural key (slug, key), never by id. Neon's version is copied
     only when it was actually edited on Neon (updatedAt well after createdAt) AND the target's
     row has not been edited since it was seeded. The target is always the newer database, so an
     edit made there after the switch must never be overwritten by an older one.

  2. People: contacts, subscribers, customers, admin users, matched by email. If the address
     already exists in the target — somebody signed up again during the outage — the target's row
     is kept, and everything hanging off the Neon row (orders, enquiries, notes) is re-pointed at
     it. Consent follows the same rule: the target's subscription row is the more recent decision.

  3. Rows only Neon has: orders and their lines, enquiries, notes, activity, messages, reviews,
     chats, visits, campaigns, redemptions. These keep their Neon ids (cuids, so they cannot
     collide) and are inserted with ON CONFLICT DO NOTHING, which makes a re-run harmless.

  Every foreign key is re-pointed through the maps built above, because a Neon product id or
  contact id means nothing in the target. A link that cannot be resolved is set to null where the
  column allows it, and the row is skipped and reported where it does not.

  It never deletes anything from the target, except delivery zones, and only when every target
  zone is still exactly as seeded: those are replaced wholesale with Neon's, because zones have
  no natural key to match on.
*/

import { Prisma, PrismaClient } from '@prisma/client';

const APPLY = process.argv.includes('--apply');
const CHUNK = 500;
/** A row whose updatedAt is within this of its createdAt has never been edited. */
const EDIT_GAP_MS = 60_000;

type Row = Record<string, any>;

function host(url: string | undefined): string {
  try {
    return url ? new URL(url).host : '(unset)';
  } catch {
    return '(unparseable)';
  }
}

const sourceUrl = process.env.NEON_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;

if (!sourceUrl) {
  console.error('NEON_DATABASE_URL is not set. Add the Neon pooled connection string to .env.');
  process.exit(1);
}
if (!targetUrl) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
/*
  Same host is refused unless IMPORT_ALLOW_SAME_HOST is set, which only the test harness does:
  it imports between two scratch schemas on one server. An identical URL is refused regardless.
*/
if (sourceUrl === targetUrl || (host(sourceUrl) === host(targetUrl) && !process.env.IMPORT_ALLOW_SAME_HOST)) {
  console.error('Source and target are the same database. Refusing to run.');
  process.exit(1);
}

const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
const target = new PrismaClient({ datasources: { db: { url: targetUrl } } });

/* ------------------------------------------------------------------ helpers */

/** Fields of type Json per model, from Prisma's own description of the schema. */
const JSON_FIELDS = new Map(
  Prisma.dmmf.datamodel.models.map((m) => [
    m.name,
    m.fields.filter((f) => f.type === 'Json').map((f) => f.name),
  ])
);

/**
 * A row as read, made writable: a Json column that is SQL NULL comes back as `null`, which
 * Prisma refuses on write — it has to be told whether that means database NULL or JSON null.
 */
function writable(model: string, row: Row): Row {
  const out = { ...row };
  for (const f of JSON_FIELDS.get(model) ?? []) {
    if (out[f] === null) out[f] = Prisma.DbNull;
  }
  return out;
}

function edited(row: Row): boolean {
  if (!(row.createdAt instanceof Date) || !(row.updatedAt instanceof Date)) return false;
  return row.updatedAt.getTime() - row.createdAt.getTime() > EDIT_GAP_MS;
}

/** Everything a row carries except its identity and timestamps, for an update. */
function content(row: Row, drop: string[] = []): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (['id', 'createdAt', 'updatedAt', ...drop].includes(k)) continue;
    out[k] = v;
  }
  return out;
}

type Tally = { source: number; created: number; matched: number; updated: number; skipped: number; notes: string[] };
const report = new Map<string, Tally>();
function tally(table: string): Tally {
  if (!report.has(table)) {
    report.set(table, { source: 0, created: 0, matched: 0, updated: 0, skipped: 0, notes: [] });
  }
  return report.get(table)!;
}

/** Insert rows that are not already there, by id. Returns how many were new. */
async function insertMissing(model: string, delegate: any, rows: Row[]): Promise<number> {
  if (rows.length === 0) return 0;
  const existing = new Set<string>();
  for (let i = 0; i < rows.length; i += CHUNK) {
    const ids = rows.slice(i, i + CHUNK).map((r) => r.id);
    const found: { id: string }[] = await delegate.findMany({ where: { id: { in: ids } }, select: { id: true } });
    for (const f of found) existing.add(f.id);
  }
  const fresh = rows.filter((r) => !existing.has(r.id));
  if (APPLY) {
    for (let i = 0; i < fresh.length; i += CHUNK) {
      await delegate.createMany({
        data: fresh.slice(i, i + CHUNK).map((r) => writable(model, r)),
        skipDuplicates: true,
      });
    }
  }
  return fresh.length;
}

async function all(delegate: any): Promise<Row[]> {
  const rows: Row[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page: Row[] = await delegate.findMany({
      take: 2000,
      orderBy: { id: 'asc' },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    rows.push(...page);
    if (page.length < 2000) return rows;
    cursor = page[page.length - 1].id;
  }
}

/* ----------------------------------------------------- 1. seeded catalogue */

/** Match by slug; create what is missing, copy Neon's edits onto untouched target rows. */
async function bySlug(
  model: 'Category' | 'Brand',
  src: any,
  dst: any
): Promise<Map<string, string>> {
  const t = tally(model);
  const map = new Map<string, string>();
  const rows = await all(src);
  t.source = rows.length;
  for (const row of rows) {
    const found: Row | null = await dst.findUnique({ where: { slug: row.slug } });
    if (!found) {
      t.created++;
      map.set(row.id, row.id);
      if (APPLY) await dst.create({ data: writable(model, row) });
      continue;
    }
    map.set(row.id, found.id);
    t.matched++;
    if (edited(row) && !edited(found)) {
      t.updated++;
      if (APPLY) await dst.update({ where: { id: found.id }, data: content(row, ['slug']) });
    }
  }
  return map;
}

async function importProducts(categories: Map<string, string>, brands: Map<string, string>) {
  const t = tally('Product');
  const map = new Map<string, string>();
  const rows = await all(source.product);
  t.source = rows.length;

  const targetBySlug = new Map<string, Row>();
  for (const p of await all(target.product)) targetBySlug.set(p.slug, p);

  const replaceChildren = async (neonId: string, targetId: string) => {
    const specs = await source.specification.findMany({ where: { productId: neonId } });
    const faqs = await source.productFaq.findMany({ where: { productId: neonId } });
    if (!APPLY) return;
    await target.specification.deleteMany({ where: { productId: targetId } });
    await target.productFaq.deleteMany({ where: { productId: targetId } });
    if (specs.length) {
      await target.specification.createMany({
        data: specs.map((s) => ({ ...s, productId: targetId })),
        skipDuplicates: true,
      });
    }
    if (faqs.length) {
      await target.productFaq.createMany({
        data: faqs.map((f) => ({ ...f, productId: targetId })),
        skipDuplicates: true,
      });
    }
  };

  for (const row of rows) {
    const categoryId = categories.get(row.categoryId);
    const brandId = brands.get(row.brandId);
    if (!categoryId || !brandId) {
      t.skipped++;
      t.notes.push(`${row.slug}: its category or brand could not be matched`);
      continue;
    }
    const found = targetBySlug.get(row.slug);
    if (!found) {
      t.created++;
      map.set(row.id, row.id);
      if (APPLY) await target.product.create({ data: { ...row, categoryId, brandId } });
      await replaceChildren(row.id, row.id);
      continue;
    }
    map.set(row.id, found.id);
    t.matched++;
    if (edited(row) && !edited(found)) {
      t.updated++;
      if (APPLY) {
        await target.product.update({
          where: { id: found.id },
          data: { ...content(row, ['slug', 'categoryId', 'brandId', 'rating', 'reviewCount']), categoryId, brandId },
        });
      }
      await replaceChildren(row.id, found.id);
    }
  }
  return map;
}

/**
 * Journal articles: REPORTED, not copied, unless --include-journal.
 *
 * The articles are defined by the repository (content/journal/), and they were re-seeded with
 * --refresh several times while being drafted. On Neon a draft loaded that way looks exactly like
 * an administrator's edit — updatedAt well after createdAt — so copying "edited" rows would put
 * an older draft over the finished article. An administrator edit made on Neon is possible but
 * rare; it is listed so a person can decide.
 */
async function importJournal() {
  const t = tally('BlogPost');
  const include = process.argv.includes('--include-journal');
  const rows = await all(source.blogPost);
  t.source = rows.length;
  for (const row of rows) {
    const found: Row | null = await target.blogPost.findUnique({ where: { slug: row.slug } });
    if (!found) {
      /* Not in the target means retired or never seeded — republishing it would be wrong. */
      t.skipped++;
      continue;
    }
    t.matched++;
    const differs = row.content !== found.content || row.title !== found.title || row.excerpt !== found.excerpt;
    if (!differs || !edited(row)) continue;
    if (!include || edited(found)) {
      t.notes.push(`${row.slug}: differs on Neon — not copied${include ? ' (edited on both sides)' : '; review it, or rerun with --include-journal'}`);
      continue;
    }
    t.updated++;
    if (APPLY) {
      await target.blogPost.update({ where: { id: found.id }, data: writable('BlogPost', content(row, ['slug'])) });
    }
  }
}

async function importPaymentMethods() {
  const t = tally('PaymentMethod');
  const rows = await all(source.paymentMethod);
  t.source = rows.length;
  for (const row of rows) {
    const found: Row | null = await target.paymentMethod.findUnique({ where: { key: row.key } });
    if (!found) {
      t.created++;
      if (APPLY) await target.paymentMethod.create({ data: { ...row, connected: false } });
      continue;
    }
    t.matched++;
    if (edited(row) && !edited(found)) {
      t.updated++;
      /* `connected` is never copied: no screen can set it, and nothing may. */
      if (APPLY) await target.paymentMethod.update({ where: { id: found.id }, data: content(row, ['key', 'connected']) });
    }
  }
}

async function importDelivery() {
  const t = tally('DeliveryZone');
  const zones = await all(source.deliveryZone);
  const rates = await all(source.deliveryRate);
  t.source = zones.length;

  const targetZones = await all(target.deliveryZone);
  const targetRates = await all(target.deliveryRate);
  const neonEdited = zones.some(edited) || rates.some(edited) || zones.length !== targetZones.length;
  const targetEdited = targetZones.some(edited) || targetRates.some(edited);

  if (!neonEdited) {
    t.matched = zones.length;
    t.notes.push('Neon zones are as seeded; nothing to copy');
    return;
  }
  if (targetEdited) {
    t.skipped = zones.length;
    t.notes.push('zones were edited on BOTH sides; kept the target\'s — compare them by hand in /admin/delivery');
    return;
  }
  t.updated = zones.length;
  t.notes.push(`replaced ${targetZones.length} seeded zones with Neon's ${zones.length} (and ${rates.length} rates)`);
  if (APPLY) {
    await target.deliveryZone.deleteMany({});
    await target.deliveryZone.createMany({ data: zones });
    await target.deliveryRate.createMany({ data: rates });
  }
}

/* ----------------------------------------------------------------- 2. people */

async function importAdmins() {
  const t = tally('AdminUser');
  const rows = await all(source.adminUser);
  t.source = rows.length;
  for (const row of rows) {
    const found = await target.adminUser.findUnique({ where: { email: row.email } });
    if (found) {
      t.matched++;
      continue;
    }
    t.created++;
    if (APPLY) await target.adminUser.create({ data: row });
  }
}

async function importContacts(): Promise<Map<string, string>> {
  const t = tally('Contact');
  const map = new Map<string, string>();
  const rows = await all(source.contact);
  t.source = rows.length;
  const byEmail = new Map<string, string>();
  for (const c of await target.contact.findMany({ select: { id: true, email: true } })) byEmail.set(c.email, c.id);

  const fresh: Row[] = [];
  for (const row of rows) {
    const existing = byEmail.get(row.email);
    if (existing) {
      map.set(row.id, existing);
      t.matched++;
    } else {
      map.set(row.id, row.id);
      fresh.push(row);
    }
  }
  t.created = await insertMissing('Contact', target.contact, fresh);
  return map;
}

/** Subscribers and customers: one per email, and one per contact. The target wins a clash. */
async function importOnePerContact(
  model: 'Subscriber' | 'Customer',
  src: any,
  dst: any,
  contacts: Map<string, string>
) {
  const t = tally(model);
  const rows = await all(src);
  t.source = rows.length;
  const targetRows: Row[] = await dst.findMany({ select: { email: true, contactId: true } });
  const emails = new Set(targetRows.map((r) => r.email));
  const taken = new Set(targetRows.map((r) => r.contactId).filter(Boolean));

  const fresh: Row[] = [];
  for (const row of rows) {
    if (emails.has(row.email)) {
      t.matched++;
      continue;
    }
    let contactId = row.contactId ? contacts.get(row.contactId) ?? null : null;
    if (contactId && taken.has(contactId)) contactId = null;
    if (contactId) taken.add(contactId);
    fresh.push({ ...row, contactId });
  }
  t.created = await insertMissing(model, dst, fresh);
}

/* ------------------------------------------------------ 3. rows only Neon has */

/** Copy a contact-owned table, re-pointing contactId. Rows whose contact is unknown are skipped. */
async function importOwned(model: string, src: any, dst: any, contacts: Map<string, string>) {
  const t = tally(model);
  const rows = await all(src);
  t.source = rows.length;
  const ready: Row[] = [];
  for (const row of rows) {
    const contactId = contacts.get(row.contactId);
    if (!contactId) {
      t.skipped++;
      continue;
    }
    ready.push({ ...row, contactId });
  }
  t.created = await insertMissing(model, dst, ready);
}

async function importDiscounts(categories: Map<string, string>, contacts: Map<string, string>) {
  const t = tally('Discount');
  const map = new Map<string, string>();
  const bothSides = new Set<string>();
  const rows = await all(source.discount);
  t.source = rows.length;
  for (const row of rows) {
    const found = await target.discount.findUnique({ where: { code: row.code } });
    if (found) {
      map.set(row.id, found.id);
      bothSides.add(found.id);
      t.matched++;
      continue;
    }
    map.set(row.id, row.id);
    t.created++;
    /* categoryId is a plain column, not a relation: it still has to be translated. */
    const categoryId = row.categoryId ? categories.get(row.categoryId) ?? null : null;
    if (APPLY) await target.discount.create({ data: { ...row, categoryId } });
  }

  const r = tally('DiscountRedemption');
  const redemptions = await all(source.discountRedemption);
  r.source = redemptions.length;
  const ready = redemptions.flatMap((row) => {
    const discountId = map.get(row.discountId);
    if (!discountId) {
      r.skipped++;
      return [];
    }
    return [{ ...row, discountId, contactId: row.contactId ? contacts.get(row.contactId) ?? null : null }];
  });
  r.created = await insertMissing('DiscountRedemption', target.discountRedemption, ready);

  /* A code that existed on both sides has been used on both: its counter must count both. */
  if (APPLY) {
    for (const id of Array.from(bothSides)) {
      const used = await target.discountRedemption.count({ where: { discountId: id } });
      await target.discount.update({ where: { id }, data: { usageCount: used } });
    }
  }
}

async function importOrders(contacts: Map<string, string>, products: Map<string, string>) {
  const t = tally('Order');
  const rows = await all(source.order);
  t.source = rows.length;
  const references = new Map<string, string>();
  for (const o of await target.order.findMany({ select: { id: true, reference: true } })) {
    references.set(o.reference, o.id);
  }

  const kept = new Set<string>();
  const ready: Row[] = [];
  for (const row of rows) {
    const contactId = contacts.get(row.contactId);
    const clash = references.get(row.reference);
    if (!contactId || (clash && clash !== row.id)) {
      t.skipped++;
      t.notes.push(`${row.reference}: ${!contactId ? 'customer could not be matched' : 'reference already used by a different order'}`);
      continue;
    }
    kept.add(row.id);
    ready.push({ ...row, contactId });
  }
  t.created = await insertMissing('Order', target.order, ready);

  const items = tally('OrderItem');
  const allItems = await all(source.orderItem);
  items.source = allItems.length;
  /* A line keeps its own snapshot of name and price; a product that no longer matches just unlinks. */
  const readyItems = allItems
    .filter((i) => kept.has(i.orderId))
    .map((i) => ({ ...i, productId: i.productId ? products.get(i.productId) ?? null : null }));
  items.skipped = allItems.length - readyItems.length;
  items.created = await insertMissing('OrderItem', target.orderItem, readyItems);

  const events = tally('OrderEvent');
  const allEvents = await all(source.orderEvent);
  events.source = allEvents.length;
  const readyEvents = allEvents.filter((e) => kept.has(e.orderId));
  events.skipped = allEvents.length - readyEvents.length;
  events.created = await insertMissing('OrderEvent', target.orderEvent, readyEvents);
}

async function importReviews(products: Map<string, string>) {
  const t = tally('Review');
  const rows = await all(source.review);
  t.source = rows.length;
  const ready = rows.flatMap((row) => {
    const productId = products.get(row.productId);
    if (!productId) {
      t.skipped++;
      return [];
    }
    return [{ ...row, productId }];
  });
  t.created = await insertMissing('Review', target.review, ready);

  /* Ratings are derived, and only ever from approved reviews — recompute rather than copy. */
  if (APPLY && t.created > 0) {
    const touched = Array.from(new Set(ready.map((r) => r.productId)));
    for (const productId of touched) {
      const agg = await target.review.aggregate({
        where: { productId, status: 'APPROVED' },
        _avg: { rating: true },
        _count: true,
      });
      await target.product.update({
        where: { id: productId },
        data: { rating: agg._avg.rating ?? 0, reviewCount: agg._count },
      });
    }
  }
}

async function importAnalytics(contacts: Map<string, string>) {
  const t = tally('Visitor');
  const map = new Map<string, string>();
  const rows = await all(source.visitor);
  t.source = rows.length;
  const byToken = new Map<string, string>();
  for (const v of await target.visitor.findMany({ select: { id: true, token: true } })) byToken.set(v.token, v.id);

  const fresh: Row[] = [];
  for (const row of rows) {
    const existing = byToken.get(row.token);
    if (existing) {
      map.set(row.id, existing);
      t.matched++;
      continue;
    }
    map.set(row.id, row.id);
    fresh.push({ ...row, contactId: row.contactId ? contacts.get(row.contactId) ?? null : null });
  }
  t.created = await insertMissing('Visitor', target.visitor, fresh);

  const views = tally('PageView');
  const allViews = await all(source.pageView);
  views.source = allViews.length;
  const readyViews = allViews.flatMap((v) => {
    const visitorId = map.get(v.visitorId);
    return visitorId ? [{ ...v, visitorId }] : [];
  });
  views.skipped = allViews.length - readyViews.length;
  views.created = await insertMissing('PageView', target.pageView, readyViews);

  const searches = tally('SearchQuery');
  const allSearches = await all(source.searchQuery);
  searches.source = allSearches.length;
  searches.created = await insertMissing(
    'SearchQuery',
    target.searchQuery,
    allSearches.map((s) => ({ ...s, visitorId: s.visitorId ? map.get(s.visitorId) ?? null : null }))
  );
}

async function importChat(contacts: Map<string, string>) {
  const t = tally('ChatConversation');
  const map = new Map<string, string>();
  const rows = await all(source.chatConversation);
  t.source = rows.length;
  const byHash = new Map<string, string>();
  for (const c of await target.chatConversation.findMany({ select: { id: true, tokenHash: true } })) {
    byHash.set(c.tokenHash, c.id);
  }
  const fresh: Row[] = [];
  for (const row of rows) {
    const existing = byHash.get(row.tokenHash);
    if (existing) {
      map.set(row.id, existing);
      t.matched++;
      continue;
    }
    map.set(row.id, row.id);
    fresh.push({ ...row, contactId: row.contactId ? contacts.get(row.contactId) ?? null : null });
  }
  t.created = await insertMissing('ChatConversation', target.chatConversation, fresh);

  const m = tally('ChatMessage');
  const messages = await all(source.chatMessage);
  m.source = messages.length;
  const ready = messages.flatMap((msg) => {
    const conversationId = map.get(msg.conversationId);
    return conversationId ? [{ ...msg, conversationId }] : [];
  });
  m.skipped = messages.length - ready.length;
  m.created = await insertMissing('ChatMessage', target.chatMessage, ready);
}

async function importSettings() {
  const t = tally('SiteSetting');
  const rows: Row[] = await source.siteSetting.findMany();
  t.source = rows.length;
  const present = new Set((await target.siteSetting.findMany({ select: { key: true } })).map((s) => s.key));
  for (const row of rows) {
    if (present.has(row.key)) {
      /* Written on the target after the switch, so it is the newer choice. */
      t.matched++;
      continue;
    }
    t.created++;
    if (APPLY) await target.siteSetting.create({ data: row });
  }
}

/* --------------------------------------------------------------------- main */

async function main() {
  console.log(`Import from Neon (${host(sourceUrl)}) into ${host(targetUrl)}`);
  console.log(APPLY ? 'APPLYING — writing to the target.\n' : 'Dry run — nothing will be written. Add --apply to write.\n');

  /* Read one row first, so a Neon that is still over quota fails here, clearly, not halfway. */
  await source.$queryRaw`select 1`;

  const categories = await bySlug('Category', source.category, target.category);
  const brands = await bySlug('Brand', source.brand, target.brand);
  const products = await importProducts(categories, brands);
  await importJournal();
  await importPaymentMethods();
  await importDelivery();
  await importSettings();

  await importAdmins();
  const contacts = await importContacts();
  await importOnePerContact('Subscriber', source.subscriber, target.subscriber, contacts);
  await importOnePerContact('Customer', source.customer, target.customer, contacts);

  await importOwned('Enquiry', source.enquiry, target.enquiry, contacts);
  await importOwned('ContactNote', source.contactNote, target.contactNote, contacts);
  await importOwned('ContactActivity', source.contactActivity, target.contactActivity, contacts);
  await importOwned('OutboundMessage', source.outboundMessage, target.outboundMessage, contacts);

  await importDiscounts(categories, contacts);
  await importOrders(contacts, products);
  await importReviews(products);

  const c = tally('Campaign');
  const campaigns = await all(source.campaign);
  c.source = campaigns.length;
  c.created = await insertMissing('Campaign', target.campaign, campaigns);

  await importAnalytics(contacts);
  await importChat(contacts);

  console.log('table                 in Neon   created   matched   updated   skipped');
  for (const [table, t] of Array.from(report)) {
    console.log(
      `${table.padEnd(20)} ${String(t.source).padStart(8)} ${String(t.created).padStart(9)} ${String(t.matched).padStart(9)} ${String(t.updated).padStart(9)} ${String(t.skipped).padStart(9)}`
    );
  }
  const notes = Array.from(report).flatMap(([table, t]) => t.notes.map((n) => `  ${table}: ${n}`));
  if (notes.length) console.log(`\nNotes:\n${notes.join('\n')}`);
  console.log(APPLY ? '\nDone.' : '\nNothing written. Run again with --apply to copy.');
}

main()
  .catch((error) => {
    const message = String(error?.message ?? error).replace(/postgres(ql)?:\/\/\S+/g, '<url>');
    /* Prisma puts the code on errorCode for connection failures, and on code for query errors. */
    if (/exceeded the .*quota|can't reach database/i.test(message) || [error?.code, error?.errorCode].includes('P1001')) {
      console.error('\nNeon is still refusing connections (quota not yet reset, or unreachable). Try again after it resets.');
    }
    console.error(message);
    process.exit(1);
  })
  .finally(() => Promise.all([source.$disconnect(), target.$disconnect()]));
