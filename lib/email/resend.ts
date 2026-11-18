import { Resend } from 'resend';
import { SITE } from '@/lib/site';
import {
  renderOrderConfirmationHTML,
  renderAdminNotificationHTML,
  renderNewsletterHTML,
  renderPasswordResetHTML,
  renderPasswordChangedHTML,
  renderReviewRequestHTML,
  renderWelcomeEmail1,
  renderWelcomeEmail2,
  renderWelcomeEmail3,
  type OrderEmailOffer,
  type OrderEmailPayment,
  type OrderEmailTotals,
} from './templates';

export const FROM_EMAIL = 'orders@mrsanabolics.com';
/*
  Where the shop's own alerts go: "New Order" and "Cash App screenshot". Not the ADMIN_EMAIL
  environment variable, which is the admin sign-in. Resend suppressed the Gmail address that was
  here, so no alert reached anyone; support@ was proven to receive a send on 10 November 2026.
*/
export const ADMIN_EMAIL = 'support@mrsanabolics.com';
export const SUPPORT_EMAIL = 'support@mrsanabolics.com'; // Routes to /contact form

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable not set');
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendOrderConfirmation(
  to: string,
  orderRef: string,
  items: Array<{ name: string; quantity: number; price: number }>,
  totals: OrderEmailTotals,
  paid = false,
  payment?: OrderEmailPayment,
  offer?: OrderEmailOffer | null
) {
  const resend = getResend();

  return resend.emails.send({
    from: FROM_EMAIL,
    replyTo: SUPPORT_EMAIL,
    to,
    subject: `${paid ? 'Order Confirmed' : 'Order Received'} - ${orderRef}`,
    html: renderOrderConfirmationHTML(orderRef, items, totals, paid, payment, offer),
  });
}

export async function sendAdminOrderNotification(
  orderRef: string,
  customerEmail: string,
  items: Array<{ name: string; quantity: number }>,
  dashboardLink: string,
  paymentLabel?: string | null
) {
  const resend = getResend();

  return resend.emails.send({
    from: FROM_EMAIL,
    replyTo: SUPPORT_EMAIL,
    to: ADMIN_EMAIL,
    /* A storefront order is created when the customer opens the payment page, before paying. */
    subject: paymentLabel
      ? `New Order (awaiting payment) - ${orderRef} - ${paymentLabel}`
      : `New Order - ${orderRef}`,
    html: renderAdminNotificationHTML(orderRef, customerEmail, items, dashboardLink, paymentLabel),
  });
}

/* To the shop, when NOWPayments reports a crypto order paid in full. Throws on a refusal. */
export async function sendCryptoPaidNotification(orderRef: string, total: number, adminLink: string) {
  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    replyTo: SUPPORT_EMAIL,
    to: ADMIN_EMAIL,
    subject: `Paid - ${orderRef} - crypto`,
    html: `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #1d2327; color: #fff; padding: 20px; border-radius: 4px 4px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Crypto payment received</h1>
      </div>
      <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; color: #333;">
        <p style="margin: 0 0 20px 0;">NOWPayments reports order <strong>${orderRef}</strong> paid in full ($${total.toFixed(2)}). The order is confirmed and the customer has been sent their confirmation.</p>
        <p style="margin: 0;"><a href="${adminLink}" style="display: inline-block; background-color: #2271b1; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 3px;">Open the order</a></p>
      </div>
    </div>
  </body>
</html>`,
  });
  if (error) throw new Error(`Resend refused the paid notification: ${error.message}`);
}

/*
  To the shop, when a customer uploads a Cash App payment screenshot, with what the automatic
  check (lib/checkout/screenshot-check.ts) found. Throws on a refusal.
*/
export async function sendPaymentProofNotification(
  orderRef: string,
  customerEmail: string,
  total: number,
  adminLink: string,
  check: { confirmed: boolean; findings: string[] }
) {
  const findings = check.findings.map((f) => `<li style="margin: 0 0 4px 0;">${f}</li>`).join('');
  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    replyTo: SUPPORT_EMAIL,
    to: ADMIN_EMAIL,
    subject: `Cash App screenshot - ${orderRef} - ${check.confirmed ? 'confirmed automatically' : 'check needed'}`,
    html: `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #1d2327; color: #fff; padding: 20px; border-radius: 4px 4px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Cash App screenshot uploaded</h1>
      </div>
      <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; color: #333;">
        <p style="margin: 0 0 12px 0;">The customer on order <strong>${orderRef}</strong> (${customerEmail}) uploaded a screenshot of their Cash App payment. The order total is <strong>$${total.toFixed(2)}</strong>.</p>
        <p style="margin: 0 0 6px 0;"><strong>What the automatic check read:</strong></p>
        <ul style="margin: 0 0 16px 0; padding-left: 20px;">${findings}</ul>
        ${
          check.confirmed
            ? `<p style="margin: 0 0 20px 0; padding: 12px; background-color: #fcf9e8; border-left: 4px solid #dba617;">The order was <strong>confirmed automatically</strong> and the customer has been sent their confirmation. A screenshot can be edited: <strong>check that $${total.toFixed(2)} is in the Cash App account before you ship.</strong> If it is not, set the order to Cancelled.</p>`
            : `<p style="margin: 0 0 20px 0;">The check did not pass, so nothing was confirmed. Check that the money is in the Cash App account, then set the order to <strong>Confirmed</strong>; the customer is emailed their confirmation then.</p>`
        }
        <p style="margin: 0;"><a href="${adminLink}" style="display: inline-block; background-color: #2271b1; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 3px;">Open the order and the screenshot</a></p>
      </div>
    </div>
  </body>
</html>`,
  });
  if (error) throw new Error(`Resend refused the screenshot notification: ${error.message}`);
}

export async function sendNewsletterCampaign(
  to: string | string[],
  subject: string,
  message: string,
  unsubscribeToken: string
) {
  const resend = getResend();
  const unsubscribeLink = `${SITE.url}/unsubscribe?token=${unsubscribeToken}`;

  const recipients = Array.isArray(to) ? to : [to];

  return Promise.all(
    recipients.map((email) =>
      resend.emails.send({
        from: FROM_EMAIL,
    replyTo: SUPPORT_EMAIL,
        to: email,
        subject,
        html: renderNewsletterHTML(message, unsubscribeLink),
      })
    )
  );
}

/*
  The two account emails. Resend's client RESOLVES with `{ error }` on an API refusal rather than
  rejecting, so these throw it themselves — otherwise a failed send looks like a sent one.
*/
export async function sendPasswordResetEmail(to: string, resetLink: string, minutes: number) {
  const { error } = await getResend().emails.send({
    from: `MrsAnabolics <${FROM_EMAIL}>`,
    replyTo: SUPPORT_EMAIL,
    to,
    subject: 'Reset your MrsAnabolics password',
    html: renderPasswordResetHTML(resetLink, minutes),
  });
  if (error) throw new Error(`Resend refused the reset email: ${error.message}`);
}

export async function sendReviewRequestEmail(
  to: string,
  orderRef: string,
  items: Array<{ name: string; url: string }>
) {
  const { error } = await getResend().emails.send({
    from: `MrsAnabolics <${FROM_EMAIL}>`,
    replyTo: SUPPORT_EMAIL,
    to,
    subject: `Your order ${orderRef} has arrived — how was it?`,
    html: renderReviewRequestHTML(orderRef, items),
  });
  if (error) throw new Error(`Resend refused the review request email: ${error.message}`);
}

/* The basket reminder (lib/basket/reminders.ts). Marketing mail, so it carries List-Unsubscribe. */
export async function sendBasketReminderEmail(to: string, subject: string, html: string, unsubscribeUrl: string) {
  const { error } = await getResend().emails.send({
    from: `MrsAnabolics <${FROM_EMAIL}>`,
    replyTo: SUPPORT_EMAIL,
    to,
    subject,
    html,
    headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
  });
  if (error) throw new Error(`Resend refused the basket reminder: ${error.message}`);
}

export async function sendPasswordChangedEmail(to: string, signInLink: string) {
  const { error } = await getResend().emails.send({
    from: `MrsAnabolics <${FROM_EMAIL}>`,
    replyTo: SUPPORT_EMAIL,
    to,
    subject: 'Your MrsAnabolics password was changed',
    html: renderPasswordChangedHTML(signInLink),
  });
  if (error) throw new Error(`Resend refused the password-changed email: ${error.message}`);
}

export async function sendOrderStatusUpdate(to: string, orderRef: string, status: string, details?: string) {
  const resend = getResend();
  return resend.emails.send({
    from: FROM_EMAIL,
    replyTo: SUPPORT_EMAIL,
    to,
    subject: `Order ${status} - ${orderRef}`,
    html: `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #1d2327; color: #fff; padding: 20px; text-align: center; border-radius: 4px 4px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Order ${status}</h1>
      </div>
      <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd;">
        <p style="margin: 0 0 20px 0; color: #333;">Your order <strong>${orderRef}</strong> is now <strong>${status.toLowerCase()}</strong>.</p>
        ${details ? `<p style="margin: 0; color: #333;">${details}</p>` : ''}
        <p style="margin: 20px 0 0 0; color: #666; font-size: 14px;">Questions? Reply to this email or contact support@mrsanabolics.com</p>
      </div>
    </div>
  </body>
</html>`,
  });
}

export async function sendContactFormReply(to: string, subject: string, message: string) {
  const resend = getResend();
  return resend.emails.send({
    from: FROM_EMAIL,
    replyTo: SUPPORT_EMAIL,
    to,
    subject: `Re: ${subject}`,
    html: `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <p style="margin: 0 0 20px 0;">Thanks for reaching out to MrsAnabolics.</p>
      <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #2271b1; margin: 20px 0;">
        ${message.split('\n').map((line) => `<p style="margin: 0 0 10px 0;">${line}</p>`).join('')}
      </div>
      <p style="margin: 20px 0 0 0; color: #666;">Best regards,<br/>The MrsAnabolics Team</p>
    </div>
  </body>
</html>`,
  });
}

export async function sendCustomerNotification(to: string, subject: string, message: string) {
  const resend = getResend();
  return resend.emails.send({
    from: FROM_EMAIL,
    replyTo: SUPPORT_EMAIL,
    to,
    subject,
    html: `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 4px;">
        ${message.split('\n').map((line) => `<p style="margin: 0 0 15px 0;">${line}</p>`).join('')}
        <p style="margin: 20px 0 0 0; color: #666; font-size: 12px;">Questions? Contact support@mrsanabolics.com</p>
      </div>
    </div>
  </body>
</html>`,
  });
}

export async function sendWelcomeEmail1(to: string, unsubscribeToken: string) {
  const resend = getResend();
  const unsubscribeLink = `${SITE.url}/unsubscribe?token=${unsubscribeToken}`;

  return resend.emails.send({
    from: FROM_EMAIL,
    replyTo: SUPPORT_EMAIL,
    to,
    subject: 'What you need to know before buying—a safety guide',
    html: renderWelcomeEmail1(unsubscribeLink),
  });
}

export async function sendWelcomeEmail2(to: string, unsubscribeToken: string) {
  const resend = getResend();
  const unsubscribeLink = `${SITE.url}/unsubscribe?token=${unsubscribeToken}`;

  return resend.emails.send({
    from: FROM_EMAIL,
    replyTo: SUPPORT_EMAIL,
    to,
    subject: '3 things most people get wrong about quality',
    html: renderWelcomeEmail2(unsubscribeLink),
  });
}

export async function sendWelcomeEmail3(to: string, unsubscribeToken: string) {
  const resend = getResend();
  const unsubscribeLink = `${SITE.url}/unsubscribe?token=${unsubscribeToken}`;

  return resend.emails.send({
    from: FROM_EMAIL,
    replyTo: SUPPORT_EMAIL,
    to,
    subject: "Ready to start? Here's where to begin (+ 15% off)",
    html: renderWelcomeEmail3(unsubscribeLink),
  });
}
