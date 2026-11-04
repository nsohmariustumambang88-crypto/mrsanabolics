'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Check, Clock, Copy } from 'lucide-react';
import { PaymentHelp } from '@/components/checkout/payment-help';

interface PaymentDetails {
  pay_amount: number;
  pay_currency: string;
  pay_address: string;
}

interface PaymentConfirmationClientProps {
  paymentId: string;
  orderReference: string;
  orderStatus: string;
  orderTotal: number;
  cryptoType: string;
  /**
   * The amount and address stored on the order when the invoice was created. Present for
   * every order since November 2026; older orders leave it null and the page asks NOWPayments.
   */
  initialDetails: PaymentDetails | null;
}

const ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 30_000;

/* One fetch that gives up after `ms`. AbortSignal.timeout is missing from older Safari. */
async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { cache: 'no-store', signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function PaymentConfirmationClient({
  paymentId,
  orderReference,
  orderStatus: initialStatus,
  orderTotal,
  cryptoType,
  initialDetails,
}: PaymentConfirmationClientProps) {
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(initialDetails);
  const [isLoading, setIsLoading] = useState(!initialDetails);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [orderStatus, setOrderStatus] = useState(initialStatus);

  /*
    Only for orders that predate the stored address. NOWPayments has been measured taking from
    one second to almost a minute to answer, and the first version of this page gave up after a
    single failed request and showed a dead end. Now: three tries, then a way to try again and a
    way to reach a person.
  */
  const loadDetails = useCallback(async () => {
    setIsLoading(true);
    setFailed(false);
    const url = `/api/crypto/payment-status/${paymentId}?order=${encodeURIComponent(orderReference)}`;
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      try {
        const response = await fetchWithTimeout(url, ATTEMPT_TIMEOUT_MS);
        if (response.ok) {
          const data = (await response.json()) as PaymentDetails;
          if (data?.pay_address && data.pay_amount) {
            setPaymentDetails(data);
            setIsLoading(false);
            return;
          }
        } else if (response.status === 404) {
          break; /* the payment does not belong to this order: retrying will not change that */
        }
      } catch {
        /* timed out or offline: try again below */
      }
      if (attempt < ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      }
    }
    setFailed(true);
    setIsLoading(false);
  }, [paymentId, orderReference]);

  useEffect(() => {
    if (!initialDetails) void loadDetails();
  }, [initialDetails, loadDetails]);

  /*
    Poll for the webhook's decision. CONFIRMED turns this into the "Payment received" page;
    CANCELLED (NOWPayments reported the payment expired or failed) stops the wait.
  */
  useEffect(() => {
    if (orderStatus === 'CONFIRMED' || orderStatus === 'CANCELLED') return;
    const interval = setInterval(async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const response = await fetchWithTimeout(
          `/api/orders/${encodeURIComponent(orderReference)}/status`,
          15_000
        );
        if (!response.ok) return;
        const data = await response.json();
        if (typeof data?.status === 'string') setOrderStatus(data.status);
      } catch {
        /* the next tick tries again */
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [orderReference, orderStatus]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const isConfirmed = orderStatus === 'CONFIRMED';
  const isCancelled = orderStatus === 'CANCELLED';
  const coin = (paymentDetails?.pay_currency ?? cryptoType).toUpperCase();

  if (isCancelled) {
    return (
      <Shell reference={orderReference} heading="This payment has expired">
        <p className="text-sm leading-relaxed text-ink-soft">
          Order {orderReference} was cancelled because its {coin} payment was not received in time.
          Do not send anything to the old address.
        </p>
        <PaymentHelp
          reference={orderReference}
          intro="If you already sent the payment, or you would like to place the order again, contact us:"
        />
      </Shell>
    );
  }

  if (!isConfirmed && isLoading) {
    return (
      <Shell reference={orderReference} heading="Complete your payment">
        <p className="text-sm text-ink-soft" role="status">
          Loading your {coin} payment address. This can take up to a minute.
        </p>
      </Shell>
    );
  }

  if (!isConfirmed && (failed || !paymentDetails)) {
    return (
      <Shell reference={orderReference} heading="Your order is saved">
        <div className="rounded-lg border border-warning/40 bg-warning/5 p-5">
          <p className="text-sm leading-relaxed text-ink">
            We couldn&rsquo;t load the {coin} payment address for order {orderReference} just now.
            Nothing has been charged.
          </p>
          <button
            type="button"
            onClick={() => void loadDetails()}
            className="mt-4 rounded-full bg-pigment-indigo px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift"
          >
            Try again
          </button>
        </div>
        <PaymentHelp
          reference={orderReference}
          intro="If it still doesn't load, contact us and we'll send you the amount and address to pay:"
        />
      </Shell>
    );
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
            {isConfirmed ? 'Payment Received!' : 'Complete Your Payment'}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">Order {orderReference}</p>
        </div>

        {/* Status Card */}
        <div className="rounded-lg border border-rule bg-paper-sunk p-6">
          <div className="flex items-center gap-3">
            {isConfirmed ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pigment-verdigris">
                <Check className="h-6 w-6 text-paper" strokeWidth={2} />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pigment-indigo">
                <Clock className="h-6 w-6 text-paper" strokeWidth={2} />
              </div>
            )}
            <div>
              <p className="font-semibold text-ink">
                {isConfirmed ? 'Payment Confirmed' : 'Waiting for Payment'}
              </p>
              <p className="text-sm text-ink-soft">
                {isConfirmed
                  ? 'Your payment has been received. Order is being processed.'
                  : 'Send the amount below to complete your order'}
              </p>
            </div>
          </div>
        </div>

        {!isConfirmed && paymentDetails && (
          <>
            {/* Payment Details */}
            <div className="space-y-4">
              <div className="border-t border-rule pt-6">
                <h2 className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                  Amount to Send
                </h2>
                <p className="mt-3 font-display text-3xl font-semibold text-ink">
                  {paymentDetails.pay_amount} {paymentDetails.pay_currency.toUpperCase()}
                </p>
              </div>

              {/* Wallet Address */}
              <div className="border-t border-rule pt-6">
                <h3 className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                  Send to Address
                </h3>
                <div className="mt-4 flex items-start gap-3">
                  <div className="flex-1 break-all rounded border border-rule bg-paper p-4 font-mono text-sm text-ink">
                    {paymentDetails.pay_address}
                  </div>
                  <button
                    onClick={() => copyToClipboard(paymentDetails.pay_address)}
                    className="mt-0.5 flex items-center gap-2 rounded border border-rule px-3 py-2 text-xs transition-colors hover:bg-paper-sunk"
                    title="Copy address"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="border-t border-rule pt-6">
                <h3 className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                  Instructions
                </h3>
                <ol className="mt-4 space-y-2 text-sm text-ink-soft">
                  <li>1. Open your crypto wallet or exchange</li>
                  <li>2. Send <strong>{paymentDetails.pay_amount} {paymentDetails.pay_currency.toUpperCase()}</strong> to the address above</li>
                  <li>3. Confirm the transaction</li>
                  <li>4. This page will automatically update when payment is received</li>
                </ol>
              </div>

              {/* Info */}
              <div className="border-t border-rule pt-6">
                <div className="rounded border border-rule/50 bg-blue-50/30 p-4 text-sm text-ink-soft">
                  <p>
                    <strong className="text-ink">Note:</strong> Payment may take several minutes to confirm depending on network congestion. You can close this page and come back to it from the link in your order email.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Order Summary */}
        <div className="border-t border-rule pt-6">
          <h3 className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
            Order Summary
          </h3>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-soft">Order ID:</span>
              <span className="font-mono text-ink">{orderReference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Amount:</span>
              <span className="text-ink">${orderTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Status:</span>
              <span className={`font-semibold ${isConfirmed ? 'text-pigment-verdigris' : 'text-pigment-indigo'}`}>
                {isConfirmed ? 'Confirmed' : 'Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Shell({
  reference,
  heading,
  children,
}: {
  reference: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-paper px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink">{heading}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Order <span className="font-mono">{reference}</span>
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
