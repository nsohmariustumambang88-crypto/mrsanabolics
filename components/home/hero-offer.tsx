'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Pause,
  Play,
  Plus,
} from 'lucide-react';
import { ProductPlate, isPhotograph } from '@/components/product/product-plate';
import { stockState } from '@/components/product/product-card';
import { useStore } from '@/components/providers/store-provider';
import { useSiteSettings } from '@/components/providers/settings-provider';
import { formatPrice } from '@/lib/format';
import { categoryPigment } from '@/lib/site';
import { cn } from '@/lib/utils';
import type { AdvertisedDiscount, ProductSummary } from '@/lib/types';

/*
  The hero's promotion panel.

  It fills the right-hand column of the hero, flush, on the plain paper. It used to be a small card
  floating in the corner of a live marbling bath; then, briefly, a sheet laid over that bath with a
  band of pigment showing round its edge. At the owner's direction the pigment is gone too — the
  offer is the whole column. With no bath behind it there is nothing for a border or a shadow to
  lift it off, so it carries neither: the hero's own rules divide it from the headline, and its
  side padding matches the headline column's gutters so the two halves share one grid.

  Two inputs, both controlled from the admin rather than decided here:

  - DEALS: products flagged "on offer" whose compare-at price is above the price, biggest share
    saved first, capped at six — chosen in app/(storefront)/page.tsx.
  - an optional CODE: only the one named in Settings, and only while the checkout would accept it.
    `advertisedDiscount` in lib/discounts explains why a code is never picked automatically.

  IT ADVANCES ON ITS OWN, AT THE OWNER'S REQUEST — every six seconds, sliding.
  It used to move only when the visitor stepped it, because content that changes on its own can
  pull a price away from somebody reading it. What keeps that from happening now, and what WCAG
  2.2.2 requires of anything that moves for more than five seconds:

  - it stops while the pointer is over it or focus is inside it, and while the tab is hidden;
  - a pause/play button beside the counter stops it for good;
  - a visitor whose system asks for reduced motion gets it paused, with no slide, until they
    press play;
  - stepping it by hand restarts the count, so a slide never changes right after a click.

  It follows the WAI-ARIA carousel pattern: a labelled region, slides announced as "2 of 6",
  buttons and the arrow keys to move. The counter is a polite live region only while it is NOT
  rotating by itself — announcing every automatic change would talk over the rest of the page.

  Nothing here claims what the catalogue cannot show. Stock comes from the product row, the saving
  from its two prices, and there is no "lab tested" line: these products carry no assay.
*/

/** How long each offer stays before the next slides in. */
const AUTO_ADVANCE_MS = 6000;

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
  const { addToCart } = useStore();
  const { lowStockThreshold } = useSiteSettings();
  const [index, setIndex] = React.useState(0);
  /* Which way the last change went, so the slide comes in from the side it was asked for. */
  const [direction, setDirection] = React.useState<1 | -1>(1);
  /* The visitor's own choice, from the pause/play button. Starts paused for reduced motion. */
  const [playing, setPlaying] = React.useState(true);
  /* Pointer over it, or keyboard focus inside it: somebody is reading, so it holds still. */
  const [held, setHeld] = React.useState(false);
  const [tabHidden, setTabHidden] = React.useState(false);
  const [added, setAdded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const onOffer = offers.length > 0;
  const list = onOffer ? offers : fallback ? [fallback] : [];
  const product = list.length ? list[index % list.length] : null;

  /* A new slide is a new product: its "added" confirmation must not carry over. */
  React.useEffect(() => setAdded(false), [index]);

  /* Reduced motion: no automatic rotation until the visitor asks for it. */
  React.useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setPlaying(false);
  }, []);

  React.useEffect(() => {
    const update = () => setTabHidden(document.visibilityState === 'hidden');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  const rotating = playing && !held && !tabHidden && list.length > 1;

  /*
    One timeout per slide rather than an interval: it restarts whenever the index changes, so a
    manual step resets the count and the next automatic change is a full period away.
  */
  React.useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => {
      setDirection(1);
      setIndex((current) => (current + 1) % list.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [rotating, index, list.length]);

  if (!product && !promoCode) return null;

  const step = (delta: number) => {
    setDirection(delta > 0 ? 1 : -1);
    setIndex((current) => (current + delta + list.length) % list.length);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (list.length < 2) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    }
  };

  const add = () => {
    if (!product || !product.inStock) return;
    addToCart(product, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

  const copy = async () => {
    if (!promoCode) return;
    try {
      await navigator.clipboard.writeText(promoCode.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard refused (insecure context, denied permission). The code is on screen in full,
         so it can still be selected by hand; there is nothing to recover. */
    }
  };

  const compareAt = product?.compareAtPrice ?? null;
  const saving = product && compareAt && compareAt > product.price ? compareAt - product.price : 0;
  const percent = saving && compareAt ? Math.round((saving / compareAt) * 100) : 0;
  const strength = product ? (product.specifications[0]?.value ?? '') : '';
  const stock = product ? stockState(product, lowStockThreshold) : null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={onOffer ? 'Current offers' : 'Featured product'}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      /*
        Keyboard focus only. A mouse click also focuses the button it lands on, and holding for
        that would leave the carousel stopped after every click on an arrow until the visitor
        clicked somewhere else — which reads as broken. The pointer is covered by hover.
      */
      onFocus={(event) => {
        if ((event.target as HTMLElement).matches?.(':focus-visible')) setHeld(true);
      }}
      onBlur={(event) => {
        /* Only when focus leaves the carousel altogether, not when it moves between its buttons. */
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false);
      }}
      /*
        No background of its own. It sits on the same paper as the headline beside it; an opaque
        `bg-paper` here covered the page's paper texture and measured a few steps off the headline
        column in both themes (244,241,235 against 241,238,232 in light), which read as a
        separate, faintly tinted block rather than one sheet.
      */
      className="relative flex flex-col lg:flex-1"
    >
      {product && (
        <>
          {/* The category's pigment, as the plate rule a product card carries. */}
          <span
            className="block h-px w-full"
            style={{ backgroundColor: categoryPigment(product.categorySlug) }}
            aria-hidden="true"
          />

          <div className="flex items-center justify-between gap-3 px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">
            {onOffer ? (
              <span className="bg-pigment-madder px-2.5 py-1 font-mono text-2xs uppercase tracking-[0.12em] text-primary-foreground tabular">
                {percent > 0 ? `−${percent}% · On offer` : 'On offer'}
              </span>
            ) : (
              <span className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                {product.category}
              </span>
            )}

            {list.length > 1 && (
              <span className="flex items-center gap-1.5">
                <span
                  className="mr-1 font-mono text-2xs text-ink-faint tabular"
                  aria-live={rotating ? 'off' : 'polite'}
                  aria-atomic="true"
                >
                  <span className="sr-only">Offer </span>
                  {index + 1} / {list.length}
                </span>
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  aria-label={playing ? 'Pause the offers' : 'Play the offers'}
                  aria-pressed={!playing}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-rule-strong text-ink-soft transition-colors hover:border-pigment-indigo hover:text-pigment-indigo"
                >
                  {playing ? (
                    <Pause className="h-3.5 w-3.5" strokeWidth={1.75} />
                  ) : (
                    <Play className="h-3.5 w-3.5" strokeWidth={1.75} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous offer"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-rule-strong text-ink-soft transition-colors hover:border-pigment-indigo hover:text-pigment-indigo"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next offer"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-rule-strong text-ink-soft transition-colors hover:border-pigment-indigo hover:text-pigment-indigo"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </span>
            )}
          </div>

          <div
            /* Keyed on the slide, so each change mounts afresh and plays the slide-in once. */
            key={index}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index % list.length + 1} of ${list.length}: ${product.name}`}
            className={cn(
              'flex flex-col lg:flex-1',
              list.length > 1 &&
                'duration-500 ease-out animate-in fade-in motion-reduce:animate-none',
              list.length > 1 && (direction === 1 ? 'slide-in-from-right-8' : 'slide-in-from-left-8')
            )}
          >
            {/*
              The photograph, at a size that sells it. object-contain via ProductPlate, so a pack
              shot keeps its lid and label; the box sets the proportion, never the crop.

              A fixed 5:4 box on a phone, where the column's height comes from its content. From
              lg the hero column has a real height and the photograph takes whatever the text
              leaves, which is why `flex-1` and `aspect-auto` only arrive at that breakpoint —
              `flex: 1 1 0%` in a column of indefinite height can collapse the box it is meant
              to size.
            */}
            <Link
              href={`/product/${product.slug}`}
              /*
                White in the dark theme. The pack shots are square and photographed on white, and
                this box is not square, so on the dark card the photo sat as a white rectangle
                between two dark bars. A white plate is how the product cards already show pack
                shots in the dark theme; this matches them.
              */
              className="relative mx-4 mt-5 block aspect-[5/4] min-h-[12rem] overflow-hidden border border-rule bg-card dark:bg-white sm:mx-6 lg:mx-10 lg:aspect-auto lg:flex-1"
              tabIndex={-1}
              aria-hidden="true"
            >
              {/*
                Multiplied onto the paper, in the light theme only. The store's pack shots are
                photographed on white, and at this size the white showed as a pasted-in rectangle
                inside the warmer paper box. Multiply turns white into whatever it sits on, so the
                pack sits ON the sheet. It is switched off in the dark theme, where multiplying
                onto a dark ground would sink the photograph into it, and never applied to a drawn
                plate, which carries its own ground colour.
              */}
              <ProductPlate
                product={product}
                showMarking={false}
                priority={index === 0}
                sizes="(min-width: 1024px) 44vw, 100vw"
                className={
                  isPhotograph(product.images[0])
                    ? 'mix-blend-multiply dark:mix-blend-normal'
                    : undefined
                }
              />
            </Link>

            <div className="px-4 pb-8 pt-5 sm:px-6 lg:px-10 lg:pb-10">
              <p className="text-xs text-ink-faint">
                {product.brand}
                {strength && (
                  <>
                    <span className="px-1.5 text-rule-strong" aria-hidden="true">
                      /
                    </span>
                    <span className="tabular">{strength}</span>
                  </>
                )}
                <span className="px-1.5 text-rule-strong" aria-hidden="true">
                  ·
                </span>
                {product.subcategoryName ?? product.category}
              </p>

              <h2 className="mt-1.5 font-display text-[clamp(1.6rem,2.6vw,2.25rem)] font-bold leading-[1.05] tracking-[-0.03em] text-white">
                <Link
                  href={`/product/${product.slug}`}
                  className="transition-colors hover:text-pigment-indigo"
                >
                  {product.name}
                </Link>
              </h2>

              <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-2xl font-semibold tabular text-white">
                  {formatPrice(product.price)}
                </span>
                {saving > 0 && compareAt && (
                  <>
                    <span className="text-sm text-ink-faint line-through tabular">
                      {formatPrice(compareAt)}
                    </span>
                    <span className="text-sm font-medium text-white tabular">
                      Save {formatPrice(saving)}
                    </span>
                  </>
                )}
                {stock && (
                  <span className={cn('ml-auto flex items-center gap-1.5 text-xs', stock.tone)}>
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: stock.token }}
                      aria-hidden="true"
                    />
                    {stock.label}
                  </span>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={add}
                  disabled={!product.inStock}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-colors',
                    !product.inStock
                      ? 'cursor-not-allowed bg-paper-sunk text-ink-faint'
                      : added
                        ? 'bg-pigment-verdigris text-primary-foreground'
                        : 'bg-pigment-indigo text-primary-foreground hover:bg-pigment-indigo-lift'
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

                <Link
                  href={`/product/${product.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-rule-strong px-5 py-3 text-sm font-medium text-white transition-colors hover:border-pigment-indigo hover:text-pigment-indigo"
                >
                  View product
                  <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                </Link>

                {onOffer && (
                  <Link
                    href="/shop?filter=deals"
                    className="ml-auto font-mono text-2xs uppercase tracking-[0.14em] text-ink-soft underline decoration-rule-strong underline-offset-4 transition-colors hover:text-pigment-indigo hover:decoration-pigment-indigo"
                  >
                    All offers
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/*
        The code, with every condition the checkout will enforce stated beside it. A headline
        that says "10% off" over a basket the till then refuses is how a promotion becomes a
        complaint.
      */}
      {promoCode && (
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-3 bg-paper-sunk px-4 py-4 sm:px-6 lg:px-10',
            product && 'border-t border-rule'
          )}
        >
          <span className="min-w-0 text-sm leading-snug text-ink-soft">
            <span className="font-medium text-ink">{promoCode.headline}</span>
            {promoCode.condition ? ` ${promoCode.condition}` : ''} with code
          </span>

          <button
            type="button"
            onClick={copy}
            aria-label={copied ? `Code ${promoCode.code} copied` : `Copy code ${promoCode.code}`}
            className={cn(
              'flex shrink-0 items-center gap-2 border px-3.5 py-2 font-mono text-sm uppercase tracking-[0.12em] transition-colors',
              copied
                ? 'border-pigment-verdigris text-pigment-verdigris'
                : 'border-rule-strong text-ink hover:border-pigment-indigo hover:text-pigment-indigo'
            )}
          >
            {promoCode.code}
            {copied ? (
              <Check className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </section>
  );
}
