/*
  Seed Neon from the catalogue that used to live in lib/data/.

  The product copy is a fixed constraint on this project — descriptions, specifications,
  benefits, directions, ingredients and blog content must survive verbatim — so the seed reads
  the original arrays rather than restating them. That makes this migration lossless by
  construction: if the seed and the arrays ever disagree, the arrays win.

  Idempotent: every write is an upsert keyed on the natural key (slug, or a deterministic
  composite for owned rows), so running it twice changes nothing.
*/

import { PrismaClient } from '@prisma/client';
import { products } from '../lib/data/products';
import { categories } from '../lib/data/categories';
import { brands } from '../lib/data/brands';
import { blogPosts } from '../lib/data/blog';
import { testimonials } from '../lib/data/testimonials';
import { faqs } from '../lib/data/faqs';

const prisma = new PrismaClient();

/** The catalogue stores dates as 'YYYY-MM-DD'; Postgres wants a real date. */
function toDate(value: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Unparseable date in catalogue data: ${value}`);
  }
  return parsed;
}

async function main() {
  console.log('Seeding Neon from lib/data …');

  // --- Categories -----------------------------------------------------------------------
  for (const [i, c] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        icon: c.icon,
        productCount: c.productCount,
        position: i,
      },
      update: {
        name: c.name,
        description: c.description,
        icon: c.icon,
        productCount: c.productCount,
        position: i,
      },
    });
  }
  console.log(`  categories   ${categories.length}`);

  // --- Brands ---------------------------------------------------------------------------
  for (const [i, b] of brands.entries()) {
    await prisma.brand.upsert({
      where: { slug: b.slug },
      create: {
        slug: b.slug,
        name: b.name,
        description: b.description,
        productCount: b.productCount,
        position: i,
      },
      update: {
        name: b.name,
        description: b.description,
        productCount: b.productCount,
        position: i,
      },
    });
  }
  /*
    Self-healing referential gap.

    Two products ("Mass Stack Pro Bundle", "Injectable Supply Kit") carry brand "MrAnabolics"
    with slug "mranabolics", which never had a row in the brands array — the house brand was
    referenced but never declared. The hand-written arrays could hold that contradiction
    indefinitely; a foreign key cannot. Rather than editing product copy, any brand a product
    actually references is created from the product's own brand name.
  */
  const declared = new Set(brands.map((b) => b.slug));
  const referenced = new Map<string, string>();
  for (const p of products) {
    if (!declared.has(p.brandSlug)) referenced.set(p.brandSlug, p.brand);
  }

  for (const [slug, name] of referenced) {
    const count = products.filter((p) => p.brandSlug === slug).length;
    await prisma.brand.upsert({
      where: { slug },
      create: {
        slug,
        name,
        description: `Own-brand products assembled and documented in house by ${name}.`,
        productCount: count,
        position: brands.length,
      },
      update: { name, productCount: count },
    });
    console.log(`  + derived brand "${name}" (${slug}) from ${count} product(s)`);
  }

  console.log(`  brands       ${brands.length + referenced.size}`);

  // --- Products and everything they own -------------------------------------------------
  for (const [i, p] of products.entries()) {
    const category = await prisma.category.findUnique({
      where: { slug: p.categorySlug },
    });
    const brand = await prisma.brand.findUnique({ where: { slug: p.brandSlug } });

    if (!category) throw new Error(`Product ${p.slug} references unknown category ${p.categorySlug}`);
    if (!brand) throw new Error(`Product ${p.slug} references unknown brand ${p.brandSlug}`);

    const scalars = {
      name: p.name,
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? null,
      rating: p.rating,
      reviewCount: p.reviewCount,
      inStock: p.inStock,
      stockCount: p.stockCount,
      isNew: p.isNew ?? false,
      isBestSeller: p.isBestSeller ?? false,
      isTrending: p.isTrending ?? false,
      isDeal: p.isDeal ?? false,
      description: p.description,
      longDescription: p.longDescription,
      directions: p.directions,
      shipping: p.shipping,
      returns: p.returns,
      benefits: p.benefits,
      ingredients: p.ingredients,
      images: p.images,
      categoryId: category.id,
      brandId: brand.id,
      position: i,
    };

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      create: { slug: p.slug, ...scalars },
      update: scalars,
    });

    /*
      Owned rows are replaced wholesale rather than diffed. They have no identity of their own
      outside the product, and rewriting them keeps the seed honest about order.
    */
    await prisma.specification.deleteMany({ where: { productId: product.id } });
    await prisma.specification.createMany({
      data: p.specifications.map((s, position) => ({
        productId: product.id,
        label: s.label,
        value: s.value,
        position,
      })),
    });

    await prisma.productFaq.deleteMany({ where: { productId: product.id } });
    await prisma.productFaq.createMany({
      data: p.faqs.map((f, position) => ({
        productId: product.id,
        question: f.question,
        answer: f.answer,
        position,
      })),
    });

    await prisma.review.deleteMany({ where: { productId: product.id } });
    await prisma.review.createMany({
      data: p.reviews.map((r) => ({
        productId: product.id,
        author: r.author,
        rating: r.rating,
        date: toDate(r.date),
        title: r.title,
        body: r.body,
      })),
    });
  }
  console.log(`  products     ${products.length}`);

  // --- Blog -----------------------------------------------------------------------------
  for (const post of blogPosts) {
    const scalars = {
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      author: post.author,
      date: toDate(post.date),
      readTime: post.readTime,
      image: post.image,
    };
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      create: { slug: post.slug, ...scalars },
      update: scalars,
    });
  }
  console.log(`  blog posts   ${blogPosts.length}`);

  // --- Testimonials and site FAQs -------------------------------------------------------
  // These carry no natural key, so they are rewritten as a set.
  await prisma.testimonial.deleteMany();
  await prisma.testimonial.createMany({
    data: testimonials.map((t, position) => ({
      name: t.name,
      role: t.role,
      location: t.location,
      rating: t.rating,
      quote: t.quote,
      position,
    })),
  });
  console.log(`  testimonials ${testimonials.length}`);

  await prisma.faq.deleteMany();
  await prisma.faq.createMany({
    data: faqs.map((f, position) => ({
      question: f.question,
      answer: f.answer,
      position,
    })),
  });
  console.log(`  faqs         ${faqs.length}`);

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
