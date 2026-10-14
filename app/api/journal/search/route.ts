import { NextResponse } from 'next/server';
import { getBlogPosts } from '@/lib/db/catalogue';
import { foldText } from '@/lib/search/fold';
import { matchesQuery } from '@/lib/search/match';

const MAX_ITEMS = 6;

export async function GET(request: Request) {
  const query = foldText(new URL(request.url).searchParams.get('q')?.trim() ?? '');
  const headers = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' };

  if (!query) return NextResponse.json({ items: [], similar: false }, { headers });

  const posts = await getBlogPosts();
  const fields = (p: (typeof posts)[number]) => [p.title, p.excerpt, p.category];

  let found = posts.filter((p) => matchesQuery(fields(p), query, false));
  let similar = false;
  if (found.length === 0) {
    found = posts.filter((p) => matchesQuery(fields(p), query, true));
    similar = found.length > 0;
  }

  const items = found
    .slice(0, MAX_ITEMS)
    .map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt, category: p.category }));

  return NextResponse.json({ items, similar }, { headers });
}
