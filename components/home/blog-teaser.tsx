'use client';

import Link from 'next/link';
import Image from 'next/image';
import { SectionHeading } from '@/components/product/section-heading';
import type { BlogPost } from '@/lib/types';

export function BlogTeaser({ posts }: { posts: BlogPost[] }) {
  const [lead, ...rest] = posts.slice(0, 4);
  if (!lead) return null;

  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <SectionHeading
          title="The journal"
          description="Protocols, testing methodology, and the reasoning behind what we stock."
          href="/blog"
          hrefLabel="Read everything"
        />

        <div className="mt-8 sm:mt-10 grid gap-px bg-rule lg:grid-cols-2">
          <Link
            href={`/blog/${lead.slug}`}
            className="group flex flex-col bg-card transition-colors hover:bg-paper-raised"
          >
            <div className="duotone relative aspect-[16/10] overflow-hidden bg-paper-sunk">
              <Image
                src={lead.image}
                alt={lead.title}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="p-6 lg:p-8">
              <h3 className="font-display text-2xl font-semibold leading-tight tracking-[-0.03em] transition-colors group-hover:text-pigment-indigo">
                {lead.title}
              </h3>
              <p className="mt-2.5 flex items-center gap-3 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                <span>{lead.category}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={lead.date}>{lead.readTime}</time>
              </p>
              <p className="measure mt-3 text-sm leading-relaxed text-ink-soft">
                {lead.excerpt}
              </p>
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
                    <h3 className="font-display text-base font-semibold leading-snug tracking-[-0.02em] transition-colors group-hover:text-pigment-indigo">
                      {post.title}
                    </h3>
                    <p className="mt-1.5 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                      {post.category} · {post.readTime}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-faint">
                      {post.excerpt}
                    </p>
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
