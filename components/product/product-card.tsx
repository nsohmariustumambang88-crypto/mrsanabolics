'use client';

import * as React from 'react';
import Link from 'next/link';
import { Heart, Plus, Check } from 'lucide-react';
import { useStore } from '@/components/providers/store-provider';
import { formatPrice } from '@/lib/format';
import { ProductPlate } from '@/components/product/product-plate';
import { categoryPigment } from '@/lib/site';
import { useSiteSettings } from '@/components/providers/settings-provider';
import type { ProductSummary } from '@/lib/types';
import { cn } from '@/lib/utils';
import { referencePrice } from '@/lib/pricing';

/*
  A product is a sheet lifted out of the bath.

  Paper stock, a hairline plate rule in the category's own pigment, and a real shadow that
  deepens as the sheet lifts on hover. Stock runs on the single state channel the whole site
  uses — one dot, one word, one pigment — never a scattered set of badge colours.
*/

export function stockState(product: ProductSummary, lowStockThreshold = 5) {
  if (!product.inStock) {
    return { label: 'Out of bath', token: 'hsl(var(--pig-madder))', tone: 'text-destructive' };
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

export function ProductCard({ product }: { product: ProductSummary }) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const [added, setAdded] = React.useState(false);
  const wished = isWishlisted(product.id);
  const { lowStockThreshold } = useSiteSettings();
  const state = stockState(product, lowStockThreshold);

  const was = referencePrice(product);
  const discount = was ? Math.round((1 - product.price / was) * 100) : 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.inStock) return;
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  return (
    <article className="group relative flex h-full flex-col border border-rule bg-card shadow-lift transition-[box-shadow,border-color] duration-300 ease-lift hover:border-rule-strong hover:shadow-lift-strong focus-within:border-pigment-indigo">
      {/* The plate rule: the category's pigment, one hairline, nothing thicker. */}
      <span
        className="block h-px w-full"
        style={{ backgroundColor: categoryPigment(product.categorySlug) }}
        aria-hidden="true"
      />

      <Link href={`/product/${product.slug}`} className="flex flex-1 flex-col outline-none">
        <div className="relative aspect-square overflow-hidden bg-paper-sunk">
          <ProductPlate
            product={product}
            sizes="(min-width: 1280px) 23vw, (min-width: 768px) 31vw, 50vw"
          />

          {discount > 0 && (
            <span className="absolute left-3 top-3 bg-pigment-madder px-2 py-1 font-mono text-2xs uppercase tracking-[0.12em] text-primary-foreground tabular">
              −{discount}%
            </span>
          )}

          <button
            type="button"
            onClick={handleWishlist}
            aria-pressed={wished}
            aria-label={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name}`}
            className={cn(
              'absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border transition-colors duration-300',
              wished
                ? 'border-pigment-madder bg-pigment-madder text-primary-foreground'
                : 'border-rule bg-paper/90 text-ink-soft hover:border-pigment-madder hover:text-pigment-madder'
            )}
          >
            <Heart
              className="h-3.5 w-3.5"
              strokeWidth={1.75}
              fill={wished ? 'currentColor' : 'none'}
            />
          </button>
        </div>

        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <h3 className="font-display text-sm font-semibold leading-snug sm:text-base tracking-[-0.02em] transition-colors group-hover:text-pigment-indigo">
            {product.name}
          </h3>

          {/* The chain, abbreviated: who made it, at what concentration. */}
          <p className="mt-1.5 text-xs text-ink-faint">
            {product.brand}
            <span className="px-1.5 text-rule-strong" aria-hidden="true">
              /
            </span>
            <span className="tabular">
              {product.specifications[0]?.value ?? product.category}
            </span>
          </p>

          <div className="mt-auto flex items-end justify-between gap-3 pt-3 sm:pt-4">
            <div>
              <p className="flex items-baseline gap-2">
                <span className="text-base font-semibold tabular">
                  {formatPrice(product.price)}
                </span>
                {was && (
                  <span className="text-xs text-ink-faint line-through tabular">
                    {formatPrice(was)}
                  </span>
                )}
              </p>
              <p className={cn('mt-1.5 flex items-center gap-1.5 text-2xs', state.tone)}>
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: state.token }}
                  aria-hidden="true"
                />
                {state.label}
              </p>
            </div>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={handleAdd}
        disabled={!product.inStock}
        aria-label={`Add ${product.name} to cart`}
        className={cn(
          'flex items-center justify-center gap-2 border-t border-rule px-3 py-2.5 text-sm font-medium transition-colors duration-300 sm:px-4 sm:py-3',
          !product.inStock
            ? 'cursor-not-allowed text-ink-faint'
            : added
              ? 'bg-pigment-verdigris text-primary-foreground'
              : 'text-ink-soft hover:bg-pigment-indigo hover:text-primary-foreground'
        )}
      >
        {!product.inStock ? (
          'Unavailable'
        ) : added ? (
          <>
            <Check className="h-4 w-4" strokeWidth={2} />
            In the cart
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Add to cart
          </>
        )}
      </button>
    </article>
  );
}
