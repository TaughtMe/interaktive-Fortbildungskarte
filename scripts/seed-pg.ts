import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { schools, trainingNeeds, type PgSchoolInsert, type PgTrainingNeedInsert } from '../src/lib/db/schema.pg';
import { FORTBILDUNGEN_DEFAULT, SCHULEN } from '../src/data/schools';

const SEED_TIMESTAMP = new Date('2026-05-01T00:00:00.000Z');
const REQUIRED_CONFIRMATION = 'seed-test-postgres';

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
  if (process.env.SEED_PG_CONFIRM !== REQUIRED_CONFIRMATION) {
    throw new Error(
      `Seed abgebrochen. Setze SEED_PG_CONFIRM=${REQUIRED_CONFIRMATION} nur fuer eine bestaetigte Testdatenbank.`,
    );
  }
}

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' || trimmed === '-' || trimmed === '—' ? null : trimmed;
}

const schoolRows: PgSchoolInsert[] = SCHULEN.map((school) => ({
  id: school.id,
  name: school.name,
  ort: school.ort,
  typ: school.typ,
  lat: school.lat,
  lng: school.lng,
  adresse: school.adresse,
  tel: school.tel,
  fax: optionalText(school.fax),
  mail: school.mail,
  web: optionalText(school.web),
  leitung: optionalText(school.leitung),
  created_at: SEED_TIMESTAMP,
  updated_at: SEED_TIMESTAMP,
}));

const trainingNeedRows: PgTrainingNeedInsert[] = SCHULEN.flatMap((school, schoolIndex) => {
  if (schoolIndex % 3 !== 0) {
    return [];
  }

  return FORTBILDUNGEN_DEFAULT.bedarf.map((need, needIndex) => ({
    id: `${school.id}-need-${needIndex + 1}`,
    school_id: school.id,
    created_by: null,
    topic: need.topic,
    description: need.description,
    priority: need.priority,
    target_group: need.targetGroup,
    preferred_format: need.preferredFormat,
    status: need.status ?? 'open',
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  }));
});

async function main(): Promise<void> {
  assertSeedConfirmation();
  const databaseUrl = getDatabaseUrl();

  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);

  try {
    await db
      .insert(schools)
      .values(schoolRows)
      .onConflictDoUpdate({
        target: schools.id,
        set: {
          name: sql`excluded.name`,
          ort: sql`excluded.ort`,
          typ: sql`excluded.typ`,
          lat: sql`excluded.lat`,
          lng: sql`excluded.lng`,
          adresse: sql`excluded.adresse`,
          tel: sql`excluded.tel`,
          fax: sql`excluded.fax`,
          mail: sql`excluded.mail`,
          web: sql`excluded.web`,
          leitung: sql`excluded.leitung`,
          updated_at: sql`excluded.updated_at`,
        },
      });

    await db
      .insert(trainingNeeds)
      .values(trainingNeedRows)
      .onConflictDoUpdate({
        target: trainingNeeds.id,
        set: {
          school_id: sql`excluded.school_id`,
          created_by: sql`excluded.created_by`,
          topic: sql`excluded.topic`,
          description: sql`excluded.description`,
          priority: sql`excluded.priority`,
          target_group: sql`excluded.target_group`,
          preferred_format: sql`excluded.preferred_format`,
          status: sql`excluded.status`,
          updated_at: sql`excluded.updated_at`,
        },
      });

    console.info(`Seed vorbereitet ausgefuehrt: ${schoolRows.length} Schulen, ${trainingNeedRows.length} Demo-Bedarfsmeldungen.`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
