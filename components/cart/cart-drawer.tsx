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
import { ProductPlate } from '@/components/product/product-plate';
import { useProducts } from '@/components/providers/catalogue-provider';
import { formatPrice } from '@/lib/format';

const FREE_SHIPPING_AT = 250;

/* The cart stores a flat snapshot, so the full record is looked up to draw its plate. */
function CartPlate({ slug, name }: { slug: string; name: string }) {
  const products = useProducts();
  const product = products.find((p) => p.slug === slug);
  if (!product) {
    return (
      <span className="flex h-full w-full items-center justify-center bg-paper-sunk p-1 text-center font-mono text-2xs leading-tight text-ink-faint">
        {name}
      </span>
    );
  }
  return <ProductPlate product={product} showMarking={false} sizes="80px" />;
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

  const remaining = Math.max(0, FREE_SHIPPING_AT - cartSubtotal);
  const progress = Math.min(100, (cartSubtotal / FREE_SHIPPING_AT) * 100);

  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-rule bg-paper p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-rule px-5 py-4 text-left">
          <SheetTitle className="flex items-baseline gap-2.5 font-display text-base tracking-[-0.02em]">
            Your cart
            <span className="font-mono text-2xs text-ink-faint tabular">
              {cartCount} {cartCount === 1 ? 'item' : 'items'}
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
              Nothing lifted yet
            </p>
            <p className="measure-tight mt-2 text-sm leading-relaxed text-ink-soft">
              Compounds you add will collect here, with the specification attached to each one.
            </p>
            <Link
              href="/shop"
              onClick={() => setCartOpen(false)}
              className="mt-6 rounded-full bg-pigment-indigo px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift"
            >
              Browse the catalogue
            </Link>
          </div>
        ) : (
          <>
            <div className="border-b border-rule px-5 py-3.5">
              {remaining > 0 ? (
                <p className="text-xs text-ink-soft">
                  <span className="tabular">{formatPrice(remaining)}</span> more for free
                  tracked shipping
                </p>
              ) : (
                <p className="text-xs text-pigment-verdigris">
                  Free tracked shipping applied
                </p>
              )}
              <div
                className="mt-2 h-px w-full bg-rule"
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progress toward free shipping"
              >
                <div
                  className="h-px bg-pigment-indigo transition-[width] duration-500 ease-lift"
                  style={{ width: `${progress}%` }}
                />
              </div>
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
                    <CartPlate slug={item.slug} name={item.name} />
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
                          aria-label={`Decrease quantity of ${item.name}`}
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
                          aria-label={`Increase quantity of ${item.name}`}
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
                    aria-label={`Remove ${item.name} from cart`}
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>

            <div className="border-t border-rule px-5 py-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-soft">Subtotal</span>
                <span className="font-display text-xl font-semibold tabular">
                  {formatPrice(cartSubtotal)}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-ink-faint">
                Shipping and duties calculated at checkout.
              </p>

              <Link
                href="/checkout"
                onClick={() => setCartOpen(false)}
                className="group mt-5 flex items-center justify-center gap-2.5 rounded-full bg-pigment-indigo px-6 py-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift"
              >
                Checkout
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
                Keep browsing
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
