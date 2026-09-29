import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PaymentConfirmationClient } from '@/components/checkout/payment-confirmation-client';

export const metadata = {
  title: 'Payment Confirmation | MrAnabolics',
  description: 'Complete your payment',
};

async function getOrderDetails(orderReference: string) {
  const order = await prisma.order.findUnique({
    where: { reference: orderReference },
    include: { contact: true },
  });

  if (!order) {
    return null;
  }

  return order;
}

export default async function PaymentConfirmationPage({
  searchParams,
}: {
  searchParams: { order?: string };
}) {
  const orderReference = searchParams.order;

  if (!orderReference) {
    notFound();
  }

  const order = await getOrderDetails(orderReference);

  if (!order) {
    notFound();
  }

  // Extract payment details from order notes
  // Format: "Crypto payment - BTC | Payment ID: 4675232349"
  const paymentIdMatch = order.notes?.match(/Payment ID: (\d+)/);
  const paymentId = paymentIdMatch?.[1];
  const cryptoType = order.notes?.match(/Crypto payment - (\w+)/)?.[1] || 'BTC';

  if (!paymentId) {
    // Payment not yet created - shouldn't happen, but handle it
    return (
      <main className="min-h-screen bg-paper px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg border border-warning/40 bg-warning/5 p-6 text-center">
            <h1 className="text-xl font-semibold text-ink">Payment Error</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Unable to load payment details. Please contact support.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <Suspense fallback={<PaymentConfirmationLoading />}>
      <PaymentConfirmationClient
        paymentId={paymentId}
        orderReference={orderReference}
        order={order}
        cryptoType={cryptoType}
      />
    </Suspense>
  );
}

function PaymentConfirmationLoading() {
  return (
    <main className="min-h-screen bg-paper px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-border" />
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-border" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-border" />
          </div>
        </div>
      </div>
    </main>
  );
}
