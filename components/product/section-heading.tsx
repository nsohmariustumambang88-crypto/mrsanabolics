'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDictionary } from '@/components/i18n/use-locale';

/*
  No eyebrow. The heading carries its own weight — a label above it is a crutch the craft
  floor bans outright, and the previous build had one on every section.
*/
export function SectionHeading({
  title,
  description,
  href,
  hrefLabel,
  className,
  align = 'left',
}: {
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  className?: string;
  align?: 'left' | 'center';
}) {
  /* "View all", in the page's language, unless the caller names the link. */
  const viewAll = useDictionary().section.viewAll;
  return (
    <div
      className={cn(
        'flex flex-col items-start justify-between gap-5 md:flex-row md:items-end',
        align === 'center' && 'md:flex-col md:items-center md:text-center',
        className
      )}
    >
      <div className={cn(align === 'center' && 'text-center')}>
        <h2 className="font-display text-[clamp(1.75rem,3.2vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.035em]">
          {title}
        </h2>
        {description && (
          <p
            className={cn(
              'measure mt-3 text-sm leading-relaxed text-ink-soft sm:text-base',
              align === 'center' && 'mx-auto'
            )}
          >
            {description}
          </p>
        )}
      </div>

      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-2 border-b border-rule-strong pb-1 text-sm font-medium text-ink-soft transition-colors hover:border-pigment-indigo hover:text-pigment-indigo"
        >
          {hrefLabel ?? viewAll}
          <ArrowRight
            className="h-4 w-4"
            strokeWidth={1.75}
          />
        </Link>
      )}
    </div>
  );
}
