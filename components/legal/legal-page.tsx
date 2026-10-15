import type { ReactNode } from 'react';
import { CollectionBreadcrumb, CollectionFaq, SectionTitle, type FaqItem } from '@/components/shop/collection-sections';
import { SITE } from '@/lib/site';

/*
  The frame for the policy pages (/legal/shipping, /returns, /privacy, /terms): breadcrumb,
  heading, a short intro, the policy itself, optional questions, and WebPage + BreadcrumbList
  (+ FAQPage) markup in the first response.

  `updated` is the date the policy text last changed, written down. It used to be
  `new Date()`, which printed today's date on every visit: a policy that claims to have been
  revised this morning, every morning.
*/
export function LegalPage({
  path,
  title,
  description,
  heading,
  intro,
  updated,
  faq = [],
  children,
}: {
  path: string;
  title: string;
  description: string;
  heading: string;
  intro: string;
  /** ISO date the policy text last changed. */
  updated: string;
  faq?: FaqItem[];
  children: ReactNode;
}) {
  const url = `${SITE.url}${path}`;
  const updatedLabel = new Date(`${updated}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${url}#page`,
      name: title,
      description,
      url,
      dateModified: updated,
      isPartOf: { '@id': `${SITE.url}/#website` },
      publisher: { '@id': `${SITE.url}/#organization` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
        { '@type': 'ListItem', position: 2, name: heading, item: url },
      ],
    },
    ...(faq.length > 0
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faq.map((f) => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.link ? `${f.answer} ${f.link.label}` : f.answer },
            })),
          },
        ]
      : []),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <CollectionBreadcrumb trail={[{ name: 'Home', href: '/' }, { name: heading }]} />
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink">{heading}</h1>
          <p className="mt-2 text-sm text-ink-soft">Last updated: {updatedLabel}</p>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">{intro}</p>
        </div>
        {children}
        {faq.length > 0 && (
          <section aria-labelledby="questions" className="space-y-4">
            <SectionTitle id="questions">Common questions</SectionTitle>
            <CollectionFaq items={faq} />
          </section>
        )}
      </div>
    </>
  );
}
