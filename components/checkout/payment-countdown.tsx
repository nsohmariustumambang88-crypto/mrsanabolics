'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
  The payment countdown (lib/orders/payment-deadline.ts). It is never reset by reloading: the
  deadline comes from the server, the clock from the visitor's device.

  Two kinds. `soft` (every order since 19 November 2026) is a request: "Please pay within", and
  at zero "Please complete your payment now", because nothing is cancelled then and the clock
  must not say otherwise. Without `soft` it counts to a deadline that is real (an old crypto
  order's NOWPayments expiry): "Time left to pay", and at zero "The time to pay has run out".

  Just the clock, at the owner's request (19 November 2026): no sentence under it. The digits
  render only after mount, so the server's clock and the browser's never have to agree on a
  second. The timer role keeps screen readers from announcing every tick, and its label carries
  the deadline as a time in the visitor's own zone.
*/

const SECOND = 1000;
/* The last five minutes turn the clock madder. */
const URGENT_MS = 5 * 60_000;

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / SECOND));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

export function PaymentCountdown({
  dueAt,
  soft = false,
  expiredNote,
  onExpire,
  className,
}: {
  /** ISO date of the deadline. */
  dueAt: string;
  /** A request rather than a deadline: nothing happens at zero. */
  soft?: boolean;
  /** Shown instead of the clock once the time has run out. */
  expiredNote: React.ReactNode;
  onExpire?: () => void;
  className?: string;
}) {
  const due = React.useMemo(() => new Date(dueAt).getTime(), [dueAt]);
  const [now, setNow] = React.useState<number | null>(null);
  const [deadlineText, setDeadlineText] = React.useState('');

  React.useEffect(() => {
    setNow(Date.now());
    setDeadlineText(
      new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(due))
    );
    const timer = window.setInterval(() => setNow(Date.now()), SECOND);
    return () => window.clearInterval(timer);
  }, [due]);

  const left = now === null ? null : due - now;
  const expired = left !== null && left <= 0;

  const expiredRef = React.useRef(false);
  React.useEffect(() => {
    if (expired && !expiredRef.current) {
      expiredRef.current = true;
      onExpire?.();
    }
  }, [expired, onExpire]);

  if (expired) {
    return (
      <div
        role="status"
        className={cn('border border-pigment-madder bg-paper-sunk p-5 text-left', className)}
      >
        <p className="flex items-center gap-2 font-display text-lg font-semibold tracking-[-0.025em] text-pigment-madder">
          <Clock className="h-4 w-4 shrink-0" strokeWidth={2} />
          {soft ? 'Please complete your payment now' : 'The time to pay has run out'}
        </p>
        <div className="mt-2 text-sm leading-relaxed text-ink-soft">{expiredNote}</div>
      </div>
    );
  }

  const p = left === null ? null : parts(left);
  const urgent = left !== null && left <= URGENT_MS;

  return (
    <div
      className={cn(
        'border bg-paper-sunk p-5 text-left',
        urgent ? 'border-pigment-madder' : 'border-rule-strong',
        className
      )}
    >
      <p className="flex items-center gap-2 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
        <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        {soft ? 'Please pay within' : 'Time left to pay'}
      </p>
      <p
        role="timer"
        aria-label={`${soft ? 'Please pay within' : 'Time left to pay'}${deadlineText ? `, until ${deadlineText}` : ''}`}
        className={cn(
          'mt-2 font-mono text-3xl font-semibold tabular tracking-tight',
          urgent ? 'text-pigment-madder' : 'text-ink'
        )}
      >
        {p ? (
          <>
            {p.days > 0 && (
              <>
                {p.days}
                <span className="text-base text-ink-faint">d</span>{' '}
              </>
            )}
            {(p.days > 0 || p.hours > 0) && (
              <>
                {pad(p.hours)}
                <span className="text-base text-ink-faint">h</span>{' '}
              </>
            )}
            {pad(p.minutes)}
            <span className="text-base text-ink-faint">m</span> {pad(p.seconds)}
            <span className="text-base text-ink-faint">s</span>
          </>
        ) : (
          <span className="text-ink-faint">--m --s</span>
        )}
      </p>
    </div>
  );
}
