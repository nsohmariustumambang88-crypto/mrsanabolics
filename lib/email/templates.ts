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

export type OrderEmailTotals = {
  subtotal: number;
  discountCode?: string | null;
  discountTotal?: number;
  shippingMethod?: string | null;
  shipping: number;
  total: number;
};

/* `paid` switches the wording: an order is "received" when placed and "confirmed" once paid. */
export function renderOrderConfirmationHTML(
  orderRef: string,
  items: Array<{ name: string; quantity: number; price: number }>,
  totals: OrderEmailTotals,
  paid = false
): string {
  const money = (n: number) => `$${n.toFixed(2)}`;
  const row = (label: string, value: string, strong = false) =>
    `<tr>
      <td style="padding: 6px 0; color: #333;${strong ? ' font-weight: bold; font-size: 18px;' : ''}">${label}</td>
      <td style="padding: 6px 0; text-align: right; color: #333;${strong ? ' font-weight: bold; font-size: 18px;' : ''}">${value}</td>
    </tr>`;
  const totalsHTML = [
    row('Subtotal', money(totals.subtotal)),
    totals.discountTotal && totals.discountTotal > 0
      ? row(`Discount${totals.discountCode ? ` (${totals.discountCode})` : ''}`, `-${money(totals.discountTotal)}`)
      : '',
    row(`Shipping${totals.shippingMethod ? ` (${totals.shippingMethod})` : ''}`, money(totals.shipping)),
    row('Total', money(totals.total), true),
  ].join('');
  const heading = paid ? 'Order Confirmed' : 'Order Received';
  const intro = paid
    ? `We've received your payment for order <strong>${orderRef}</strong>, and your order is confirmed. We're preparing it for shipping.`
    : `We've received your order <strong>${orderRef}</strong>. We'll confirm it as soon as your payment arrives.`;

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
    <title>${heading}</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #1d2327; color: #fff; padding: 20px; text-align: center; border-radius: 4px 4px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">${heading}</h1>
      </div>

      <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd;">
        <p style="margin: 0 0 20px 0; color: #333;">${intro}</p>

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

        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; padding-top: 20px; border-top: 2px solid #ddd;">
          <tbody>
            ${totalsHTML}
          </tbody>
        </table>

        <p style="margin: 20px 0 0 0; color: #666; font-size: 14px;">We'll send you tracking information as soon as your order ships. If you have any questions, reply to this email and our support team will help.</p>
      </div>

      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 0;">MrAnabolics</p>
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

/* The shell the account emails share, in the same layout as the order emails. */
function accountEmailHTML(heading: string, body: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>${heading}</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #1d2327; color: #fff; padding: 20px; text-align: center; border-radius: 4px 4px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">${heading}</h1>
      </div>

      <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; color: #333; font-size: 15px; line-height: 1.6;">
        ${body}
      </div>

      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 0;">MrAnabolics</p>
      </div>
    </div>
  </body>
</html>`;
}

/* The forgot-password link. `minutes` is how long it works; it works once. */
export function renderPasswordResetHTML(resetLink: string, minutes: number): string {
  return accountEmailHTML(
    'Reset your password',
    `<p style="margin: 0 0 16px 0;">We received a request to reset the password for your MrAnabolics account.</p>
        <p style="margin: 0 0 16px 0;">Press the button to choose a new one. The link works once and expires in <strong>${minutes} minutes</strong>.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetLink}" style="background-color: #2271b1; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 16px; font-weight: bold;">Reset password</a>
        </div>
        <p style="margin: 0 0 16px 0; color: #666; font-size: 13px; word-break: break-all;">If the button does not work, copy this link into your browser:<br><a href="${resetLink}" style="color: #2271b1;">${resetLink}</a></p>
        <p style="margin: 0; padding-top: 16px; border-top: 1px solid #eee; color: #666; font-size: 13px;">Did not ask for this? You can ignore this email: your password has not changed. Do not forward it, because the link lets whoever holds it set a new password.</p>`
  );
}

/* Sent after a password is set through the reset link, so a change the owner did not make is noticed. */
export function renderPasswordChangedHTML(signInLink: string): string {
  return accountEmailHTML(
    'Your password was changed',
    `<p style="margin: 0 0 16px 0;">The password for your MrAnabolics account was just changed using a reset link, and every other device signed in to your account has been signed out.</p>
        <p style="margin: 0 0 16px 0;">If this was you, there is nothing else to do. You can <a href="${signInLink}" style="color: #2271b1;">sign in here</a>.</p>
        <p style="margin: 0; padding-top: 16px; border-top: 1px solid #eee; color: #333;"><strong>Was it not you?</strong> Reply to this email straight away and our support team will lock the account and help you back in.</p>`
  );
}

export function renderWelcomeEmail1(unsubscribeLink: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Welcome to MrAnabolics</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #1d2327; color: #fff; padding: 20px; text-align: center; border-radius: 4px 4px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Welcome to MrAnabolics</h1>
      </div>

      <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd;">
        <p style="margin: 0 0 15px 0; color: #333;">Thanks for subscribing. We're glad you're here.</p>

        <p style="margin: 0 0 20px 0; color: #333;">Before you start shopping, here's what you need to know about evaluating quality and spotting counterfeits.</p>

        <div style="background-color: #f0f0f1; padding: 15px; border-left: 4px solid #2271b1; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1d2327; font-size: 16px;">What to Look For When Buying</h3>
          <ul style="margin: 0; padding-left: 20px; color: #333;">
            <li>Authentic packaging with correct serial numbers</li>
            <li>Holograms or security features (varies by manufacturer)</li>
            <li>Clear batch numbers and expiry dates</li>
            <li>Certificates of analysis (CoA) from third-party testing</li>
          </ul>
        </div>

        <p style="margin: 20px 0; color: #333;">Every product we carry comes with verification documentation. We only work with manufacturers who can prove quality and authenticity.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://mrsanabolics.com/blog/how-to-spot-counterfeit-steroids" style="background-color: #2271b1; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Read Our Complete Safety Guide</a>
        </div>

        <p style="margin: 20px 0 0 0; color: #666; font-size: 14px;">Questions? We're here to help. Reply to this email or visit our <a href="https://mrsanabolics.com/contact" style="color: #2271b1;">contact page</a>.</p>
      </div>

      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 0;"><a href="${unsubscribeLink}" style="color: #2271b1; text-decoration: none;">Unsubscribe</a></p>
        <p style="margin: 10px 0 0 0;">MrAnabolics - Professional Supplements</p>
      </div>
    </div>
  </body>
</html>`;
}

export function renderWelcomeEmail2(unsubscribeLink: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>3 Things Most People Get Wrong</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #1d2327; color: #fff; padding: 20px; text-align: center; border-radius: 4px 4px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">3 Common Misconceptions</h1>
      </div>

      <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd;">
        <p style="margin: 0 0 20px 0; color: #333;">Continuing from our last email—here are three things we see beginners misunderstand:</p>

        <div style="margin: 20px 0; padding-bottom: 20px; border-bottom: 1px solid #eee;">
          <h3 style="margin: 0 0 10px 0; color: #1d2327;">1. Cheaper = Counterfeit</h3>
          <p style="margin: 0; color: #333; line-height: 1.6;">Not always true. Some manufacturers have lower overhead. What matters: Do they have third-party testing? Can they provide batch verification?</p>
        </div>

        <div style="margin: 20px 0; padding-bottom: 20px; border-bottom: 1px solid #eee;">
          <h3 style="margin: 0 0 10px 0; color: #1d2327;">2. Underground Labs vs Pharma</h3>
          <p style="margin: 0; color: #333; line-height: 1.6;">UGL products can be legitimate and tested. Pharmaceutical products can be counterfeit. What matters: Third-party verification, not the source.</p>
        </div>

        <div style="margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1d2327;">3. "If It Works, It's Real"</h3>
          <p style="margin: 0; color: #333; line-height: 1.6;">Counterfeit products might work (or be a different compound). The only way to know for certain: Lab testing and documentation.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://mrsanabolics.com/shop" style="background-color: #2271b1; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Explore Our Collection</a>
        </div>

        <p style="margin: 20px 0 0 0; color: #666; font-size: 14px;">Every product in our store comes with documentation. We make verification simple.</p>
      </div>

      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 0;"><a href="${unsubscribeLink}" style="color: #2271b1; text-decoration: none;">Unsubscribe</a></p>
        <p style="margin: 10px 0 0 0;">MrAnabolics - Professional Supplements</p>
      </div>
    </div>
  </body>
</html>`;
}

export function renderWelcomeEmail3(unsubscribeLink: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Start Here (+ 10% Off)</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #1d2327; color: #fff; padding: 20px; text-align: center; border-radius: 4px 4px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Ready to Start?</h1>
      </div>

      <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd;">
        <p style="margin: 0 0 20px 0; color: #333;">Based on our research and customer feedback, here's where most people start:</p>

        <div style="background-color: #f0f0f1; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1d2327;">Bestsellers for Beginners</h3>
          <ul style="margin: 0; padding-left: 20px; color: #333;">
            <li>Testosterone Cypionate (reliable, predictable results)</li>
            <li>Nolvadex (for cycle support)</li>
            <li>Clomid (post-cycle therapy)</li>
          </ul>
          <p style="margin: 15px 0 0 0; font-size: 13px; color: #666;">All products come with certificates of analysis and batch verification.</p>
        </div>

        <div style="background-color: #fffbee; padding: 15px; border-left: 4px solid #f9a825; margin: 20px 0;">
          <p style="margin: 0; color: #333;"><strong>New subscriber offer: Use code WELCOME10 for 10% off your first order.</strong></p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://mrsanabolics.com/shop" style="background-color: #2271b1; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 16px;">Browse All Products</a>
        </div>

        <p style="margin: 20px 0 0 0; color: #666; font-size: 14px;">Not sure what to order? <a href="https://mrsanabolics.com/contact" style="color: #2271b1;">Reach out</a>—our team can help you find exactly what you need.</p>
      </div>

      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 0;"><a href="${unsubscribeLink}" style="color: #2271b1; text-decoration: none;">Unsubscribe</a></p>
        <p style="margin: 10px 0 0 0;">MrAnabolics - Professional Supplements</p>
      </div>
    </div>
  </body>
</html>`;
}
