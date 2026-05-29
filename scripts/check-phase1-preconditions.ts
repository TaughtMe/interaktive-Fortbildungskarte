/**
 * Phase-1-Vorabprüfung: Benutzerverwaltung v1
 *
 * Prüft ob training_needs.created_by und audit_logs.user_id
 * NULL-freie Werte enthalten, die vor der Migration bewertet werden müssen.
 *
 * Ausführen mit:
 *   npx tsx --env-file=.env.local scripts/check-phase1-preconditions.ts
 *
 * Kein Schreibzugriff. Nur SELECT.
 */

import postgres from 'postgres';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || url.length === 0) {
    throw new Error('DATABASE_URL fehlt. Bitte .env.local prüfen.');
  }
  if (url.includes('missing-database-url.invalid')) {
    throw new Error('DATABASE_URL zeigt auf Platzhalter. Abgebrochen.');
  }
  return url;
}

async function main() {
  const client = postgres(getDatabaseUrl(), { max: 1, ssl: 'require' });

  try {
    console.log('\n=== Phase-1-Vorabprüfung ===\n');

    // ── 1. training_needs.created_by ────────────────────────────────────────
    const [tnResult] = await client<[{ not_null_count: string }]>`
      SELECT COUNT(*) AS not_null_count
      FROM training_needs
      WHERE created_by IS NOT NULL
    `;
    const tnCount = parseInt(tnResult.not_null_count, 10);
    console.log(`training_needs.created_by IS NOT NULL: ${tnCount}`);

    if (tnCount > 0) {
      console.log('\n  ⚠ Betroffene Zeilen:');
      const tnRows = await client`
        SELECT tn.id, tn.created_by, u.email AS matched_user_email
        FROM training_needs tn
        LEFT JOIN users u ON u.id = tn.created_by
        WHERE tn.created_by IS NOT NULL
        LIMIT 20
      `;
      for (const row of tnRows) {
        console.log(`  id=${row.id}  created_by=${row.created_by}  user=${row.matched_user_email ?? '(kein Treffer in users)'}`);
      }
    }

    // ── 2. audit_logs.user_id ────────────────────────────────────────────────
    const [alResult] = await client<[{ not_null_count: string }]>`
      SELECT COUNT(*) AS not_null_count
      FROM audit_logs
      WHERE user_id IS NOT NULL
    `;
    const alCount = parseInt(alResult.not_null_count, 10);
    console.log(`\naudit_logs.user_id IS NOT NULL:        ${alCount}`);

    if (alCount > 0) {
      console.log('\n  ⚠ Betroffene Zeilen:');
      const alRows = await client`
        SELECT al.id, al.user_id, al.action, u.email AS matched_user_email
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al.user_id
        WHERE al.user_id IS NOT NULL
        LIMIT 20
      `;
      for (const row of alRows) {
        console.log(`  id=${row.id}  user_id=${row.user_id}  action=${row.action}  user=${row.matched_user_email ?? '(kein Treffer in users)'}`);
      }
    }

    // ── 3. Profiles-Bestand ──────────────────────────────────────────────────
    const profileRows = await client`
      SELECT role, COUNT(*) AS cnt
      FROM profiles
      GROUP BY role
      ORDER BY role
    `;
    console.log('\nProfiles nach Rolle:');
    if (profileRows.length === 0) {
      console.log('  (keine Profile vorhanden)');
    } else {
      for (const row of profileRows) {
        console.log(`  ${row.role}: ${row.cnt}`);
      }
    }

    // ── Zusammenfassung ──────────────────────────────────────────────────────
    console.log('\n=== Ergebnis ===');

    if (tnCount === 0 && alCount === 0) {
      console.log('✓ Beide Prüfungen ergaben 0. Migration ist unkritisch und kann ausgeführt werden.');
    } else {
      console.log('✗ Mindestens eine Prüfung ergab > 0.');
      console.log('  Migration NICHT ausführen. Werte oben bewerten und explizit freigeben.');
      process.exitCode = 1;
    }

    console.log('');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('\n✗ Fehler:', err instanceof Error ? err.message : err);
  process.exit(1);
});
