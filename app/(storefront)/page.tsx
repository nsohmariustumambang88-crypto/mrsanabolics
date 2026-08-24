import type { Metadata } from 'next';
import { Hero } from '@/components/home/hero';
import { AssuranceRegister } from '@/components/home/assurance-register';
import { FeaturedCategories } from '@/components/home/categories';
import { ProductsSection } from '@/components/home/products-section';
import { WeeklyDeals } from '@/components/home/weekly-deals';
import { PopularBrands } from '@/components/home/brands';
import { FeaturedCollections } from '@/components/home/featured-collections';
import { Testimonials } from '@/components/home/testimonials';
import { WhyChoose } from '@/components/home/why-choose';
import { BlogTeaser } from '@/components/home/blog-teaser';
import { Newsletter } from '@/components/home/newsletter';
import { InstagramGallery } from '@/components/home/instagram-gallery';
import { getProducts, getBlogPosts, getTestimonials } from '@/lib/db/catalogue';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  /* Absolute, so the brand leads on the one page a searcher is most likely to see. */
  title: { absolute: `${SITE.name} — Lab-Tested Performance Compounds` },
  description: SITE.description,
  alternates: { canonical: '/' },
};

/*
  Pacing.

  This page used to run four identical four-across product rows and two same-size card grids —
  one rhythm repeated until the scroll ended. Construction now alternates: a split index, a
  four-across grid, a ruled category index, a feature-plus-list, a numbered sequence, a name
  list, a sheet strip. A dense passage earns a quiet one.

  "Two ways in" answers the two-audience split the user confirmed, so it sits directly under
  the hero rather than eleven thousand pixels below it. New and trending stay reachable from
  it and from /shop's own filter list.
*/

/* Re-read at most once a minute; see the note in app/layout.tsx. */
export const revalidate = 60;

export default async function Home() {
  const [products, posts, testimonials] = await Promise.all([
    getProducts(),
    getBlogPosts(),
    getTestimonials(),
  ]);

  const bestSellers = products.filter((p) => p.isBestSeller);
  const deals = products.filter((p) => p.isDeal);

  /* Server-rendered so a crawler sees the catalogue on first request, not after hydration. */
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Featured compounds',
    itemListElement: bestSellers.slice(0, 8).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE.url}/product/${p.slug}`,
      name: p.name,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />

      <Hero />
      <FeaturedCollections />
      <AssuranceRegister />

      <ProductsSection
        title="Best sellers"
        description="The compounds that move fastest, with the specification and batch record attached to each one."
        href="/shop?filter=best-sellers"
        products={bestSellers}
      />

      <FeaturedCategories />
      <WeeklyDeals products={deals} />
      <WhyChoose />
      <PopularBrands />
      <InstagramGallery />
      <Testimonials testimonials={testimonials} />
      <BlogTeaser posts={posts} />
      <Newsletter />
    </>
  );
}
