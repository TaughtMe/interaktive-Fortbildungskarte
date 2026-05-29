/**
 * Testqueries nach Migration 0004 — prüft alle strukturellen Erwartungen.
 *
 * Ausführen mit:
 *   npx tsx --env-file=.env.local scripts/verify-migration-0004.ts
 */

import postgres from 'postgres';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || url.length === 0) throw new Error('DATABASE_URL fehlt.');
  if (url.includes('missing-database-url.invalid')) throw new Error('DATABASE_URL zeigt auf Platzhalter.');
  return url;
}

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function main() {
  const client = postgres(getDatabaseUrl(), { max: 1, ssl: 'require' });

  try {
    console.log('\n=== Testqueries Migration 0004 ===\n');

    // ── 1. Neue Spalten in profiles vorhanden ────────────────────────────────
    console.log('1. Neue profiles-Spalten:');
    const cols = await client<{ column_name: string; data_type: string; is_nullable: string }[]>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles'
        AND column_name IN (
          'username','real_email','is_local_account',
          'must_change_password','last_login_at','created_by'
        )
      ORDER BY column_name
    `;
    const colMap = Object.fromEntries(cols.map((c) => [c.column_name, c]));
    check('username vorhanden (text, nullable)', colMap['username']?.data_type === 'text' && colMap['username']?.is_nullable === 'YES');
    check('real_email vorhanden (text, nullable)', colMap['real_email']?.data_type === 'text' && colMap['real_email']?.is_nullable === 'YES');
    check('is_local_account vorhanden (boolean, NOT NULL)', colMap['is_local_account']?.data_type === 'boolean' && colMap['is_local_account']?.is_nullable === 'NO');
    check('must_change_password vorhanden (boolean, NOT NULL)', colMap['must_change_password']?.data_type === 'boolean' && colMap['must_change_password']?.is_nullable === 'NO');
    check('last_login_at vorhanden (timestamptz, nullable)', colMap['last_login_at']?.is_nullable === 'YES');
    check('created_by vorhanden (uuid, nullable)', colMap['created_by']?.data_type === 'uuid' && colMap['created_by']?.is_nullable === 'YES');

    // ── 2. Neue Constraints auf profiles ────────────────────────────────────
    console.log('\n2. Neue Constraints auf profiles:');
    const constraints = await client<{ conname: string; contype: string }[]>`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'profiles'::regclass
        AND conname IN (
          'profiles_username_unique','profiles_real_email_unique',
          'profiles_local_requires_username','profiles_created_by_fk'
        )
    `;
    const cnames = new Set(constraints.map((c) => c.conname));
    check('profiles_username_unique', cnames.has('profiles_username_unique'));
    check('profiles_real_email_unique', cnames.has('profiles_real_email_unique'));
    check('profiles_local_requires_username', cnames.has('profiles_local_requires_username'));
    check('profiles_created_by_fk', cnames.has('profiles_created_by_fk'));

    // ── 3. training_needs.created_by: Typ uuid, neue FK ─────────────────────
    console.log('\n3. training_needs.created_by:');
    const [tnCol] = await client<{ data_type: string }[]>`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'training_needs' AND column_name = 'created_by'
    `;
    check('Typ = uuid', tnCol?.data_type === 'uuid', `actual: ${tnCol?.data_type}`);

    const [tnFk] = await client<{ conname: string; def: string }[]>`
      SELECT conname, pg_get_constraintdef(oid) AS def
      FROM pg_constraint
      WHERE conrelid = 'training_needs'::regclass
        AND conname = 'training_needs_created_by_profiles_fk'
    `;
    check('FK training_needs_created_by_profiles_fk vorhanden', !!tnFk);
    check('FK ON DELETE SET NULL', tnFk?.def?.includes('ON DELETE SET NULL') ?? false, tnFk?.def);

    // ── 4. audit_logs.user_id: Typ uuid, neue FK ────────────────────────────
    console.log('\n4. audit_logs.user_id:');
    const [alCol] = await client<{ data_type: string }[]>`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'audit_logs' AND column_name = 'user_id'
    `;
    check('Typ = uuid', alCol?.data_type === 'uuid', `actual: ${alCol?.data_type}`);

    const [alFk] = await client<{ conname: string; def: string }[]>`
      SELECT conname, pg_get_constraintdef(oid) AS def
      FROM pg_constraint
      WHERE conrelid = 'audit_logs'::regclass
        AND conname = 'audit_logs_user_id_profiles_fk'
    `;
    check('FK audit_logs_user_id_profiles_fk vorhanden', !!alFk);
    check('FK ON DELETE SET NULL', alFk?.def?.includes('ON DELETE SET NULL') ?? false);

    // ── 5. Alte FKs auf users entfernt ──────────────────────────────────────
    console.log('\n5. Alte FKs auf Alttabelle users:');
    const oldFks = await client<{ conname: string }[]>`
      SELECT conname FROM pg_constraint
      WHERE conrelid IN ('training_needs'::regclass, 'audit_logs'::regclass)
        AND conname IN (
          'training_needs_created_by_users_id_fk',
          'audit_logs_user_id_users_id_fk'
        )
    `;
    check('training_needs_created_by_users_id_fk entfernt', !oldFks.some((r) => r.conname === 'training_needs_created_by_users_id_fk'));
    check('audit_logs_user_id_users_id_fk entfernt', !oldFks.some((r) => r.conname === 'audit_logs_user_id_users_id_fk'));

    // ── 6. user_deletion_logs existiert ─────────────────────────────────────
    console.log('\n6. user_deletion_logs:');
    const [udlCount] = await client<{ cnt: string }[]>`
      SELECT COUNT(*) AS cnt FROM user_deletion_logs
    `;
    check('Tabelle existiert und ist leer', parseInt(udlCount?.cnt ?? '1', 10) === 0);

    const udlCols = await client<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_deletion_logs'
      ORDER BY ordinal_position
    `;
    check('Alle Pflicht-Spalten vorhanden', udlCols.length >= 10, `${udlCols.length} Spalten`);

    // ── 7. profiles-Datensätze unverändert ───────────────────────────────────
    console.log('\n7. Bestehende Daten:');
    const [profCount] = await client<{ cnt: string }[]>`
      SELECT COUNT(*) AS cnt FROM profiles
    `;
    check(`profiles-Zeilen unverändert (${profCount?.cnt})`, parseInt(profCount?.cnt ?? '0', 10) >= 1);

    const [tnNull] = await client<{ cnt: string }[]>`
      SELECT COUNT(*) AS cnt FROM training_needs WHERE created_by IS NOT NULL
    `;
    check('training_needs.created_by alle NULL', parseInt(tnNull?.cnt ?? '1', 10) === 0);

    // ── Zusammenfassung ──────────────────────────────────────────────────────
    console.log(`\n=== Ergebnis: ${passed} ✓  ${failed} ✗ ===\n`);
    if (failed > 0) process.exitCode = 1;

  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('\n✗ Fehler:', err instanceof Error ? err.message : err);
  process.exit(1);
});
