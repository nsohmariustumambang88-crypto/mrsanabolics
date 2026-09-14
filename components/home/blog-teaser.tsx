'use client';

import Link from 'next/link';
import Image from 'next/image';
import { SectionHeading } from '@/components/product/section-heading';
import { journalDate } from '@/components/journal/journal-date';
import type { JournalCard } from '@/lib/types';

/*
  The journal on the home page: the lead article beside the three that follow it.

  It takes JournalCard, not BlogPost. This is a client component, so a full post would put every
  article's body into the RSC payload of the busiest page on the site to render a headline.

  Each card states when it was last revised, how long it takes to read, and how many sources it
  cites. On a subject where most of the internet is unsourced, the source count is the single
  most useful thing a card can say about an article.
*/
export function BlogTeaser({ posts }: { posts: JournalCard[] }) {
  const lead = posts.find((p) => p.featured) ?? posts[0];
  if (!lead) return null;
  const rest = posts.filter((p) => p !== lead).slice(0, 3);

  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <SectionHeading
          title="The journal"
          description="How to check a certificate, spot a fake, and read the law and the health evidence — every claim linked to its source."
          href="/blog"
          hrefLabel="Read everything"
        />

        <div className="mt-8 grid gap-px bg-rule sm:mt-10 lg:grid-cols-2">
          <Link
            href={`/blog/${lead.slug}`}
            className="group flex flex-col bg-card transition-colors hover:bg-paper-raised"
          >
            <div className="duotone relative aspect-[16/10] overflow-hidden bg-paper-sunk">
              <Image
                src={lead.image}
                alt={lead.imageAlt}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-1 flex-col p-6 lg:p-8">
              <p className="font-mono text-2xs uppercase tracking-[0.16em] text-pigment-indigo">
                {lead.category}
              </p>
              <h3 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-[-0.03em] transition-colors group-hover:text-pigment-indigo">
                {lead.title}
              </h3>
              <p className="measure mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
                {lead.excerpt}
              </p>
              <Meta post={lead} className="mt-5 border-t border-rule pt-4" />
            </div>
          </Link>

          <ul className="flex flex-col bg-card">
            {rest.map((post) => (
              <li key={post.id} className="flex-1 border-b border-rule last:border-0">
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex h-full items-start gap-5 p-6 transition-colors hover:bg-paper-raised lg:p-7"
                >
                  <div className="duotone relative hidden h-20 w-28 shrink-0 overflow-hidden bg-paper-sunk sm:block">
                    <Image
                      src={post.image}
                      alt=""
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-2xs uppercase tracking-[0.14em] text-pigment-indigo">
                      {post.category}
                    </p>
                    <h3 className="mt-1.5 font-display text-base font-semibold leading-snug tracking-[-0.02em] transition-colors group-hover:text-pigment-indigo">
                      {post.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-faint">
                      {post.excerpt}
                    </p>
                    <Meta post={post} className="mt-2.5" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Meta({ post, className }: { post: JournalCard; className?: string }) {
  return (
    <p
      className={`flex flex-wrap gap-x-3 gap-y-1 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint ${
        className ?? ''
      }`}
    >
      <time dateTime={post.updated ?? post.date}>
        {post.updated && post.updated !== post.date ? 'Updated ' : ''}
        {journalDate(post.updated ?? post.date, 'short')}
      </time>
      <span aria-hidden="true">·</span>
      <span>{post.readTime} read</span>
      {post.sourceCount > 0 && (
        <>
          <span aria-hidden="true">·</span>
          <span>{post.sourceCount} sources</span>
        </>
      )}
    </p>
  );
}
