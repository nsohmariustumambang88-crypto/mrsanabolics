import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getBlogPosts } from '@/lib/db/catalogue';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Journal',
  description:
    'Protocols, testing methodology, and the reasoning behind what we stock. Written for people who read the specification before they buy.',
  alternates: { canonical: '/blog' },
};

export const revalidate = 60;

export default async function BlogIndexPage() {
  const blogPosts = await getBlogPosts();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${SITE.name} Journal`,
    url: `${SITE.url}/blog`,
    blogPost: blogPosts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.excerpt,
      datePublished: p.date,
      author: { '@type': 'Person', name: p.author },
      url: `${SITE.url}/blog/${p.slug}`,
      image: p.image,
    })),
  };

  const categories = Array.from(new Set(blogPosts.map((p) => p.category)));

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
          <p className="measure mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
            Protocols, testing methodology, and the reasoning behind what we stock — written
            for people who read the specification before they buy.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {categories.map((c) => (
              <li
                key={c}
                className="border border-rule px-2.5 py-1 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint"
              >
                {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[86rem] px-4 py-10 sm:px-6 lg:px-10">
          <div className="grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group flex flex-col bg-card transition-colors hover:bg-paper-raised"
              >
                <div className="duotone relative aspect-[16/10] overflow-hidden bg-paper-sunk">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h2 className="font-display text-lg font-semibold leading-snug tracking-[-0.025em] transition-colors group-hover:text-pigment-indigo">
                    {post.title}
                  </h2>
                  <p className="mt-2 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                    {post.category} · {post.readTime}
                  </p>
                  <p className="mt-2.5 flex-1 text-sm leading-relaxed text-ink-soft">
                    {post.excerpt}
                  </p>
                  <p className="mt-5 border-t border-rule pt-3 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                    {post.author} ·{' '}
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
