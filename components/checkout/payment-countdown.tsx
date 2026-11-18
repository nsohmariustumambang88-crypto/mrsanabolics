'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
  Time left to pay an order, counted to a deadline something actually enforces (see
  lib/orders/payment-deadline.ts). It is never reset by reloading: the deadline comes from the
  server, the clock from the visitor's device.

  The digits render only after mount, so the server's clock and the browser's never have to
  agree on a second. The timer role keeps screen readers from announcing every tick; the
  sentence beneath gives the deadline as a time in the visitor's own zone.
*/

const SECOND = 1000;
/* The last quarter of an hour turns the clock madder. */
const URGENT_MS = 15 * 60_000;

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
  note,
  expiredNote,
  onExpire,
  className,
}: {
  /** ISO date of the deadline. */
  dueAt: string;
  /** What happens at the deadline, said once under the clock. */
  note: React.ReactNode;
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
          The time to pay has run out
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
        Time left to pay
      </p>
      <p
        role="timer"
        aria-label="Time left to pay"
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
            {pad(p.hours)}
            <span className="text-base text-ink-faint">h</span> {pad(p.minutes)}
            <span className="text-base text-ink-faint">m</span> {pad(p.seconds)}
            <span className="text-base text-ink-faint">s</span>
          </>
        ) : (
          <span className="text-ink-faint">--h --m --s</span>
        )}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        {deadlineText && (
          <>
            Pay by <strong className="font-medium text-ink">{deadlineText}</strong> (your time).{' '}
          </>
        )}
        {note}
      </p>
    </div>
  );
}
