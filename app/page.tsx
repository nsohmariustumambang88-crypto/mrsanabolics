import { Hero } from '@/components/home/hero';
import { TrustMarquee } from '@/components/home/marquee';
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
import { products } from '@/lib/data/products';

export default function Home() {
  const bestSellers = products.filter((p) => p.isBestSeller);
  const newArrivals = products.filter((p) => p.isNew);
  const trending = products.filter((p) => p.isTrending);
  const deals = products.filter((p) => p.isDeal);

  return (
    <>
      <Hero />
      <TrustMarquee />
      <FeaturedCategories />
      <ProductsSection
        eyebrow="Top Rated"
        title="Best Sellers"
        description="Our most-loved products, backed by thousands of verified reviews."
        href="/shop?filter=best-sellers"
        products={bestSellers}
      />
      <WeeklyDeals products={deals} />
      <ProductsSection
        eyebrow="Fresh Drop"
        title="Latest Products"
        description="The newest additions to our catalog, freshly tested and ready to ship."
        href="/shop?filter=new"
        products={newArrivals}
      />
      <ProductsSection
        eyebrow="Hot Right Now"
        title="Trending Products"
        description="What the community is buying this week."
        href="/shop?filter=trending"
        products={trending}
      />
      <FeaturedCollections />
      <PopularBrands />
      <WhyChoose />
      <Testimonials />
      <BlogTeaser />
      <InstagramGallery />
      <Newsletter />
    </>
  );
}
