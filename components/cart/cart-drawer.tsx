'use client';

import * as React from 'react';
import Link from 'next/link';
import { Minus, Plus, X, ArrowRight, ShoppingBag } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useStore } from '@/components/providers/store-provider';
import Image from 'next/image';

import { formatPrice } from '@/lib/format';
import { useCountry } from '@/components/providers/country-provider';
import { useDictionary } from '@/components/i18n/use-locale';
import { ApproxPrice, CurrencyNote } from '@/components/currency/approx-price';
import { matchZone } from '@/lib/delivery/match';

/*
  The free-delivery line follows the visitor's country.

  It used to read a constant of $250 that matched no zone — the US rate is free from $150 and
  Europe's from $200 — so it promised the wrong figure everywhere. It now takes the threshold
  from the zone that serves the selected country (the US until a country is known, as the
  store's home market), and a zone with no free-delivery rate gets its starting price instead
  of a progress bar toward something that does not exist. Checkout still quotes for itself.
*/
function useFreeDelivery() {
  const { country, zones } = useCountry();
  const zone = matchZone(zones, country ?? 'US');
  const freeRates = (zone?.rates ?? []).filter((r) => r.freeOver !== null);
  const freeOver = freeRates.length ? Math.min(...freeRates.map((r) => r.freeOver as number)) : null;
  const cheapest = zone?.rates[0]?.price ?? null;
  return { country: country ?? 'US', freeOver, cheapest };
}

/*
  The cart's own snapshot draws the thumbnail.

  This used to look the product up in the catalogue the layout shipped to every page. Nothing
  else here needed that catalogue, and the snapshot already carries the picture, so the lookup
  was the only reason half a megabyte travelled with every page load. A line added before the
  snapshot carried an image falls back to its name.
*/
function CartPlate({ image, name }: { image?: string; name: string }) {
  if (!image) {
    return (
      <span className="flex h-full w-full items-center justify-center bg-paper-sunk p-1 text-center font-mono text-2xs leading-tight text-ink-faint">
        {name}
      </span>
    );
  }
  return (
    <Image
      src={image}
      alt=""
      fill
      sizes="80px"
      className="object-contain mix-blend-multiply dark:mix-blend-normal"
    />
  );
}

export function CartDrawer() {
  const {
    cart,
    cartOpen,
    setCartOpen,
    updateQuantity,
    removeFromCart,
    cartSubtotal,
    cartCount,
  } = useStore();

  const t = useDictionary();
  const free = useFreeDelivery();
  const remaining = free.freeOver !== null ? Math.max(0, free.freeOver - cartSubtotal) : 0;
  const progress = free.freeOver !== null ? Math.min(100, (cartSubtotal / free.freeOver) * 100) : 0;
  const countryName = free.country === 'OTHER' ? t.delivery.otherCountries : t.country.names[free.country];

  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-rule bg-paper p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-rule px-5 py-4 text-left">
          <SheetTitle className="flex items-baseline gap-2.5 font-display text-base tracking-[-0.02em]">
            {t.cart.title}
            <span className="font-mono text-2xs text-ink-faint tabular">
              {cartCount} {t.cart.items(cartCount)}
            </span>
          </SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <ShoppingBag
              className="h-8 w-8 text-ink-faint"
              strokeWidth={1.25}
              aria-hidden="true"
            />
            <p className="mt-5 font-display text-lg font-semibold tracking-[-0.025em]">
              {t.cart.emptyTitle}
            </p>
            <p className="measure-tight mt-2 text-sm leading-relaxed text-ink-soft">
              {t.cart.emptyBody}
            </p>
            <Link
              href="/shop"
              onClick={() => setCartOpen(false)}
              className="mt-6 rounded-full bg-pigment-indigo px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift"
            >
              {t.cart.browse}
            </Link>
          </div>
        ) : (
          <>
            <div className="border-b border-rule px-5 py-3.5">
              {free.freeOver === null ? (
                free.cheapest !== null && (
                  <p className="text-xs text-ink-soft">
                    {t.cart.deliveryFrom(countryName, formatPrice(free.cheapest))}
                  </p>
                )
              ) : (
                <>
                  {remaining > 0 ? (
                    <p className="text-xs text-ink-soft">
                      {t.cart.moreForFree[0]}
                      <span className="tabular">{formatPrice(remaining)}</span>
                      {t.cart.moreForFree[1]}
                    </p>
                  ) : (
                    <p className="text-xs text-pigment-verdigris">{t.cart.freeApplied}</p>
                  )}
                  <div
                    className="mt-2 h-px w-full bg-rule"
                    role="progressbar"
                    aria-valuenow={Math.round(progress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t.cart.progress}
                  >
                    <div
                      className="h-px bg-pigment-indigo transition-[width] duration-500 ease-lift"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              )}
            </div>

            <ul className="flex-1 overflow-y-auto">
              {cart.map((item) => (
                <li
                  key={item.productId}
                  className="flex gap-4 border-b border-rule px-5 py-4"
                >
                  <Link
                    href={`/product/${item.slug}`}
                    onClick={() => setCartOpen(false)}
                    className="relative h-20 w-20 shrink-0 overflow-hidden border border-rule bg-paper-sunk"
                  >
                    <CartPlate image={item.image} name={item.name} />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                      {item.brand}
                    </p>
                    <Link
                      href={`/product/${item.slug}`}
                      onClick={() => setCartOpen(false)}
                      className="mt-1 block text-sm font-medium leading-snug hover:text-pigment-indigo"
                    >
                      {item.name}
                    </Link>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center border border-rule">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          className="flex h-7 w-7 items-center justify-center text-ink-soft transition-colors hover:bg-paper-sunk disabled:opacity-40"
                          aria-label={t.cart.decrease(item.name)}
                        >
                          <Minus className="h-3 w-3" strokeWidth={2} />
                        </button>
                        <span className="w-8 text-center font-mono text-xs tabular">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity + 1)
                          }
                          className="flex h-7 w-7 items-center justify-center text-ink-soft transition-colors hover:bg-paper-sunk"
                          aria-label={t.cart.increase(item.name)}
                        >
                          <Plus className="h-3 w-3" strokeWidth={2} />
                        </button>
                      </div>

                      <span className="text-sm font-medium tabular">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.productId)}
                    className="h-fit text-ink-faint transition-colors hover:text-pigment-madder"
                    aria-label={t.cart.remove(item.name)}
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>

            <div className="border-t border-rule px-5 py-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-soft">{t.cart.subtotal}</span>
                <span className="font-display text-xl font-semibold tabular">
                  {formatPrice(cartSubtotal)}
                </span>
              </div>
              <p className="mt-0.5 text-right">
                <ApproxPrice usd={cartSubtotal} className="text-xs" />
              </p>
              <p className="mt-1.5 text-xs text-ink-faint">
                {t.cart.shippingNote}
              </p>
              <CurrencyNote className="mt-1" />

              <Link
                href="/checkout"
                onClick={() => setCartOpen(false)}
                className="group mt-5 flex items-center justify-center gap-2.5 rounded-full bg-pigment-indigo px-6 py-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift"
              >
                {t.cart.checkout}
                <ArrowRight
                  className="h-4 w-4"
                  strokeWidth={1.75}
                />
              </Link>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="mt-3 w-full text-center text-sm text-ink-soft underline underline-offset-4 transition-colors hover:text-ink"
              >
                {t.cart.keepBrowsing}
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
