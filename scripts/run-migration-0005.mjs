// One-off script: execute migration 0005 against Supabase.
// Run from project root: node scripts/run-migration-0005.mjs
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(
  join(__dirname, '..', 'drizzle-pg', 'migrations', '0005_soft_delete.sql'),
  'utf8',
);

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const client = postgres(DATABASE_URL, { max: 1, ssl: 'require' });

try {
  // postgres-js doesn't support multi-statement strings directly — split on ";"
  // but the migration uses BEGIN/COMMIT so we run it as-is via unsafe():
  await client.unsafe(sql);
  console.log('✅  Migration 0005 erfolgreich ausgeführt.');
} catch (err) {
  console.error('❌  Fehler:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
