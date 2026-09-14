import { chromium } from 'playwright-core';
import { PrismaClient } from '@prisma/client';

/*
  Live chat, end to end: a visitor, the agent, a person in the admin, and the database.

  What it proves, and why each one matters:

  - The agent answers in the same request, and the questions it must not engage with (dosing,
    "is this legit") get the fixed replies, not an improvisation.
  - A conversation is reachable ONLY through the cookie that started it. Another browser asking
    for messages gets nothing.
  - The cookie is httpOnly and scoped to /api/chat, so page script cannot read it and pages never
    send it.
  - Writing to Support puts the thread in the admin as waiting; a staff reply written in the real
    admin reaches the visitor's poll as a "staff" message that does not carry the admin's address.
  - Leaving an address links a Contact and records it on their timeline, and writes NO Subscriber.
  - The honeypot answers like a success and stores nothing.
  - The admin endpoints refuse a request without a session.

  Leaves the database as it found it.

    BASE=http://localhost:3210 node --env-file=.env .impeccable/chat-e2e.mjs
*/

const BASE = process.env.BASE ?? 'http://localhost:3000';
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (they live in .env). Run with: node --env-file=.env ' + process.argv[1]);
  process.exit(1);
}

const PROBE_EMAIL = `chat-probe-${Date.now()}@example.test`;
const REPLY = `Probe reply ${Date.now()}: yes, a person is here.`;

const prisma = new PrismaClient();
const fails = [];
const ok = (label, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!pass) fails.push(label);
};

/* A fresh address per client, so the suite never trips its own rate limiter. */
let ipCounter = Math.floor(Math.random() * 200);
const nextIp = () => `203.0.113.${(ipCounter++ % 250) + 1}`;

/** A minimal browser: remembers the chat cookie, sends it back. */
function visitor() {
  const ip = nextIp();
  let cookie = null;
  let setCookieHeader = null;
  const call = async (path, init = {}) => {
    const res = await fetch(BASE + path, {
      ...init,
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': ip,
        ...(cookie ? { cookie } : {}),
        ...(init.headers ?? {}),
      },
    });
    const raw = res.headers.get('set-cookie');
    if (raw && raw.startsWith('mra_chat=')) {
      setCookieHeader = raw;
      cookie = raw.split(';')[0];
    }
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  };
  return {
    send: (text, mode, extra = {}) =>
      call('/api/chat/visitor/message', { method: 'POST', body: JSON.stringify({ body: text, mode, path: '/shop?x=1', ...extra }) }),
    poll: (after) => call(`/api/chat/visitor/messages${after ? `?after=${encodeURIComponent(after)}` : ''}`),
    details: (email) => call('/api/chat/visitor/details', { method: 'POST', body: JSON.stringify({ email }) }),
    get cookie() {
      return cookie;
    },
    get setCookie() {
      return setCookieHeader;
    },
  };
}

const created = new Set();

async function conversationIdFor(v) {
  const res = await v.poll();
  const first = res.body?.messages?.[0];
  if (!first) return null;
  const row = await prisma.chatMessage.findUnique({ where: { id: first.id }, select: { conversationId: true } });
  return row?.conversationId ?? null;
}

async function cleanup() {
  if (created.size) await prisma.chatConversation.deleteMany({ where: { id: { in: [...created] } } });
  await prisma.contact.deleteMany({ where: { email: { startsWith: 'chat-probe-', endsWith: '@example.test' } } });
}

let browser;
try {
  /* ------------------------------------------------------------ anonymous */

  const stranger = visitor();
  const empty = await stranger.poll();
  ok('a browser that never chatted gets no messages', empty.status === 200 && empty.body?.messages?.length === 0);

  const unauth = await fetch(BASE + '/api/admin/chat');
  ok('the admin list refuses a request without a session', unauth.status === 401, `got ${unauth.status}`);

  /* ------------------------------------------------------------ agent mode */

  const a = visitor();
  const delivery = await a.send('Do you deliver to the United Kingdom?', 'agent');
  ok('an agent message is accepted', delivery.status === 201, `got ${delivery.status}`);
  const roles = delivery.body?.messages?.map((m) => m.role) ?? [];
  ok('the agent answers in the same request', roles.join(',') === 'visitor,bot', roles.join(','));
  ok('the agent reply is not empty', (delivery.body?.messages?.[1]?.body ?? '').length > 10);

  ok('the chat cookie is set', Boolean(a.cookie));
  ok('the chat cookie is httpOnly', /httponly/i.test(a.setCookie ?? ''));
  ok('the chat cookie is scoped to /api/chat', /path=\/api\/chat/i.test(a.setCookie ?? ''));

  const agentId = await conversationIdFor(a);
  if (agentId) created.add(agentId);
  const agentRow = agentId ? await prisma.chatConversation.findUnique({ where: { id: agentId } }) : null;
  ok('an agent-only conversation is not waiting on staff', agentRow?.status === 'AGENT', agentRow?.status);
  ok('the page is stored without its query string', agentRow?.path === '/shop', agentRow?.path);
  ok('no raw token is stored', agentRow && !Object.values(agentRow).some((v) => typeof v === 'string' && a.cookie?.includes(v) && v.length > 20));

  const dosing = await a.send('How much should I take per week?', 'agent');
  const dosingReply = dosing.body?.messages?.[1]?.body ?? '';
  ok('a dosing question gets the fixed refusal', /doctor/i.test(dosingReply) && !/\d+\s?mg/i.test(dosingReply), dosingReply.slice(0, 80));

  const legit = await a.send('is this really legit', 'agent');
  ok('"is this legit" is answered honestly', /demonstration/i.test(legit.body?.messages?.[1]?.body ?? ''));

  const other = visitor();
  const otherPoll = await other.poll();
  ok('another browser cannot see this conversation', otherPoll.body?.messages?.length === 0);

  const history = await a.poll();
  ok('the owner can read the whole thread back', (history.body?.messages?.length ?? 0) === 6, `${history.body?.messages?.length}`);
  const last = history.body?.messages?.at(-1)?.createdAt;
  const incremental = await a.poll(last);
  ok('polling after the newest message returns only that edge', (incremental.body?.messages?.length ?? 9) <= 1);

  /* ------------------------------------------------------------ honeypot */

  const before = await prisma.chatConversation.count();
  const bot = visitor();
  const trapped = await bot.send('buy cheap followers', 'support', { website: 'https://spam.example' });
  const after = await prisma.chatConversation.count();
  ok('the honeypot answers like a success', trapped.status === 201);
  ok('the honeypot stores nothing', after === before, `${before} → ${after}`);
  ok('the honeypot sets no cookie', !bot.cookie);

  /* ------------------------------------------------------------ support mode */

  const s = visitor();
  const detailsTooSoon = await s.details(PROBE_EMAIL);
  ok('details before any message are refused', detailsTooSoon.status === 400);

  const help = await s.send('I need a person to check something about my order please.', 'support');
  ok('a support message is accepted', help.status === 201);
  ok('support mode does not trigger the agent', (help.body?.messages ?? []).every((m) => m.role === 'visitor'));

  const supportId = await conversationIdFor(s);
  if (supportId) created.add(supportId);
  const supportRow = supportId ? await prisma.chatConversation.findUnique({ where: { id: supportId } }) : null;
  ok('a support conversation is waiting on staff', supportRow?.status === 'OPEN', supportRow?.status);

  const badEmail = await s.details('not-an-address');
  ok('a malformed address is refused', badEmail.status === 400);
  const goodEmail = await s.details(PROBE_EMAIL);
  ok('a valid address is accepted', goodEmail.status === 200, JSON.stringify(goodEmail.body));

  const linked = supportId ? await prisma.chatConversation.findUnique({ where: { id: supportId }, select: { contactId: true, email: true } }) : null;
  ok('the conversation is linked to a contact', Boolean(linked?.contactId));
  const activity = linked?.contactId
    ? await prisma.contactActivity.count({ where: { contactId: linked.contactId, type: 'CHAT_STARTED' } })
    : 0;
  ok('the contact timeline records the chat', activity === 1, `${activity}`);
  const subscriber = await prisma.subscriber.count({ where: { email: PROBE_EMAIL } });
  ok('leaving an address in the chat writes NO subscriber', subscriber === 0, `${subscriber}`);

  /* ------------------------------------------------------------ the admin */

  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  await page.goto(BASE + '/admin/login', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type=submit]', { noWaitAfter: true });
  await page.waitForURL(/\/admin(\?|$)/, { timeout: 120000 });

  ok('Live Chat is in the admin menu', (await page.locator('a[href="/admin/chat"]').count()) > 0);

  await page.goto(`${BASE}/admin/chat?c=${supportId}`, { waitUntil: 'networkidle', timeout: 90000 });
  ok('the waiting conversation opens in the inbox', await page.getByText('I need a person to check something').first().isVisible());
  ok('the inbox shows the address the visitor left', await page.getByText(PROBE_EMAIL).first().isVisible());

  await page.fill('#chat-reply', REPLY);
  await page.getByRole('button', { name: 'Send reply' }).click();
  /*
    Look for the reply in the thread, not anywhere on the page. React writes a controlled
    textarea's value into its text content, so a page-wide text search matches the draft still
    sitting in the box and passes before anything was sent.
  */
  const sentAt = Date.now();
  await page.locator('section[aria-label="Conversation"] [aria-live="polite"]').getByText(REPLY).waitFor({ timeout: 30000 });
  ok('the reply appears in the admin thread', true, `${Date.now() - sentAt}ms`);
  ok('the reply box clears once it has sent', (await page.inputValue('#chat-reply')) === '');

  const answered = await prisma.chatConversation.findUnique({ where: { id: supportId }, select: { status: true } });
  ok('replying marks the conversation answered', answered?.status === 'ANSWERED', answered?.status);

  const staffPoll = await s.poll();
  const staffMessage = staffPoll.body?.messages?.find((m) => m.role === 'staff');
  ok('the visitor receives the staff reply on their poll', staffMessage?.body === REPLY);
  ok('the visitor never sees the admin address', !JSON.stringify(staffPoll.body).includes(EMAIL));

  await page.getByRole('button', { name: 'Close', exact: true }).click();
  let closed = null;
  for (let i = 0; i < 20; i++) {
    closed = await prisma.chatConversation.findUnique({ where: { id: supportId }, select: { status: true } });
    if (closed?.status === 'CLOSED') break;
    await new Promise((r) => setTimeout(r, 500));
  }
  ok('Close closes the conversation', closed?.status === 'CLOSED', closed?.status);

  const reopenedByVisitor = await s.send('One more thing.', 'support');
  const reopened = await prisma.chatConversation.findUnique({ where: { id: supportId }, select: { status: true } });
  ok('a visitor writing to Support again reopens it', reopenedByVisitor.status === 201 && reopened?.status === 'OPEN', reopened?.status);
} catch (error) {
  ok('the suite threw', false, error instanceof Error ? error.message : String(error));
} finally {
  await browser?.close();
  try {
    await cleanup();
  } catch (error) {
    console.error('CLEANUP FAILED — probe rows may remain:', error instanceof Error ? error.message : error);
    fails.push('cleanup');
  }
  await prisma.$disconnect();
}

if (fails.length) {
  console.log(`\n${fails.length} failed:\n  - ${fails.join('\n  - ')}`);
  process.exit(1);
}
console.log('\nAll checks passed.');
