import type { Metadata } from 'next';
import { getBlogPosts } from '@/lib/db/catalogue';
import { SITE } from '@/lib/site';
import { JournalIndex } from '@/components/journal/journal-index';
import { toJournalCard } from '@/lib/journal/fields';

const DESCRIPTION =
  'Sourced guides to lab testing, certificates of analysis, counterfeit steroids, SARMs and steroid law, and the health risks, with every claim linked to its source.';

export const metadata: Metadata = {
  title: 'Journal: lab testing, steroid law and health risks',
  description: DESCRIPTION,
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    url: `${SITE.url}/blog`,
    title: `The ${SITE.name} journal`,
    description: DESCRIPTION,
  },
};

export const revalidate = 3600;

export default async function BlogIndexPage() {
  const posts = await getBlogPosts();

  const cards = posts.map(toJournalCard);

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      '@id': `${SITE.url}/blog#blog`,
      name: `The ${SITE.name} journal`,
      description: DESCRIPTION,
      url: `${SITE.url}/blog`,
      publisher: { '@id': `${SITE.url}/#organization` },
      blogPost: posts.map((p) => ({
        '@type': 'BlogPosting',
        headline: p.title,
        description: p.metaDescription ?? p.excerpt,
        datePublished: p.date,
        dateModified: p.updated ?? p.date,
        author: { '@type': 'Organization', name: p.author },
        url: `${SITE.url}/blog/${p.slug}`,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
        { '@type': 'ListItem', position: 2, name: 'Journal', item: `${SITE.url}/blog` },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="border-b border-rule">
        <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
          <h1 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
            The journal
          </h1>
          <p className="measure mt-4 text-base leading-relaxed text-ink-soft sm:text-lg">
            How lab testing works, how to read a certificate of analysis, how to tell a genuine
            product from a fake, what the law says, and what the evidence says about the risks.
            Every claim links to the source it rests
            on, so you can check it yourself.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[86rem] px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
          <JournalIndex posts={cards} />
        </div>
      </section>
    </>
  );
}
