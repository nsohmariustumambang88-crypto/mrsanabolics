import type { MetadataRoute } from 'next';
import { products } from '@/lib/data/products';
import { categories } from '@/lib/data/categories';
import { brands } from '@/lib/data/brands';
import { blogPosts } from '@/lib/data/blog';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://mranabolics.example.com';
  const staticPages = [
    '',
    '/shop',
    '/categories',
    '/brands',
    '/blog',
    '/faq',
    '/about',
    '/contact',
    '/account',
    '/auth',
    '/checkout',
  ];

  return [
    ...staticPages.map((p) => ({
      url: `${base}${p}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: p === '' ? 1 : 0.8,
    })),
    ...products.map((p) => ({
      url: `${base}/product/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...categories.map((c) => ({
      url: `${base}/shop?category=${c.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...brands.map((b) => ({
      url: `${base}/brands/${b.slug}`,
      lastModified: new Date(),
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
