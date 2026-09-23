/**
 * Email template utilities for React Email components.
 * Provides HTML rendering for emails sent via Resend.
 */

export const emailStyles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#f9f9f9',
  },
  header: {
    backgroundColor: '#1d2327',
    color: '#fff',
    padding: '20px',
    textAlign: 'center' as const,
  },
  button: {
    backgroundColor: '#2271b1',
    color: '#fff',
    padding: '12px 24px',
    textDecoration: 'none',
    borderRadius: '4px',
    display: 'inline-block',
    marginTop: '20px',
  },
  section: {
    backgroundColor: '#fff',
    padding: '20px',
    marginTop: '20px',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  footer: {
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid #ddd',
    fontSize: '12px',
    color: '#666',
    textAlign: 'center' as const,
  },
};

export function renderOrderConfirmationHTML(
  orderRef: string,
  items: Array<{ name: string; quantity: number; price: number }>,
  total: number
): string {
  const itemsHTML = items
    .map(
      (item) =>
        `<tr style="border-bottom: 1px solid #eee; padding: 10px 0;">
      <td style="padding: 10px 0;">${item.name}</td>
      <td style="text-align: right; padding: 10px 0;">x${item.quantity}</td>
      <td style="text-align: right; padding: 10px 0;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Order Confirmed</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #1d2327; color: #fff; padding: 20px; text-align: center; border-radius: 4px 4px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Order Confirmed</h1>
      </div>

      <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd;">
        <p style="margin: 0 0 20px 0; color: #333;">Your order <strong>${orderRef}</strong> has been received and confirmed.</p>

        <h2 style="font-size: 16px; margin: 20px 0 10px 0; color: #1d2327;">Order Items</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #ddd;">
              <th style="text-align: left; padding: 10px 0; font-weight: bold;">Product</th>
              <th style="text-align: right; padding: 10px 0; font-weight: bold;">Qty</th>
              <th style="text-align: right; padding: 10px 0; font-weight: bold;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div style="text-align: right; margin-top: 20px; padding-top: 20px; border-top: 2px solid #ddd;">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1d2327;">Total: <span style="color: #2271b1;">$${total.toFixed(2)}</span></p>
        </div>

        <p style="margin: 20px 0 0 0; color: #666; font-size: 14px;">We'll send you tracking information as soon as your order ships. If you have any questions, please reply to this email or contact support@mrsanabolics.com</p>
      </div>

      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 0;">MrAnabolics - Professional Supplements</p>
        <p style="margin: 5px 0 0 0;">This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  </body>
</html>`;
}

export function renderAdminNotificationHTML(
  orderRef: string,
  customerEmail: string,
  items: Array<{ name: string; quantity: number }>,
  dashboardLink: string
): string {
  const itemsHTML = items
    .map((item) => `<li style="padding: 5px 0;">${item.name} x${item.quantity}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>New Order</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #2271b1; color: #fff; padding: 20px; text-align: center; border-radius: 4px 4px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">New Order Received</h1>
      </div>

      <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd;">
        <p style="margin: 0 0 20px 0; color: #333;">A new order has been placed.</p>

        <div style="background-color: #f0f0f1; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Order ID:</strong> ${orderRef}</p>
          <p style="margin: 0;"><strong>Customer:</strong> ${customerEmail}</p>
        </div>

        <h2 style="font-size: 16px; margin: 20px 0 10px 0; color: #1d2327;">Items Ordered</h2>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${itemsHTML}
        </ul>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${dashboardLink}" style="background-color: #2271b1; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Order in Admin</a>
        </div>

        <p style="margin: 20px 0 0 0; color: #666; font-size: 14px;">Log in to the admin dashboard to process this order.</p>
      </div>

      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 0;">MrAnabolics Admin Notification</p>
      </div>
    </div>
  </body>
</html>`;
}

export function renderNewsletterHTML(
  message: string,
  unsubscribeLink: string
): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Newsletter</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #1d2327; color: #fff; padding: 20px; text-align: center; border-radius: 4px 4px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">MrAnabolics Newsletter</h1>
      </div>

      <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 4px 4px;">
        ${message}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0;"><a href="${unsubscribeLink}" style="color: #2271b1; text-decoration: none;">Unsubscribe from this newsletter</a></p>
          <p style="margin: 10px 0 0 0;">MrAnabolics - Professional Supplements</p>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

export function renderPasswordResetHTML(
  resetLink: string,
  expiresIn: string = '24 hours'
): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Reset Your Password</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #1d2327; color: #fff; padding: 20px; text-align: center; border-radius: 4px 4px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Reset Your Password</h1>
      </div>

      <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd;">
        <p style="margin: 0 0 20px 0; color: #333;">We received a request to reset your password. If you didn't make this request, you can ignore this email.</p>

        <p style="margin: 0 0 20px 0; color: #333;">Click the button below to reset your password. This link expires in ${expiresIn}.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #2271b1; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 16px;">Reset Password</a>
        </div>

        <p style="margin: 0; color: #666; font-size: 12px; word-break: break-all;">Or copy this link: <a href="${resetLink}" style="color: #2271b1;">${resetLink}</a></p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="margin: 0; color: #666; font-size: 12px;">For security reasons, do not share this email with anyone.</p>
        </div>
      </div>

      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 0;">MrAnabolics - Professional Supplements</p>
      </div>
    </div>
  </body>
</html>`;
}
