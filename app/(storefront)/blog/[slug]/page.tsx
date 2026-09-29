import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { getBlogPostBySlug, getBlogPosts, getBlogSlugs } from '@/lib/db/catalogue';
import { SITE, UNDER_HEADER_INSET } from '@/lib/site';
import { cloudinaryUrl } from '@/lib/cloudinary';
import { ArticleBody, articleHeadings } from '@/components/journal/article-body';
import { journalDate } from '@/components/journal/journal-date';
import type { BlogPost } from '@/lib/types';

type Params = { params: { slug: string } };

export async function generateStaticParams() {
  const slugs = await getBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export const revalidate = 60;

/**
 * The lead image at a fixed crop, as an absolute URL. Search engines and link previews need a
 * real file of a known shape, not a srcset: 1200x630 is the size link previews expect, and
 * Google asks for article images at least 1200px wide in 16:9, 4:3 and 1:1.
 */
function leadImage(post: BlogPost, width: number, height: number): string {
  const url = cloudinaryUrl(post.image, { width, height, crop: 'fill' });
  return url.startsWith('http') ? url : `${SITE.url}${url}`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = await getBlogPostBySlug(params.slug);
  if (!post) return { title: 'Article not found' };

  const title = post.metaTitle ?? post.title;
  const description = post.metaDescription ?? post.excerpt;
  const image = leadImage(post, 1200, 630);

  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      url: `${SITE.url}/blog/${post.slug}`,
      title,
      description,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      section: post.category,
      authors: [post.author],
      images: [{ url: image, width: 1200, height: 630, alt: post.imageAlt || post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function BlogPostPage({ params }: Params) {
  const post = await getBlogPostBySlug(params.slug);
  if (!post) notFound();

  const all = await getBlogPosts();
  /* Same topic first, then the newest of the rest, so the row of three always fills. */
  const more = [
    ...all.filter((p) => p.slug !== post.slug && p.category === post.category),
    ...all.filter((p) => p.slug !== post.slug && p.category !== post.category),
  ].slice(0, 3);

  const headings = articleHeadings(post.content);
  const url = `${SITE.url}/blog/${post.slug}`;

  const schema: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.metaDescription ?? post.excerpt,
      /*
        Three crops, because Google asks for 16:9, 4:3 and 1:1 and picks what suits the surface.
        Each is comfortably over its 50,000-pixel minimum.
      */
      image: [leadImage(post, 1200, 675), leadImage(post, 1200, 900), leadImage(post, 1200, 1200)],
      /* ISO 8601 WITH a zone. Without one, Googlebot applies its own default to a bare date. */
      datePublished: `${post.date}T00:00:00Z`,
      dateModified: `${post.updated ?? post.date}T00:00:00Z`,
      /*
        The byline is the organisation, and it says so. Google's guidance is to name who is
        responsible for the content; an invented person with invented credentials is exactly
        what it asks sites not to do.
      */
      author: { '@type': 'Organization', name: post.author, url: `${SITE.url}/about#editorial-policy` },
      publisher: { '@id': `${SITE.url}/#organization` },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      articleSection: post.category,
      wordCount: post.content.split(/\s+/).filter(Boolean).length,
      ...(post.sources.length > 0 && {
        citation: post.sources.map((s) => ({
          '@type': 'CreativeWork',
          name: s.title,
          url: s.url,
          ...(s.publisher && { publisher: s.publisher }),
        })),
      }),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
        { '@type': 'ListItem', position: 2, name: 'Journal', item: `${SITE.url}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    },
  ];
  if (post.faqs.length > 0) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <nav aria-label="Breadcrumb" className="border-b border-rule bg-paper-sunk">
        <ol className={`mx-auto flex max-w-[86rem] items-center gap-1.5 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint ${UNDER_HEADER_INSET}`}>
          <li>
            <Link href="/blog" className="transition-colors hover:text-ink">
              Journal
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
          <li className="truncate text-ink-soft" aria-current="page">
            {post.category}
          </li>
        </ol>
      </nav>

      <article>
        <header className="border-b border-rule">
          <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
            <p className="font-mono text-2xs uppercase tracking-[0.16em] text-pigment-indigo">
              {post.category} · {post.readTime} read
            </p>
            <h1 className="measure mt-4 font-display text-[clamp(2rem,4.2vw,3.5rem)] font-semibold leading-[1.03] tracking-[-0.04em]">
              {post.title}
            </h1>
            <p className="measure mt-5 text-base leading-relaxed text-ink-soft sm:text-lg">
              {post.excerpt}
            </p>
            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-rule pt-5 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
              <div className="flex gap-2">
                <dt>By</dt>
                <dd className="text-ink-soft">
                  <Link href="/about#editorial-policy" className="transition-colors hover:text-ink">
                    {post.author}
                  </Link>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt>Published</dt>
                <dd className="text-ink-soft">
                  <time dateTime={post.date}>{journalDate(post.date)}</time>
                </dd>
              </div>
              {post.updated && post.updated !== post.date && (
                <div className="flex gap-2">
                  <dt>Updated</dt>
                  <dd className="text-ink-soft">
                    <time dateTime={post.updated}>{journalDate(post.updated)}</time>
                  </dd>
                </div>
              )}
              {post.sources.length > 0 && (
                <div className="flex gap-2">
                  <dt>Sources</dt>
                  <dd>
                    <a href="#sources" className="text-ink-soft transition-colors hover:text-ink">
                      {post.sources.length} cited
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </header>

        <figure className="border-b border-rule">
          <div className="mx-auto max-w-[86rem] px-4 sm:px-6 lg:px-10">
            <div className="duotone relative aspect-[16/9] overflow-hidden border-x border-rule bg-paper-sunk sm:aspect-[21/9]">
              <Image
                src={post.image}
                alt={post.imageAlt}
                fill
                priority
                sizes="(min-width: 86rem) 86rem, 100vw"
                className="object-cover"
              />
            </div>
            {post.imageCredit && (
              <figcaption className="border-x border-rule px-4 py-2 font-mono text-2xs tracking-[0.06em] text-ink-faint">
                {post.imageCredit}
              </figcaption>
            )}
          </div>
        </figure>

        <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16 lg:px-10 lg:py-16">
          {headings.length > 2 && (
            <nav aria-label="In this article" className="mb-10 lg:mb-0">
              <div className="border-y border-rule py-5 lg:sticky lg:top-32 lg:border-y-0 lg:py-0">
                <p className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
                  In this article
                </p>
                <ol className="mt-4 space-y-2.5 text-sm leading-snug">
                  {headings.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className="text-ink-soft transition-colors hover:text-pigment-indigo"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                  {post.faqs.length > 0 && (
                    <li>
                      <a href="#questions" className="text-ink-soft transition-colors hover:text-pigment-indigo">
                        Questions
                      </a>
                    </li>
                  )}
                  {post.sources.length > 0 && (
                    <li>
                      <a href="#sources" className="text-ink-soft transition-colors hover:text-pigment-indigo">
                        Sources
                      </a>
                    </li>
                  )}
                </ol>
              </div>
            </nav>
          )}

          <div className={`measure min-w-0 ${headings.length > 2 ? '' : 'lg:col-span-2'}`}>
            <ArticleBody markdown={post.content} />

            {post.faqs.length > 0 && (
              <section aria-labelledby="questions" className="mt-16 border-t border-rule pt-10">
                <h2
                  id="questions"
                  className="scroll-mt-40 font-display text-2xl font-semibold tracking-[-0.03em] text-ink"
                >
                  Questions
                </h2>
                <dl className="mt-6 divide-y divide-rule border-y border-rule">
                  {post.faqs.map((f) => (
                    <div key={f.question} className="py-5">
                      <dt className="font-display text-base font-semibold tracking-[-0.015em] text-ink">
                        {f.question}
                      </dt>
                      <dd className="mt-2 text-sm leading-relaxed text-ink-soft">{f.answer}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {post.sources.length > 0 && (
              <section aria-labelledby="sources" className="mt-16 border-t border-rule pt-10">
                <h2
                  id="sources"
                  className="scroll-mt-40 font-display text-2xl font-semibold tracking-[-0.03em] text-ink"
                >
                  Sources
                </h2>
                <ol className="mt-6 space-y-3 text-sm leading-relaxed text-ink-soft">
                  {post.sources.map((s, i) => (
                    <li key={s.url + i} id={`source-${i + 1}`} className="flex scroll-mt-40 gap-3">
                      <span className="w-6 shrink-0 font-mono text-xs text-ink-faint tabular">
                        {i + 1}.
                      </span>
                      <span>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ink underline decoration-rule-strong underline-offset-[3px] transition-colors hover:decoration-pigment-indigo"
                        >
                          {s.title}
                        </a>
                        {(s.publisher || s.year) && (
                          <span className="text-ink-faint">
                            {' '}
                            — {[s.publisher, s.year].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <p className="mt-12 border-t border-rule pt-6 text-xs leading-relaxed text-ink-faint">
              General information for educational purposes. It is not medical or legal advice, and laws and evidence change. Where it matters, check the primary sources above and speak to a qualified professional where you live.
            </p>
          </div>
        </div>
      </article>

      {more.length > 0 && (
        <section className="border-t border-rule">
          <div className="mx-auto max-w-[86rem] px-4 py-14 sm:px-6 lg:px-10">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">
              Keep reading
            </h2>
            <div className="mt-8 grid gap-px bg-rule sm:grid-cols-3">
              {more.map((p) => (
                <Link
                  key={p.id}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col bg-card transition-colors hover:bg-paper-raised"
                >
                  <div className="duotone relative aspect-[16/9] overflow-hidden bg-paper-sunk">
                    <Image
                      src={p.image}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 33vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                      {p.category} · {p.readTime}
                    </p>
                    <h3 className="mt-3 font-display text-base font-semibold leading-snug tracking-[-0.02em] transition-colors group-hover:text-pigment-indigo">
                      {p.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-faint">
                      {p.excerpt}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
