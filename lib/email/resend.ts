import { Resend } from 'resend';

export const FROM_EMAIL = 'orders@mrsanabolics.com';
export const ADMIN_EMAIL = 'support@mrsanabolics.com';

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable not set');
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendOrderConfirmation(to: string, orderRef: string, items: Array<{ name: string; quantity: number; price: number }>) {
  const resend = getResend();
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Order Confirmed - ${orderRef}`,
    html: `
      <h1>Order Confirmed</h1>
      <p>Your order <strong>${orderRef}</strong> has been received.</p>
      <h2>Items:</h2>
      <ul>
        ${items.map(item => `<li>${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</li>`).join('')}
      </ul>
      <h2>Total: $${total.toFixed(2)}</h2>
      <p>We'll send you tracking information as soon as your order ships.</p>
      <p>Questions? Reply to this email or contact support@mrsanabolics.com</p>
    `,
  });
}

export async function sendAdminOrderNotification(orderRef: string, customerEmail: string, items: Array<{ name: string; quantity: number }>) {
  const resend = getResend();
  return resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: `New Order - ${orderRef}`,
    html: `
      <h1>New Order Received</h1>
      <p><strong>Order:</strong> ${orderRef}</p>
      <p><strong>Customer:</strong> ${customerEmail}</p>
      <h2>Items:</h2>
      <ul>
        ${items.map(item => `<li>${item.name} x${item.quantity}</li>`).join('')}
      </ul>
      <p>Log in to admin dashboard to process this order.</p>
    `,
  });
}

export async function sendContactFormReply(to: string, subject: string, message: string) {
  const resend = getResend();
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Re: ${subject}`,
    html: `
      <p>Thanks for reaching out to MrAnabolics.</p>
      <p>${message}</p>
      <p>Best regards,<br/>The MrAnabolics Team</p>
    `,
  });
}

export async function sendCustomerNotification(to: string, subject: string, message: string) {
  const resend = getResend();
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: `
      <div>${message}</div>
      <p>Questions? Contact support@mrsanabolics.com</p>
    `,
  });
}
