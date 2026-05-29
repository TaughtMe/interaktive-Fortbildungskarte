/**
 * Führt Migration 0004_user_management_v1.sql manuell aus.
 *
 * Ausführen mit:
 *   npx tsx --env-file=.env.local scripts/run-migration-0004.ts
 *
 * Sicherheitsprüfung: Erfordert MIGRATION_CONFIRM=run-0004
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

const REQUIRED_CONFIRMATION = 'run-0004';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || url.length === 0) throw new Error('DATABASE_URL fehlt.');
  if (url.includes('missing-database-url.invalid')) throw new Error('DATABASE_URL zeigt auf Platzhalter.');
  return url;
}

async function main() {
  if (process.env.MIGRATION_CONFIRM !== REQUIRED_CONFIRMATION) {
    throw new Error(
      `Migration abgebrochen. Setze MIGRATION_CONFIRM=${REQUIRED_CONFIRMATION} zur Bestätigung.`
    );
  }

  const migrationPath = join(
    process.cwd(),
    'drizzle-pg/migrations/0004_user_management_v1.sql'
  );
  const sql = readFileSync(migrationPath, 'utf-8');

  const client = postgres(getDatabaseUrl(), { max: 1, ssl: 'require' });

  try {
    console.log('\n=== Migration 0004: Benutzerverwaltung v1 ===\n');
    console.log('Führe Migration aus …');

    // Migration als einzelner Befehl — BEGIN/COMMIT ist in der SQL-Datei enthalten
    await client.unsafe(sql);

    console.log('✓ Migration erfolgreich ausgeführt.\n');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('\n✗ Migration fehlgeschlagen:', err instanceof Error ? err.message : err);
  process.exit(1);
});
