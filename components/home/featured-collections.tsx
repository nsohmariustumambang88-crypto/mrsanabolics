'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MarbleBath } from '@/components/ebru/marble-bath';
import { slugSeed } from '@/lib/site';

/*
  Two doors into one catalogue — the audience split PRODUCT.md records, answered directly under
  the hero because it is the first decision a visitor has to make. A buyer who arrives with a
  molecule in mind takes the left door; one who arrives with a goal takes the right.

  Each door is its own sheet, floated from its own seed, so the two read as visibly different
  bodies of water rather than as two copies of one card.
*/

const doors = [
  {
    title: 'By compound',
    slug: 'by-compound',
    body: 'You know the molecule and the ester. Go straight to the specification, the concentration, and the certificate.',
    href: '/categories',
    action: 'Open the index',
    pigments: ['--size-coat', '--pig-indigo', '--paper-raised', '--pig-indigo-lift'],
  },
  {
    title: 'By goal',
    slug: 'by-goal',
    body: 'You know what you are training toward. Start from the outcome and read down to what supports it.',
    href: '/shop',
    action: 'Browse by outcome',
    pigments: ['--size-coat', '--pig-madder', '--paper-raised', '--pig-saffron'],
  },
];

const collections = [
  { label: 'Newly floated', href: '/shop?filter=new' },
  { label: 'Moving this week', href: '/shop?filter=trending' },
  { label: 'On offer', href: '/shop?filter=deals' },
];

export function FeaturedCollections() {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto grid max-w-[86rem] gap-px bg-rule md:grid-cols-2">
        {doors.map((door) => (
          <Link
            key={door.slug}
            href={door.href}
            className="group relative flex min-h-[26rem] flex-col justify-end overflow-hidden bg-card p-8 lg:min-h-[30rem] lg:p-12"
          >
            <MarbleBath
              className="absolute inset-0 opacity-[0.3] transition-opacity duration-500 group-hover:opacity-50"
              seed={slugSeed(door.slug)}
              density={0.5}
              animate={false}
              pigments={door.pigments}
            />

            {/*
              The sheet has to stay readable over live pigment. A scrim in the card's own
              ground — not a blur — keeps body copy above 4.5:1 in both substrates while the
              marbling still reads at the top of the card.
            */}
            <div
              className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-card via-card/92 to-transparent"
              aria-hidden="true"
            />

            <div className="relative">
              <h2 className="font-display text-[clamp(1.9rem,3.6vw,3rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
                {door.title}
              </h2>
              <p className="measure-tight mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
                {door.body}
              </p>
              <span className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-rule-strong bg-paper px-5 py-3 text-sm font-medium transition-colors group-hover:border-pigment-indigo group-hover:bg-pigment-indigo group-hover:text-primary-foreground">
                {door.action}
                <ArrowRight
                  className="h-4 w-4"
                  strokeWidth={1.75}
                />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mx-auto flex max-w-[86rem] flex-wrap items-center gap-x-7 gap-y-2 border-t border-rule px-4 py-4 sm:px-6 lg:px-10">
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
