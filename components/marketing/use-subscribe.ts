'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { looksLikeEmail, type ConsentSource } from '@/lib/marketing/consent';

/*
  One submit path for every capture point.

  The newsletter band, the exit-intent card and the checkout field all post the same shape to
  the same route, so a change to validation, error handling or the consent rule lands in all
  three at once. Three near-identical handlers is how one of them quietly stops requiring the
  checkbox.

  The path travels with the sign-up because it is the useful half of "they browsed and did not
  buy": knowing someone subscribed from a product page tells you what to send them, and it is
  recorded from a form they submitted rather than harvested from browsing.
*/

export type SubscribeState = {
  email: string;
  setEmail: (v: string) => void;
  consent: boolean;
  setConsent: (v: boolean) => void;
  busy: boolean;
  done: boolean;
  error: string | null;
  submit: (event?: React.FormEvent) => Promise<void>;
};

export function useSubscribe(source: ConsentSource, cartValue?: number): SubscribeState {
  const pathname = usePathname();
  const [email, setEmail] = React.useState('');
  const [consent, setConsent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = React.useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      setError(null);

      if (!looksLikeEmail(email)) {
        setError('That address is missing an @ or a domain.');
        return;
      }
      if (!consent) {
        setError('Tick the box to confirm you want these emails.');
        return;
      }

      setBusy(true);
      try {
        const res = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            source,
            consent,
            path: pathname,
            ...(typeof cartValue === 'number' ? { cartValue } : {}),
          }),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setError(json.error ?? 'Could not sign you up. Try again shortly.');
          return;
        }

        setDone(true);
      } catch {
        setError('Could not reach the server. Check your connection and try again.');
      } finally {
        setBusy(false);
      }
    },
    [email, consent, source, pathname, cartValue]
  );

  return { email, setEmail, consent, setConsent, busy, done, error, submit };
}
