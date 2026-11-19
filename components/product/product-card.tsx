'use client';

import * as React from 'react';
import Link from 'next/link';
import { Heart, Plus, Check } from 'lucide-react';
import { useStore } from '@/components/providers/store-provider';
import { formatPrice } from '@/lib/format';
import { ProductPlate } from '@/components/product/product-plate';
import { useSiteSettings } from '@/components/providers/settings-provider';
import type { ProductSummary } from '@/lib/types';
import { cn } from '@/lib/utils';
import { referencePrice } from '@/lib/pricing';
import { useDictionary } from '@/components/i18n/use-locale';
import { ApproxPrice } from '@/components/currency/approx-price';

/*
  The product card, styled after a reference store the owner chose (19 November 2026), in this
  site's own colours. No box around the card: the photograph sits on a rounded paper tile and
  the text runs underneath it.

  - The tile is 5:4 with a 4px radius. The pack shot's white is multiplied into the paper and
    given 9% of breathing room, so the pack sits on the sheet rather than in a white rectangle.
  - Hovering anywhere on the card eases the photograph up to 105% over 0.7s on the site's one
    curve (ease-lift, an exponential ease-out). The name underlines.
  - The heart is a small frosted square in the corner that answers a press. It sits beside the
    link, never inside it: a button inside an <a> is invalid and navigates on every press.
  - Name in bold, two lines reserved so every row lines up; maker and strength in small caps;
    price in heavy figures, with the stock state (one dot, one word) where the reference showed
    a star rating, because this catalogue holds no ratings to show.
  - "Add to cart" stays on the card (the owner's request), at the foot so a row's buttons align.
  - It rises into view as it scrolls in (data-reveal, components/motion/scroll-reveal.tsx).
    Every motion stops under prefers-reduced-motion.
*/

export function stockState(product: ProductSummary, lowStockThreshold = 5) {
  if (!product.inStock) {
    return { label: 'Out of stock', token: 'hsl(var(--pig-madder))', tone: 'text-destructive' };
  }
  if (product.stockCount <= lowStockThreshold) {
    return {
      label: `${product.stockCount} left`,
      token: 'hsl(var(--pig-saffron))',
      tone: 'text-warning',
    };
  }
  return { label: 'In stock', token: 'hsl(var(--pig-verdigris))', tone: 'text-success' };
}

export function ProductCard({
  product,
  className,
}: {
  product: ProductSummary;
  className?: string;
}) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const [added, setAdded] = React.useState(false);
  const wished = isWishlisted(product.id);
  const { lowStockThreshold } = useSiteSettings();
  const t = useDictionary().card;
  /* The same three states, worded in the page's language. */
  const base = stockState(product, lowStockThreshold);
  const state = {
    ...base,
    label: !product.inStock
      ? t.outOfStock
      : product.stockCount <= lowStockThreshold
        ? t.left(product.stockCount)
        : t.inStock,
  };

  const was = referencePrice(product);
  const discount = was ? Math.round((1 - product.price / was) * 100) : 0;
  const href = `/product/${product.slug}`;
  const spec = product.specifications[0]?.value ?? product.category;

  const handleAdd = () => {
    if (!product.inStock) return;
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article data-reveal className={cn('group relative flex h-full flex-col', className)}>
      <Link
        href={href}
        aria-label={product.name}
        className="block rounded-[4px] outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pigment-indigo"
      >
        <div className="relative aspect-[5/4] overflow-hidden rounded-[4px] bg-paper-sunk">
          {/*
            The zooming layer carries the tile colour itself. A transform makes it a stacking
            context, and a multiplied photo only blends with what is inside its own context: on
            a transparent layer the pack's white came back as a white box while zoomed.
          */}
          <div className="absolute inset-0 bg-paper-sunk transition-transform duration-700 ease-lift group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
            <ProductPlate
              product={product}
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
              photoClassName="p-[9%] mix-blend-multiply dark:mix-blend-normal"
            />
          </div>

          {discount > 0 && (
            <span className="absolute left-2 top-2 rounded-[3px] bg-pigment-madder px-1.5 py-1 text-[0.6875rem] font-bold uppercase leading-none tracking-[0.06em] text-primary-foreground tabular">
              −{discount}%
            </span>
          )}
        </div>
      </Link>

      <button
        type="button"
        onClick={() => toggleWishlist(product.id)}
        aria-pressed={wished}
        aria-label={wished ? t.unsave(product.name) : t.save(product.name)}
        className={cn(
          'absolute right-2 top-2 z-10 inline-flex size-8 items-center justify-center rounded-[4px] backdrop-blur-sm transition-[background-color,color,transform] duration-200 active:scale-90',
          wished
            ? 'bg-pigment-madder text-primary-foreground'
            : /* The colour tokens are bare HSL triplets, so transparency is written out. */
              'bg-[hsl(var(--paper)/0.85)] text-ink hover:bg-paper'
        )}
      >
        <Heart
          className="size-4 transition-transform duration-300"
          strokeWidth={2}
          fill={wished ? 'currentColor' : 'none'}
        />
      </button>

      <div className="mt-2.5 flex flex-1 flex-col">
        {/* Two lines reserved and no more, so every card in a row lines up. */}
        <h3 className="line-clamp-2 min-h-[2.5em] text-[0.875rem] font-bold leading-[1.25] text-ink">
          <Link
            href={href}
            tabIndex={-1}
            className="underline-offset-2 hover:underline group-hover:underline"
          >
            {product.name}
          </Link>
        </h3>

        <p className="mt-1 truncate text-[0.6875rem] font-bold uppercase leading-[1.2] tracking-[0.06em] text-ink-soft">
          {product.brand}
          <span className="px-1" aria-hidden="true">
            •
          </span>
          <span className="tabular">{spec}</span>
        </p>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="flex items-baseline gap-1.5">
            <span className="text-[0.9375rem] font-extrabold tabular">
              {formatPrice(product.price)}
            </span>
            {was && (
              <span className="text-xs font-semibold text-ink-faint line-through tabular">
                {formatPrice(was)}
              </span>
            )}
          </p>
          <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', state.tone)}>
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: state.token }}
              aria-hidden="true"
            />
            {state.label}
          </span>
        </div>
        {/* Approximate local price for EUR/GBP/CAD/AUD countries; nothing for USD. */}
        <ApproxPrice usd={product.price} className="mt-0.5 block text-2xs" />

        {/* At the foot, so every button in a row sits on one line. */}
        <div className="mt-auto pt-3">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!product.inStock}
          aria-label={t.addAria(product.name)}
          className={cn(
            'inline-flex h-9 w-full items-center justify-center gap-2 rounded-[4px] border text-sm font-bold transition-[background-color,color,border-color,transform] duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-45',
            added
              ? 'border-pigment-verdigris bg-pigment-verdigris text-primary-foreground'
              : 'border-ink bg-ink text-paper hover:border-ink-soft hover:bg-ink-soft'
          )}
        >
          {!product.inStock ? (
            t.unavailable
          ) : added ? (
            <>
              <Check className="size-4" strokeWidth={2} />
              {t.inCart}
            </>
          ) : (
            <>
              <Plus className="size-4" strokeWidth={2} />
              {t.addToCart}
            </>
          )}
        </button>
        </div>
      </div>
    </article>
  );
}
