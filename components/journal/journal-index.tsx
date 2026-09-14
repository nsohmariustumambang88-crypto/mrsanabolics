'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { journalDate } from '@/components/journal/journal-date';
import { GridFillers } from '@/components/layout/grid-fillers';
import { cn } from '@/lib/utils';
import type { JournalCard } from '@/lib/types';

const ALL = 'All';

/*
  The topic filter hides cards; it never removes them from the server-rendered HTML. Every
  article is in the first response for search engines and for anyone without JavaScript, and a
  button that filters is a real <button> with aria-pressed, not a link to a page that does not
  exist.
*/
export function JournalIndex({ posts }: { posts: JournalCard[] }) {
  const [topic, setTopic] = React.useState(ALL);
  const topics = React.useMemo(
    () => [ALL, ...Array.from(new Set(posts.map((p) => p.category)))],
    [posts]
  );

  const lead = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p !== lead);
  const shown = (p: JournalCard) => topic === ALL || p.category === topic;
  const visible = rest.filter(shown).length + (lead && shown(lead) ? 1 : 0);

  if (!lead) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by topic">
        {topics.map((t) => {
          const count = t === ALL ? posts.length : posts.filter((p) => p.category === t).length;
          const active = topic === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTopic(t)}
              aria-pressed={active}
              className={cn(
                'border px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.14em] transition-colors',
                active
                  ? 'border-pigment-indigo bg-pigment-indigo text-paper'
                  : 'border-rule text-ink-soft hover:border-rule-strong hover:text-ink'
              )}
            >
              {t} <span className={active ? 'opacity-80' : 'text-ink-faint'}>{count}</span>
            </button>
          );
        })}
        <p className="sr-only" aria-live="polite">
          {visible} {visible === 1 ? 'article' : 'articles'} shown
        </p>
      </div>

      <div className="mt-8 grid gap-px border border-rule bg-rule">
        <Link
          href={`/blog/${lead.slug}`}
          hidden={!shown(lead)}
          className="group grid bg-card transition-colors hover:bg-paper-raised lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]"
        >
          <div className="duotone relative aspect-[16/10] overflow-hidden bg-paper-sunk lg:aspect-auto lg:min-h-[24rem]">
            <Image
              src={lead.image}
              alt={lead.imageAlt}
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-12">
            <p className="font-mono text-2xs uppercase tracking-[0.16em] text-pigment-indigo">
              Start here · {lead.category}
            </p>
            <h2 className="mt-4 font-display text-[clamp(1.6rem,2.6vw,2.25rem)] font-semibold leading-[1.08] tracking-[-0.035em] transition-colors group-hover:text-pigment-indigo">
              {lead.title}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">{lead.excerpt}</p>
            <Meta post={lead} className="mt-6" />
            <span className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-ink">
              Read the article
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
          </div>
        </Link>

        <div className="grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              hidden={!shown(post)}
              className="group flex flex-col bg-card transition-colors hover:bg-paper-raised"
            >
              <div className="duotone relative aspect-[16/10] overflow-hidden bg-paper-sunk">
                <Image
                  src={post.image}
                  alt={post.imageAlt}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="font-mono text-2xs uppercase tracking-[0.14em] text-pigment-indigo">
                  {post.category}
                </p>
                <h2 className="mt-3 font-display text-lg font-semibold leading-snug tracking-[-0.025em] transition-colors group-hover:text-pigment-indigo">
                  {post.title}
                </h2>
                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-ink-soft">{post.excerpt}</p>
                <Meta post={post} className="mt-5 border-t border-rule pt-3" />
              </div>
            </Link>
          ))}
          <GridFillers
            len={rest.filter(shown).length}
            narrow={1}
            mid={2}
            midPrefix="sm"
            wide={3}
            ground="bg-card"
          />
        </div>
      </div>
    </>
  );
}

function Meta({ post, className }: { post: JournalCard; className?: string }) {
  return (
    <p
      className={cn(
        'flex flex-wrap gap-x-3 gap-y-1 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint',
        className
      )}
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
