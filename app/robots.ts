import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

/*
  SEO-tool crawlers are asked to stay off the whole site (24 November 2026). They walk every one
  of the ~800 product pages to build backlink and keyword databases, send no customers, and each
  visit to a page whose cache has run out is a server render and an ISR write against Vercel's
  free allowance. Search engines (Google, Bing and the engines IndexNow feeds) and the AI
  assistants the site wants to be cited by (GPTBot, ClaudeBot, PerplexityBot) are not listed and
  keep full access. These bots honour robots.txt; ones that do not would need the Vercel
  firewall instead.
*/
const SEO_TOOL_CRAWLERS = [
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
  'BLEXBot',
  'DataForSeoBot',
  'Barkrowler',
  'serpstatbot',
  'SeekportBot',
  'PetalBot',
  'Bytespider',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: SEO_TOOL_CRAWLERS, disallow: '/' },
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/account', '/checkout', '/auth', '/basket', '/wishlist'],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
