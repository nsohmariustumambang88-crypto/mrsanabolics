import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const DIRECT_URL = process.env.DIRECT_URL;
if (!DIRECT_URL) {
  console.error('❌ DIRECT_URL not set in .env');
  process.exit(1);
}

const sqlPath = resolve('./supabase-rls-final-corrected.sql');
const sql = readFileSync(sqlPath, 'utf-8');

console.log('🔐 Running RLS security fix...\n');

try {
  const result = execSync(`psql "${DIRECT_URL}" -c "${sql.replace(/"/g, '\\"')}"`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  console.log('✅ RLS enabled successfully!\n');
  console.log(result);
  console.log('\n🔒 All tables secured:');
  console.log('  - Public read: categories, brands, products, specifications, product_faqs, reviews, blog_posts, testimonials, faqs');
  console.log('  - Blocked: orders, order_items, contacts, enquiries, subscribers, customers, site_settings, discounts, delivery_zones, admin_users, chat_conversations, chat_messages, etc.');
} catch (error) {
  console.error('❌ Error running RLS fix:', error.message);
  process.exit(1);
}
