'use client';

import { SectionHeading } from '@/components/product/section-heading';

/*
  The chain a batch travels, in order, because the order is the argument.

  This was four same-size cards of heading plus text — a banned page scaffold and the second
  identical grid on the page. It is now a ruled sequence: large tabular numerals in the margin,
  each stage a row, the document it produces set at the end of the line like a register entry.
  The numbers are earned here — the sequence itself is the information.
*/

const stages = [
  {
    n: '01',
    title: 'Synthesised',
    body: 'Produced in a GMP-certified facility against a written specification, with the concentration fixed before anything is filled.',
    record: 'Specification set',
  },
  {
    n: '02',
    title: 'Assayed',
    body: 'A sample from every batch goes to an independent laboratory. We do not run the test that clears our own product.',
    record: 'Independent lab',
  },
  {
    n: '03',
    title: 'Documented',
    body: 'The certificate of analysis is filed against the batch number and published on the product page. You read it before you buy, not after.',
    record: 'COA published',
  },
  {
    n: '04',
    title: 'Lifted',
    body: 'Packed unmarked, insulated where the compound requires it, and tracked from our door to yours.',
    record: 'Tracked, unmarked',
  },
];

export function WhyChoose() {
  return (
    <section className="border-b border-rule bg-paper-sunk">
      <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-24">
        <SectionHeading
          title="What happens before it ships"
          description="Four stages, in order. Each one produces a document, and every document is attached to the batch number printed on your vial."
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
