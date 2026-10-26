import { Resend } from 'resend';
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
  type OrderEmailTotals,
} from './templates';

export const FROM_EMAIL = 'orders@mrsanabolics.com';
export const ADMIN_EMAIL = 'shoponlinesteriod@gmail.com';
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
  paid = false
) {
  const resend = getResend();

  return resend.emails.send({
    from: FROM_EMAIL,
    replyTo: SUPPORT_EMAIL,
    to,
    subject: `${paid ? 'Order Confirmed' : 'Order Received'} - ${orderRef}`,
    html: renderOrderConfirmationHTML(orderRef, items, totals, paid),
  });
}

export async function sendAdminOrderNotification(
  orderRef: string,
  customerEmail: string,
  items: Array<{ name: string; quantity: number }>
) {
  const resend = getResend();
  const dashboardLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mrsanabolics.com'}/admin/orders/${orderRef}`;

  return resend.emails.send({
    from: FROM_EMAIL,
    replyTo: SUPPORT_EMAIL,
    to: ADMIN_EMAIL,
    subject: `New Order - ${orderRef}`,
    html: renderAdminNotificationHTML(orderRef, customerEmail, items, dashboardLink),
  });
}

export async function sendNewsletterCampaign(
  to: string | string[],
  subject: string,
  message: string,
  unsubscribeToken: string
) {
  const resend = getResend();
  const unsubscribeLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mrsanabolics.com'}/unsubscribe?token=${unsubscribeToken}`;

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
  const unsubscribeLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mrsanabolics.com'}/unsubscribe?token=${unsubscribeToken}`;

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
  const unsubscribeLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mrsanabolics.com'}/unsubscribe?token=${unsubscribeToken}`;

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
  const unsubscribeLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mrsanabolics.com'}/unsubscribe?token=${unsubscribeToken}`;

  return resend.emails.send({
    from: FROM_EMAIL,
    replyTo: SUPPORT_EMAIL,
    to,
    subject: "Ready to start? Here's where to begin (+ 10% off)",
    html: renderWelcomeEmail3(unsubscribeLink),
  });
}
