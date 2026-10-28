'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { useStore } from '@/components/providers/store-provider';
import type { CartItem } from '@/lib/types';

/*
  Puts a reminded basket back into this device's cart, then opens the checkout.

  The lines come from /api/basket/restore with today's prices and only what is in stock, so a
  basket restored a week later is never quoted at an old price. It REPLACES the cart rather than
  adding to it: the link means "this basket", and merging would double anything already there.
  A client-side push keeps the store provider mounted, so the checkout opens with the cart the
  effect has just persisted.
*/

type Line = { productId: string; slug: string; name: string; brand: string; image: string; price: number; quantity: number };

export function RestoreBasket({ token }: { token: string }) {
  const router = useRouter();
  const { replaceCart } = useStore();
  const [state, setState] = React.useState<'working' | 'empty' | 'expired'>('working');
  const started = React.useRef(false);

  React.useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetch(`/api/basket/restore?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then((r) => r.json() as Promise<{ ok: boolean; items: Line[] }>)
      .then((data) => {
        if (!data.ok) return setState('expired');
        if (data.items.length === 0) return setState('empty');
        const items: CartItem[] = data.items.map((l) => ({
          productId: l.productId,
          name: l.name,
          slug: l.slug,
          price: l.price,
          image: l.image,
          quantity: l.quantity,
          brand: l.brand,
        }));
        replaceCart(items);
        router.replace('/checkout');
      })
      .catch(() => setState('expired'));
  }, [token, replaceCart, router]);

  return (
    <section className="border-b border-rule">
      <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <ShoppingBag className="h-8 w-8 text-pigment-indigo" strokeWidth={1.5} />
        {state === 'working' ? (
          <>
            <h1 className="mt-5 font-display text-2xl font-semibold tracking-[-0.03em]">Restoring your basket…</h1>
            <p className="mt-2 text-sm text-ink-soft">Taking you to the checkout in a moment.</p>
          </>
        ) : (
          <>
            <h1 className="mt-5 font-display text-2xl font-semibold tracking-[-0.03em]">
              {state === 'empty' ? 'Those items are out of stock now' : 'This basket link has expired'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {state === 'empty'
                ? 'Everything that was in your basket has sold out since. The shop has the rest of the range.'
                : 'Basket links work for 30 days. Your products are still in the shop.'}
            </p>
            <Link
              href="/shop"
              className="mt-8 rounded-full bg-pigment-indigo px-7 py-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift"
            >
              Go to the shop
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
