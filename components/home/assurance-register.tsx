'use client';

/*
  The band under the bath.

  This was four same-size cells of icon plus heading plus text — the one card scaffold the
  rhythm pass left standing, and one the craft floor refuses outright. It is now a single ruled
  line: four assurances set as register entries, divided by hairlines, with no icons and no
  cells. It states the four facts and takes up the height of a caption.
*/

const assurances = [
  ['Assay', 'Third-party, every batch'],
  ['Certificate', 'Published with the batch'],
  ['Packaging', 'Unmarked outer carton'],
  ['Delivery', 'Tracked and insured'],
];

export function AssuranceRegister() {
  return (
    <section
      className="border-b border-rule bg-paper-sunk"
      aria-label="What every order includes"
    >
      <dl className="mx-auto flex max-w-[86rem] flex-wrap px-4 sm:px-6 lg:px-10">
        {assurances.map(([term, detail], i) => (
          <div
            key={term}
            className={
              'flex flex-1 basis-[15rem] items-baseline gap-3 py-4 ' +
              (i > 0 ? 'sm:border-l sm:border-rule sm:pl-6' : '')
            }
          >
            <dt className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
              {term}
            </dt>
            <dd className="text-sm text-ink-soft">{detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
