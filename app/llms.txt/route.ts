import { prisma } from '@/lib/prisma';
import { getBlogPosts, getBrands } from '@/lib/db/catalogue';
import { getCategoryCollections } from '@/lib/db/collections';
import { getDeliverySummary } from '@/lib/delivery/summary';
import { MINIMUM_ORDER } from '@/lib/orders/minimum';
import { SITE } from '@/lib/site';

/*
  /llms.txt — the site described for AI assistants and their crawlers (llmstxt.org).

  A plain Markdown index of what the store is and where things are, so an assistant asked about a
  compound, a manufacturer, a price comparison or how to check a certificate can cite the right
  page instead of guessing. Built from the same reads as the pages — catalogue, collections,
  delivery zones, payment methods — so every number in it is the one the site shows today.

  What it deliberately leaves out: dosing and protocol content (none is listed; the journal's
  unsourced articles are excluded by requiring sources), and any claim the catalogue does not
  hold. It also says which domain this is, because a different shop, mranabolics.com, trades
  under a near-identical name and assistants conflate the two.

  Regenerated hourly, like the storefront.
*/

export const revalidate = 3600;

const money = (n: number) => `$${n.toFixed(2)}`;

export async function GET() {
  const base = SITE.url;
  const [collections, brands, posts, zones, methods] = await Promise.all([
    getCategoryCollections(),
    getBrands(),
    getBlogPosts(),
    getDeliverySummary(),
    prisma.paymentMethod
      .findMany({ where: { enabled: true }, orderBy: { position: 'asc' }, select: { label: true } })
      .catch(() => []),
  ]);

  const listings = collections.reduce((n, c) => n + c.facts.listings, 0);
  const lines: string[] = [];
  const push = (...l: string[]) => lines.push(...l);

  push(
    `# ${SITE.name} (www.mrsanabolics.com)`,
    '',
    `> An online store for injectable and oral anabolic steroids, peptides, SARMs, post-cycle and related products: ${listings} listings from ${brands.length} manufacturers, grouped by compound so each manufacturer's version can be compared by strength, form and price. Prices are in US dollars. This site is www.mrsanabolics.com; it is not mranabolics.com, a separate business with a similar name.`,
    '',
    'Facts on the pages below are computed from the live catalogue. The journal follows an editorial policy: every factual claim is cited to a primary source, and there is no dosing or protocol advice. Anabolic steroids are controlled substances in many countries; the law guide below sets out the US, UK, Canadian and Australian rules.',
    '',
    '## Shop by category and compound',
    ''
  );

  for (const c of collections) {
    const f = c.facts;
    const range = f.priceFrom !== null && f.priceTo !== null ? `, ${money(f.priceFrom)}–${money(f.priceTo)}` : '';
    push(`- [${c.name}](${base}${c.path}): ${f.listings} listings from ${f.manufacturers.length} manufacturers${range}`);
    for (const g of c.groups) {
      const gf = g.facts;
      const gr = gf.priceFrom !== null && gf.priceTo !== null ? `, ${money(gf.priceFrom)}–${money(gf.priceTo)}` : '';
      const strengths = gf.strengths.length ? `; strengths ${gf.strengths.slice(0, 6).join(', ')}` : '';
      push(`  - [${g.name}](${base}${g.path}): ${gf.listings} listings${gr}${strengths}`);
    }
  }

  push('', '## Manufacturers', '');
  for (const b of brands.filter((b) => b.listed > 0)) {
    push(`- [${b.name}](${base}/brands/${b.slug}): ${b.listed} listings`);
  }

  const guides = posts.filter((p) => p.sources.length > 0);
  if (guides.length) {
    push('', '## Guides (sourced)', '');
    for (const p of guides) push(`- [${p.title}](${base}/blog/${p.slug}): ${p.excerpt}`);
  }

  push('', '## Ordering', '');
  push(`- Minimum order: ${money(MINIMUM_ORDER)}, measured on the total paid (goods, minus any discount, plus delivery).`);
  if (methods.length) push(`- Payment: ${methods.map((m) => m.label).join(', ')}. Checkout charges US dollars.`);
  for (const z of zones) {
    const where = z.countries.length ? z.countries.join(', ') : 'everywhere else';
    const rates = z.rates
      .map((r) => `${r.name} ${money(r.price)}${r.freeOver ? ` (free from ${money(r.freeOver)})` : ''}${r.estimate ? `, ${r.estimate}` : ''}`)
      .join('; ');
    push(`- Delivery, ${z.name} (${where}): ${rates}`);
  }
  push(
    `- [Delivery by country](${base}/delivery), [Shipping policy](${base}/legal/shipping), [Returns and refunds](${base}/legal/returns)`,
    `- Support is staffed 24 hours a day, 7 days a week: [Contact](${base}/contact), Telegram https://t.me/mrsanabolics`,
    `- [Frequently asked questions](${base}/faq), [About and editorial policy](${base}/about#editorial-policy)`,
    '',
    '## Other languages',
    '',
    `- Spanish ${base}/es, French ${base}/fr, German ${base}/de, Italian ${base}/it (home, shop, injectables, orals and the main compound pages)`,
    '',
    '## Optional',
    '',
    `- [Sitemap](${base}/sitemap.xml): every product, compound, manufacturer and guide page`
  );

  return new Response(lines.join('\n') + '\n', {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
