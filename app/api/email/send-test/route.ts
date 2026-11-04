import { getCurrentAdmin } from '@/lib/auth';
import { sendOrderConfirmation, sendAdminOrderNotification } from '@/lib/email/resend';
import { SITE } from '@/lib/site';

/*
  Sends a sample "Order Received" and staff notification, for checking the templates.

  Admin only. It used to answer anyone, which let any visitor make orders@mrsanabolics.com mail
  any address on the internet — the quickest way to lose the sending domain's reputation.
*/
export async function POST(request: Request) {
  if (!(await getCurrentAdmin())) {
    return Response.json({ error: 'Not signed in.' }, { status: 401 });
  }

  try {
    const { to, orderRef } = await request.json();

    if (!to || !orderRef) {
      return Response.json(
        { error: 'Missing required fields: to, orderRef' },
        { status: 400 }
      );
    }

    // Sample order data for testing
    const testItems = [
      { name: 'Testosterone Enanthate 250 - Hilma Biocare', quantity: 1, price: 45.99 },
      { name: 'Nolvadex (Tamoxifen) - Pharmaqo', quantity: 2, price: 12.50 },
    ];

    // Send to customer
    const subtotal = testItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const customerEmail = await sendOrderConfirmation(to, orderRef, testItems, {
      subtotal,
      shippingMethod: 'Standard tracked',
      shipping: 9,
      total: subtotal + 9,
    });

    // Send to admin
    const adminEmail = await sendAdminOrderNotification(
      orderRef,
      to,
      testItems.map(item => ({ name: item.name, quantity: item.quantity })),
      `${SITE.url}/admin/orders`
    );

    return Response.json({
      success: true,
      message: 'Test emails sent successfully',
      customerEmail: customerEmail.data,
      adminEmail: adminEmail.data,
    });
  } catch (error) {
    console.error('Email send error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}
