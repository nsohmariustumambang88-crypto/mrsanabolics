'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { HeroOffer } from '@/components/home/hero-offer';
import type { AdvertisedDiscount, ProductSummary } from '@/lib/types';

/*
  The first viewport is the thesis, not a header.

  The claim and the actions sit on the paper on the left. The right-hand column is the site's
  promotion, showing what is on offer at the size a pack shot needs to sell. See hero-offer.tsx.
  What it carries is chosen on the server from what the admin has marked as on offer, so this
  component never reaches into the catalogue for a product of its own choosing.

  The column used to be a live marbling bath the visitor could comb, with the offer as a small
  card in its corner. At the owner's direction the marbling is gone from the hero entirely; the
  category pigment survives as the hairline rule along the top of the offer, as it does on every
  product card.
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
    <section className="relative border-b border-rule overflow-hidden">
      <div
        className="absolute inset-0 opacity-40 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: 'url(/hero-bg.jfif)' }}
      />
      <div className="mx-auto grid max-w-[86rem] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] relative z-10">
        {/* The sheet with semi-transparent background for text contrast */}
        <div className="flex flex-col justify-center px-4 py-12 sm:px-6 sm:py-16 lg:border-r lg:border-rule lg:px-10 lg:py-24 lg:bg-paper/95">
          <h1 className="font-display text-[clamp(2.75rem,6vw,5rem)] font-semibold leading-[0.95] tracking-[-0.04em]">
            Steroids, peptides
            <br />
            and SARMs,
            <br />
            <span className="text-pigment-indigo">compared by compound.</span>
          </h1>

          <p className="measure-tight mt-8 text-base leading-relaxed text-ink-soft sm:text-lg">
            Injectable and oral steroids, post-cycle, peptides and SARMs from 41 manufacturers.
            Every compound has its own page comparing each maker’s version by strength, form and
            price.
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
              href="/blog/how-to-read-a-certificate-of-analysis"
              className="inline-flex items-center gap-2.5 rounded-full border border-rule-strong px-6 py-3.5 text-sm font-medium transition-colors duration-300 hover:border-pigment-indigo hover:bg-paper-sunk"
            >
              How to check a certificate
            </Link>
          </div>
        </div>

        {/*
          The promotion, on the plain paper.

          This column used to BE the marbling bath — combable, with a small offer card in its
          corner — and then a band of that pigment framing the offer. At the owner's direction
          both are gone: the offer is the whole column. Dropping the bath also drops the most
          expensive thing the home page had to draw.

          A top rule below lg, where the column stacks under the headline and needs something to
          divide it; from lg the headline column's own right-hand rule does that job. The column
          is a flex container from lg so the panel can take the full 42rem height and the
          photograph can grow into whatever the text leaves.
        */}
        <div className="relative flex flex-col border-t border-rule lg:min-h-[42rem] lg:border-t-0 z-10">
          <div className="relative flex flex-col lg:flex-1">
            <HeroOffer offers={offers} fallback={fallback} promoCode={promoCode} />
          </div>
        </div>
      </div>
    </section>
  );
}
