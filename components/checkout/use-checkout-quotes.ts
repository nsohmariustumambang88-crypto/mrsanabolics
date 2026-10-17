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
  /**
   * Check a code with the server. With `override` (the promotion checkbox) that code is used
   * instead of whatever is typed, and it is kept applied as the basket or shipping changes.
   */
  apply: (override?: string) => Promise<void>;
  clear: () => void;
};

/**
 * A discount quote for this basket.
 *
 * `shipping` is passed because a code now comes off the order total INCLUDING shipping, and
 * the server refuses a code that would take the total under the shop minimum. Both are the
 * server's decisions; this hook only holds the answer.
 */
export function useDiscountCode(subtotal: number, shipping: number): DiscountState {
  const [code, setCode] = React.useState('');
  const [applied, setApplied] = React.useState<AppliedDiscount | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(false);

  /* Set when the checkbox applied the code: then a changed basket re-checks it rather than
     dropping it, so the total on screen is always the total that will be charged. */
  const auto = React.useRef<string | null>(null);
  /* Only the newest answer counts; an older reply arriving late must not overwrite it. */
  const latest = React.useRef(0);
  /* The basket (subtotal|shipping) the current quote was made for. */
  const quotedFor = React.useRef<string | null>(null);
  const basketKey = `${subtotal}|${shipping}`;

  const check = React.useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      const ticket = ++latest.current;
      setChecking(true);
      setMessage(null);
      try {
        const response = await fetch('/api/discount/validate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code: trimmed, subtotal, shipping }),
        });
        const data = (await response.json()) as {
          valid?: boolean;
          amount?: number;
          freeShipping?: boolean;
          message?: string;
        };
        if (ticket !== latest.current) return;

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
        if (ticket !== latest.current) return;
        setApplied(null);
        setMessage('That code could not be checked just now. Try again in a moment.');
      } finally {
        if (ticket === latest.current) setChecking(false);
      }
    },
    [subtotal, shipping]
  );

  const apply = React.useCallback(
    async (override?: string) => {
      if (override) {
        auto.current = override;
        setCode(override);
      } else {
        auto.current = null;
      }
      quotedFor.current = basketKey;
      await check(override ?? code);
    },
    [check, code, basketKey]
  );

  /*
    A basket or shipping change after a code was accepted invalidates the quote — the amount is
    a function of both. A code the shopper typed is dropped and must be applied again; the
    promotion's checkbox code is simply re-checked against the new total.
  */
  React.useEffect(() => {
    if (auto.current) {
      if (quotedFor.current !== basketKey) {
        quotedFor.current = basketKey;
        void check(auto.current);
      }
      return;
    }
    if (!applied) {
      quotedFor.current = null;
      return;
    }
    if (quotedFor.current === null) {
      quotedFor.current = basketKey;
      return;
    }
    if (quotedFor.current !== basketKey) {
      quotedFor.current = null;
      setApplied(null);
      setMessage('Your basket changed, so the code needs applying again.');
    }
  }, [basketKey, applied, check]);

  const clear = React.useCallback(() => {
    auto.current = null;
    quotedFor.current = null;
    latest.current++;
    setChecking(false);
    setApplied(null);
    setMessage(null);
    setCode('');
  }, []);

  return { code, setCode, applied, message, checking, apply, clear };
}
