import { renderBasketReminderHTML, basketReminderSubject } from '@/lib/email/basket-reminder';

/*
  The automated emails, as table-based HTML (what mail clients render reliably).

  A plain module, no server imports: the jobs render with it, and so do the unit tests that pin
  each template's VERSION. The version is a hash of the template rendered with fixed sample data,
  so any change to wording or layout changes it, and a job whose template changed since the
  owner approved it stops sending until he approves again (lib/automation/run.ts).

  Editorial rules hold here as everywhere: no dosing, cycles, protocols, effect or performance
  claims; no reviews or testimonials; no "was" prices. Marketing emails name no product from the
  excluded list (lib/automation/jobs.ts) and do not mention the minimum order. The postal address
  and the unsubscribe link of a marketing email are added by the sender, never by hand.
*/

export const SITE_URL = 'https://www.mrsanabolics.com';
const LOGO = `${SITE_URL}/apple-icon.png`;
const WHATSAPP = 'https://wa.me/19143137729';
const TELEGRAM = 'https://t.me/mrsanabolics';

const money = (n: number) => `$${n.toFixed(2)}`;
export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const utm = (url: string, campaign: string) =>
  `${url}${url.includes('?') ? '&' : '?'}utm_source=email&utm_medium=email&utm_campaign=${campaign}`;

const FONT = 'font-family:Arial,Helvetica,sans-serif;';

/** The shared frame: logo, white card, footer line. `body` is rows of the card's table. */
function frame(opts: { title: string; preheader: string; body: string; footer: string }): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(opts.title)}</title></head>
<body style="margin:0; padding:0; background:#efece4;">
<div style="display:none; max-height:0; overflow:hidden; opacity:0;">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efece4;"><tr><td align="center" style="padding:20px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">
  <tr><td align="center" style="padding:6px 0 14px 0;">
    <a href="${SITE_URL}" style="text-decoration:none;"><img src="${LOGO}" width="56" height="56" alt="MrsAnabolics" style="display:inline-block; border-radius:28px; vertical-align:middle;"><span style="${FONT} font-size:20px; font-weight:bold; color:#16181f; vertical-align:middle; padding-left:10px;">MrsAnabolics</span></a>
  </td></tr>
  <tr><td style="background:#ffffff; border-radius:8px; padding:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${opts.body}</table>
  </td></tr>
  <tr><td align="center" style="padding:20px 20px 10px 20px; ${FONT} font-size:12px; line-height:1.6; color:#8a877e;">${opts.footer}</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (html: string, style = '') =>
  `<p style="margin:0 0 14px 0; ${FONT} font-size:15px; line-height:1.65; color:#33312c; ${style}">${html}</p>`;
const row = (html: string, padding = '0 28px') => `<tr><td style="padding:${padding};">${html}</td></tr>`;
const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block; background:#2a3f8f; color:#ffffff; ${FONT} font-size:16px; font-weight:bold; text-decoration:none; padding:14px 30px; border-radius:30px;">${esc(label)}</a>`;
const heading = (text: string) =>
  `<h1 style="margin:0 0 14px 0; ${FONT} font-size:24px; line-height:1.25; color:#16181f;">${esc(text)}</h1>`;

const helpLine = `Questions? Reply to this email, or message us on <a href="${WHATSAPP}" style="color:#2a3f8f;">WhatsApp</a> (+1 914 313 7729) or <a href="${TELEGRAM}" style="color:#2a3f8f;">Telegram</a>. Support answers 24 hours a day.`;

/* ------------------------------------------------------- unpaid order reminder */

export type UnpaidReminderInput = {
  step: 1 | 2;
  firstName: string;
  reference: string;
  placedAt: Date;
  items: { name: string; quantity: number; lineTotal: number }[];
  subtotal: number;
  discountLabel: string | null;
  discountTotal: number;
  shipping: number;
  total: number;
  method: 'crypto' | 'cashapp' | 'bank_transfer';
  /** The order's payment page (crypto, Cash App). Null for bank transfer. */
  payUrl: string | null;
  cashApp: { tag: string; name: string | null } | null;
};

export function unpaidReminderEmail(input: UnpaidReminderInput): { subject: string; html: string } {
  const subject =
    input.step === 1
      ? `Your order ${input.reference} is waiting for payment`
      : `Still waiting: payment for order ${input.reference}`;
  const placed = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', timeZone: 'America/New_York' }).format(
    input.placedAt
  );
  const hi = input.firstName ? `Hi ${esc(input.firstName)},` : 'Hello,';

  const lines = input.items
    .map(
      (i) => `<tr>
        <td style="padding:8px 0; border-bottom:1px solid #eee; ${FONT} font-size:14px; color:#16181f;">${esc(i.name)} <span style="color:#8a877e;">× ${i.quantity}</span></td>
        <td align="right" style="padding:8px 0; border-bottom:1px solid #eee; ${FONT} font-size:14px; color:#16181f; white-space:nowrap;">${money(i.lineTotal)}</td>
      </tr>`
    )
    .join('');
  const sum = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:6px 0; ${FONT} font-size:${strong ? 16 : 14}px; color:${strong ? '#16181f' : '#5c5a54'};${strong ? ' font-weight:bold;' : ''}">${esc(label)}</td><td align="right" style="padding:6px 0; ${FONT} font-size:${strong ? 16 : 14}px; color:#16181f;${strong ? ' font-weight:bold;' : ''}">${value}</td></tr>`;
  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px 0;">${lines}
    ${sum('Subtotal', money(input.subtotal))}
    ${input.discountTotal > 0 && input.discountLabel ? sum(input.discountLabel, `-${money(input.discountTotal)}`) : ''}
    ${sum('Shipping', input.shipping === 0 ? 'Free' : money(input.shipping))}
    ${sum('Total to pay', money(input.total), true)}
  </table>`;

  let how = '';
  if (input.method === 'crypto') {
    how = p(
      'You chose to pay with cryptocurrency. Your payment page shows the exact amount and the address to send it to.'
    );
  } else if (input.method === 'cashapp') {
    how = p(
      `You chose Cash App. Send exactly <strong>${money(input.total)}</strong>${
        input.cashApp ? ` to <strong>${esc(input.cashApp.tag)}</strong>${input.cashApp.name ? ` (the account shows as ${esc(input.cashApp.name)})` : ''}` : ''
      } with <strong>${esc(input.reference)}</strong> in the note, then upload a screenshot of the payment on your payment page so we can match it to your order.`
    );
  } else {
    how = p('You chose to pay by bank transfer. If you need the payment details again, reply to this email and we will send them.');
  }

  const body = [
    row(heading(input.step === 1 ? 'Your order is waiting for payment' : 'Your order is still waiting for payment'), '30px 28px 0 28px'),
    row(
      p(`${hi}<br><br>We have your order <strong>${esc(input.reference)}</strong> from ${placed}, but its payment has not reached us yet, so it has not been sent.`)
    ),
    row(table),
    row(how),
    input.payUrl ? row(`<div style="text-align:center; padding:4px 0 22px 0;">${button(input.payUrl, 'Open my payment page')}</div>`) : '',
    row(
      p(
        'Already paid? Then there is nothing to do: we confirm an order as soon as its payment arrives' +
          (input.method === 'cashapp' ? ', and a Cash App payment as soon as we have its screenshot' : '') +
          '. Changed your mind? Reply to this email and we will cancel the order.'
      )
    ),
    input.step === 2 ? row(p('This is the last reminder we will send about this order.', 'color:#5c5a54;')) : '',
    row(p(helpLine, 'font-size:13px; color:#5c5a54;'), '4px 28px 26px 28px'),
  ].join('');

  return {
    subject,
    html: frame({
      title: subject,
      preheader: `Order ${input.reference}: ${money(input.total)} to pay.`,
      body,
      footer: `You are receiving this because you placed order ${esc(input.reference)} at <a href="${SITE_URL}" style="color:#8a877e;">www.mrsanabolics.com</a>. It is about your order, not marketing.<br>MrsAnabolics · support@mrsanabolics.com`,
    }),
  };
}

/* ------------------------------------------------------------ welcome 2 and 3 */

/** The unsubscribe link is filled in by the sender with the subscriber's own token. */
export const UNSUBSCRIBE_PLACEHOLDER = '{{unsubscribe_url}}';

const marketingFooter = (why: string) =>
  `${why}<br><a href="${UNSUBSCRIBE_PLACEHOLDER}" style="color:#8a877e;">Unsubscribe</a> · MrsAnabolics · www.mrsanabolics.com`;

export function welcomeEmail2(): { subject: string; html: string } {
  const subject = 'Three checks before you trust a product';
  const check = (n: number, title: string, text: string) =>
    `<tr><td style="padding:0 28px 16px 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="34" valign="top" style="${FONT} font-size:20px; font-weight:bold; color:#2a3f8f;">${n}</td>
      <td style="${FONT}"><div style="font-size:16px; font-weight:bold; color:#16181f; margin-bottom:4px;">${esc(title)}</div><div style="font-size:15px; line-height:1.6; color:#33312c;">${text}</div></td>
    </tr></table></td></tr>`;
  const body = [
    row(heading(subject), '30px 28px 0 28px'),
    row(p('Whoever you buy from, these three checks tell you more than any promise on a website.')),
    check(
      1,
      'Match the batch',
      'The certificate of analysis for your batch comes with your order. The batch number on it should match the one printed on the pack in your hand. If it does not, the certificate describes a different product.'
    ),
    check(
      2,
      'Read the certificate properly',
      `A certificate is only worth the laboratory that signed it and the batch it names. <a href="${utm(`${SITE_URL}/blog/how-to-read-a-certificate-of-analysis`, 'welcome-2')}" style="color:#2a3f8f;">Our guide to reading a certificate of analysis</a> goes through it line by line.`
    ),
    check(
      3,
      'Look hard at the pack',
      `Print, seals, batch number and expiry date tell you a lot. <a href="${utm(`${SITE_URL}/blog/how-to-spot-counterfeit-steroids`, 'welcome-2')}" style="color:#2a3f8f;">How to spot counterfeit steroids</a> shows what to look for.`
    ),
    row(
      `<div style="text-align:center; padding:8px 0 28px 0;">${button(utm(`${SITE_URL}/blog`, 'welcome-2'), 'Read the guides')}</div>`
    ),
  ].join('');
  return {
    subject,
    html: frame({
      title: subject,
      preheader: 'Match the batch, read the certificate, look at the pack.',
      body,
      footer: marketingFooter("You're receiving this because you subscribed at www.mrsanabolics.com. This is the second of three welcome emails."),
    }),
  };
}

export type WelcomeOffer = { code: string; headline: string; condition: string };

export function welcomeEmail3(offer: WelcomeOffer | null): { subject: string; html: string } {
  const subject = offer ? `${offer.headline} your next order, and how the shop works` : 'How the shop works';
  const point = (title: string, text: string) =>
    `<tr><td style="padding:0 28px 14px 28px; ${FONT}"><div style="font-size:16px; font-weight:bold; color:#16181f; margin-bottom:3px;">${esc(title)}</div><div style="font-size:15px; line-height:1.6; color:#33312c;">${text}</div></td></tr>`;
  const offerRow = offer
    ? `<tr><td style="background:#16181f; padding:24px 28px; ${FONT}" align="center">
        <div style="font-size:12px; letter-spacing:3px; text-transform:uppercase; color:#e0b44a;">For subscribers</div>
        <div style="font-size:34px; line-height:1.1; font-weight:bold; color:#ffffff; margin-top:6px;">${esc(offer.headline.toUpperCase())}</div>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px auto 0 auto;"><tr>
          <td style="border:2px dashed #e0b44a; border-radius:6px; padding:10px 22px; font-family:'Courier New',monospace; font-size:22px; font-weight:bold; letter-spacing:4px; color:#ffffff;">${esc(offer.code)}</td>
        </tr></table>
        <div style="font-size:13px; color:#a9a59b; margin-top:10px;">Enter it at checkout${offer.condition ? `, ${esc(offer.condition)}` : ''}. One discount per order.</div>
      </td></tr>`
    : '';
  const body = [
    row(heading('How the shop works'), '30px 28px 0 28px'),
    row(p('A short map, so you can find what you came for.')),
    point(
      'By compound, then by maker',
      `Every compound has its own page listing each manufacturer’s version side by side, by strength, form and price. <a href="${utm(`${SITE_URL}/shop`, 'welcome-3')}" style="color:#2a3f8f;">Start from the shop</a>.`
    ),
    point(
      'What comes with every order',
      'Tracked, insured delivery in plain, unmarked packaging, and the certificate of analysis for your batch.'
    ),
    point('Help when you want it', helpLine),
    offerRow,
    row(
      `<div style="text-align:center; padding:24px 0 28px 0;">${button(utm(`${SITE_URL}/shop`, 'welcome-3'), 'Go to the shop')}</div>`
    ),
  ].join('');
  return {
    subject,
    html: frame({
      title: subject,
      preheader: offer ? `${offer.headline} with ${offer.code}.` : 'Compound pages, delivery and help.',
      body,
      footer: marketingFooter("You're receiving this because you subscribed at www.mrsanabolics.com. This is the last of three welcome emails."),
    }),
  };
}

/* ------------------------------------------------------------ shop's own emails */

export function enquiryAlertEmail(input: {
  enquiries: { name: string; email: string; subject: string; waitedHours: number; url: string }[];
}): { subject: string; html: string } {
  const n = input.enquiries.length;
  const subject = `${n} enquir${n === 1 ? 'y has' : 'ies have'} waited more than 24 hours`;
  const rows = input.enquiries
    .map(
      (e) => `<tr>
        <td style="padding:8px 0; border-bottom:1px solid #eee; ${FONT} font-size:14px; color:#16181f;"><a href="${e.url}" style="color:#2a3f8f;">${esc(e.subject)}</a><br><span style="color:#5c5a54;">${esc(e.name)} · ${esc(e.email)}</span></td>
        <td align="right" style="padding:8px 0; border-bottom:1px solid #eee; ${FONT} font-size:14px; color:#b23b2e; white-space:nowrap;">${Math.round(e.waitedHours)} h</td>
      </tr>`
    )
    .join('');
  return {
    subject,
    html: frame({
      title: subject,
      preheader: subject,
      body: [
        row(heading(subject), '30px 28px 0 28px'),
        row(p('These contact-form enquiries are still New or Open. Answer them, then mark them Answered in the admin.')),
        row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">${rows}</table>`),
        row(`<div style="text-align:center; padding:0 0 28px 0;">${button(`${SITE_URL}/admin/enquiries`, 'Open the enquiries')}</div>`),
      ].join(''),
      footer: 'Sent by the waiting-enquiries alert on /admin/automation.',
    }),
  };
}

export type WeeklyReport = {
  from: Date;
  to: Date;
  newCustomers: number;
  newSubscribers: number;
  unsubscribed: number;
  paid: { count: number; total: number };
  unpaid: { count: number; total: number };
  cancelled: number;
  friday: { orders: number; given: number; paidOrders: number; paidGiven: number };
  enquiries: { received: number; stillWaiting: number };
  failedSearches: { term: string; count: number }[];
  emails: { job: string; kind: string; status: string; count: number }[];
  jobs: { label: string; enabled: boolean; ran: number; failed: number; missedDays: string[]; notes: string[] }[];
};

export function weeklyReportEmail(r: WeeklyReport): { subject: string; html: string } {
  const day = (d: Date) =>
    new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/New_York' }).format(d);
  const subject = `Weekly report: ${day(r.from)} to ${day(r.to)}`;
  const kv = (rows: [string, string][]) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px 0;">${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:5px 0; border-bottom:1px solid #f0eee8; ${FONT} font-size:14px; color:#5c5a54;">${esc(k)}</td><td align="right" style="padding:5px 0; border-bottom:1px solid #f0eee8; ${FONT} font-size:14px; color:#16181f; font-weight:bold;">${esc(v)}</td></tr>`
      )
      .join('')}</table>`;
  const h2 = (t: string) => `<h2 style="margin:6px 0 8px 0; ${FONT} font-size:16px; color:#16181f;">${esc(t)}</h2>`;

  const emailRows: [string, string][] = r.emails.length
    ? r.emails.map((e) => [`${e.job} (${e.kind.toLowerCase()}, ${e.status.toLowerCase()})`, String(e.count)])
    : [['No automated emails this week', '0']];
  const jobRows = r.jobs
    .map((j) => {
      const state = !j.enabled
        ? 'switched off'
        : j.failed || j.missedDays.length
          ? `<span style="color:#b23b2e;">${j.failed ? `${j.failed} failed run${j.failed === 1 ? '' : 's'}` : ''}${j.failed && j.missedDays.length ? '; ' : ''}${j.missedDays.length ? `did not run on ${esc(j.missedDays.join(', '))}` : ''}</span>`
          : `ran ${j.ran} time${j.ran === 1 ? '' : 's'}, no failures`;
      const notes = j.notes.length ? `<br><span style="color:#8a877e;">${esc(j.notes.join(' · '))}</span>` : '';
      return `<tr><td style="padding:6px 0; border-bottom:1px solid #f0eee8; ${FONT} font-size:14px; color:#16181f;">${esc(j.label)}${notes}</td><td align="right" style="padding:6px 0; border-bottom:1px solid #f0eee8; ${FONT} font-size:14px; color:#16181f;">${state}</td></tr>`;
    })
    .join('');

  const body = [
    row(heading(subject), '30px 28px 0 28px'),
    row(h2('People')),
    row(kv([
      ['New customer accounts', String(r.newCustomers)],
      ['New subscribers', String(r.newSubscribers)],
      ['Unsubscribed', String(r.unsubscribed)],
    ])),
    row(h2('Orders placed this week')),
    row(kv([
      ['Paid (confirmed or further)', `${r.paid.count} · ${money(r.paid.total)}`],
      ['Unpaid (still New)', `${r.unpaid.count} · ${money(r.unpaid.total)}`],
      ['Cancelled', String(r.cancelled)],
    ])),
    row(h2('Friday 5%')),
    row(kv([
      ['Orders that got it', String(r.friday.orders)],
      ['Given away on those orders', money(r.friday.given)],
      ['Of which paid orders', `${r.friday.paidOrders} · ${money(r.friday.paidGiven)}`],
    ])),
    row(h2('Enquiries')),
    row(kv([
      ['Received this week', String(r.enquiries.received)],
      ['Waiting for an answer now', String(r.enquiries.stillWaiting)],
    ])),
    row(h2('Searches that found nothing')),
    row(
      kv(
        r.failedSearches.length
          ? r.failedSearches.map((s) => [`"${s.term}"`, `${s.count}×`] as [string, string])
          : [['None this week', '0']]
      )
    ),
    row(h2('Automated emails, by type')),
    row(kv(emailRows)),
    row(h2('Jobs')),
    row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px 0;">${jobRows}</table>`),
    row(`<div style="text-align:center; padding:0 0 28px 0;">${button(`${SITE_URL}/admin/automation`, 'Open the run log')}</div>`),
  ].join('');
  return {
    subject,
    html: frame({ title: subject, preheader: `${r.paid.count} paid orders, ${r.unpaid.count} unpaid.`, body, footer: 'Sent by the weekly report on /admin/automation. Times are New York time.' }),
  };
}

/* --------------------------------------------------- additions made at send time */

/** The postal address, which CAN-SPAM requires in every marketing email. Inserted before </body>. */
export function withPostalAddress(html: string, address: string): string {
  const line = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 20px 24px 20px; ${FONT} font-size:12px; line-height:1.6; color:#8a877e;">MrsAnabolics · ${esc(address.trim()).replace(/\r?\n/g, ', ')}</td></tr></table>`;
  return html.includes('</body>') ? html.replace('</body>', () => `${line}</body>`) : html + line;
}

/** The owner's copy: a banner on top, and the recipient's unsubscribe link disabled. */
export function asOwnerCopy(html: string, note: string): string {
  const banner = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#fcf9e8; border-bottom:2px solid #dba617; padding:12px 16px; ${FONT} font-size:13px; line-height:1.5; color:#33312c;">${esc(note)}</td></tr></table>`;
  return html.replace(/<body([^>]*)>/, (m) => `${m}${banner}`);
}

/* --------------------------------------------------------------- template versions */

/** FNV-1a, 32-bit, as hex: deterministic in Node and the browser alike. */
function fnv(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const FIXED = new Date('2026-01-02T15:00:00Z');

/** What the version of each customer-facing template is computed from: fixed sample data. */
function fixtures(job: string): string {
  switch (job) {
    case 'unpaid-orders': {
      const base: UnpaidReminderInput = {
        step: 1,
        firstName: 'Sam',
        reference: 'MRA-SAMPLE',
        placedAt: FIXED,
        items: [{ name: 'Sample product', quantity: 2, lineTotal: 120 }],
        subtotal: 120,
        discountLabel: 'Friday 5% off',
        discountTotal: 6,
        shipping: 9,
        total: 123,
        method: 'crypto',
        payUrl: `${SITE_URL}/checkout/payment-confirmation?order=MRA-SAMPLE`,
        cashApp: null,
      };
      return [
        unpaidReminderEmail(base),
        unpaidReminderEmail({ ...base, step: 2, method: 'cashapp', cashApp: { tag: '$sample', name: 'Sample' } }),
        unpaidReminderEmail({ ...base, method: 'bank_transfer', payUrl: null }),
      ]
        .map((e) => e.subject + e.html)
        .join('');
    }
    case 'welcome': {
      const a = welcomeEmail2();
      const b = welcomeEmail3({ code: 'SAMPLE', headline: '15% off', condition: '' });
      const c = welcomeEmail3(null);
      return [a, b, c].map((e) => e.subject + e.html).join('');
    }
    case 'basket-reminders': {
      const lines = [{ slug: 'sample', name: 'Sample product', brand: 'Maker', image: '', price: 60, quantity: 2 }];
      const input = { firstName: 'Sam', lines, restoreUrl: `${SITE_URL}/basket/restore?token=x`, unsubscribeUrl: UNSUBSCRIBE_PLACEHOLDER, reachedCheckout: true };
      return [
        basketReminderSubject(lines, true) + renderBasketReminderHTML({ ...input, offer: true }),
        basketReminderSubject(lines, false) + renderBasketReminderHTML({ ...input, offer: false }),
      ].join('');
    }
    default:
      return '';
  }
}

/** The current version of a job's template, e.g. "u-3f2a9c1d". Empty for jobs with none. */
export function templateVersion(job: string): string {
  const text = fixtures(job);
  return text ? `${job.slice(0, 1)}-${fnv(text)}` : '';
}
