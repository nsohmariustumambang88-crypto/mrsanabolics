'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Heart,
  Minus,
  Plus,
  Check,
  ChevronRight,
  Star,
  Truck,
  RotateCcw,
} from 'lucide-react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { useStore } from '@/components/providers/store-provider';
import { stockState } from '@/components/product/product-card';
import { useSiteSettings } from '@/components/providers/settings-provider';
import { ProductGrid } from '@/components/product/product-grid';
import { ProductPlate, isPhotograph } from '@/components/product/product-plate';
import { ReviewForm } from '@/components/product/review-form';
import { SectionHeading } from '@/components/product/section-heading';
import { formatPrice } from '@/lib/format';
import { categoryPigment, UNDER_HEADER_INSET } from '@/lib/site';
import { categoryPath, groupPath } from '@/lib/catalogue/paths';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { referencePrice } from '@/lib/pricing';
import { ApproxPrice, CurrencyNote } from '@/components/currency/approx-price';
import { DeliveryLine } from '@/components/currency/delivery-line';

/*
  The evaluation surface. PRODUCT.md's first principle is that evidence outranks atmosphere,
  so the specification is not buried in a tab below the fold — the chain that determines how
  this compound is used sits directly under the price, as one connected read.
*/

function Rating({ value, count }: { value: number; count?: number }) {
  /* Nothing to rate with yet: render nothing. Five hollow stars and "0.0" would read as a bad
     score, and at the owner's direction there is no "No reviews yet" line either. Per-review
     stars pass no count at all and keep rendering. */
  if (count === 0) return null;
  return (
    <p className="flex items-center gap-2.5">
      <span className="flex gap-0.5" role="img" aria-label={`${value} out of 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={
                i < Math.round(value)
                ? 'h-3.5 w-3.5 fill-pigment-saffron text-pigment-saffron'
                : 'h-3.5 w-3.5 text-rule-strong'
            }
            strokeWidth={1.5}
          />
        ))}
      </span>
      <span className="font-mono text-2xs text-ink-faint tabular">
        {value.toFixed(1)}
        {count ? ` · ${count} reviews` : ''}
      </span>
    </p>
  );
}

/* The first sentence of a block of copy, or '' when there is none. Appending a full stop to an
   empty split rendered a row reading only "." — so blank directions now drop the row instead. */
function firstSentence(text: string): string {
  const first = text.split('.')[0].trim();
  return first ? `${first}.` : '';
}

/* The raise donated by the fracture-glaze shelf: cause and effect visible as one chain. */
function ProtocolChain({ product }: { product: Product }) {
  const links = [
    { label: 'Compound', value: product.name },
    {
      label: 'Concentration',
      value: product.specifications.find((s) => /concentration|strength/i.test(s.label))?.value
        ?? product.specifications[0]?.value
        ?? '—',
    },
    {
      label: 'Half-life',
      value: product.specifications.find((s) => /half.?life/i.test(s.label))?.value ?? '—',
    },
    { label: 'Protocol', value: firstSentence(product.directions) },
    /*
      A row with nothing in it is dropped rather than shown as a dash. No product in the
      catalogue records a half-life, so every page showed "Half-life —" — an empty field that
      reads as missing information on all 792 of them.
    */
  ].filter((link) => link.value && link.value !== '—');

  return (
    <div className="mt-8 border-y border-rule py-6">
      <ol className="space-y-0">
        {links.map((link, i) => (
          <li key={link.label} className="relative flex gap-4 pb-5 last:pb-0">
            <span className="relative flex flex-col items-center">
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: categoryPigment(product.categorySlug) }}
                aria-hidden="true"
              />
              {i < links.length - 1 && (
                <span className="mt-1 w-px flex-1 bg-rule" aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
                {link.label}
              </span>
              <span className="mt-1 block text-sm leading-snug tabular">{link.value}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export type ProductCompound = {
  name: string;
  path: string;
  listings: number;
  /** What the compound is, from lib/catalogue/collection-copy.ts. */
  identity: string | null;
};

export function ProductDetail({
  product,
  related,
  reviewsOpen = false,
  compound = null,
  summary,
  faqs,
  paymentMethods = [],
}: {
  product: Product;
  related: Product[];
  /** Whether the site is accepting new reviews. Read from settings on the server. */
  reviewsOpen?: boolean;
  /** The compound page this product belongs to, where it has one. Computed on the server. */
  compound?: ProductCompound | null;
  /** The short description under the price, computed on the server from the label facts. */
  summary?: string;
  /** The admin's questions plus the ones answered from the data (lib/catalogue/buying-facts.ts). */
  faqs?: { question: string; answer: string }[];
  /** The payment methods checkout lists, by label. */
  paymentMethods?: string[];
}) {
  const questions = faqs ?? product.faqs;
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const [active, setActive] = React.useState(0);
  const [qty, setQty] = React.useState(1);
  const [added, setAdded] = React.useState(false);
  const wished = isWishlisted(product.id);
  const { lowStockThreshold } = useSiteSettings();
  const state = stockState(product, lowStockThreshold);

  const was = referencePrice(product);
  const discount = was ? Math.round((1 - product.price / was) * 100) : 0;

  /* Track recently viewed for homepage carousel */
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('mra-recently-viewed');
      const ids = stored ? JSON.parse(stored) : [];
      const filtered = ids.filter((id: string) => id !== product.id);
      const updated = [product.id, ...filtered].slice(0, 20);
      localStorage.setItem('mra-recently-viewed', JSON.stringify(updated));
    } catch {
      // localStorage error - silently fail
    }
  }, [product.id]);

  const handleAdd = () => {
    addToCart(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="border-b border-rule bg-paper-sunk"
      >
        <ol className={`mx-auto flex max-w-[86rem] flex-wrap items-center gap-1.5 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint ${UNDER_HEADER_INSET}`}>
          <li>
            <Link href="/shop" className="transition-colors hover:text-ink">
              Shop
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
          <li>
            <Link
              href={categoryPath(product.categorySlug)}
              className="transition-colors hover:text-ink"
            >
              {product.category}
            </Link>
          </li>
          {product.subcategory && product.subcategoryName && (
            <>
              <ChevronRight className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
              <li>
                <Link
                  href={groupPath(product.categorySlug, product.subcategoryName ?? product.subcategory ?? '')}
                  className="transition-colors hover:text-ink"
                >
                  {product.subcategoryName}
                </Link>
              </li>
            </>
          )}
          <ChevronRight className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
          <li className="text-ink-soft" aria-current="page">
            {product.name}
          </li>
        </ol>
      </nav>

      <section className="border-b border-rule">
        <div className="mx-auto grid max-w-[86rem] lg:grid-cols-2">
          {/* Gallery */}
          <div className="border-rule px-4 py-8 sm:px-6 lg:border-r lg:px-10 lg:py-12">
            <div className="relative aspect-square overflow-hidden border border-rule bg-paper-sunk">
              <ProductPlate
                product={product}
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
              {discount > 0 && (
                <span className="absolute left-4 top-4 bg-pigment-madder px-2.5 py-1 font-mono text-2xs uppercase tracking-[0.12em] text-primary-foreground tabular">
                  −{discount}%
                </span>
              )}
            </div>

            <p className="mt-3 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
              {isPhotograph(product.images[0])
                ? 'Photograph of the product as supplied'
                : 'Plate drawn from the batch record — not a photograph of the vial'}
            </p>
          </div>

          {/* Buy panel */}
          <div className="px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
            <h1 className="font-display text-[clamp(1.9rem,3.6vw,3rem)] font-semibold leading-[1.03] tracking-[-0.035em]">
              {product.name}
            </h1>

            <p className="mt-3 text-sm text-ink-soft">
              Made by{' '}
              <Link
                href={`/brands/${product.brandSlug}`}
                className="underline decoration-rule-strong underline-offset-4 transition-colors hover:text-pigment-indigo hover:decoration-pigment-indigo"
              >
                {product.brand}
              </Link>
            </p>

            {product.reviewCount > 0 && (
              <div className="mt-4">
                <Rating value={product.rating} count={product.reviewCount} />
              </div>
            )}

            <div className="mt-6 flex items-baseline gap-3">
              <span className="font-display text-3xl font-semibold tabular">
                {formatPrice(product.price)}
              </span>
              {was && (
                <span className="text-base text-ink-faint line-through tabular">
                  {formatPrice(was)}
                </span>
              )}
              <ApproxPrice usd={product.price} className="text-sm" />
            </div>
            <CurrencyNote className="measure mt-2" />

            <p className={cn('mt-3 flex items-center gap-2 text-sm', state.tone)}>
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: state.token }}
                aria-hidden="true"
              />
              {state.label}
            </p>

            <p className="measure mt-6 text-sm leading-relaxed text-ink-soft">
              {summary ?? product.description}
            </p>

            <ProtocolChain product={product} />

            {/* Actions */}
            <div className="mt-8 flex flex-wrap items-stretch gap-3">
              <div className="flex items-center border border-rule-strong">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  className="flex h-12 w-12 items-center justify-center text-ink-soft transition-colors hover:bg-paper-sunk disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" strokeWidth={1.75} />
                </button>
                <span
                  className="w-12 text-center font-mono text-sm tabular"
                  aria-live="polite"
                >
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(product.stockCount || 99, q + 1))}
                  className="flex h-12 w-12 items-center justify-center text-ink-soft transition-colors hover:bg-paper-sunk"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                disabled={!product.inStock}
                className={cn(
                  'flex h-12 flex-1 items-center justify-center gap-2.5 rounded-full px-8 text-sm font-medium transition-colors duration-300',
                  !product.inStock
                    ? 'cursor-not-allowed bg-paper-sunk text-ink-faint'
                    : added
                      ? 'bg-pigment-verdigris text-primary-foreground'
                      : 'bg-pigment-indigo text-primary-foreground hover:bg-pigment-indigo-lift'
                )}
              >
                {!product.inStock ? (
                  'Out of bath'
                ) : added ? (
                  <>
                    <Check className="h-4 w-4" strokeWidth={2} />
                    Added — {qty} in the cart
                  </>
                ) : (
                  `Add to cart · ${formatPrice(product.price * qty)}`
                )}
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-pressed={wished}
                aria-label={wished ? 'Remove from wishlist' : 'Save for later'}
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full border transition-colors',
                  wished
                    ? 'border-pigment-madder bg-pigment-madder text-primary-foreground'
                    : 'border-rule-strong text-ink-soft hover:border-pigment-madder hover:text-pigment-madder'
                )}
              >
                <Heart
                  className="h-4 w-4"
                  strokeWidth={1.75}
                  fill={wished ? 'currentColor' : 'none'}
                />
              </button>
            </div>

            {/*
              "Third-party assayed" is gone from this list: the catalogue holds no assay for
              any product, so it was a claim with nothing behind it on every page — the same
              reason it came off the hero's offer card.
            */}
            <ul className="mt-8 grid gap-3 border-t border-rule pt-6 sm:grid-cols-2">
              {[
                { icon: Truck, label: 'Tracked, unmarked' },
                { icon: RotateCcw, label: '30-day returns' },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2.5 text-xs text-ink-soft">
                  <Icon
                    className="h-4 w-4 shrink-0 text-pigment-indigo"
                    strokeWidth={1.5}
                  />
                  {label}
                </li>
              ))}
            </ul>

            {/* Delivery to the visitor's country, from the zones the checkout quotes from. */}
            <DeliveryLine className="mt-5" />
          </div>
        </div>
      </section>

      {/* The record */}
      <section className="border-b border-rule">
        <div className="mx-auto grid max-w-[86rem] gap-px bg-rule lg:grid-cols-2">
          <div className="bg-card px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">
              About this compound
            </h2>
            {compound?.identity && (
              <p className="measure mt-5 text-sm leading-relaxed text-ink">{compound.identity}</p>
            )}
            <p className="measure mt-5 text-sm leading-relaxed text-ink-soft">
              {product.longDescription}
            </p>
            {compound && compound.listings > 1 && (
              <p className="mt-5 text-sm">
                <Link
                  href={compound.path}
                  className="text-pigment-indigo underline decoration-rule-strong underline-offset-[3px] transition-colors hover:decoration-pigment-indigo"
                >
                  Compare all {compound.listings} {compound.name} listings by strength and price
                </Link>
              </p>
            )}

            <h3 className="mt-10 font-display text-lg font-semibold tracking-[-0.025em]">
              What it is used for
            </h3>
            <ul className="mt-4 space-y-2.5">
              {product.benefits.map((b) => (
                <li key={b} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-pigment-verdigris"
                    strokeWidth={2}
                  />
                  {b}
                </li>
              ))}
            </ul>

            {product.directions.trim() && (
              <>
                <h3 className="mt-10 font-display text-lg font-semibold tracking-[-0.025em]">
                  Directions
                </h3>
                <p className="measure mt-3 text-sm leading-relaxed text-ink-soft">
                  {product.directions}
                </p>
              </>
            )}

            <h3 className="mt-10 font-display text-lg font-semibold tracking-[-0.025em]">
              Ingredients
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {product.ingredients.map((ing) => (
                <li
                  key={ing}
                  className="border border-rule px-2.5 py-1 font-mono text-2xs text-ink-soft"
                >
                  {ing}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-card px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">
              Specification
            </h2>
            <table className="mt-5 w-full border-collapse text-sm">
              <caption className="sr-only">
                Technical specification for {product.name}
              </caption>
              <tbody>
                {product.specifications.map((spec) => (
                  <tr key={spec.label} className="border-b border-rule">
                    <th
                      scope="row"
                      className="py-3 pr-4 text-left font-mono text-2xs font-normal uppercase tracking-[0.14em] text-ink-faint"
                    >
                      {spec.label}
                    </th>
                    <td className="py-3 text-right font-medium tabular">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="mt-10 font-display text-lg font-semibold tracking-[-0.025em]">
              Shipping
            </h3>
            <p className="measure mt-3 text-sm leading-relaxed text-ink-soft">
              {product.shipping}
            </p>

            <h3 className="mt-8 font-display text-lg font-semibold tracking-[-0.025em]">
              Returns
            </h3>
            <p className="measure mt-3 text-sm leading-relaxed text-ink-soft">
              {product.returns}{' '}
              <Link
                href="/legal/returns"
                className="text-pigment-indigo underline decoration-rule-strong underline-offset-[3px] transition-colors hover:decoration-pigment-indigo"
              >
                Returns policy
              </Link>
            </p>

            {paymentMethods.length > 0 && (
              <>
                <h3 className="mt-8 font-display text-lg font-semibold tracking-[-0.025em]">
                  Payment
                </h3>
                <p className="measure mt-3 text-sm leading-relaxed text-ink-soft">
                  {paymentMethods.join(', ')}. Checkout charges in US dollars.
                </p>
              </>
            )}

            {/* Trust that a buyer can verify, not a badge: what to look at when the pack arrives. */}
            <h3 className="mt-8 font-display text-lg font-semibold tracking-[-0.025em]">
              Check your pack
            </h3>
            <p className="measure mt-3 text-sm leading-relaxed text-ink-soft">
              The batch number and expiry date should be printed on the pack, and match on the box
              and the {product.specifications.some((s) => /tablet/i.test(s.value)) ? 'blister' : 'vial'}.
              Our guides explain{' '}
              <Link
                href="/blog/how-to-spot-counterfeit-steroids"
                className="text-pigment-indigo underline decoration-rule-strong underline-offset-[3px] transition-colors hover:decoration-pigment-indigo"
              >
                how to spot a counterfeit
              </Link>{' '}
              and{' '}
              <Link
                href="/blog/how-to-read-a-certificate-of-analysis"
                className="text-pigment-indigo underline decoration-rule-strong underline-offset-[3px] transition-colors hover:decoration-pigment-indigo"
              >
                how to check a certificate of analysis
              </Link>
              .
            </p>

            {questions.length > 0 && (
              <>
                <h3 className="mt-10 font-display text-lg font-semibold tracking-[-0.025em]">
                  Common questions
                </h3>
                <Accordion type="single" collapsible className="mt-3">
                  {questions.map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="border-rule">
                      <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-relaxed text-ink-soft">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </>
            )}
          </div>
        </div>
      </section>

      {/*
        Reviews.

        The section appears when there is something to read OR somewhere to write — an empty
        grid under "0 buyers rated this 0.0" is a hole, but so is a product nobody can review.
        Every review shown here is APPROVED: `lib/db/catalogue.ts` filters on status, and the
        rating above is recomputed from approved rows only, so the stars and the reviews under
        them can never disagree.
      */}
      {(product.reviews.length > 0 || reviewsOpen) && (
      /* `#reviews` is where the "how was your order?" email lands a buyer. */
      <section id="reviews" className="scroll-mt-24 border-b border-rule">
        <div className="mx-auto max-w-[86rem] px-4 py-14 sm:px-6 lg:px-10">
          {/* With no approved reviews the section is the form alone: no "Reviews" heading over
              nothing and no empty-state sentence, at the owner's direction. */}
          {product.reviews.length > 0 && (
          <>
          <SectionHeading title="Reviews" />

          <div className="mt-8 grid gap-px bg-rule md:grid-cols-3">
            {product.reviews.map((r) => (
              <article key={r.id} className="flex flex-col bg-card p-6">
                <Rating value={r.rating} />
                <h3 className="mt-4 font-display text-base font-semibold tracking-[-0.02em]">
                  {r.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{r.body}</p>
                {/* A moderation edit is disclosed, never silent: the words above are not
                    exactly what the reviewer typed. */}
                {r.editedAt && <p className="mt-3 text-xs text-ink-faint">Edited by MrAnabolics</p>}
                <p className="mt-5 border-t border-rule pt-3 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                  {r.author} · <time dateTime={r.date}>{r.date}</time>
                </p>
              </article>
            ))}
          </div>

          <p className="mt-6 text-xs text-ink-faint">
            Every review here was submitted through our review form and checked before it was
            published.
          </p>
          </>
          )}

          {reviewsOpen && (
            <div className={cn(product.reviews.length > 0 && 'mt-10 border-t border-rule pt-10')}>
              <ReviewForm productId={product.id} productName={product.name} />
            </div>
          )}
        </div>
      </section>
      )}

      {related.length > 0 && (
        <section className="border-b border-rule">
          <div className="mx-auto max-w-[86rem] px-4 py-14 sm:px-6 lg:px-10">
            <SectionHeading
              title="From the same bath"
              description={`Other ${product.category.toLowerCase()} in the catalogue.`}
              href={categoryPath(product.categorySlug)}
              hrefLabel={`All ${product.category.toLowerCase()}`}
            />
            <ProductGrid products={related} columns={4} className="mt-8" />
          </div>
        </section>
      )}
    </>
  );
}
