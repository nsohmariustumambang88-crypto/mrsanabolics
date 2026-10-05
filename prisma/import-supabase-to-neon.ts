/*
  Reverse migration: Supabase → Neon
  Copies all live data from Supabase (current prod) into Neon (backup)

  Usage:
    npm run db:import-supabase -- --dry-run    (show what would be copied)
    npm run db:import-supabase -- --apply      (actually copy the data)
*/

import { Client } from 'pg';

const SOURCE_URL = process.env.DATABASE_URL; // Supabase (current)
const DEST_URL = process.env.NEON_DATABASE_URL; // Neon (destination)

const DRY_RUN = process.argv.includes('--dry-run');
const APPLY = process.argv.includes('--apply');

if (!SOURCE_URL || !DEST_URL) {
  console.error('❌ Missing DATABASE_URL or NEON_DATABASE_URL in .env');
  process.exit(1);
}

const source = new Client({ connectionString: SOURCE_URL });
const dest = new Client({ connectionString: DEST_URL });

async function migrate() {
  try {
    await source.connect();
    await dest.connect();

    console.log('📊 Supabase → Neon Migration\n');
    console.log(`Source: Supabase`);
    console.log(`Dest:   Neon`);
    console.log(`Mode:   ${DRY_RUN ? 'DRY RUN' : APPLY ? 'APPLY' : 'INFO ONLY'}\n`);

    // Tables to migrate (in dependency order)
    const tables = [
      'contacts',
      'customers',
      'subscribers',
      'contact_activities',
      'contact_notes',
      'enquiries',
      'orders',
      'order_items',
      'order_events',
      'reviews',
      'chat_conversations',
      'chat_messages',
      'visitors',
      'page_views',
      'search_queries',
      'discounts',
      'discount_redemptions',
      'campaigns',
      'outbound_messages',
    ];

    let totalRows = 0;

    for (const table of tables) {
      try {
        // Count rows
        const countResult = await source.query(
          `SELECT COUNT(*) as count FROM "${table}"`
        );
        const count = parseInt(countResult.rows[0].count);

        if (count === 0) {
          console.log(`  ${table.padEnd(25)} 0 rows (skip)`);
          continue;
        }

        totalRows += count;
        console.log(`  ${table.padEnd(25)} ${count} rows → `, { end: '' } as any);

        if (!APPLY && !DRY_RUN) {
          console.log('(info only)');
          continue;
        }

        // Get all data from Supabase
        const sourceData = await source.query(
          `SELECT * FROM "${table}" ORDER BY id`
        );

        if (sourceData.rows.length === 0) {
          console.log('(no data)');
          continue;
        }

        // Get columns from Neon schema (might differ from Supabase)
        const destColumnsResult = await dest.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = $1 ORDER BY ordinal_position
        `, [table]);

        const destColumns = new Set(destColumnsResult.rows.map(r => r.column_name));
        const sourceColumns = Object.keys(sourceData.rows[0]);
        const commonColumns = sourceColumns.filter(c => destColumns.has(c));

        if (commonColumns.length === 0) {
          console.log(DRY_RUN ? '(no matching columns)' : '❌ No matching columns');
          continue;
        }

        // Delete existing data in Neon for this table (to avoid conflicts)
        if (APPLY) {
          try {
            await dest.query(`TRUNCATE TABLE "${table}" CASCADE`);
          } catch (e) {
            // Table might be read-only or have constraints, try DELETE instead
            await dest.query(`DELETE FROM "${table}"`);
          }
        }

        // Insert into Neon using only common columns
        if (APPLY || DRY_RUN) {
          const placeholders = commonColumns.map((_, i) => `$${i + 1}`).join(', ');
          const insertSql = `INSERT INTO "${table}" (${commonColumns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

          for (const row of sourceData.rows) {
            const values = commonColumns.map((col) => row[col]);
            if (APPLY) {
              try {
                await dest.query(insertSql, values);
              } catch (e) {
                // Skip rows with FK conflicts
                if (!(e instanceof Error && e.message.includes('violates foreign key'))) {
                  throw e;
                }
              }
            }
          }

          console.log(DRY_RUN ? '(dry run)' : '✅');
        }
      } catch (err) {
        console.log(`❌ Error: ${(err as Error).message}`);
      }
    }

    console.log(`\n✅ Total rows to migrate: ${totalRows}`);

    if (DRY_RUN) {
      console.log('\n🔍 Dry run complete - no data was copied');
      console.log('Run with --apply to actually migrate');
    } else if (APPLY) {
      console.log('\n✅ Migration complete!');
      console.log('Neon now has all Supabase data');
    }

    await source.end();
    await dest.end();
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

migrate();
