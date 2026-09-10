import { PrismaClient } from '@prisma/client';

/*
  Customer accounts, end to end over HTTP.

  The checks that matter here are the refusals, not the happy path. A sign-up form that works is
  table stakes; what costs you is the one that leaks who shops here, or hands out a session it
  should not, or quietly signs somebody up for email they never agreed to.

  Asserted:
  - registering creates a Customer AND links a CRM Contact, but writes NO Subscriber;
  - the password is never stored in the clear, and the hash is bcrypt;
  - a wrong password and an unknown address give the SAME sentence, so the form is not a
    membership oracle;
  - the session cookie is HttpOnly and SameSite=Lax;
  - a customer session cannot reach /admin — the JWT audiences differ, so the admin reader
    refuses it outright rather than merely failing a role check;
  - signing out clears the cookie;
  - a weak password is refused server-side, not merely by the form.

  Needs the app running (`npm start`). Leaves the database as it found it.

    node --env-file=.env .impeccable/account-e2e.mjs
*/

const BASE = process.env.BASE ?? 'http://localhost:3100';
const stamp = Date.now();
const EMAIL = `account-probe-${stamp}@example.test`;
const PASSWORD = 'a-long-enough-passphrase-9271';

const prisma = new PrismaClient();

const fails = [];
const ok = (label, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!pass) fails.push(label);
};

const post = (path, body, headers = {}) =>
  fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    redirect: 'manual',
  });

async function main() {
  /* ================================================================= weak password ======= */

  const weak = await post('/api/account/register', { email: EMAIL, password: 'short' });
  ok('a weak password is refused by the server', weak.status === 400, `status ${weak.status}`);
  ok(
    'nothing was written for the refused sign-up',
    (await prisma.customer.count({ where: { email: EMAIL } })) === 0
  );

  /* ==================================================================== registration ====== */

  const registered = await post('/api/account/register', {
    email: EMAIL,
    password: PASSWORD,
    name: 'Account Probe',
  });
  ok('registering succeeds', registered.status === 201, `status ${registered.status}`);

  const setCookie = registered.headers.get('set-cookie') ?? '';
  ok('registration returns a session cookie', /mranabolics_account=/.test(setCookie));
  ok('the session cookie is HttpOnly', /HttpOnly/i.test(setCookie), setCookie.slice(0, 90));
  ok('the session cookie is SameSite=Lax', /SameSite=Lax/i.test(setCookie));

  const customer = await prisma.customer.findUnique({
    where: { email: EMAIL },
    select: { id: true, passwordHash: true, contactId: true, sessionVersion: true },
  });
  ok('a Customer row exists', Boolean(customer));

  ok(
    'the password is not stored in the clear',
    Boolean(customer) && !customer.passwordHash.includes(PASSWORD)
  );
  ok(
    'the password is hashed with bcrypt',
    Boolean(customer) && /^\$2[aby]\$\d{2}\$/.test(customer.passwordHash),
    customer?.passwordHash.slice(0, 7)
  );

  ok('the account is linked to a CRM contact', Boolean(customer?.contactId));

  /* The rule the whole marketing design rests on. */
  const subscriber = await prisma.subscriber.findUnique({ where: { email: EMAIL } });
  ok('registering creates NO subscriber — an account is not consent', subscriber === null);

  const activity = customer?.contactId
    ? await prisma.contactActivity.findFirst({
        where: { contactId: customer.contactId, type: 'ACCOUNT_CREATED' },
        select: { summary: true },
      })
    : null;
  ok('the contact timeline records the account being opened', Boolean(activity), activity?.summary);

  /* ======================================================== duplicate registration ======= */

  const duplicate = await post('/api/account/register', { email: EMAIL, password: PASSWORD });
  ok('a duplicate address cannot open a second account', duplicate.status === 400);
  ok(
    'still exactly one account for that address',
    (await prisma.customer.count({ where: { email: EMAIL } })) === 1
  );

  /* ============================================================== the membership oracle == */

  const wrongPassword = await post('/api/account/login', {
    email: EMAIL,
    password: 'definitely-not-the-password',
  });
  const unknownAddress = await post('/api/account/login', {
    email: `nobody-${stamp}@example.test`,
    password: 'definitely-not-the-password',
  });

  const wrongBody = await wrongPassword.json().catch(() => ({}));
  const unknownBody = await unknownAddress.json().catch(() => ({}));

  ok('a wrong password is refused', wrongPassword.status === 401);
  ok('an unknown address is refused', unknownAddress.status === 401);
  ok(
    'both refusals are the SAME sentence, so the form is not a membership oracle',
    wrongBody.error === unknownBody.error,
    `${wrongBody.error} / ${unknownBody.error}`
  );

  /* ======================================================================= sign in ======== */

  const signedIn = await post('/api/account/login', { email: EMAIL, password: PASSWORD });
  ok('correct credentials sign in', signedIn.status === 200, `status ${signedIn.status}`);

  const sessionCookie = (signedIn.headers.get('set-cookie') ?? '')
    .split(';')[0];
  ok('sign-in returns a session cookie', /mranabolics_account=/.test(sessionCookie));

  /* =============================================== the boundary that matters most ======== */

  const adminAttempt = await fetch(`${BASE}/admin`, {
    headers: { cookie: sessionCookie },
    redirect: 'manual',
  });
  const reachedAdmin = adminAttempt.status === 200;
  ok(
    'a customer session cannot reach /admin',
    !reachedAdmin,
    `status ${adminAttempt.status}${adminAttempt.headers.get('location') ? ' -> ' + adminAttempt.headers.get('location') : ''}`
  );

  /* The account page, on the other hand, must accept it. */
  const accountPage = await fetch(`${BASE}/account`, {
    headers: { cookie: sessionCookie },
    redirect: 'manual',
  });
  ok('the same session reaches /account', accountPage.status === 200, `status ${accountPage.status}`);

  /* ====================================================================== sign out ======== */

  const signedOut = await post('/api/account/logout', {}, { cookie: sessionCookie });
  const cleared = signedOut.headers.get('set-cookie') ?? '';
  ok('signing out clears the cookie', /mranabolics_account=;|mranabolics_account=""/.test(cleared) || /Max-Age=0/i.test(cleared), cleared.slice(0, 90));

  /* Sign-out is POST-only: a GET that destroys a session gets fired by link scanners. */
  const getLogout = await fetch(`${BASE}/api/account/logout`, { method: 'GET', redirect: 'manual' });
  ok('GET cannot sign somebody out', getLogout.status === 405, `status ${getLogout.status}`);
}

async function cleanup() {
  await prisma.customer.deleteMany({ where: { email: { endsWith: '@example.test' } } }).catch(() => {});
  await prisma.contact.deleteMany({ where: { email: { endsWith: '@example.test' } } }).catch(() => {});
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
