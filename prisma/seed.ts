/*
  Seed Neon with the editorial content that lives in lib/data/ — testimonials and FAQs.

  The product copy is a fixed constraint on this project — descriptions, specifications,
  benefits, directions, ingredients and blog content must survive verbatim — so the seed reads
  the original arrays rather than restating them. That makes this migration lossless by
  construction: if the seed and the arrays ever disagree, the arrays win.

  Idempotent: every write is an upsert keyed on the natural key (slug, or a deterministic
  composite for owned rows), so running it twice changes nothing.
*/

import { PrismaClient } from '@prisma/client';
import { testimonials } from '../lib/data/testimonials';
import { faqs } from '../lib/data/faqs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Neon from lib/data …');

  /*
    The catalogue — categories, brands, products — is no longer seeded from here.

    It comes from the store's own product photographs: prisma/seed-catalogue.ts reads
    prisma/image-library.json (written by the Cloudinary uploader) against
    lib/catalogue/taxonomy.ts and builds one product per photograph. The 12 hand-written
    fixture products the template started with, and the arrays under lib/data that held
    them, are gone. Run: npm run db:seed-catalogue
  */

  // --- Blog -----------------------------------------------------------------------------
  /*
    The journal is no longer seeded from here. Its articles are Markdown under content/journal/
    with metadata in lib/data/journal.ts, written by prisma/seed-journal.ts, which checks every
    citation and figure before it writes. The original posts in lib/data/blog.ts are retired and
    must not be re-published: this loop used to upsert them, which would have put a withdrawn
    article back on the site behind its own redirect. Run: npm run db:seed-journal
  */

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
