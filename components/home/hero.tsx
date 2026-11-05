'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useBrands } from '@/components/providers/catalogue-provider';
import { useLocale } from '@/components/i18n/use-locale';
import { dictionary } from '@/lib/i18n/dictionaries';
import { localizedHref } from '@/lib/i18n/routes';

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

  The words come from the page's language (/es, /fr, /de, /it have their own), and the number of
  manufacturers is counted from the catalogue rather than written down.
*/

export function Hero() {
  const locale = useLocale();
  const t = dictionary(locale).home;
  const makers = useBrands().length;

  return (
    <section className="relative border-b border-rule overflow-hidden">
      {/*
        The photograph is the page's largest paint, so it is an <img> in the server HTML with
        high fetch priority rather than a CSS background: a background is only discovered once
        the stylesheet has arrived and the box has been laid out, and on a slow line that put
        the first full paint at 10-20 seconds. It is a 28 KB WebP made from the 261 KB PNG it
        replaced, at the same size and with the same transparency. `unoptimized` because the
        Cloudinary loader treats any non-http src as a public ID.
      */}
      <Image
        src="/hero-bg.webp"
        alt=""
        fill
        priority
        unoptimized
        sizes="100vw"
        className="pointer-events-none object-cover object-center opacity-55"
      />
      <div className="mx-auto max-w-[86rem] relative z-10">
        {/* Black on the sheet, as chosen. On the bath black disappeared into the ground, so the
            dark theme sets the same words in its own ink and lifted indigo. */}
        <div className="flex flex-col justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-24">
          <h1 className="font-display text-[clamp(2.75rem,6vw,5rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-black dark:text-ink">
            {t.heroLines[0]}
            <br />
            {t.heroLines[1]}
            <br />
            <span className="text-blue-900 dark:text-pigment-indigo">{t.heroAccent}</span>
          </h1>

          <p className="measure-tight mt-8 text-base leading-relaxed sm:text-lg text-black dark:text-ink">
            {t.heroBody(makers)}
          </p>

          <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-3">
            <Link
              href={localizedHref(locale, '/shop')}
              className="group inline-flex items-center gap-2.5 rounded-full bg-pigment-indigo px-6 py-3.5 text-sm font-medium text-primary-foreground transition-colors duration-300 hover:bg-pigment-indigo-lift"
            >
              {t.heroCta}
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
