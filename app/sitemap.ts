import type { MetadataRoute } from 'next';
import {
  getProducts,
  getCategories,
  getBrands,
  getBlogPosts,
} from '@/lib/db/catalogue';
import { SITE } from '@/lib/site';

/* The sitemap is generated from the database, so a new product is indexed without a code change. */
export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, brands, blogPosts] = await Promise.all([
    getProducts(),
    getCategories(),
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
    ...categories.map((c) => ({
      url: `${base}/shop?category=${c.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...brands.map((b) => ({
      url: `${base}/brands/${b.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...blogPosts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.date),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
