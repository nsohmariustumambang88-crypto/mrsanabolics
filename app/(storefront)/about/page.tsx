import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MarbleBath } from '@/components/ebru/marble-bath';
import { SectionHeading } from '@/components/product/section-heading';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Why this catalogue publishes the specification, the batch, and the assay for every compound it sells.',
  alternates: { canonical: '/about' },
};

const principles = [
  {
    title: 'Evidence outranks atmosphere',
    body: 'The specification is the product’s real argument. We put it under the price rather than behind a tab, because a buyer who cannot check the concentration is being asked to trust a photograph.',
  },
  {
    title: 'Two doors, one catalogue',
    body: 'Some people arrive knowing the molecule and the ester. Others arrive knowing what they are training toward. Neither should have to browse the other’s route to find the same shelf.',
  },
  {
    title: 'Legibility is the trust signal',
    body: 'In a category built on skepticism, information that is easy to read and easy to verify does more for conviction than any amount of persuasion styling.',
  },
  {
    title: 'Nothing claims what it cannot show',
    body: 'Every figure on this site either traces to a document or is labelled as demonstration content. A number without a source is decoration.',
  },
];

const milestones = [
  { year: '2019', title: 'First catalogue', body: 'Twelve compounds, one manufacturer, and a spreadsheet of batch numbers.' },
  { year: '2021', title: 'Independent assay', body: 'Testing moved outside the house. We stopped running the test that cleared our own product.' },
  { year: '2023', title: 'Certificates published', body: 'Every batch record became readable on the product page rather than available on request.' },
  { year: '2025', title: 'Eleven categories', body: 'The catalogue reached its current shape, with one pigment per category across the whole site.' },
];

export default function AboutPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    url: `${SITE.url}/about`,
    name: `About ${SITE.name}`,
    description: SITE.description,
    mainEntity: { '@id': `${SITE.url}/#organization` },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="relative border-b border-rule">
        <div className="mx-auto grid max-w-[86rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <div className="flex flex-col justify-center px-4 py-12 sm:px-6 sm:py-16 lg:border-r lg:border-rule lg:px-10 lg:py-24">
            <h1 className="font-display text-[clamp(2.25rem,5vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
              We sell the document
              <br />
              as much as the vial.
            </h1>
            <p className="measure mt-7 text-base leading-relaxed text-ink-soft sm:text-lg">
              A compound is a substance held at a concentration. That number is either true or
              it is not, and the only way to know is to read a test somebody else ran. This
              catalogue is built around making that test easy to find.
            </p>
            <Link
              href="/faq"
              className="group mt-9 inline-flex w-fit items-center gap-2.5 rounded-full bg-pigment-indigo px-6 py-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift"
            >
              How testing works
              <ArrowRight
                className="h-4 w-4"
                strokeWidth={1.75}
              />
            </Link>
          </div>

          <div className="relative min-h-[20rem] overflow-hidden lg:min-h-full">
            <MarbleBath
              className="absolute inset-0 h-full w-full"
              seed={3311}
              density={0.7}
              animate={false}
            />
          </div>
        </div>
      </section>

      <section className="border-b border-rule">
        <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
          <SectionHeading
            title="What we hold to"
            description="Four principles that decide what gets listed and how it gets presented."
          />
          <div className="mt-8 grid sm:mt-10 gap-px bg-rule md:grid-cols-2">
            {principles.map((p) => (
              <div key={p.title} className="bg-card p-7 lg:p-8">
                <h2 className="font-display text-xl font-semibold tracking-[-0.025em]">
                  {p.title}
                </h2>
                <p className="measure mt-3 text-sm leading-relaxed text-ink-soft">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-rule bg-paper-sunk">
        <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
          <SectionHeading
            title="How it got here"
            description="A short history of the catalogue, in the order it happened."
          />
          <ol className="mt-8 sm:mt-10 border-t border-rule">
            {milestones.map((m) => (
              <li
                key={m.year}
                className="grid gap-2 border-b border-rule py-6 sm:grid-cols-[7rem_minmax(0,16rem)_1fr] sm:gap-8"
              >
                <span className="font-mono text-2xs uppercase tracking-[0.16em] text-pigment-indigo tabular">
                  {m.year}
                </span>
                <h3 className="font-display text-lg font-semibold tracking-[-0.025em]">
                  {m.title}
                </h3>
                <p className="text-sm leading-relaxed text-ink-soft">{m.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-xs text-ink-faint">
            Demonstration content — this timeline is authored for a portfolio build and does
            not describe a real company history.
          </p>
        </div>
      </section>

      {/*
        The editorial policy. Every article in the journal is bylined "MrAnabolics Editorial"
        and that byline links here, because a byline that leads nowhere answers none of the
        questions a reader of this subject should be asking. It states the conflict of interest
        in the first line: this site sells what the journal writes about.
      */}
      <section id="editorial-policy" className="border-b border-rule">
        <div className="mx-auto max-w-[86rem] px-4 py-12 scroll-mt-32 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
          <SectionHeading
            title="Editorial policy"
            description="Who writes the journal, how it is sourced, and what it will not tell you."
          />
          <div className="measure mt-8 space-y-5 text-sm leading-relaxed text-ink-soft sm:mt-10">
            <p>
              <span className="font-medium text-ink">We sell what we write about.</span> That is
              a conflict of interest, and the honest thing is to say so at the top rather than
              bury it. Read the journal knowing it, and check the sources.
            </p>
            <p>
              <span className="font-medium text-ink">The byline is the shop, not a person.</span>{' '}
              Articles are written and checked by the people who run this site. No article
              carries an invented author, and none claims a medical, scientific or legal
              qualification that nobody here holds.
            </p>
            <p>
              <span className="font-medium text-ink">Every factual claim is sourced.</span> The
              sources are listed at the foot of each article and cited in the text where they are
              used. We prefer the primary document — the legislation, the regulator, the
              standard, the published study — over anybody&apos;s summary of it, including ours.
              Where the evidence is thin or disputed, the article says so instead of picking a
              side.
            </p>
            <p>
              <span className="font-medium text-ink">
                No dosing, no protocols, no medical advice.
              </span>{' '}
              The journal covers testing, verification, the law, and the health risks as health
              authorities and published studies describe them. It does not tell
              anybody what to take, how much, or in what combination. Those are questions for a
              doctor who knows your history, and the answer cannot come from a shop.
            </p>
            <p>
              <span className="font-medium text-ink">Corrections.</span> Articles carry the date
              they were published and the date they were last revised. If something here is
              wrong, <Link href="/contact" className="text-pigment-indigo underline decoration-rule-strong underline-offset-[3px] transition-colors hover:decoration-pigment-indigo">tell us</Link>{' '}
              and we will correct it and say that we did.
            </p>
            <p className="text-xs text-ink-faint">
              This is a portfolio build, so the journal is a demonstration of that standard
              rather than the output of a working newsroom. The sources it cites are real and
              the claims are checked against them.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
