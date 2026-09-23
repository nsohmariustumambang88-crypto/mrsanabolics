import { Resend } from 'resend';
import {
  renderOrderConfirmationHTML,
  renderAdminNotificationHTML,
  renderNewsletterHTML,
  renderPasswordResetHTML,
} from './templates';

export const FROM_EMAIL = 'orders@mrsanabolics.com';
export const ADMIN_EMAIL = 'support@mrsanabolics.com';

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable not set');
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendOrderConfirmation(
  to: string,
  orderRef: string,
  items: Array<{ name: string; quantity: number; price: number }>
) {
  const resend = getResend();
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Order Confirmed - ${orderRef}`,
    html: renderOrderConfirmationHTML(orderRef, items, total),
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
        to: email,
        subject,
        html: renderNewsletterHTML(message, unsubscribeLink),
      })
    )
  );
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const resend = getResend();
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Reset Your Password',
    html: renderPasswordResetHTML(resetLink),
  });
}

export async function sendOrderStatusUpdate(to: string, orderRef: string, status: string, details?: string) {
  const resend = getResend();
  return resend.emails.send({
    from: FROM_EMAIL,
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
    to,
    subject: `Re: ${subject}`,
    html: `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <p style="margin: 0 0 20px 0;">Thanks for reaching out to MrAnabolics.</p>
      <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #2271b1; margin: 20px 0;">
        ${message.split('\n').map((line) => `<p style="margin: 0 0 10px 0;">${line}</p>`).join('')}
      </div>
      <p style="margin: 20px 0 0 0; color: #666;">Best regards,<br/>The MrAnabolics Team</p>
    </div>
  </body>
</html>`,
  });
}

export async function sendCustomerNotification(to: string, subject: string, message: string) {
  const resend = getResend();
  return resend.emails.send({
    from: FROM_EMAIL,
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
