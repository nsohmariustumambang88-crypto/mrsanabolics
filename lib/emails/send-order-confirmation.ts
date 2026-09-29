import 'server-only';
import { Resend } from 'resend';
import type { Order } from '@prisma/client';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOrderConfirmation(order: Order) {
  if (!order.customerEmail) {
    throw new Error('No customer email on order');
  }

  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
          .header { background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .header h1 { margin: 0 0 10px 0; font-size: 24px; color: #333; }
          .header p { margin: 0; color: #666; font-size: 14px; }
          .content p { margin: 0 0 15px 0; color: #666; font-size: 14px; line-height: 1.6; }
          .details { border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
          .details h2 { margin: 0 0 15px 0; font-size: 16px; color: #333; }
          .details table { width: 100%; border-collapse: collapse; }
          .details tr { border-bottom: 1px solid #eee; }
          .details td { padding: 10px 0; font-size: 14px; }
          .details td:first-child { color: #666; }
          .details td:last-child { text-align: right; color: #333; }
          .details tr:last-child { border-bottom: none; }
          .cta { text-align: center; margin-bottom: 20px; }
          .cta a { display: inline-block; background-color: #333; color: #fff; padding: 12px 30px; border-radius: 4px; text-decoration: none; font-size: 14px; font-weight: bold; }
          .footer { border-top: 1px solid #eee; padding-top: 20px; text-align: center; }
          .footer p { margin: 0 0 10px 0; font-size: 12px; }
          .footer a { color: #0066cc; text-decoration: none; }
          .footer-small { margin: 0; color: #999; font-size: 11px; }
          .status { color: #27ae60; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Order Confirmed</h1>
          <p>Thank you for your purchase</p>
        </div>

        <div class="content">
          <p>Hi there,</p>
          <p>Your payment has been received and confirmed. Your order is being prepared for shipment.</p>
        </div>

        <div class="details">
          <h2>Order Details</h2>
          <table>
            <tr>
              <td><strong>Order Number:</strong></td>
              <td>${order.reference}</td>
            </tr>
            <tr>
              <td><strong>Order Date:</strong></td>
              <td>${new Date(order.createdAt || Date.now()).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td><strong>Total Amount:</strong></td>
              <td>Paid in Crypto</td>
            </tr>
            <tr>
              <td><strong>Status:</strong></td>
              <td class="status">✓ Paid</td>
            </tr>
          </table>
        </div>

        <div class="cta">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://mrsanabolics.com'}/account">View Order Status</a>
        </div>

        <div class="footer">
          <p>If you have any questions about your order, please <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://mrsanabolics.com'}/contact">contact us</a></p>
          <p class="footer-small">© ${new Date().getFullYear()} MrAnabolics. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: 'noreply@mrsanabolics.com',
      to: order.customerEmail,
      subject: `Order Confirmation - ${order.reference}`,
      html,
    });

    console.log(`[Email] Order confirmation sent to ${order.customerEmail}`, result);
    return result;
  } catch (error) {
    console.error('[Email] Failed to send order confirmation:', error);
    throw error;
  }
}
