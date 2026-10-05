#!/usr/bin/env node

/**
 * Database Export Script
 * Exports non-essential data to JSON files before deletion
 *
 * Usage:
 *   node scripts/export-database-data.mjs reviews
 *   node scripts/export-database-data.mjs page_views
 *   node scripts/export-database-data.mjs all
 *
 * Output: backups/ folder with JSON files
 */

import 'dotenv/config';
import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('❌ DATABASE_URL not set in .env');
  process.exit(1);
}

const dataType = process.argv[2] || 'reviews';
const BACKUP_DIR = path.join(__dirname, '../backups');

// Create backups directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const tables = {
  reviews: 'SELECT * FROM reviews ORDER BY "createdAt" DESC',
  page_views: 'SELECT * FROM page_views ORDER BY "createdAt" DESC',
  visitors: 'SELECT * FROM visitors ORDER BY "createdAt" DESC',
  search_queries: 'SELECT * FROM search_queries ORDER BY "createdAt" DESC',
};

async function exportData(tableName) {
  const client = new Client({ connectionString: DB_URL });

  try {
    await client.connect();
    console.log(`\n📥 Exporting ${tableName}...\n`);

    const query = tables[tableName];
    if (!query) {
      console.error(`❌ Unknown table: ${tableName}`);
      console.log(`   Available: ${Object.keys(tables).join(', ')}`);
      return;
    }

    const result = await client.query(query);
    const filePath = path.join(BACKUP_DIR, `${tableName}.json`);

    fs.writeFileSync(filePath, JSON.stringify(result.rows, null, 2));

    const fileSize = (fs.statSync(filePath).size / 1024).toFixed(1);
    console.log(`✅ Exported ${result.rows.length} rows`);
    console.log(`   File: ${filePath}`);
    console.log(`   Size: ${fileSize} KB\n`);

    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function exportAll() {
  for (const table of Object.keys(tables)) {
    await exportData(table);
  }
  console.log(`✅ All exports complete in ${BACKUP_DIR}\n`);
}

if (dataType === 'all') {
  exportAll();
} else {
  exportData(dataType);
}
