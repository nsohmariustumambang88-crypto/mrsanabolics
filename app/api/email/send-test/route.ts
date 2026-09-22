import { sendOrderConfirmation, sendAdminOrderNotification } from '@/lib/email/resend';

export async function POST(request: Request) {
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
    const customerEmail = await sendOrderConfirmation(to, orderRef, testItems);

    // Send to admin
    const adminEmail = await sendAdminOrderNotification(
      orderRef,
      to,
      testItems.map(item => ({ name: item.name, quantity: item.quantity }))
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
