#!/usr/bin/env tsx
/**
 * Database migration script
 * Run this to set up the database schema
 */

import { initializeSchema, pool } from './client.js';

async function main() {
  try {
    console.log('🔄 Initializing database schema...');
    await initializeSchema();
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();


