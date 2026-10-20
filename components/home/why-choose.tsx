'use client';

import { SectionHeading } from '@/components/product/section-heading';
import { useDictionary } from '@/components/i18n/use-locale';

/*
  The chain a batch travels, in order, because the order is the argument.

  This was four same-size cards of heading plus text — a banned page scaffold and the second
  identical grid on the page. It is now a ruled sequence: large tabular numerals in the margin,
  each stage a row, the document it produces set at the end of the line like a register entry.
  The numbers are earned here — the sequence itself is the information.
*/

/*
  Four checks a buyer can make, here or anywhere. This section used to describe four stages this
  shop does not perform — a GMP-certified facility, an independent assay of every batch, a
  certificate published on each product page — none of which the catalogue can show. Those were
  claims with nothing behind them, on the busiest page of the site, and they came off at the same
  time as the decorative taglines.
*/
/* The four stages' words live in lib/i18n/dictionaries (home.checks), in each language. */
export function WhyChoose() {
  const t = useDictionary().home;
  const stages = t.checks.map((c, i) => ({ ...c, n: String(i + 1).padStart(2, '0') }));
  return (
    <section className="border-b border-rule bg-paper-sunk">
      <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-24">
        <SectionHeading title={t.checksTitle} description={t.checksBody} />

        <ol className="mt-8 border-t border-rule sm:mt-12">
          {stages.map((stage) => (
            <li
              key={stage.n}
              className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 border-b border-rule py-6 sm:grid-cols-[5rem_minmax(0,13rem)_minmax(0,1fr)_auto] sm:gap-x-8 sm:py-7 lg:py-9"
            >
              <span className="font-mono text-3xl leading-none text-pigment-indigo tabular sm:text-4xl">
                {stage.n}
              </span>

              <h3 className="font-display text-xl font-semibold tracking-[-0.025em]">
                {stage.title}
              </h3>

              <p className="col-start-2 text-sm leading-relaxed text-ink-soft sm:col-start-auto">{stage.body}</p>

              <p className="col-start-2 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint sm:col-start-auto sm:text-right">
                {stage.record}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
