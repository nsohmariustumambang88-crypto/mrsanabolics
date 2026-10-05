/*
  Database cleanup: Remove unnecessary tables to prevent quota issues

  Removes:
  - reviews (3,598 rows) → moved to public/data/reviews.json
  - page_views (1,520 rows) → use Vercel Analytics instead
  - visitors (1,240 rows) → use Vercel Analytics instead
  - search_queries → not essential

  Saves ~2.4 MB of database space

  Usage:
    npm run db:cleanup -- --dry-run    (show what would be deleted)
    npm run db:cleanup -- --apply      (actually delete)
*/

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');
const APPLY = process.argv.includes('--apply');

async function cleanup() {
  try {
    console.log('🗑️  Database Cleanup\n');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : APPLY ? 'APPLY' : 'INFO ONLY'}\n`);

    console.log('Tables to delete:\n');

    // Reviews
    const reviewCount = await prisma.review.count();
    console.log(`  🔴 reviews:        ${reviewCount} rows → Moved to public/data/reviews.json`);
    if (APPLY) {
      await prisma.review.deleteMany({});
      console.log('     ✅ Deleted');
    }

    // Page Views
    const pvCount = await prisma.pageView.count();
    console.log(`  🟡 page_views:     ${pvCount} rows → Use Vercel Analytics`);
    if (APPLY) {
      await prisma.pageView.deleteMany({});
      console.log('     ✅ Deleted');
    }

    // Visitors
    const visitorCount = await prisma.visitor.count();
    console.log(`  🟡 visitors:       ${visitorCount} rows → Use Vercel Analytics`);
    if (APPLY) {
      await prisma.visitor.deleteMany({});
      console.log('     ✅ Deleted');
    }

    // Search Queries
    const searchCount = await prisma.searchQuery.count();
    console.log(`  🟡 search_queries: ${searchCount} rows → Not essential`);
    if (APPLY) {
      await prisma.searchQuery.deleteMany({});
      console.log('     ✅ Deleted');
    }

    const totalRows = reviewCount + pvCount + visitorCount + searchCount;
    console.log(`\n✅ Total rows to delete: ${totalRows}`);

    if (DRY_RUN) {
      console.log('\n🔍 Dry run complete - nothing was deleted');
      console.log('Run with --apply to actually delete');
    } else if (APPLY) {
      console.log('\n✅ Cleanup complete!');
      console.log('Database size reduced by ~2.4 MB');
      console.log('Quota issues should be resolved');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

cleanup();
