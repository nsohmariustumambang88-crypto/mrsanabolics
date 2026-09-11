'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MarbleBath } from '@/components/ebru/marble-bath';
import { HeroOffer } from '@/components/home/hero-offer';
import type { AdvertisedDiscount, ProductSummary } from '@/lib/types';

/*
  The first viewport is the thesis, not a header.

  The claim and the actions sit on the paper on the left. The right-hand column is the site's
  promotion: a sheet laid over a marbled bath, showing what is on offer at the size a pack shot
  needs to sell. See hero-offer.tsx. What it carries is chosen on the server from what the admin
  has marked as on offer, so this component never reaches into the catalogue for a product of
  its own choosing.

  The bath used to be the column's content — a live marbling the visitor could comb, with the
  offer as a small card in its corner. It now shows only as a band of pigment round the sheet,
  which keeps the column recognisably this site rather than a banner slot.
*/

export function Hero({
  offers,
  fallback,
  promoCode,
}: {
  offers: ProductSummary[];
  fallback: ProductSummary | null;
  promoCode: AdvertisedDiscount | null;
}) {
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

        {/*
          The promotion, laid over the bath.

          This column used to BE the bath — a live marbling the visitor could comb, with a small
          offer card floating in its corner. At the owner's direction the offer now fills it, and
          the bath survives only as the narrow band of pigment round the sheet's edge. It is no
          longer interactive: there is almost nothing left to comb, and a crosshair cursor over a
          product photograph promises a gesture that does nothing useful.

          It is composed at lower density for the same reason — nearly all of it is covered, and
          the full-fidelity sheet was the most expensive thing on the page to draw.

          The column is a flex container from lg so the panel can take the full 42rem height and
          the photograph can grow into what the text leaves. Below lg the panel sizes to its
          content, with a floor so an empty catalogue still leaves a visible sheet.
        */}
        <div className="relative flex min-h-[16rem] flex-col overflow-hidden p-3 sm:p-4 lg:min-h-[42rem] lg:p-6">
          <MarbleBath
            className="absolute inset-0 h-full w-full"
            seed={1873}
            density={0.6}
            animate={false}
          />

          <div className="relative flex flex-col lg:flex-1">
            <HeroOffer offers={offers} fallback={fallback} promoCode={promoCode} />
          </div>
        </div>
      </div>
    </section>
  );
}
