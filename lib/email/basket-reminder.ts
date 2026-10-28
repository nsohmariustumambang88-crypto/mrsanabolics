/*
  The basket reminder email (lib/basket/reminders.ts sends it).

  The same look as the WELCOME15 campaign of October 2026: the buyer's own lines with today's
  prices and quantities, a "Restore my basket" button that puts the same basket back on any
  device, and — only for someone who has not bought before and not used it — the WELCOME15
  first-order offer. Every link carries UTM tags; the footer carries the subscriber's own
  unsubscribe link. No dosing or effect copy anywhere.
*/

export type ReminderLine = { slug: string; name: string; brand: string; image: string; price: number; quantity: number };

const SITE = 'https://www.mrsanabolics.com';
const CLOUD = 'https://res.cloudinary.com/gwmiqm53/image/upload/f_jpg,q_auto,w_200,h_200,c_pad,b_white/';
const WELCOME_CODE = 'WELCOME15';

const money = (n: number) => `$${n.toFixed(2)}`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tag = (url: string) => `${url}${url.includes('?') ? '&' : '?'}utm_source=email&utm_medium=email&utm_campaign=basket-reminder`;

export function basketReminderSubject(lines: ReminderLine[], offer: boolean): string {
  const first = lines[0]?.name ?? 'your basket';
  const more = lines.length > 1 ? ` and ${lines.length - 1} more` : '';
  return offer ? `You left ${first}${more} in your basket — 15% off inside` : `You left ${first}${more} in your basket`;
}

export function renderBasketReminderHTML(input: {
  firstName: string;
  lines: ReminderLine[];
  restoreUrl: string;
  unsubscribeUrl: string;
  offer: boolean;
  reachedCheckout: boolean;
}): string {
  const { lines, offer } = input;
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const hi = input.firstName ? `Hi ${esc(input.firstName)},` : 'Hi there,';
  const lead = input.reachedCheckout
    ? 'You got as far as the checkout and stopped, so we saved your basket for you.'
    : 'You left some products in your basket, so we saved it for you.';

  const rows = lines
    .map((l) => {
      const url = tag(`${SITE}/product/${l.slug}`);
      const img = l.image ? `${CLOUD}${l.image}` : `${SITE}/apple-icon.png`;
      return `<tr>
        <td width="84" style="padding:12px 0; border-bottom:1px solid #eee;"><a href="${url}"><img src="${img}" width="72" height="72" alt="${esc(l.name)}" style="display:block; border:1px solid #e3e1da; border-radius:4px;"></a></td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee; font-family:Arial,Helvetica,sans-serif;">
          <div style="font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#8a877e;">${esc(l.brand)}</div>
          <div style="font-size:15px; font-weight:bold; color:#16181f;"><a href="${url}" style="color:#16181f; text-decoration:none;">${esc(l.name)}</a></div>
          <div style="font-size:13px; color:#5c5a54;">Qty ${l.quantity} × ${money(l.price)}</div>
        </td>
        <td align="right" style="padding:12px 0; border-bottom:1px solid #eee; font-family:Arial,Helvetica,sans-serif; font-size:15px; color:#16181f; white-space:nowrap;">${money(l.price * l.quantity)}</td>
      </tr>`;
    })
    .join('');

  const offerBlock = offer
    ? `<tr><td style="background:#16181f; padding:24px 28px; font-family:Arial,Helvetica,sans-serif;" align="center">
        <div style="font-size:12px; letter-spacing:3px; text-transform:uppercase; color:#e0b44a;">Your first order</div>
        <div style="font-size:40px; line-height:1.1; font-weight:bold; color:#ffffff; margin-top:6px;">15% OFF</div>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px auto 0 auto;"><tr>
          <td style="border:2px dashed #e0b44a; border-radius:6px; padding:10px 22px; font-family:'Courier New',monospace; font-size:22px; font-weight:bold; letter-spacing:4px; color:#ffffff;">${WELCOME_CODE}</td>
        </tr></table>
        <div style="font-size:13px; color:#a9a59b; margin-top:10px;">That basket would be ${money(subtotal * 0.85)} with ${WELCOME_CODE}. Enter it at checkout.</div>
      </td></tr>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Your basket is saved</title></head>
<body style="margin:0; padding:0; background:#efece4;">
<div style="display:none; max-height:0; overflow:hidden; opacity:0;">Your basket is saved. One click puts it back, on any device.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efece4;"><tr><td align="center" style="padding:20px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">
  <tr><td align="center" style="padding:6px 0 14px 0;">
    <a href="${tag(SITE)}" style="text-decoration:none;"><img src="${SITE}/apple-icon.png" width="56" height="56" alt="MrsAnabolics" style="display:inline-block; border-radius:28px; vertical-align:middle;"><span style="font-family:Arial,Helvetica,sans-serif; font-size:20px; font-weight:bold; color:#16181f; vertical-align:middle; padding-left:10px;">MrsAnabolics</span></a>
  </td></tr>
  <tr><td style="background:#ffffff; border-radius:8px 8px 0 0; padding:30px 28px 8px 28px; font-family:Arial,Helvetica,sans-serif;">
    <h1 style="margin:0 0 14px 0; font-size:24px; line-height:1.25; color:#16181f;">Your basket is saved</h1>
    <p style="margin:0; font-size:15px; line-height:1.65; color:#33312c;">${hi}<br><br>${lead} One click puts it back, on any device, and takes you straight to the checkout.</p>
  </td></tr>
  <tr><td style="background:#ffffff; padding:12px 28px 0 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
      <tr><td></td><td style="padding:12px 10px; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#5c5a54;">Subtotal</td><td align="right" style="padding:12px 0; font-family:Arial,Helvetica,sans-serif; font-size:16px; font-weight:bold; color:#16181f;">${money(subtotal)}</td></tr>
    </table>
  </td></tr>
  <tr><td align="center" style="background:#ffffff; padding:16px 28px 30px 28px;">
    <a href="${tag(input.restoreUrl)}" style="display:inline-block; background:#2a3f8f; color:#ffffff; font-family:Arial,Helvetica,sans-serif; font-size:16px; font-weight:bold; text-decoration:none; padding:15px 34px; border-radius:30px;">Restore my basket</a>
    <div style="font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#8a877e; margin-top:10px;">Prices and stock are checked again when you open it.</div>
  </td></tr>
  ${offerBlock}
  <tr><td style="background:#ffffff; padding:20px 18px; border-radius:0 0 8px 8px; border-top:1px solid #e3e1da;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif; text-align:center;"><tr>
      <td width="33%" style="padding:6px; font-size:13px; color:#33312c;"><strong style="color:#16181f;">Tracked, unmarked</strong><br>US from $9, free over $150</td>
      <td width="33%" style="padding:6px; font-size:13px; color:#33312c;"><strong style="color:#16181f;">Support 24/7</strong><br>Reply here, or <a href="https://t.me/mrsanabolics" style="color:#2a3f8f;">Telegram</a></td>
      <td width="33%" style="padding:6px; font-size:13px; color:#33312c;"><strong style="color:#16181f;">Minimum order</strong><br>$100, delivery included</td>
    </tr></table>
  </td></tr>
  <tr><td align="center" style="padding:20px 20px 10px 20px; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.6; color:#8a877e;">
    You're receiving this because you subscribed at <a href="${SITE}" style="color:#8a877e;">mrsanabolics.com</a> and left items in your basket. We send this once.<br>
    <a href="${input.unsubscribeUrl}" style="color:#8a877e;">Unsubscribe</a> · MrsAnabolics · www.mrsanabolics.com
  </td></tr>
</table></td></tr></table></body></html>`;
}
