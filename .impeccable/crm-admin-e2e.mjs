import { chromium } from 'playwright-core';
import { PrismaClient } from '@prisma/client';

/*
  Drive the CRM admin the way a person does, and check what it wrote.

  Two things here are worth testing through the real interface rather than at the data layer:

  - **Adding a contact by hand must not create marketing consent.** This is the only screen where
    a person gets a record without acting themselves, so it is the one place where a careless
    change could turn staff data entry into a silent opt-in. Asserted against the database, not
    against the page, because the page could be right while the row is wrong.

  - **Deleting keeps the suppression record.** When a subscribed contact is deleted their consent
    is withdrawn but the Subscriber row survives, so the opt-out cannot be undone by re-adding
    them. Deleting that row would make an unsubscribe reversible, which is the exact failure the
    marketing rules exist to prevent.

  Leaves the database as it found it.

    node --env-file=.env .impeccable/crm-admin-e2e.mjs
*/

const BASE = process.env.BASE ?? 'http://localhost:3000';
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

/*
  Credentials come from the environment, never from this file.

  A password written into a harness is a password in the repository, and a password in the
  repository is one nobody can rotate without a commit. Run these with --env-file=.env, which
  is gitignored and holds the real values.
*/
if (!EMAIL || !PASSWORD) {
  console.error(
    'Set ADMIN_EMAIL and ADMIN_PASSWORD (they live in .env). Run with: node --env-file=.env ' +
      process.argv[1]
  );
  process.exit(1);
}

const MANUAL = 'e2e-manual@example.test';
const SUBBED = 'e2e-subbed@example.test';

const prisma = new PrismaClient();
const fails = [];
const ok = (label, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!pass) fails.push(label);
};

async function cleanup() {
  const emails = [MANUAL, SUBBED];
  await prisma.enquiry.deleteMany({ where: { email: { in: emails } } });
  await prisma.contact.deleteMany({ where: { email: { in: emails } } });
  await prisma.subscriber.deleteMany({ where: { email: { in: emails } } });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

/* Every confirm() in this flow is a delete we mean to go through with. */
page.on('dialog', (d) => d.accept());

try {
  await cleanup();

  await page.goto(BASE + '/admin/login', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type=submit]', { noWaitAfter: true });
  await page.waitForURL(/\/admin(\?|$)/, { timeout: 120000 });
  ok('sign in reaches the dashboard', /\/admin$/.test(new URL(page.url()).pathname));

  /* ---------------------------------------------------- add a contact by hand */

  await page.goto(BASE + '/admin/contacts/new', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('#email', MANUAL);
  await page.fill('#name', 'Manual Probe');
  await page.fill('#tags', 'Trade Show, wholesale');
  await page.fill('#note', 'Added by the CRM admin harness.');
  await page.click('button[type=submit]', { noWaitAfter: true });

  /*
    Wait for the record's own heading, not for a navigation: router.push is a client-side
    transition, so no `load` event fires and waitForURL times out on a flow that worked.

    Waiting on the name also sidesteps the pattern trap CLAUDE.md records for
    /admin/products/[^/]+$ — a loose id regex matches "/admin/contacts/new" instantly and every
    later assertion then runs against the form we are still standing on.
  */
  await page.waitForSelector('h1:has-text("Manual Probe")', { timeout: 120000 });

  const landedOn = new URL(page.url()).pathname;
  ok(
    'adding lands on the new contact record',
    /^\/admin\/contacts\/[^/]+$/.test(landedOn) && !landedOn.endsWith('/new'),
    landedOn
  );

  const manual = await prisma.contact.findUnique({
    where: { email: MANUAL },
    include: { subscriber: true, activities: true },
  });

  ok('contact row created', manual !== null);
  ok('name saved', manual?.name === 'Manual Probe');
  ok(
    'source records that staff added them',
    manual?.firstSource === 'added by staff',
    manual?.firstSource
  );
  ok(
    'tags normalised to lower case',
    JSON.stringify(manual?.tags) === JSON.stringify(['trade show', 'wholesale']),
    JSON.stringify(manual?.tags)
  );

  /* THE POINT: data entry is not consent. */
  ok('manual add created NO subscriber link', manual?.subscriber == null);
  const manualSub = await prisma.subscriber.findUnique({ where: { email: MANUAL } });
  ok('manual add created NO subscriber row at all', manualSub === null);
  ok(
    'timeline records no consent event',
    !(manual?.activities ?? []).some((a) => a.type === 'SUBSCRIBED'),
    (manual?.activities ?? []).map((a) => a.type).join(',')
  );

  const body = await page.content();
  ok('the screen says there is no consent', body.includes('No marketing consent on file'));

  /* -------------------------------------- a duplicate address is refused, not silently ignored */

  await page.goto(BASE + '/admin/contacts/new', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('#email', MANUAL);
  await page.click('button[type=submit]');
  await page.waitForSelector('.wp-notice-error', { timeout: 30000 });
  ok('duplicate address is refused', (await page.locator('.wp-notice-error').count()) > 0);
  ok(
    'and no second row was written',
    (await prisma.contact.count({ where: { email: MANUAL } })) === 1
  );

  /* ------------------------------------------- select-all + bulk delete on the contacts list */

  await page.goto(BASE + '/admin/contacts?q=e2e-manual', {
    waitUntil: 'networkidle',
    timeout: 90000,
  });
  ok('search finds the contact', (await page.locator(`text=${MANUAL}`).count()) > 0);

  await page.click('input[aria-label="Select all contacts"]');
  const checked = await page.locator('tbody input[type=checkbox]:checked').count();
  ok('select-all ticks every visible row', checked === 1, `${checked} ticked`);
  ok(
    'the bar reports the selection',
    (await page.locator('text=1 selected').count()) > 0
  );

  await page.selectOption('#contact-bulk-top', 'delete');
  await page.click('#contact-bulk-top ~ button');
  await page.waitForSelector('.wp-notice-success', { timeout: 60000 });

  ok(
    'bulk delete removed the contact',
    (await prisma.contact.count({ where: { email: MANUAL } })) === 0
  );

  /* ----------------------------- deleting a subscribed contact keeps the suppression record */

  const subscriber = await prisma.subscriber.create({
    data: {
      email: SUBBED,
      source: 'newsletter',
      consentText: 'Harness consent sentence.',
      unsubscribeToken: 'harness-token-' + Date.now().toString(36),
    },
  });

  const contact = await prisma.contact.create({
    data: { email: SUBBED, name: 'Subbed Probe', firstSource: 'newsletter sign-up' },
  });

  await prisma.subscriber.update({
    where: { id: subscriber.id },
    data: { contactId: contact.id },
  });

  await page.goto(BASE + `/admin/contacts/${contact.id}`, {
    waitUntil: 'networkidle',
    timeout: 90000,
  });
  ok('a subscribed contact shows as emailable', (await page.content()).includes('Consented to marketing email'));

  await page.click('button:has-text("Delete contact")', { noWaitAfter: true });

  /*
    Wait for the destination heading, not for a navigation. Deleting sends you back with
    router.push, which is a client-side transition — no `load` event ever fires, so waitForURL
    sits there until it times out even though the app did exactly the right thing.
  */
  await page.waitForSelector('h1:has-text("Contacts")', { timeout: 120000 });

  ok(
    'the contact is gone',
    (await prisma.contact.count({ where: { email: SUBBED } })) === 0
  );

  const survivor = await prisma.subscriber.findUnique({ where: { email: SUBBED } });
  ok('the consent record SURVIVES as suppression evidence', survivor !== null);
  ok(
    'and they are marked unsubscribed rather than left live',
    survivor?.status === 'UNSUBSCRIBED',
    survivor?.status
  );
  ok('the link to the deleted contact is cleared', survivor?.contactId === null);
} catch (error) {
  ok('suite ran without throwing', false, String(error).slice(0, 300));
} finally {
  await browser.close();
  await cleanup();
  await prisma.$disconnect();
}

console.log('');
if (fails.length) {
  console.log(`${fails.length} FAILED: ${fails.join(' | ')}`);
  process.exitCode = 1;
} else {
  console.log('All CRM admin checks passed.');
}
