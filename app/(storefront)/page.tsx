import type { Metadata } from 'next';
import { Hero } from '@/components/home/hero';
import { HeroOffer } from '@/components/home/hero-offer';
import { AssuranceRegister } from '@/components/home/assurance-register';
import { FeaturedCategories } from '@/components/home/categories';
import { ProductsSection } from '@/components/home/products-section';
import { WeeklyDeals } from '@/components/home/weekly-deals';
import { PopularBrands } from '@/components/home/brands';
import { FeaturedCollections } from '@/components/home/featured-collections';
import { RecentlyViewed } from '@/components/home/recently-viewed';
import { doors, spread, PER_DOOR, TILES, PER_TILE } from '@/components/home/home-samples';
import { Testimonials } from '@/components/home/testimonials';
import { TrustBadges } from '@/components/home/trust-badges';
import { WhyChoose } from '@/components/home/why-choose';
import { BlogTeaser } from '@/components/home/blog-teaser';
import { toJournalCard } from '@/lib/journal/fields';
import { Newsletter } from '@/components/home/newsletter';
import { InstagramGallery } from '@/components/home/instagram-gallery';
import { getProducts, getCategories, getBlogPosts, getTestimonials, toSummary } from '@/lib/db/catalogue';
import { advertisedDiscount } from '@/lib/discounts';
import { getSettingsSafe } from '@/lib/settings';
import { SITE } from '@/lib/site';
import { referencePrice } from '@/lib/pricing';

export const metadata: Metadata = {
  /* Absolute, so the brand leads on the one page a searcher is most likely to see. */
  title: { absolute: `${SITE.name} — ${SITE.tagline}` },
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
export const revalidate = 3600;

export default async function Home() {
  const [products, categories, posts, testimonials] = await Promise.all([
    getProducts(),
    getCategories(),
    getBlogPosts(),
    getTestimonials(),
  ]);

  /*
    The samples for the two home sections, chosen HERE rather than in the browser. Both used to
    read the whole catalogue from the client context; that context is why every page carried it.
  */
  const photographed = products.filter((p) => Boolean(p.images[0]));
  const doorSamples = Object.fromEntries(
    doors.map((door) => [
      door.slug,
      spread(photographed.filter((p) => door.categories.includes(p.categorySlug)), PER_DOOR).map(toSummary),
    ])
  );
  const tileSamples = Object.fromEntries(
    categories
      .slice(0, TILES)
      .map((c) => [c.slug, spread(photographed.filter((p) => p.categorySlug === c.slug), PER_TILE).map(toSummary)])
  );

  const bestSellers = products.filter((p) => p.isBestSeller);
  const deals = products.filter((p) => p.isDeal);

  /* Top-rated products with most reviews for SEO boost */
  const topRated = [...products]
    .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
    .slice(0, 8);

  /*
    The hero's offer card.

    Only deals with a REAL markdown — a compare-at price above the price — because an "On offer"
    badge over a product that costs what it always did is a claim with nothing under it. Ordered
    by the share of the price saved, so the strongest offer leads; `sort` is stable, so ties keep
    catalogue order and the server and the browser agree on which one is first.
  */
  const savingShare = (p: (typeof products)[number]) => {
    const was = referencePrice(p);
    return was ? (was - p.price) / was : 0;
  };
  const offers = deals
    .filter((p) => referencePrice(p) !== null)
    .sort((a, b) => savingShare(b) - savingShare(a))
    .slice(0, 6)
    .map(toSummary);

  /* Nothing on offer: the card still shows a real product, framed as nothing more than that. */
  const fallbackSource = bestSellers[0] ?? products[0];
  const fallback = fallbackSource ? toSummary(fallbackSource) : null;

  /* A code, only if an administrator named one and the checkout would accept it right now. */
  const settings = await getSettingsSafe();
  const promoCode = settings.hero_promo_code
    ? await advertisedDiscount(settings.hero_promo_code)
    : null;

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

      {/* Promotional card in separate section with white background */}
      <section className="border-b border-rule bg-paper">
        <div className="mx-auto max-w-[86rem] px-4 py-8 sm:px-6 sm:py-12 lg:px-10 lg:py-16">
          {offers.length > 0 || fallback ? (
            <div className="rounded-lg border border-rule bg-card">
              <div className="p-4 sm:p-6 lg:p-8">
                <h2 className="mb-6 font-display text-2xl font-semibold text-ink">Featured Offer</h2>
                <div className="max-w-sm">
                  <HeroOffer offers={offers} fallback={fallback} promoCode={promoCode} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
      <RecentlyViewed allProducts={products.map(toSummary)} />
      <FeaturedCollections samples={doorSamples} />
      <AssuranceRegister />
      <TrustBadges />

      {/*
        Summaries, not records, into client components. Passing the full Product put long copy,
        FAQs and reviews for every best seller and every deal into this page's RSC payload — dozens
        of records nobody on the home page reads. Best sellers are also cut to what is shown; the
        deals list stays whole because its heading states the true total.
      */}
      <ProductsSection
        title="Best sellers"
        description="The compounds that move fastest, with the specification and batch record attached to each one."
        href="/shop?filter=best-sellers"
        products={bestSellers.slice(0, 8).map(toSummary)}
      />

      <FeaturedCategories />
      <WeeklyDeals products={deals.map(toSummary)} />
      <WhyChoose />
      <PopularBrands />

      {/* Top-rated products section for SEO and conversion */}
      <ProductsSection
        title="Highest Rated"
        description="Most reviewed and trusted by our community."
        href="/shop?sort=rating"
        products={topRated.map(toSummary)}
      />

      <InstagramGallery samples={tileSamples} />
      <Testimonials testimonials={testimonials} />
      <BlogTeaser posts={posts.slice(0, 4).map(toJournalCard)} />
      <Newsletter />
    </>
  );
}
