import { PrismaClient } from '@prisma/client';

/*
  Prove the CRM's central claim: writing in is not subscribing.

  The valuable checks here are the negative ones. It is easy to build a contact form that works;
  what is easy to get wrong — and invisible once wrong — is a form that quietly adds everyone
  who uses it to a mailing list. That is the mistake that costs a sending domain its reputation
  and breaks GDPR/PECR at the same time, so it is asserted directly rather than assumed.

  Also asserted: the refusals (unknown subject, too-short message, bad address), the honeypot
  answering exactly like a success, and the rate limiter.

  Cleans up after itself — every row it creates is removed at the end.

    node --env-file=.env .impeccable/crm-e2e.mjs
*/

const BASE = process.env.BASE ?? 'http://localhost:3000';
const prisma = new PrismaClient();
const fails = [];
const ok = (label, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!pass) fails.push(label);
};

const EMAIL = 'probe-enquiry@example.test';
const SPAM_EMAIL = 'probe-spam@example.test';

/* Each call gets its own bucket, so the suite never trips its own limiter. See marketing-e2e. */
let bucket = 0;
const post = (body, ip) =>
  fetch(`${BASE}/api/enquiry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip ?? `198.51.100.${(bucket += 1)}`,
    },
    body: JSON.stringify(body),
  });

const valid = (over = {}) => ({
  name: 'Probe Person',
  email: EMAIL,
  subject: 'A batch certificate',
  message: 'This is a probe message long enough to pass the minimum length rule.',
  path: '/contact',
  ...over,
});

async function cleanup() {
  const emails = [EMAIL, SPAM_EMAIL];
  await prisma.enquiry.deleteMany({ where: { email: { in: emails } } });
  /* Activities and notes cascade from the contact. */
  await prisma.contact.deleteMany({ where: { email: { in: emails } } });
  await prisma.subscriber.deleteMany({ where: { email: { in: emails } } });
}

try {
  await cleanup();

  /* ---------------------------------------------------------------- refusals */

  const noSubject = await post(valid({ subject: 'Something I invented' }));
  ok('unknown subject is refused', noSubject.status === 400, `got ${noSubject.status}`);

  const shortMessage = await post(valid({ message: 'hi' }));
  ok('too-short message is refused', shortMessage.status === 400, `got ${shortMessage.status}`);

  const badEmail = await post(valid({ email: 'not-an-address' }));
  ok('malformed address is refused', badEmail.status === 400, `got ${badEmail.status}`);

  const noName = await post(valid({ name: '   ' }));
  ok('missing name is refused', noName.status === 400, `got ${noName.status}`);

  /* ------------------------------------------------------------- the honeypot */

  const trapped = await post(valid({ email: SPAM_EMAIL, company: 'Acme Bots Ltd' }));
  ok('honeypot answers like a success', trapped.status === 201, `got ${trapped.status}`);

  const spamRow = await prisma.enquiry.findFirst({ where: { email: SPAM_EMAIL } });
  ok('honeypot submission stored nothing', spamRow === null);

  /* ----------------------------------------------------------- the happy path */

  const sent = await post(valid());
  ok('valid enquiry accepted', sent.status === 201, `got ${sent.status}`);

  const enquiry = await prisma.enquiry.findFirst({
    where: { email: EMAIL },
    include: { contact: { include: { activities: true, subscriber: true } } },
  });

  ok('enquiry row created', enquiry !== null);
  ok('enquiry starts NEW', enquiry?.status === 'NEW', enquiry?.status);
  ok('enquiry is attached to a contact', Boolean(enquiry?.contact));
  ok('contact carries the name given', enquiry?.contact?.name === 'Probe Person');
  ok(
    'contact records where it came from',
    enquiry?.contact?.firstSource === 'contact form',
    enquiry?.contact?.firstSource
  );

  /*
    THE POINT OF THIS FILE.

    An enquiry must leave the subscriber table untouched. If this ever fails, the contact form
    has become a silent opt-in and every person who used it is on a mailing list they never
    agreed to join.
  */
  ok('enquiry created NO marketing consent', enquiry?.contact?.subscriber == null);

  const subscriberRow = await prisma.subscriber.findUnique({ where: { email: EMAIL } });
  ok('no subscriber row exists for the enquirer', subscriberRow === null);

  const types = (enquiry?.contact?.activities ?? []).map((a) => a.type);
  ok('timeline records the contact being created', types.includes('CONTACT_CREATED'));
  ok('timeline records the enquiry', types.includes('ENQUIRY_RECEIVED'));
  ok('timeline records no consent event', !types.includes('SUBSCRIBED'), types.join(','));

  /* ------------------------------------------- a second message reuses the person */

  await post(valid({ subject: 'Returns', message: 'A second message from the same person.' }));

  const contacts = await prisma.contact.findMany({ where: { email: EMAIL } });
  ok('a second enquiry does not create a second contact', contacts.length === 1, `${contacts.length}`);

  const enquiryCount = await prisma.enquiry.count({ where: { email: EMAIL } });
  ok('both messages are kept', enquiryCount === 2, `${enquiryCount}`);

  /* ------------------------------------------------------------ the rate limiter */

  const LIMIT_IP = '198.51.100.250';
  let limited = false;
  for (let i = 0; i < 7; i += 1) {
    const response = await post(valid({ message: `Rate limit probe number ${i} of seven.` }), LIMIT_IP);
    if (response.status === 429) limited = true;
  }
  ok('repeated posts from one address are rate limited', limited);
} catch (error) {
  ok('suite ran without throwing', false, String(error));
} finally {
  await cleanup();
  await prisma.$disconnect();
}

console.log('');
if (fails.length) {
  console.log(`${fails.length} FAILED: ${fails.join(' | ')}`);
  process.exitCode = 1;
} else {
  console.log('All CRM checks passed.');
}
