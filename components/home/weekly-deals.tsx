'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MarbleBath } from '@/components/ebru/marble-bath';
import { ProductCard } from '@/components/product/product-card';
import { ProductPlate } from '@/components/product/product-plate';
import { stockState } from '@/components/product/product-card';
import { useSiteSettings } from '@/components/providers/settings-provider';
import { formatPrice } from '@/lib/format';
import type { ProductSummary } from '@/lib/types';
import { referencePrice } from '@/lib/pricing';

/*
  The bath drains on a clock. A real countdown to the end of the week, computed from the
  visitor's own clock rather than a fake number that resets on reload.
*/

function useWeekRemaining() {
  const [parts, setParts] = React.useState<{ d: number; h: number; m: number; s: number } | null>(
    null
  );

  React.useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      /* End of the current week, Sunday 23:59:59 local. */
      end.setDate(now.getDate() + ((7 - now.getDay()) % 7));
      end.setHours(23, 59, 59, 999);
      const diff = Math.max(0, end.getTime() - now.getTime());
      setParts({
        d: Math.floor(diff / 86400000),
        h: Math.floor(diff / 3600000) % 24,
        m: Math.floor(diff / 60000) % 60,
        s: Math.floor(diff / 1000) % 60,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return parts;
}

function Countdown() {
  const parts = useWeekRemaining();

  if (!parts) {
    return <span className="font-mono text-sm text-ink-faint">—</span>;
  }

  const cells: [string, number][] = [
    ['days', parts.d],
    ['hrs', parts.h],
    ['min', parts.m],
    ['sec', parts.s],
  ];

  return (
    <div className="flex items-end gap-3">
      {cells.map(([label, value]) => (
        <div key={label} className="text-center">
          <span className="block font-mono text-2xl font-medium leading-none tabular sm:text-3xl">
            {String(value).padStart(2, '0')}
          </span>
          <span className="mt-1.5 block font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function WeeklyDeals({ products }: { products: ProductSummary[] }) {
  const { lowStockThreshold } = useSiteSettings();
  if (products.length === 0) return null;

  /*
    The lead sheet plus a short register beside it — not the whole offer.

    Every marked-down product used to be listed here: 39 rows running to 5,100px on a phone,
    against a lead column of about 600. The register is meant to sit alongside the lead, so it
    is capped near the lead's own height and "Everything on offer" carries the rest. The count
    in the heading is still the true total, which is the honest pairing: say how many there
    are, show a few, link to all of them.
  */
  const REGISTER_ROWS = 6;
  const [lead, ...others] = products;
  const rest = others.slice(0, REGISTER_ROWS);

  const saved = products.reduce(
    (sum, p) => sum + ((referencePrice(p) ?? p.price) - p.price),
    0
  );

  return (
    <section className="border-b border-rule">
      <div className="relative overflow-hidden border-b border-rule bg-field-indigo">
        <MarbleBath
          className="absolute inset-0 h-full w-full opacity-40"
          seed={2291}
          density={0.5}
          animate={false}
          pigments={[
            '--pig-indigo',
            '--pig-indigo-lift',
            '--pig-madder',
            '--pig-saffron',
          ]}
        />
        <div className="relative mx-auto flex max-w-[86rem] flex-col gap-8 px-4 py-12 text-field-foreground sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:py-14">
          <div>
            <h2 className="font-display text-[clamp(1.75rem,3.2vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.035em]">
              This week&rsquo;s bath
            </h2>
            <p className="measure-tight mt-3 text-sm leading-relaxed text-field-foreground/80 sm:text-base">
              {saved > 0 ? (
                <>
                  {products.length} compounds marked down until Sunday midnight — a combined{' '}
                  <span className="tabular">{formatPrice(saved)}</span> off list.
                </>
              ) : (
                <>{products.length} compounds picked for this week.</>
              )}
            </p>
          </div>
          {/* A countdown with no markdown behind it is urgency about nothing. */}
          {saved > 0 && <Countdown />}
        </div>
      </div>

      <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 lg:px-10">
        <div className="grid gap-px bg-rule lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* The lead sheet, at the scale a marked-down compound deserves. */}
          <article className="bg-card p-6 sm:p-8">
            <Link href={`/product/${lead.slug}`} className="group block">
              <div className="relative aspect-[16/10] overflow-hidden border border-rule bg-paper-sunk">
                <ProductPlate product={lead} sizes="(min-width: 1024px) 45vw, 100vw" />
              </div>
              <h3 className="mt-6 font-display text-2xl font-semibold tracking-[-0.03em] transition-colors group-hover:text-pigment-indigo sm:text-3xl">
                {lead.name}
              </h3>
            </Link>
            <p className="measure mt-3 text-sm leading-relaxed text-ink-soft">
              {lead.description}
            </p>
            <p className="mt-5 flex items-baseline gap-3">
              <span className="font-display text-2xl font-semibold tabular">
                {formatPrice(lead.price)}
              </span>
              {referencePrice(lead) && (
                <span className="text-sm text-ink-faint line-through tabular">
                  {formatPrice(referencePrice(lead) as number)}
                </span>
              )}
            </p>
          </article>

          {/* The rest of the offer, as a register. */}
          <div className="flex flex-col bg-card">
            {rest.length === 0 ? (
              <div className="p-8">
                <ProductCard product={lead} />
              </div>
            ) : (
              <ul>
                {rest.map((p) => {
                  const state = stockState(p, lowStockThreshold);
                  return (
                    <li key={p.id} className="border-b border-rule last:border-0">
                      <Link
                        href={`/product/${p.slug}`}
                        className="group flex items-center gap-4 p-5 transition-colors hover:bg-paper-sunk sm:p-6"
                      >
                        <span className="relative h-16 w-16 shrink-0 overflow-hidden border border-rule bg-paper-sunk">
                          <ProductPlate product={p} showMarking={false} sizes="64px" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-base font-semibold leading-snug tracking-[-0.02em] transition-colors group-hover:text-pigment-indigo">
                            {p.name}
                          </span>
                          <span className="mt-1 block text-xs text-ink-faint">
                            {p.brand}
                            <span className="px-1.5 text-rule-strong" aria-hidden="true">
                              /
                            </span>
                            <span className="tabular">
                              {p.specifications[0]?.value ?? p.category}
                            </span>
                          </span>
                          <span className={`mt-1.5 flex items-center gap-1.5 text-2xs ${state.tone}`}>
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: state.token }}
                              aria-hidden="true"
                            />
                            {state.label}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-base font-semibold tabular">
                            {formatPrice(p.price)}
                          </span>
                          {referencePrice(p) && (
                            <span className="mt-0.5 block text-xs text-ink-faint line-through tabular">
                              {formatPrice(referencePrice(p) as number)}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <Link
          href="/shop?filter=deals"
          className="group mt-8 inline-flex items-center gap-2 border-b border-rule-strong pb-1 text-sm font-medium text-ink-soft transition-colors hover:border-pigment-indigo hover:text-pigment-indigo"
        >
          Everything on offer
          <ArrowRight
            className="h-4 w-4"
            strokeWidth={1.75}
          />
        </Link>
      </div>
    </section>
  );
}
