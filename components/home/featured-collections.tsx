'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProductPlate } from '@/components/product/product-plate';

import { categoryPigment } from '@/lib/site';
import type { ProductSummary } from '@/lib/types';
import { doors, PER_DOOR } from '@/components/home/home-samples';

/*
  Two doors into one catalogue — the audience split PRODUCT.md records, answered directly under
  the hero because it is the first decision a visitor has to make. A buyer who arrives with a
  molecule in mind takes the left door; one who arrives with a goal takes the right.

  Each door used to be an abstract marbled sheet. It was honest and it was decoration: a swirl
  of indigo does not tell anyone what is behind "By compound". Each door now shows the actual
  stock it leads to, drawn from the categories that door is about — the compound-led shelves on
  the left, the outcome-led ones on the right. The pigment survives as the rule above the
  montage, which is where it identifies a category everywhere else on the site.

  The photographs sit ABOVE the copy rather than behind it. Text over a picture is the easiest
  way to lose a paragraph, and this build's craft floor puts legibility over atmosphere.
*/

const collections = [
  { label: 'Newly floated', href: '/shop?filter=new' },
  { label: 'Moving this week', href: '/shop?filter=trending' },
  { label: 'On offer', href: '/shop?filter=deals' },
];

export function FeaturedCollections({ samples }: { samples: Record<string, ProductSummary[]> }) {

  return (
    <section className="border-b border-rule">
      <div className="mx-auto grid max-w-[86rem] gap-px bg-rule md:grid-cols-2">
        {doors.map((door) => {
          const sample = samples[door.slug] ?? [];
          return (
            <Link
              key={door.slug}
              href={door.href}
              className="group flex flex-col bg-card transition-colors hover:bg-paper-sunk"
            >
              {/* The pigment of the first shelf this door opens onto. */}
              <span
                className="block h-px w-full"
                style={{ backgroundColor: categoryPigment(door.categories[0]) }}
                aria-hidden="true"
              />

              <div className="grid grid-cols-3 gap-px bg-rule">
                {sample.map((product) => (
                  <span
                    key={product.id}
                    className="relative aspect-square overflow-hidden bg-paper-sunk"
                  >
                    <ProductPlate
                      product={product}
                      showMarking={false}
                      sizes="(min-width: 768px) 17vw, 33vw"
                    />
                  </span>
                ))}
                {Array.from({ length: Math.max(0, PER_DOOR - sample.length) }).map((_, i) => (
                  <span key={`filler-${i}`} className="aspect-square bg-paper-sunk" />
                ))}
              </div>

              <div className="flex flex-1 flex-col p-6 sm:p-8 lg:p-10">
                <h2 className="font-display text-[clamp(1.5rem,2.6vw,2.25rem)] font-semibold leading-[1.05] tracking-[-0.035em]">
                  {door.title}
                </h2>
                <p className="measure-tight mt-3 text-sm leading-relaxed text-ink-soft sm:text-base">
                  {door.body}
                </p>

                <span className="mt-6 inline-flex items-center gap-2 self-start rounded-full border border-rule-strong px-5 py-2.5 text-sm font-medium transition-colors group-hover:border-pigment-indigo group-hover:text-pigment-indigo">
                  {door.action}
                  <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mx-auto flex max-w-[86rem] flex-wrap items-center gap-x-6 gap-y-2 border-t border-rule px-4 py-4 sm:px-6 lg:px-10">
        <span className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
          Or jump to
        </span>
        {collections.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="text-sm text-ink-soft underline decoration-rule-strong underline-offset-4 transition-colors hover:text-pigment-indigo hover:decoration-pigment-indigo"
          >
            {c.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
