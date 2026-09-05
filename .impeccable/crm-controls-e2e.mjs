import { chromium } from 'playwright-core';
import { PrismaClient } from '@prisma/client';

/*
  Exercise every interactive control in the CRM admin, one at a time, and check the database
  after each one.

  This is deliberately not a happy-path walkthrough. Each control gets its own assertion so a
  failure names the exact widget rather than "the admin is broken" — and every check reads the
  row back, because the failure mode that matters here is a control that LOOKS like it worked.
  That is not hypothetical: these screens shipped once with <form action={clientFn}>, which on
  React 18 does nothing at all while the button still goes through its busy state.

  Leaves the database as it found it.

    node --env-file=.env .impeccable/crm-controls-e2e.mjs
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

const DOMAIN = '@ctrl.test';
const prisma = new PrismaClient();

const fails = [];
const ok = (label, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!pass) fails.push(label);
};

async function cleanup() {
  await prisma.enquiry.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  await prisma.contact.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  await prisma.subscriber.deleteMany({ where: { email: { endsWith: DOMAIN } } });
}

/* A tag the seeded rows share, so one search isolates them from real data. */
const MARK = 'ctrlprobe';

async function seedContacts(n) {
  const made = [];
  for (let i = 0; i < n; i += 1) {
    made.push(
      await prisma.contact.create({
        data: {
          email: `ctrl-${i}${DOMAIN}`,
          name: `Ctrl Probe ${i}`,
          firstSource: 'contact form',
          tags: [MARK],
          activities: { create: { type: 'CONTACT_CREATED', summary: 'Seeded by the harness.' } },
        },
        select: { id: true, email: true },
      })
    );
  }
  return made;
}

const listUrl = `${BASE}/admin/contacts?q=${MARK}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

const dialogs = [];
page.on('dialog', (d) => {
  dialogs.push(d.message());
  d.accept();
});

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

/** Wait for a notice of a given kind to appear. */
async function waitForNotice(kind = 'success', timeout = 45000) {
  try {
    await page.waitForSelector(`.wp-notice-${kind}`, { timeout });
    return true;
  } catch {
    return false;
  }
}

/*
  Poll the database until the write lands.

  This is how every "did it actually save" assertion below works, and it replaced waiting on a
  success notice. Each control on the contact screen owns its own notice component, so a
  page-wide .wp-notice-success selector matches the PREVIOUS control's notice, which is still
  sitting there — the wait returns instantly and the database check races ahead of the write
  that was still in flight. That produced a run where "adding a tag" failed and "removing a tag"
  then reported the tag present, which is not a state the application can actually be in.
*/
async function waitForDb(check, timeout = 25000) {
  const started = Date.now();
  for (;;) {
    try {
      if (await check()) return true;
    } catch {
      /* a cold Neon endpoint can refuse the first connection; keep trying until the deadline */
    }
    if (Date.now() - started > timeout) return false;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

try {
  await cleanup();

  await page.goto(BASE + '/admin/login', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type=submit]', { noWaitAfter: true });
  await page.waitForURL(/\/admin(\?|$)/, { timeout: 120000 });
  ok('sign in reaches the dashboard', /\/admin$/.test(new URL(page.url()).pathname));

  /* ================================================== contacts list: selection ============ */

  await seedContacts(4);
  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 90000 });

  const rowCount = await page.locator('tbody tr').count();
  ok('search isolates the seeded rows', rowCount === 4, `${rowCount} rows`);

  /* select one */
  await page.locator('tbody input[type=checkbox]').first().check();
  ok(
    'ticking one row selects exactly one',
    (await page.locator('tbody input[type=checkbox]:checked').count()) === 1
  );
  ok('the bar reports "1 selected"', (await page.locator('text=1 selected').count()) > 0);

  /* header checkbox should now be indeterminate, not checked */
  const headerBox = page.locator('thead input[type=checkbox]').first();
  const indeterminate = await headerBox.evaluate((el) => el.indeterminate);
  ok('header checkbox shows the partial state', indeterminate === true);

  /* select all */
  await headerBox.check();
  ok(
    'select-all ticks every visible row',
    (await page.locator('tbody input[type=checkbox]:checked').count()) === 4
  );
  ok('the bar reports "4 selected"', (await page.locator('text=4 selected').count()) > 0);

  /* unselect all */
  await headerBox.uncheck();
  ok(
    'select-all again clears the selection',
    (await page.locator('tbody input[type=checkbox]:checked').count()) === 0
  );

  /* ================================================== guard rails on Apply =============== */

  await page.selectOption('#contact-bulk-top', '');
  await page.locator('#contact-bulk-top').locator('xpath=following-sibling::button[1]').click();
  ok('Apply with no action chosen warns', await waitForNotice('error', 15000));

  await page.selectOption('#contact-bulk-top', 'stage-ENGAGED');
  await page.locator('#contact-bulk-top').locator('xpath=following-sibling::button[1]').click();
  ok('Apply with nothing selected warns', await waitForNotice('error', 15000));

  /* ================================================== bulk stage change ================== */

  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('thead input[type=checkbox]').first().check();
  await page.selectOption('#contact-bulk-top', 'stage-QUALIFIED');
  await page.locator('#contact-bulk-top').locator('xpath=following-sibling::button[1]').click();
  ok('bulk stage change reports success', await waitForNotice('success'));

  const qualified = await prisma.contact.count({
    where: { email: { endsWith: DOMAIN }, stage: 'QUALIFIED' },
  });
  ok('bulk stage change actually wrote', qualified === 4, `${qualified}/4 moved`);

  const stageActivity = await prisma.contactActivity.count({
    where: { type: 'STAGE_CHANGED', contact: { email: { endsWith: DOMAIN } } },
  });
  ok('and each move is on the timeline', stageActivity === 4, `${stageActivity} entries`);

  /* ================================================== row delete ========================= */

  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 90000 });
  const before = await prisma.contact.count({ where: { email: { endsWith: DOMAIN } } });

  dialogs.length = 0;
  await page.locator('tbody tr').first().hover();
  await page.locator('tbody button:has-text("Delete")').first().click();
  ok('row delete asks first', dialogs.length === 1, dialogs[0]?.slice(0, 60));
  ok('row delete reports success', await waitForNotice('success'));

  const afterRow = await prisma.contact.count({ where: { email: { endsWith: DOMAIN } } });
  ok('row delete removed exactly one', afterRow === before - 1, `${before} -> ${afterRow}`);

  /* ================================================== bulk delete ======================== */

  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 90000 });
  dialogs.length = 0;
  await page.locator('thead input[type=checkbox]').first().check();
  await page.selectOption('#contact-bulk-top', 'delete');
  await page.locator('#contact-bulk-top').locator('xpath=following-sibling::button[1]').click();
  ok('bulk delete asks first', dialogs.length === 1);
  ok(
    'the confirmation names what goes with them',
    (dialogs[0] ?? '').includes('enquiries, notes and activity')
  );
  ok('bulk delete reports success', await waitForNotice('success'));

  const afterBulk = await prisma.contact.count({ where: { email: { endsWith: DOMAIN } } });
  ok('bulk delete cleared the rest', afterBulk === 0, `${afterBulk} left`);

  /* ================================================== contact detail controls ============ */

  const [subject] = await seedContacts(1);
  await page.goto(`${BASE}/admin/contacts/${subject.id}`, {
    waitUntil: 'networkidle',
    timeout: 90000,
  });

  /* stage picker */
  await page.selectOption('#contact-stage', 'ENGAGED');
  ok(
    'stage picker wrote to the row',
    await waitForDb(
      async () =>
        (await prisma.contact.findUnique({ where: { id: subject.id }, select: { stage: true } }))
          ?.stage === 'ENGAGED'
    )
  );

  /*
    Scope to the tag form. A has-text("Add") locator also matches "Add note" — substring
    matching, and the note button happens to come first in the DOM.
  */
  await page.fill('#tag-input', 'Wholesale');
  await page.locator('form:has(#tag-input) button[type=submit]').click();
  ok(
    'adding a tag wrote it, lower-cased',
    await waitForDb(async () => {
      const c = await prisma.contact.findUnique({
        where: { id: subject.id },
        select: { tags: true },
      });
      return Boolean(c?.tags.includes('wholesale'));
    })
  );

  /* tag remove */
  await page.click('button[aria-label="Remove tag wholesale"]');
  ok(
    'removing a tag wrote it',
    await waitForDb(async () => {
      const c = await prisma.contact.findUnique({
        where: { id: subject.id },
        select: { tags: true },
      });
      return Boolean(c && !c.tags.includes('wholesale'));
    })
  );

  /* details form */
  await page.fill('#contact-name', 'Renamed Probe');
  await page.fill('#contact-phone', '+44 7700 900000');
  await page.click('button:has-text("Save details")');
  ok(
    'details form wrote the name and phone',
    await waitForDb(async () => {
      const c = await prisma.contact.findUnique({
        where: { id: subject.id },
        select: { name: true, phone: true },
      });
      return c?.name === 'Renamed Probe' && c?.phone === '+44 7700 900000';
    })
  );

  /* note */
  await page.fill('#note-body', 'Rang about a batch certificate.');
  await page.click('button:has-text("Add note")');
  ok(
    'the note was written',
    await waitForDb(
      async () => (await prisma.contactNote.count({ where: { contactId: subject.id } })) === 1
    )
  );
  ok(
    'and it is on the timeline',
    await waitForDb(
      async () =>
        (await prisma.contactActivity.count({
          where: { contactId: subject.id, type: 'NOTE_ADDED' },
        })) === 1
    )
  );

  /* delete from the detail screen */
  dialogs.length = 0;
  await page.click('button:has-text("Delete contact")', { noWaitAfter: true });
  await page.waitForSelector('h1:has-text("Contacts")', { timeout: 90000 });
  ok('detail delete asks first', dialogs.length === 1);
  ok(
    'detail delete removed the contact',
    (await prisma.contact.count({ where: { id: subject.id } })) === 0
  );

  /* ================================================== enquiries screen =================== */

  const withMessages = await prisma.contact.create({
    data: {
      email: `ctrl-enq${DOMAIN}`,
      name: 'Enquiry Probe',
      firstSource: 'contact form',
      enquiries: {
        create: [
          { name: 'Enquiry Probe', email: `ctrl-enq${DOMAIN}`, subject: 'Returns', message: 'First probe message, long enough.' },
          { name: 'Enquiry Probe', email: `ctrl-enq${DOMAIN}`, subject: 'Returns', message: 'Second probe message, long enough.' },
        ],
      },
    },
    select: { id: true },
  });

  await page.goto(`${BASE}/admin/enquiries?filter=open&q=Enquiry+Probe`, {
    waitUntil: 'networkidle',
    timeout: 90000,
  });
  ok('enquiries search finds the probes', (await page.locator('tbody tr').count()) === 2);

  /* status picker */
  const firstStatus = page.locator('tbody select').first();
  await firstStatus.selectOption('ANSWERED');
  ok(
    'status picker wrote the new status',
    await waitForDb(
      async () =>
        (await prisma.enquiry.count({
          where: { contactId: withMessages.id, status: 'ANSWERED' },
        })) === 1
    )
  );

  const stamped = await prisma.enquiry.findFirst({
    where: { contactId: withMessages.id, status: 'ANSWERED' },
    select: { handledAt: true, handledBy: true },
  });
  ok('answering stamps who and when', stamped?.handledAt != null && stamped?.handledBy === EMAIL);

  /* select-all + bulk delete on enquiries */
  await page.goto(`${BASE}/admin/enquiries?filter=all&q=Enquiry+Probe`, {
    waitUntil: 'networkidle',
    timeout: 90000,
  });
  await page.locator('thead input[type=checkbox]').first().check();
  ok(
    'enquiries select-all ticks both rows',
    (await page.locator('tbody input[type=checkbox]:checked').count()) === 2
  );

  dialogs.length = 0;
  await page.selectOption('#enquiry-bulk-top', 'delete');
  await page.locator('#enquiry-bulk-top').locator('xpath=following-sibling::button[1]').click();
  ok('enquiry bulk delete asks first', dialogs.length === 1);
  ok('enquiry bulk delete reports success', await waitForNotice('success'));
  ok(
    'the messages are gone',
    (await prisma.enquiry.count({ where: { contactId: withMessages.id } })) === 0
  );
  ok(
    'but the person is kept',
    (await prisma.contact.count({ where: { id: withMessages.id } })) === 1
  );

  /* ================================================== add contact form ================== */

  await page.goto(BASE + '/admin/contacts/new', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('#email', `ctrl-new${DOMAIN}`);
  await page.fill('#name', 'Added By Hand');
  await page.click('button[type=submit]', { noWaitAfter: true });
  await page.waitForSelector('h1:has-text("Added By Hand")', { timeout: 90000 });
  ok('add form creates the contact', true);
  ok(
    'and writes no marketing consent',
    (await prisma.subscriber.count({ where: { email: `ctrl-new${DOMAIN}` } })) === 0
  );

  /* ================================================== dashboard ========================= */

  await page.goto(BASE + '/admin', { waitUntil: 'networkidle', timeout: 90000 });
  const contactCount = await prisma.contact.count();
  const glance = await page.locator('.wp-glance').innerText();
  ok(
    'dashboard glance shows the live contact count',
    glance.includes(String(contactCount)),
    glance.replace(/\s+/g, ' ').slice(0, 90)
  );

  ok('no uncaught client errors during the run', pageErrors.length === 0, pageErrors.join(' | '));
} catch (error) {
  ok('suite ran without throwing', false, String(error).slice(0, 400));
} finally {
  await browser.close();
  await cleanup();
  await prisma.$disconnect();
}

console.log('');
if (fails.length) {
  console.log(`${fails.length} FAILED:`);
  for (const f of fails) console.log(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log('Every CRM control passed.');
}
