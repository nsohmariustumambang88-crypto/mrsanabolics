/*
  Seed the journal's written articles.

    npm run db:seed-journal              write new articles, leave existing rows alone
    npm run db:seed-journal -- --refresh rewrite existing rows from the files
    npm run db:seed-journal -- --dry-run check everything, write nothing
    npm run db:seed-journal -- --refresh --only=a,b
                                         rewrite only the named articles; every other row,
                                         and any admin edit to it, is left alone

  The articles live as Markdown under content/journal/, with their metadata in
  lib/data/journal.ts. Long-form prose does not belong inside a TypeScript string literal: it
  cannot be read in a diff, and every apostrophe becomes an escaping question.

  IT CHECKS BEFORE IT WRITES, and refuses the whole run on any failure:

  - every [^n] in the body has a source n, and every source is cited at least once. An article
    that cites source 7 and lists six is the one mistake that quietly destroys the credibility
    the sources are there to build;
  - every [[figure:key]] names a figure that exists in components/journal/figures.tsx;
  - at most one article is `featured`, since the journal and the home page both lead with it;
  - the excerpt fits in a search result, and the meta description too.

  A row that already exists is NOT rewritten without --refresh: after the first run an
  administrator owns the copy, and a re-run must not silently undo their edits.
*/

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { articles } from '../lib/data/journal';
import { readingTime } from '../lib/journal/fields';
import retiredFile from '../content/journal/retired.json';

/** Withdrawn addresses. Their rows are deleted; next.config.js redirects them. */
const retired: { slug: string; to: string }[] = retiredFile.retired;

const prisma = new PrismaClient();

const REFRESH = process.argv.includes('--refresh');
const DRY_RUN = process.argv.includes('--dry-run');
/** Slugs `--refresh` is limited to. Unset, it rewrites every existing row. */
const ONLY = process.argv
  .find((arg) => arg.startsWith('--only='))
  ?.slice('--only='.length)
  .split(',')
  .filter(Boolean);

/** Longest an excerpt or meta description may be before Google truncates it in a result. */
const DESCRIPTION_LIMIT = 165;

function figureKeys(): Set<string> {
  const source = readFileSync(join('components', 'journal', 'figures.tsx'), 'utf8');
  return new Set(Array.from(source.matchAll(/^\s{2}'([a-z0-9-]+)':/gm)).map((m) => m[1]));
}

function check(): { slug: string; body: string }[] {
  const problems: string[] = [];
  const keys = figureKeys();
  const bodies: { slug: string; body: string }[] = [];

  if (articles.filter((a) => a.featured).length > 1) {
    problems.push('more than one article is marked featured');
  }

  /* A retired address redirects away, so an article published at one could never be read. */
  const live = new Set(articles.map((a) => a.slug));
  for (const slug of ONLY ?? []) {
    if (!live.has(slug)) problems.push(`--only names ${slug}, which is not an article`);
  }
  for (const r of retired) {
    if (live.has(r.slug)) problems.push(`${r.slug}: is retired in content/journal/retired.json`);
    const target = r.to.match(/^\/blog\/(.+)$/)?.[1];
    if (target && !live.has(target)) problems.push(`${r.slug}: redirects to ${r.to}, which is not an article`);
  }

  for (const article of articles) {
    const path = join('content', 'journal', `${article.slug}.md`);
    if (!existsSync(path)) {
      problems.push(`${article.slug}: no file at ${path}`);
      continue;
    }
    const body = readFileSync(path, 'utf8');
    bodies.push({ slug: article.slug, body });

    const cited = new Set(
      Array.from(body.matchAll(/\[\^(\d+)\]/g)).map((m) => Number.parseInt(m[1], 10))
    );
    for (const n of Array.from(cited).sort((a, b) => a - b)) {
      if (n < 1 || n > article.sources.length) {
        problems.push(`${article.slug}: cites [^${n}] but lists ${article.sources.length} sources`);
      }
    }
    article.sources.forEach((source, i) => {
      if (!cited.has(i + 1)) problems.push(`${article.slug}: source ${i + 1} is never cited (${source.title})`);
      if (!/^https?:\/\//.test(source.url)) problems.push(`${article.slug}: source ${i + 1} has no URL`);
    });

    for (const m of Array.from(body.matchAll(/\[\[figure:([a-z0-9-]+)\]\]/g))) {
      if (!keys.has(m[1])) problems.push(`${article.slug}: no figure named "${m[1]}"`);
    }

    if (article.excerpt.length > DESCRIPTION_LIMIT) {
      problems.push(`${article.slug}: excerpt is ${article.excerpt.length} characters`);
    }
    if (article.metaDescription && article.metaDescription.length > DESCRIPTION_LIMIT) {
      problems.push(`${article.slug}: meta description is ${article.metaDescription.length} characters`);
    }
    if (!article.imageAlt) problems.push(`${article.slug}: the lead image has no description`);
  }

  if (problems.length) {
    console.error('The journal did not pass its checks:\n');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  return bodies;
}

async function main() {
  const bodies = new Map(check().map((b) => [b.slug, b.body]));
  console.log(`Journal: ${articles.length} articles${DRY_RUN ? ' (dry run)' : ''}`);

  for (const article of articles) {
    const content = bodies.get(article.slug)!;
    const scalars = {
      title: article.title,
      excerpt: article.excerpt,
      content,
      category: article.category,
      author: article.author,
      date: new Date(`${article.date}T00:00:00.000Z`),
      updated: article.updated ? new Date(`${article.updated}T00:00:00.000Z`) : null,
      readTime: readingTime(content),
      image: article.image,
      imageAlt: article.imageAlt,
      imageCredit: article.imageCredit ?? null,
      metaTitle: article.metaTitle ?? null,
      metaDescription: article.metaDescription ?? null,
      featured: article.featured ?? false,
      faqs: article.faqs,
      sources: article.sources,
    };

    const existing = await prisma.blogPost.findUnique({
      where: { slug: article.slug },
      select: { id: true },
    });

    const refresh = REFRESH && (!ONLY || ONLY.includes(article.slug));
    const words = content.split(/\s+/).filter(Boolean).length;
    const action = existing ? (refresh ? 'rewrite' : 'skip (exists)') : 'create';
    console.log(
      `  ${article.slug.padEnd(34)} ${action.padEnd(14)} ${String(words).padStart(5)} words  ${article.sources.length} sources`
    );

    if (DRY_RUN || (existing && !refresh)) continue;

    await prisma.blogPost.upsert({
      where: { slug: article.slug },
      create: { slug: article.slug, ...scalars },
      update: scalars,
    });
  }

  const withdrawn = await prisma.blogPost.findMany({
    where: { slug: { in: retired.map((r) => r.slug) } },
    select: { slug: true },
  });
  for (const row of withdrawn) {
    console.log(`  ${row.slug.padEnd(34)} ${DRY_RUN ? 'would delete' : 'delete (retired)'}`);
  }
  if (!DRY_RUN && withdrawn.length > 0) {
    await prisma.blogPost.deleteMany({ where: { slug: { in: withdrawn.map((r) => r.slug) } } });
  }

  console.log(DRY_RUN ? 'Nothing written.' : 'Done.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
