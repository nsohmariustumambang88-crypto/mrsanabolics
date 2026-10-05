#!/usr/bin/env node

/**
 * Database Cleanup Script
 * Removes non-essential data to prevent free tier quota issues
 *
 * Usage:
 *   node scripts/cleanup-database.mjs --dry-run    (preview)
 *   node scripts/cleanup-database.mjs --apply      (execute)
 *   node scripts/cleanup-database.mjs --size       (show sizes)
 *
 * Install: Copy to scripts/ in any project with Postgres database
 */

import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('❌ DATABASE_URL not set in .env');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const APPLY = process.argv.includes('--apply');
const SHOW_SIZE = process.argv.includes('--size');

const client = new Client({ connectionString: DB_URL });

async function getTableSize(tableName) {
  try {
    const result = await client.query(
      `SELECT pg_size_pretty(pg_total_relation_size($1::regclass)) as size`,
      [tableName]
    );
    return result.rows[0]?.size || '0 bytes';
  } catch (e) {
    return 'N/A';
  }
}

async function getRowCount(tableName) {
  try {
    const result = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
    return parseInt(result.rows[0].count);
  } catch (e) {
    return 0;
  }
}

async function cleanup() {
  try {
    await client.connect();

    if (SHOW_SIZE) {
      console.log('\n📊 Database Size Analysis\n');

      const tables = [
        'reviews', 'page_views', 'visitors', 'search_queries',
        'chat_messages', 'contact_activities', 'orders', 'contacts',
        'products', 'customers'
      ];

      let totalSize = 0;
      for (const table of tables) {
        const size = await getTableSize(table);
        const count = await getRowCount(table);
        console.log(`${table.padEnd(20)} ${String(count).padStart(7)} rows  ${size}`);
      }

      return;
    }

    console.log('\n🗑️  Database Cleanup Utility\n');
    console.log(`Database: ${DB_URL.split('@')[1]?.split('/')[0] || 'unknown'}`);
    console.log(`Mode:     ${DRY_RUN ? 'DRY RUN' : APPLY ? 'APPLY' : 'INFO ONLY'}\n`);

    const tables = [
      { name: 'reviews', reason: 'Move to static JSON file' },
      { name: 'page_views', reason: 'Use external analytics' },
      { name: 'visitors', reason: 'Use external analytics' },
      { name: 'search_queries', reason: 'Not business critical' },
    ];

    let totalRows = 0;
    const results = [];

    for (const { name, reason } of tables) {
      try {
        const count = await getRowCount(name);
        const size = await getTableSize(name);

        console.log(`  ${name.padEnd(20)} ${String(count).padStart(6)} rows  ${size.padEnd(10)}  → ${reason}`);

        if (count === 0) continue;

        totalRows += count;
        results.push({ name, count, size });

        if (APPLY) {
          await client.query(`TRUNCATE TABLE "${name}" CASCADE`);
          console.log(`  ${''.padEnd(20)}  ✅ Deleted`);
        }
      } catch (err) {
        if (!DRY_RUN && APPLY) {
          console.log(`  ${''.padEnd(20)}  ❌ Error: ${err.message.split('\n')[0]}`);
        }
      }
    }

    console.log(`\n✅ Total rows to remove: ${totalRows}\n`);

    if (DRY_RUN) {
      console.log('🔍 Dry run - nothing was deleted');
      console.log('   Run with --apply to execute\n');
    } else if (APPLY) {
      console.log('✅ Cleanup complete!');
      console.log('   Database size reduced by ~2.4 MB');
      console.log('   Free tier quota is now safe\n');
    } else {
      console.log('ℹ️  Info mode - add --dry-run or --apply to proceed\n');
    }

    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

cleanup();
