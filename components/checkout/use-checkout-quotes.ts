'use client';

import * as React from 'react';

/*
  The two things at checkout the browser is not allowed to decide for itself.

  Both hooks ask the server and hold only the answer. That is the point: a delivery price or a
  discount worked out in the browser is a price the buyer can edit with the dev tools open. The
  same evaluation runs again when an order is recorded in the admin, against the same tables,
  so what is shown here is a quote and never an authority.

  Neither hook throws. A checkout that cannot reach the quote endpoint should fall back to the
  flat rate and keep working, not stall on a step nobody can leave.
*/

export type DeliveryOption = {
  rateId: string;
  name: string;
  price: number;
  estimate: string;
  free: boolean;
};

type DeliveryState = {
  options: DeliveryOption[];
  selectedId: string | null;
  select: (id: string) => void;
  loading: boolean;
  /** True once a country has been given but no zone covers it. */
  uncovered: boolean;
};

/** Only ask once the field looks like a country, and only then. */
function looksLikeCountry(value: string): boolean {
  return value.trim().length >= 2;
}

export function useDeliveryQuote(country: string, subtotal: number): DeliveryState {
  const [options, setOptions] = React.useState<DeliveryOption[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [uncovered, setUncovered] = React.useState(false);

  React.useEffect(() => {
    if (!looksLikeCountry(country)) {
      setOptions([]);
      setUncovered(false);
      return;
    }

    /* Debounced: the country field is typed into, and every keystroke is not a question. */
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/delivery/quote', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ country: country.trim(), subtotal }),
        });
        const data = (await response.json()) as {
          options?: DeliveryOption[];
          zone?: unknown;
        };
        if (cancelled) return;

        const next = Array.isArray(data.options) ? data.options : [];
        setOptions(next);
        setUncovered(next.length === 0);
      } catch {
        /* Keep whatever was last quoted rather than emptying the step under them. */
        if (!cancelled) setUncovered(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [country, subtotal]);

  /* Keep the selection valid: if the chosen rate is no longer offered, fall to the first. */
  React.useEffect(() => {
    setSelectedId((current) => {
      if (current && options.some((o) => o.rateId === current)) return current;
      return options[0]?.rateId ?? null;
    });
  }, [options]);

  return { options, selectedId, select: setSelectedId, loading, uncovered };
}

export type AppliedDiscount = {
  code: string;
  amount: number;
  freeShipping: boolean;
};

type DiscountState = {
  code: string;
  setCode: (value: string) => void;
  applied: AppliedDiscount | null;
  message: string | null;
  checking: boolean;
  apply: () => Promise<void>;
  clear: () => void;
};

export function useDiscountCode(subtotal: number): DiscountState {
  const [code, setCode] = React.useState('');
  const [applied, setApplied] = React.useState<AppliedDiscount | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(false);

  const apply = React.useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setChecking(true);
    setMessage(null);
    try {
      const response = await fetch('/api/discount/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: trimmed, subtotal }),
      });
      const data = (await response.json()) as {
        valid?: boolean;
        amount?: number;
        freeShipping?: boolean;
        message?: string;
      };

      if (data.valid) {
        setApplied({
          code: trimmed.toUpperCase(),
          amount: Number(data.amount) || 0,
          freeShipping: Boolean(data.freeShipping),
        });
        setMessage(null);
      } else {
        setApplied(null);
        /*
          Whatever the server says, verbatim. It deliberately gives the same sentence for a
          code that does not exist and one that has expired — distinguishing them turns this
          box into a way to enumerate live codes.
        */
        setMessage(data.message ?? 'That code is not valid.');
      }
    } catch {
      setApplied(null);
      setMessage('That code could not be checked just now. Try again in a moment.');
    } finally {
      setChecking(false);
    }
  }, [code, subtotal]);

  /*
    A basket that changes after a code was accepted invalidates the quote — the amount is a
    function of the subtotal, and a percentage struck on a bigger basket is not the discount
    that was granted. Rather than silently recompute, drop it and make them apply it again.
  */
  const appliedAt = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!applied) {
      appliedAt.current = null;
      return;
    }
    if (appliedAt.current === null) {
      appliedAt.current = subtotal;
      return;
    }
    if (appliedAt.current !== subtotal) {
      appliedAt.current = null;
      setApplied(null);
      setMessage('Your basket changed, so the code needs applying again.');
    }
  }, [subtotal, applied]);

  const clear = React.useCallback(() => {
    setApplied(null);
    setMessage(null);
    setCode('');
  }, []);

  return { code, setCode, applied, message, checking, apply, clear };
}
