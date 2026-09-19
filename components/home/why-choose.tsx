'use client';

import { SectionHeading } from '@/components/product/section-heading';

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
const stages = [
  {
    n: '01',
    title: 'Check the maker',
    body: 'Every listing names its manufacturer, and each manufacturer has a page listing everything it makes here.',
    record: 'Manufacturer named',
  },
  {
    n: '02',
    title: 'Ask for the certificate',
    body: 'Ask for the certificate of analysis for the exact batch, and check that the laboratory that issued it is accredited for that test.',
    record: 'Certificate for the batch',
  },
  {
    n: '03',
    title: 'Match the batch',
    body: 'The batch number on the certificate should match the one printed on the pack in your hand. If it does not, the certificate describes a different product.',
    record: 'Batch numbers match',
  },
  {
    n: '04',
    title: 'Compare the versions',
    body: 'Every compound has a page comparing each manufacturer’s version side by side, by strength, form and price.',
    record: 'Compared by compound',
  },
];

export function WhyChoose() {
  return (
    <section className="border-b border-rule bg-paper-sunk">
      <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-24">
        <SectionHeading
          title="Four checks before you buy"
          description="What is worth checking before any order, here or anywhere else. Our guide to reading a certificate of analysis goes through each one."
        />

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
