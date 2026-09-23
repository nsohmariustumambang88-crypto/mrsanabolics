import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, '../supabase-rls-final-corrected.sql');
const sql = readFileSync(sqlPath, 'utf-8');

const DIRECT_URL = process.env.DIRECT_URL;
if (!DIRECT_URL) {
  console.error('❌ DIRECT_URL environment variable not set');
  process.exit(1);
}

console.log('🔐 Applying RLS policies to Supabase...\n');

const pool = new Pool({
  connectionString: DIRECT_URL,
});

try {
  const client = await pool.connect();

  try {
    await client.query(sql);
    console.log('✅ Row-Level Security (RLS) successfully enabled!\n');
    console.log('🔒 Security summary:');
    console.log('   PUBLIC READ TABLES:');
    console.log('   - categories, brands, products, specifications');
    console.log('   - product_faqs, reviews, blog_posts, testimonials, faqs\n');
    console.log('   BLOCKED TABLES:');
    console.log('   - orders, order_items, contacts, enquiries');
    console.log('   - subscribers, customers, site_settings, discounts');
    console.log('   - delivery_zones, delivery_rates, admin_users');
    console.log('   - chat_conversations, chat_messages');
    console.log('   - contact_activities, contact_notes, campaigns\n');
    console.log('✨ Your database is now secure from unauthorized access!');
  } finally {
    client.release();
  }
} catch (error) {
  console.error('❌ Error applying RLS policies:', error.message);
  process.exit(1);
} finally {
  await pool.end();
}
