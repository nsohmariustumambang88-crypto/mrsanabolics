import type { MetadataRoute } from 'next';
import { getProducts, getBrands, getBlogPosts } from '@/lib/db/catalogue';
import { getCategoryCollections } from '@/lib/db/collections';
import { SITE } from '@/lib/site';

/*
  The sitemap is generated from the database, so a new product is indexed without a code change.

  RENDERED ON REQUEST, NOT AT BUILD TIME. It enumerates ~850 URLs from four catalogue reads, and
  building it meant the deploy waited on those reads inside Next's 60-second static-generation
  budget. Against a Neon endpoint that had just woken up, that budget is not generous — the
  sitemap alone failed a build after three attempts while every other page succeeded.

  A sitemap is fetched by crawlers now and then, not by people on every page load, so paying for
  it per request is the right trade. The catalogue memo in lib/db/catalogue.ts means consecutive
  fetches inside a minute share one set of queries anyway.
*/
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections, brands, blogPosts] = await Promise.all([
    getProducts(),
    getCategoryCollections(),
    getBrands(),
    getBlogPosts(),
  ]);

  const base = SITE.url;
  const now = new Date();

  /* Only indexable routes. /account, /checkout and /auth are disallowed in robots.ts, so
     listing them here would have been telling the crawler two different things. */
  const staticPages: [string, number, 'weekly' | 'monthly'][] = [
    ['', 1, 'weekly'],
    ['/shop', 0.9, 'weekly'],
    ['/categories', 0.8, 'weekly'],
    ['/brands', 0.8, 'monthly'],
    ['/blog', 0.7, 'weekly'],
    ['/faq', 0.6, 'monthly'],
    ['/about', 0.5, 'monthly'],
    ['/contact', 0.5, 'monthly'],
  ];

  return [
    ...staticPages.map(([path, priority, changeFrequency]) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    })),
    ...products.map((p) => ({
      url: `${base}/product/${p.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    /*
      Category and compound pages. These used to be `/shop?category=x` addresses whose pages
      named `/shop` as their canonical, so the sitemap listed nine URLs the pages themselves
      disowned. Compound pages rank above single products: they are the pages built to answer a
      search for the compound's name.
    */
    ...collections.flatMap((c) => [
      { url: `${base}${c.path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
      ...c.groups.map((g) => ({
        url: `${base}${g.path}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
    ]),
    ...brands.map((b) => ({
      url: `${base}/brands/${b.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    /*
      Articles carry their real revision date, not today's. A sitemap that claims everything
      changed this morning tells a crawler nothing, and Google says it ignores lastmod when a
      site reports one it cannot believe. Editorial pages carry a higher priority than the
      product pages here because they are the pages worth arriving on from a search.
    */
    ...blogPosts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(`${p.updated ?? p.date}T00:00:00Z`),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
