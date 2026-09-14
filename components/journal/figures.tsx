import * as React from 'react';

/*
  Figures drawn for the journal, placed in an article with [[figure:key]] on a line of its own.

  They are drawn in the page rather than exported as pictures, for the reason the product plates
  keep their marking as live text: the words stay selectable, translatable and readable by a
  screen reader, and they wear the theme in both light and dark.

  Each figure is original work for this site. An unknown key renders nothing, so a typo in an
  article costs a figure, never the page — and prisma/seed-journal.ts refuses to publish an
  article that names a figure which is not in the record below.
*/

function Frame({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <figure className="my-10">
      <div className="overflow-x-auto border border-rule bg-card">{children}</div>
      <figcaption className="mt-2.5 text-xs leading-relaxed text-ink-faint">{caption}</figcaption>
    </figure>
  );
}

/** A numbered marker, tying a place on the certificate to the note that explains it. */
function Marker({ n }: { n: number }) {
  return (
    <span className="inline-flex h-[1.15rem] w-[1.15rem] shrink-0 items-center justify-center rounded-full border border-pigment-indigo font-mono text-2xs text-pigment-indigo">
      {n}
    </span>
  );
}

function Row({
  marker,
  label,
  value,
}: {
  marker?: number;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3 border-b border-rule px-4 py-2 last:border-0 sm:px-5">
      {marker ? <Marker n={marker} /> : <span className="w-[1.15rem] shrink-0" aria-hidden="true" />}
      <span className="w-[8.5rem] shrink-0 font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
        {label}
      </span>
      <span className="min-w-0 text-sm text-ink">{value}</span>
    </div>
  );
}

const CERTIFICATE_NOTES: { n: number; text: string }[] = [
  { n: 1, text: 'The laboratory, with an address and a way to contact it. A certificate from a lab you cannot telephone cannot be checked.' },
  { n: 2, text: 'The accreditation number. Look it up in the accreditation body’s own directory — the number is either in the register, against this lab, for these tests, or it is worth nothing.' },
  { n: 3, text: 'The batch or lot number. It has to match the number printed on the product in your hand, or the certificate describes somebody else’s batch.' },
  { n: 4, text: 'Identity: a test that proves the substance IS what the label says, usually by mass spectrometry against a reference standard.' },
  { n: 5, text: 'Assay: how much of it there is, against what the label claims. This is the line that says whether a product is underdosed.' },
  { n: 6, text: 'Purity, with the limit it was judged against. A result with no specification beside it is a number, not a pass.' },
  { n: 7, text: 'The method for each test, so somebody else could repeat it.' },
  { n: 8, text: 'The date tested, and a named person who signs for the result.' },
];

function CertificateAnatomy() {
  return (
    <Frame caption="How a certificate of analysis is laid out, and the eight things worth checking on one. An illustration drawn for this article — the laboratory, batch and results are invented, and it is not a real certificate.">
      <div className="min-w-[34rem]">
        <div className="border-b border-rule-strong bg-paper-sunk px-4 py-3 sm:px-5">
          <div className="flex items-baseline gap-3">
            <Marker n={1} />
            <div>
              <p className="font-display text-base font-semibold tracking-[-0.02em] text-ink">
                Northgate Analytical Services
              </p>
              <p className="mt-0.5 font-mono text-2xs text-ink-faint">
                14 Corn Exchange, Leeds LS1 · +44 113 000 0000 · lab@example.test
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <Marker n={2} />
            <p className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft">
              ISO/IEC 17025 accredited · testing laboratory no. 0000
            </p>
          </div>
        </div>

        <p className="border-b border-rule px-4 py-2.5 font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint sm:px-5">
          Certificate of analysis
        </p>

        <Row label="Sample" value="Testosterone enanthate 250 mg/mL, 10 mL vial" />
        <Row marker={3} label="Batch / lot" value="TE-2411-088" />
        <Row label="Received" value="4 March 2026" />

        <div className="border-b border-rule">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-paper-sunk">
                {['', 'Test', 'Method', 'Specification', 'Result'].map((h, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="border-b border-rule px-3 py-2 font-mono text-2xs font-medium uppercase tracking-[0.12em] text-ink-faint first:w-10 first:px-4 sm:first:px-5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {[
                { n: 4, test: 'Identity', method: 'LC-MS', spec: 'Conforms to reference standard', result: 'Conforms' },
                { n: 5, test: 'Assay', method: 'HPLC-UV', spec: '95.0 – 105.0 % of label claim', result: '99.2 %' },
                { n: 6, test: 'Related substances', method: 'HPLC-UV', spec: '≤ 2.0 % total', result: '0.7 %' },
              ].map((r) => (
                <tr key={r.test} className="border-b border-rule last:border-0">
                  <td className="px-4 py-2 align-middle sm:px-5">
                    <Marker n={r.n} />
                  </td>
                  <td className="px-3 py-2 font-medium text-ink">{r.test}</td>
                  <td className="px-3 py-2 text-ink-soft">
                    {r.test === 'Identity' ? (
                      <span className="inline-flex items-center gap-2">
                        <Marker n={7} />
                        {r.method}
                      </span>
                    ) : (
                      r.method
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-ink-soft tabular">{r.spec}</td>
                  <td className="px-3 py-2 font-mono text-xs text-ink tabular">{r.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Row
          marker={8}
          label="Tested / signed"
          value="11 March 2026 · A. Whitfield, Head of Laboratory"
        />
      </div>
    </Frame>
  );
}

function CertificateChecklist() {
  return (
    <ol className="my-8 space-y-3">
      {CERTIFICATE_NOTES.map((note) => (
        <li key={note.n} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
          <Marker n={note.n} />
          <span>{note.text}</span>
        </li>
      ))}
    </ol>
  );
}

/*
  How much each kind of evidence about a product is worth, weakest first. The strength is drawn
  as filled segments AND stated in words, so it does not rely on colour or on the picture alone.
*/
const EVIDENCE: { title: string; tells: string; strength: number; word: string }[] = [
  {
    title: 'The seller’s word',
    tells: '“Lab tested”, “pharma grade”, “99% pure”. A claim with nothing behind it that anyone could check.',
    strength: 0,
    word: 'None',
  },
  {
    title: 'The packaging looks right',
    tells: 'Catches careless forgeries. A competent fake, or a genuine box refilled, looks exactly the same.',
    strength: 1,
    word: 'Weak',
  },
  {
    title: 'A certificate you cannot verify',
    tells: 'May describe a different batch, a different product, or no real test at all.',
    strength: 2,
    word: 'Limited',
  },
  {
    title: 'A verified certificate for your batch',
    tells: 'The laboratory confirms it issued the report, the test is on its accredited scope, and the batch number matches.',
    strength: 3,
    word: 'Good',
  },
  {
    title: 'An accredited test of your own product',
    tells: 'Direct evidence about the container you hold, rather than about a sample from the same batch.',
    strength: 4,
    word: 'Strongest',
  },
];

function EvidenceLadder() {
  return (
    <Frame caption="How much each kind of evidence tells you about what is inside a product, from weakest to strongest. Drawn for this article.">
      <ol className="min-w-[30rem] divide-y divide-rule">
        {EVIDENCE.map((rung) => (
          <li key={rung.title} className="grid grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-5 px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold tracking-[-0.015em] text-ink">{rung.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">{rung.tells}</p>
            </div>
            <div>
              <div className="flex gap-1" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-2 flex-1 ${i < rung.strength ? 'bg-pigment-indigo' : 'bg-paper-sunk ring-1 ring-inset ring-rule'}`}
                  />
                ))}
              </div>
              <p className="mt-1.5 font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">{rung.word}</p>
            </div>
          </li>
        ))}
      </ol>
    </Frame>
  );
}

const TEST_QUESTIONS: { name: string; question: string; method: string; watch: string }[] = [
  {
    name: 'Identity',
    question: 'Is it what the label says?',
    method: 'Mass spectrometry, usually paired with liquid or gas chromatography (LC-MS, GC-MS).',
    watch: 'Identity claimed from an HPLC retention time alone. That is not specific.',
  },
  {
    name: 'Assay',
    question: 'How much of it is there?',
    method: 'HPLC, measured against a calibration curve built from a reference standard.',
    watch: 'A figure with no label claim and no acceptable range beside it.',
  },
  {
    name: 'Purity',
    question: 'What else is in it?',
    method: 'HPLC impurity profile, with mass spectrometry to identify unexpected peaks.',
    watch: '“Not detected”, which means below that method’s detection limit, not absent.',
  },
];

function TestQuestions() {
  return (
    <Frame caption="The three questions a laboratory answers about a product, the methods that usually answer them, and the claim on a certificate that should make you look twice. Drawn for this article.">
      <div className="grid min-w-[34rem] grid-cols-3 gap-px bg-rule">
        {TEST_QUESTIONS.map((t, i) => (
          <div key={t.name} className="flex flex-col bg-card p-4 sm:p-5">
            <p className="flex items-center gap-2 font-mono text-2xs uppercase tracking-[0.14em] text-pigment-indigo">
              <Marker n={i + 1} />
              {t.name}
            </p>
            <p className="mt-3 font-display text-base font-semibold leading-snug tracking-[-0.02em] text-ink">
              {t.question}
            </p>
            <p className="mt-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">Usually by</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{t.method}</p>
            <p className="mt-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">Look twice at</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{t.watch}</p>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/*
  The four countries side by side. Every line here is stated, with its source, in the article
  text below it; the figure is a summary and says so. Cards rather than a table, because a
  four-country table scrolls sideways on a phone and a stack of cards does not.
*/
const LAW: { country: string; rows: [string, string][] }[] = [
  {
    country: 'United States',
    rows: [
      ['Status', 'Schedule III controlled substance'],
      ['Possession', 'Offence without a valid prescription: up to 1 year, minimum $1,000 fine (first offence)'],
      ['Importing', 'Unlawful except for legitimate uses under federal rules; no online supply without a valid prescription'],
      ['Supply', 'Up to 10 years (first offence)'],
    ],
  },
  {
    country: 'United Kingdom',
    rows: [
      ['Status', 'Class C drug'],
      ['Possession', 'Not an offence for the listed steroids, for yourself (England, Wales and Scotland)'],
      ['Importing', 'Exempt only if carried in person for your own use; post, courier and freight are not'],
      ['Supply', 'Up to 14 years'],
    ],
  },
  {
    country: 'Canada',
    rows: [
      ['Status', 'Schedule IV controlled substance'],
      ['Possession', 'Simple possession is not an offence'],
      ['Importing', 'Prohibited unless authorised under the regulations: up to 3 years'],
      ['Supply', 'Trafficking: up to 3 years'],
    ],
  },
  {
    country: 'Australia',
    rows: [
      ['Status', 'Schedule 4, prescription-only'],
      ['Possession', 'Illegal without authority, such as a prescription; offences set by each state and territory'],
      ['Importing', 'Prohibited without written permission'],
      ['Supply', 'Set by state and territory law'],
    ],
  },
];

function LawAtAGlance() {
  return (
    <figure className="my-10">
      <div className="grid gap-px border border-rule bg-rule sm:grid-cols-2">
        {LAW.map((c) => (
          <div key={c.country} className="bg-card">
            <p className="border-b border-rule bg-paper-sunk px-4 py-2.5 font-display text-sm font-semibold tracking-[-0.015em] text-ink">
              {c.country}
            </p>
            <dl className="divide-y divide-rule">
              {c.rows.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 px-4 py-2.5">
                  <dt className="pt-px font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">{label}</dt>
                  <dd className="text-xs leading-relaxed text-ink-soft">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <figcaption className="mt-2.5 text-xs leading-relaxed text-ink-faint">
        A summary of the federal or national position, checked against the legislation in September
        2026. The sections below give the detail and the source for each line. Not legal advice.
      </figcaption>
    </figure>
  );
}

const FIGURES: Record<string, () => React.ReactElement> = {
  'law-at-a-glance': LawAtAGlance,
  'certificate-anatomy': CertificateAnatomy,
  'certificate-checklist': CertificateChecklist,
  'evidence-ladder': EvidenceLadder,
  'test-questions': TestQuestions,
};

export function JournalFigure({ figureKey }: { figureKey: string }) {
  const Figure = FIGURES[figureKey];
  return Figure ? <Figure /> : null;
}
