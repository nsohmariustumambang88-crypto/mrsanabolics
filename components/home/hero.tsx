'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

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

export function Hero() {
  return (
    <section className="relative border-b border-rule overflow-hidden">
      <div
        className="absolute inset-0 opacity-55 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: 'url(/hero-bg-no-bg.png)' }}
      />
      <div className="mx-auto max-w-[86rem] relative z-10">
        {/* The sheet with text shadow for contrast */}
        <div className="flex flex-col justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-24">
          <h1 className="font-display text-[clamp(2.75rem,6vw,5rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-black">
            Steroids, peptides
            <br />
            and SARMs,
            <br />
            <span className="text-blue-900">compared by compound.</span>
          </h1>

          <p className="measure-tight mt-8 text-base leading-relaxed sm:text-lg text-black">
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
          </div>
        </div>
      </div>
    </section>
  );
}
