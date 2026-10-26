/*
  Write the two halves of the product title test to crawl/title-test.csv:
  url, group (A = descriptive title, B = "Buy … $price"), in stock.

  Compare them with Search Console → Performance → Pages, exported for the period since
  TITLE_TEST_STARTED: join on url, then sum clicks and impressions per group. Only in-stock B
  products actually carry the new title, so compare in-stock rows on both sides.

    npm run title-test:export
*/
import { writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { TITLE_TEST_STARTED, titleTestGroup } from '../lib/catalogue/title-test';

async function main() {
  const prisma = new PrismaClient();
  const products = await prisma.product.findMany({ select: { slug: true, inStock: true }, orderBy: { slug: 'asc' } });
  const rows = products.map((p) => `https://www.mrsanabolics.com/product/${p.slug},${titleTestGroup(p.slug)},${p.inStock}`);
  writeFileSync('crawl/title-test.csv', `url,group,in_stock\n${rows.join('\n')}\n`);
  const b = products.filter((p) => p.inStock && titleTestGroup(p.slug) === 'B').length;
  const a = products.filter((p) => p.inStock && titleTestGroup(p.slug) === 'A').length;
  console.log(`crawl/title-test.csv: ${products.length} products; in stock A ${a}, B ${b}; test started ${TITLE_TEST_STARTED}`);
  await prisma.$disconnect();
}

main();
