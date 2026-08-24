'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MarbleBath } from '@/components/ebru/marble-bath';
import { StylusMark } from '@/components/ebru/drop-mark';
import { useProducts } from '@/components/providers/catalogue-provider';
import { formatPrice } from '@/lib/format';

/*
  The first viewport is the thesis, not a header.

  A compound is a substance suspended at a concentration. Ebru is the craft of exactly that:
  pigment floated on thickened water, combed, and lifted onto paper in one contact. So the
  page opens on an actual bath — a live displacement simulation the visitor can draw through —
  with the claim and the action set on the paper beside it, divided by one plate rule.

  No hero photograph. No stat row: the contract says the assay belongs on the sheet, not spread
  across the opening as four free-floating figures, so it rides on the float card instead.

  The deckle is masked onto the canvas alone. Masking the whole column also clipped the float
  card and its label, which is what broke the mobile first viewport.
*/

export function Hero() {
  const products = useProducts();
  const featured = products[0];
  const concentration = featured.specifications[0]?.value ?? featured.category;

  return (
    <section className="relative border-b border-rule">
      <div className="mx-auto grid max-w-[86rem] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* The sheet */}
        <div className="flex flex-col justify-center px-4 py-12 sm:px-6 sm:py-16 lg:border-r lg:border-rule lg:px-10 lg:py-24">
          <h1 className="font-display text-[clamp(2.75rem,6vw,5rem)] font-semibold leading-[0.95] tracking-[-0.04em]">
            Suspended,
            <br />
            documented,
            <br />
            <span className="text-pigment-indigo">lifted once.</span>
          </h1>

          <p className="measure-tight mt-8 text-base leading-relaxed text-ink-soft sm:text-lg">
            Every compound we sell is a substance held at a concentration. We publish the
            specification, the batch, and the protocol for each one — then let you read it
            before you decide.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/shop"
              className="group inline-flex items-center gap-2.5 rounded-full bg-pigment-indigo px-6 py-3.5 text-sm font-medium text-primary-foreground transition-colors duration-300 hover:bg-pigment-indigo-lift"
            >
              Browse the catalogue
              <ArrowRight
                className="h-4 w-4"
                strokeWidth={1.75}
              />
            </Link>
            <Link
              href="/faq"
              className="inline-flex items-center gap-2.5 rounded-full border border-rule-strong px-6 py-3.5 text-sm font-medium transition-colors duration-300 hover:border-pigment-indigo hover:bg-paper-sunk"
            >
              How testing works
            </Link>
          </div>
        </div>

        {/* The bath */}
        <div className="relative min-h-[26rem] overflow-hidden lg:min-h-[42rem]">
          <MarbleBath
            className="deckle-b absolute inset-0 cursor-crosshair lg:mask-none"
            seed={1873}
            density={1}
            interactive
          />

          <p className="pointer-events-none absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full border border-rule-strong bg-paper px-3.5 py-2 font-mono text-2xs uppercase tracking-[0.16em] text-ink shadow-lift">
            <StylusMark className="h-3.5 w-3.5" />
            Drag to comb the bath
          </p>

          {/* The featured compound, lifted out of the size it was made in. */}
          <Link
            href={`/product/${featured.slug}`}
            className="group absolute bottom-6 left-5 right-5 z-10 border border-rule bg-paper p-5 shadow-lift transition-colors duration-300 hover:border-pigment-indigo sm:left-auto sm:w-[23rem]"
          >
            <span className="flex items-end justify-between gap-4">
              <span className="min-w-0">
                <span className="block font-display text-lg font-semibold leading-tight tracking-[-0.02em] group-hover:text-pigment-indigo">
                  {featured.name}
                </span>
                <span className="mt-1.5 block text-xs text-ink-faint">
                  {featured.brand}
                  <span className="px-1.5 text-rule-strong" aria-hidden="true">
                    /
                  </span>
                  <span className="tabular">{concentration}</span>
                </span>
              </span>
              <ArrowRight
                className="mb-1 h-5 w-5 shrink-0 text-ink-faint transition-colors duration-300 group-hover:text-pigment-indigo"
                strokeWidth={1.5}
              />
            </span>

            {/* The assay, on the sheet where it belongs. */}
            <span className="mt-4 flex items-center justify-between gap-3 border-t border-rule pt-3">
              <span className="text-sm font-semibold tabular">
                {formatPrice(featured.price)}
              </span>
              <span className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                Third-party assayed
              </span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
