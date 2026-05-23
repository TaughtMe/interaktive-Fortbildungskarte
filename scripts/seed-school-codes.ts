import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { randomBytes } from 'crypto';
import postgres from 'postgres';
import { hashSchoolCode } from '../src/lib/auth/schoolCodeAuth';
import { schoolAccessCodes, type PgSchoolAccessCodeInsert } from '../src/lib/db/schema.pg';
import { postgresSchoolsSeed } from '../src/lib/db/seed/schoolsSeed';

const REQUIRED_CONFIRMATION = 'seed-school-codes';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error('DATABASE_URL fehlt. Seed nur mit bewusst gesetzter Testdatenbank-URL ausfuehren.');
  }

  if (databaseUrl.includes('missing-database-url.invalid')) {
    throw new Error('DATABASE_URL zeigt auf den Platzhalter. Seed abgebrochen.');
  }

  return databaseUrl;
}

function assertSeedConfirmation(): void {
  if (process.env.SEED_SCHOOL_CODES_CONFIRM !== REQUIRED_CONFIRMATION) {
    throw new Error(
      `Seed abgebrochen. Setze SEED_SCHOOL_CODES_CONFIRM=${REQUIRED_CONFIRMATION} nur fuer eine bestaetigte Testdatenbank.`,
    );
  }
}

function createLocalTestCode(): string {
  const bytes = randomBytes(10);
  const raw = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

async function main(): Promise<void> {
  assertSeedConfirmation();
  const databaseUrl = getDatabaseUrl();
  const now = new Date();
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);
  const generatedCodes: Array<{ schoolId: string; code: string }> = [];

  try {
    const rows: PgSchoolAccessCodeInsert[] = await Promise.all(
      postgresSchoolsSeed.map(async (school) => {
        const code = createLocalTestCode();
        generatedCodes.push({ schoolId: school.id, code });

        return {
          id: `${school.id}-pilot-code`,
          school_id: school.id,
          code_hash: await hashSchoolCode(code),
          label: 'Pilot-Testcode',
          active: 1,
          expires_at: null,
          last_used_at: null,
          created_at: now,
          updated_at: now,
        };
      }),
    );

    await db
      .insert(schoolAccessCodes)
      .values(rows)
      .onConflictDoUpdate({
        target: schoolAccessCodes.id,
        set: {
          code_hash: sql`excluded.code_hash`,
          label: sql`excluded.label`,
          active: sql`excluded.active`,
          expires_at: sql`excluded.expires_at`,
          last_used_at: null,
          updated_at: sql`excluded.updated_at`,
        },
      });

    console.info(`Lokale Testcodes erzeugt: ${rows.length} Schulen.`);
    console.info('Einmalige lokale Ausgabe fuer den Testbetrieb. Nicht committen, nicht in Doku uebernehmen.');
    generatedCodes.forEach(({ schoolId, code }) => {
      console.info(`${schoolId}: ${code}`);
    });
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
