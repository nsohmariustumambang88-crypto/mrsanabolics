import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PaymentConfirmationClient } from '@/components/checkout/payment-confirmation-client';
import { PaymentHelp } from '@/components/checkout/payment-help';
import { CashAppPayment } from '@/components/checkout/cash-app-payment';
import { cashAppDetails, proofTokenMatches } from '@/lib/checkout/cashapp';
import {
  PAYMENT_METHOD_LABEL,
  parseCryptoNote,
  paymentMethodFromNotes,
} from '@/lib/checkout/order-notes';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Payment Confirmation | MrsAnabolics',
  description: 'Complete your payment',
};

async function getOrderDetails(orderReference: string) {
  /* Only what the page shows. The contact's name, email and address never reach the browser. */
  return prisma.order.findUnique({
    where: { reference: orderReference },
    select: {
      status: true,
      total: true,
      notes: true,
      _count: { select: { paymentProofs: true } },
    },
  });
}

export default async function PaymentConfirmationPage({
  searchParams,
}: {
  /** `t` is the Cash App screenshot token, from the checkout or the "Order Received" email. */
  searchParams: { order?: string; t?: string };
}) {
  const orderReference = searchParams.order;
  if (!orderReference) notFound();

  const order = await getOrderDetails(orderReference);
  if (!order) notFound();

  const total = Number(order.total);
  const crypto = parseCryptoNote(order.notes);

  if (!crypto) {
    /*
      Not a crypto order with an invoice: bank transfer, Cash App, or a crypto order whose
      invoice was never created. Say what happens next instead of "Payment Error".
    */
    const method = paymentMethodFromNotes(order.notes);
    const label = method ? PAYMENT_METHOD_LABEL[method] ?? method : null;
    const manual = method === 'bank_transfer' || method === 'cashapp';
    const cancelled = order.status === 'CANCELLED';

    /*
      Cash App with a $Cashtag on file: the tag, the amount and, with a valid token, the
      screenshot upload. Once staff have confirmed it, say so instead.
    */
    const cashApp = method === 'cashapp' && !cancelled ? await cashAppDetails() : null;
    if (cashApp) {
      const confirmed = ['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(order.status);
      return (
        <main className="min-h-screen bg-paper px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl space-y-8">
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
                {confirmed ? 'Payment received' : 'Pay with Cash App'}
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                Order <span className="font-mono">{orderReference}</span> · ${total.toFixed(2)}
              </p>
            </div>
            {confirmed ? (
              <p className="text-sm leading-relaxed text-ink-soft">
                We have checked your payment and your order is confirmed. We&rsquo;ll email you the
                tracking number when it ships.
              </p>
            ) : (
              <CashAppPayment
                reference={orderReference}
                token={
                  proofTokenMatches(orderReference, searchParams.t) ? searchParams.t ?? null : null
                }
                total={total}
                tag={cashApp.tag}
                name={cashApp.name}
                initialCount={order._count.paymentProofs}
              />
            )}
            <PaymentHelp reference={orderReference} intro="Questions about paying? Contact us:" />
          </div>
        </main>
      );
    }

    return (
      <OrderNotice
        reference={orderReference}
        total={total}
        heading={cancelled ? 'This order was cancelled' : 'Your order is saved'}
        body={
          cancelled
            ? 'If you think this is a mistake, or you have already paid, contact us with your order number.'
            : manual
              ? `You chose to pay by ${label}. We'll email you the payment details at the address you gave at checkout. Your order is sent once your payment arrives.`
              : method === 'crypto'
                ? "We couldn't create the crypto payment address for this order. Nothing has been charged. Contact us and we'll send you an address to pay to."
                : "Contact us and we'll tell you how to pay for this order."
        }
        help={
          manual && !cancelled
            ? "Haven't had the payment details within a few hours? Contact us:"
            : 'Contact us:'
        }
      />
    );
  }

  return (
    <Suspense fallback={null}>
      <PaymentConfirmationClient
        paymentId={crypto.paymentId}
        orderReference={orderReference}
        orderStatus={order.status}
        orderTotal={total}
        cryptoType={crypto.asset}
        initialDetails={
          crypto.payAmount && crypto.payAddress
            ? {
                pay_amount: Number(crypto.payAmount),
                pay_currency: crypto.asset.toLowerCase(),
                pay_address: crypto.payAddress,
              }
            : null
        }
      />
    </Suspense>
  );
}

function OrderNotice({
  reference,
  total,
  heading,
  body,
  help,
}: {
  reference: string;
  total: number;
  heading: string;
  body: string;
  help: string;
}) {
  return (
    <main className="min-h-screen bg-paper px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink">{heading}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Order <span className="font-mono">{reference}</span> · ${total.toFixed(2)}
          </p>
        </div>
        <p className="text-sm leading-relaxed text-ink-soft">{body}</p>
        <PaymentHelp reference={reference} intro={help} />
      </div>
    </main>
  );
}
