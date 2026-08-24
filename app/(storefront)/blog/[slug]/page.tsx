import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { getBlogPostBySlug, getBlogPosts, getBlogSlugs } from '@/lib/db/catalogue';
import { SITE } from '@/lib/site';

type Params = { params: { slug: string } };

export async function generateStaticParams() {
  const slugs = await getBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export const revalidate = 60;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = await getBlogPostBySlug(params.slug);
  if (!post) return { title: 'Article not found' };

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      url: `${SITE.url}/blog/${post.slug}`,
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
      authors: [post.author],
      images: [{ url: post.image, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.image],
    },
  };
}

export default async function BlogPostPage({ params }: Params) {
  const post = await getBlogPostBySlug(params.slug);
  if (!post) notFound();

  const all = await getBlogPosts();
  const more = all.filter((p) => p.slug !== post.slug).slice(0, 3);
  const paragraphs = post.content.split(/\n{2,}/).filter(Boolean);

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      image: post.image,
      datePublished: post.date,
      dateModified: post.date,
      author: { '@type': 'Person', name: post.author },
      publisher: { '@id': `${SITE.url}/#organization` },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${SITE.url}/blog/${post.slug}`,
      },
      articleSection: post.category,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Journal', item: `${SITE.url}/blog` },
        {
          '@type': 'ListItem',
          position: 2,
          name: post.title,
          item: `${SITE.url}/blog/${post.slug}`,
        },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <nav aria-label="Breadcrumb" className="border-b border-rule bg-paper-sunk">
        <ol className="mx-auto flex max-w-[86rem] items-center gap-1.5 px-4 py-3 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint sm:px-6 lg:px-10">
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
            <h1 className="measure font-display text-[clamp(2rem,4.2vw,3.5rem)] font-semibold leading-[1.03] tracking-[-0.04em]">
              {post.title}
            </h1>
            <p className="mt-4 font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
              {post.category} · {post.readTime}
            </p>
            <p className="measure mt-5 text-base leading-relaxed text-ink-soft sm:text-lg">
              {post.excerpt}
            </p>
            <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule pt-5 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
              <span>{post.author}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </p>
          </div>
        </header>

        <div className="border-b border-rule">
          <div className="mx-auto max-w-[86rem] px-4 sm:px-6 lg:px-10">
            <div className="duotone relative aspect-[21/9] overflow-hidden border-x border-rule bg-paper-sunk">
              <Image
                src={post.image}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[86rem] px-4 py-14 sm:px-6 lg:px-10">
          <div className="measure">
            {paragraphs.map((para, i) => (
              <p
                key={i}
                className="mb-6 text-base leading-[1.75] text-ink last:mb-0"
              >
                {para}
              </p>
            ))}
          </div>

          <p className="measure mt-10 border-t border-rule pt-6 text-xs leading-relaxed text-ink-faint">
            Educational content for a demonstration build. Nothing here is medical advice, and
            the author byline is a fixture rather than a real contributor.
          </p>
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
                  className="group flex flex-col bg-card p-6 transition-colors hover:bg-paper-raised"
                >
                  <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                    {p.category} · {p.readTime}
                  </p>
                  <h3 className="mt-3 font-display text-base font-semibold leading-snug tracking-[-0.02em] transition-colors group-hover:text-pigment-indigo">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-faint">{p.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
