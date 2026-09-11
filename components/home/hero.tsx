'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MarbleBath } from '@/components/ebru/marble-bath';
import { StylusMark } from '@/components/ebru/drop-mark';
import { HeroOffer } from '@/components/home/hero-offer';
import type { AdvertisedDiscount, ProductSummary } from '@/lib/types';

/*
  The first viewport is the thesis, not a header.

  A compound is a substance suspended at a concentration. Ebru is the craft of exactly that:
  pigment floated on thickened water, combed, and lifted onto paper in one contact. So the
  page opens on an actual bath — a live displacement simulation the visitor can draw through —
  with the claim and the action set on the paper beside it, divided by one plate rule.

  No hero photograph. No stat row. The card floating on the bath is the promotion slot — see
  hero-offer.tsx — and what it carries is chosen on the server from what the admin has marked
  as on offer, so this component no longer reaches into the catalogue for an arbitrary product.

  The deckle is masked onto the canvas alone. Masking the whole column also clipped the float
  card and its label, which is what broke the mobile first viewport.
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
          The bath.

          Taller on a phone than the next step up. Below 640px the offer card spans the full width,
          and at 26rem it covered about four fifths of the bath once a promo code added its row —
          leaving a strip too thin to comb, which is the one thing this panel invites you to do.
          From sm up the card sits in a corner and the shorter bath is enough.
        */}
        <div className="relative min-h-[31rem] overflow-hidden sm:min-h-[26rem] lg:min-h-[42rem]">
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

          {/* The promotion slot, lifted out of the bath it was floated in. */}
          <HeroOffer offers={offers} fallback={fallback} promoCode={promoCode} />
        </div>
      </div>
    </section>
  );
}
