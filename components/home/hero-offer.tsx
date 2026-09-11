'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { ProductPlate } from '@/components/product/product-plate';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AdvertisedDiscount, ProductSummary } from '@/lib/types';

/*
  The offer card that floats over the hero bath.

  It used to show `products[0]` — whichever product happened to sort first, with nothing about
  why — and it would have thrown on an empty catalogue, taking the home page with it. It is now the
  site's promotion slot, fed by two things an administrator actually controls:

  - the DEALS: products flagged "on offer" in the admin that carry a real markdown, biggest saving
    first. Which products appear here is therefore decided by the `isDeal` flag and the
    compare-at price, not by this file.
  - an optional CODE: only the one named in Settings, and only while the checkout would accept it.
    See `advertisedDiscount` in lib/discounts for why a code is never chosen automatically.

  STEPPED BY THE VISITOR, NEVER ON A TIMER. This build has no motion, and content that advances on
  its own is also a WCAG 2.2.2 failure: somebody reading the price has it pulled away from them. The
  counter is a polite live region, so a screen reader hears which offer they moved to.

  The card is not one big link any more. It holds buttons, and a button inside an <a> is invalid
  HTML that also navigates on every press. The product is the link; the controls sit beside it.

  It is opaque paper over the live pigment — the craft floor's rule for anything carrying text on
  the bath. "Third-party assayed" is gone from it: the catalogue holds no assay for these
  products, and a promotion is the last place to make a claim nobody can show.
*/

export function HeroOffer({
  offers,
  fallback,
  promoCode,
}: {
  /** Deals with a real markdown, already ordered by the server. */
  offers: ProductSummary[];
  /** Shown, without any offer framing, when nothing is on offer. */
  fallback: ProductSummary | null;
  promoCode: AdvertisedDiscount | null;
}) {
  const [index, setIndex] = React.useState(0);
  const [copied, setCopied] = React.useState(false);

  const onOffer = offers.length > 0;
  const list = onOffer ? offers : fallback ? [fallback] : [];
  const product = list.length ? list[index % list.length] : null;

  /* Nothing to promote and nothing to show: no card at all, rather than an empty frame. */
  if (!product && !promoCode) return null;

  const step = (delta: number) =>
    setIndex((current) => (current + delta + list.length) % list.length);

  const copy = async () => {
    if (!promoCode) return;
    try {
      await navigator.clipboard.writeText(promoCode.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard refused (an insecure context, or a denied permission). The code is on screen
         in full, so the visitor can still select it; there is nothing to recover. */
    }
  };

  const compareAt = product?.compareAtPrice ?? null;
  const saving = product && compareAt && compareAt > product.price ? compareAt - product.price : 0;
  const percent = saving && compareAt ? Math.round((saving / compareAt) * 100) : 0;
  const strength = product ? (product.specifications[0]?.value ?? product.category) : '';

  return (
    <div className="absolute bottom-6 left-5 right-5 z-10 border border-rule bg-paper shadow-lift sm:left-auto sm:w-[25rem]">
      {product && (
        <div className="p-5">
          {onOffer && (
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="bg-pigment-madder px-2 py-1 font-mono text-2xs uppercase tracking-[0.12em] text-primary-foreground tabular">
                {percent > 0 ? `−${percent}% · On offer` : 'On offer'}
              </span>

              {list.length > 1 && (
                <span className="flex items-center gap-1.5">
                  <span
                    className="mr-1 font-mono text-2xs text-ink-faint tabular"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    <span className="sr-only">Offer </span>
                    {index + 1} / {list.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    aria-label="Previous offer"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-rule-strong text-ink-soft transition-colors hover:border-pigment-indigo hover:text-pigment-indigo"
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label="Next offer"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-rule-strong text-ink-soft transition-colors hover:border-pigment-indigo hover:text-pigment-indigo"
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </span>
              )}
            </div>
          )}

          <Link href={`/product/${product.slug}`} className="group flex items-center gap-4">
            <span className="relative h-16 w-16 shrink-0 overflow-hidden border border-rule bg-paper-sunk">
              <ProductPlate product={product} showMarking={false} sizes="64px" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-semibold leading-tight tracking-[-0.02em] transition-colors group-hover:text-pigment-indigo">
                {product.name}
              </span>
              <span className="mt-1 block truncate text-xs text-ink-faint">
                {product.brand}
                <span className="px-1.5 text-rule-strong" aria-hidden="true">
                  /
                </span>
                <span className="tabular">{strength}</span>
              </span>
            </span>

            <ArrowRight
              className="h-5 w-5 shrink-0 text-ink-faint transition-colors group-hover:text-pigment-indigo"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </Link>

          <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-rule pt-3">
            <span className="flex items-baseline gap-2">
              <span className="text-base font-semibold tabular">{formatPrice(product.price)}</span>
              {saving > 0 && compareAt && (
                <span className="text-xs text-ink-faint line-through tabular">
                  {formatPrice(compareAt)}
                </span>
              )}
            </span>

            {onOffer ? (
              <Link
                href="/shop?filter=deals"
                className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-soft underline decoration-rule-strong underline-offset-4 transition-colors hover:text-pigment-indigo hover:decoration-pigment-indigo"
              >
                All offers
              </Link>
            ) : (
              <span className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                {product.category}
              </span>
            )}
          </div>
        </div>
      )}

      {/*
        The code, with every condition the checkout will enforce stated beside it. A headline that
        says "10% off" over a basket the till then refuses is how a promotion becomes a complaint.
      */}
      {promoCode && (
        <div
          className={cn(
            'flex items-center justify-between gap-3 bg-paper-sunk px-5 py-3.5',
            product && 'border-t border-rule'
          )}
        >
          <span className="min-w-0 text-xs leading-snug text-ink-soft">
            <span className="font-medium text-ink">{promoCode.headline}</span>
            {promoCode.condition ? ` ${promoCode.condition}` : ''} with code
          </span>

          <button
            type="button"
            onClick={copy}
            aria-label={copied ? `Code ${promoCode.code} copied` : `Copy code ${promoCode.code}`}
            className={cn(
              'flex shrink-0 items-center gap-2 border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] transition-colors',
              copied
                ? 'border-pigment-verdigris text-pigment-verdigris'
                : 'border-rule-strong text-ink hover:border-pigment-indigo hover:text-pigment-indigo'
            )}
          >
            {promoCode.code}
            {copied ? (
              <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
