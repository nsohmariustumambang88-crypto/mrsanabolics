/*
  Helpers shared by the journal's reader (lib/db/catalogue.ts) and its seed
  (prisma/seed-journal.ts). No `server-only` guard: the seed runs in plain Node, where that
  guard throws.
*/

import type { BlogPost, JournalCard, JournalSource } from '@/lib/types';

export function toJournalCard(p: BlogPost): JournalCard {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    category: p.category,
    date: p.date,
    updated: p.updated,
    readTime: p.readTime,
    image: p.image,
    imageAlt: p.imageAlt,
    featured: p.featured,
    sourceCount: p.sources.length,
  };
}

/** Words per minute for reading time. A common figure for adults reading prose on screen. */
const WORDS_PER_MINUTE = 230;

/** "7 min", from the body's word count. Markdown punctuation and figure markers are not words. */
export function readingTime(markdown: string): string {
  const words = markdown
    .replace(/\[\[figure:[^\]]+\]\]/g, ' ')
    .replace(/\[\^\d+\]/g, ' ')
    .replace(/[#*>|`_[\]()-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return `${Math.max(1, Math.round(words / WORDS_PER_MINUTE))} min`;
}

/*
  The two JSON columns are read defensively. A row an administrator edited by hand, or one
  written before the column existed, must render as "no FAQs" rather than crash the page.
*/

export function journalFaqs(value: unknown): { question: string; answer: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) =>
    item &&
    typeof item === 'object' &&
    typeof (item as { question?: unknown }).question === 'string' &&
    typeof (item as { answer?: unknown }).answer === 'string'
      ? [{ question: (item as { question: string }).question, answer: (item as { answer: string }).answer }]
      : []
  );
}

export function journalSources(value: unknown): JournalSource[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const s = item as Record<string, unknown>;
    if (typeof s.title !== 'string' || typeof s.url !== 'string') return [];
    return [
      {
        title: s.title,
        url: s.url,
        publisher: typeof s.publisher === 'string' ? s.publisher : undefined,
        year: typeof s.year === 'string' ? s.year : undefined,
      },
    ];
  });
}
