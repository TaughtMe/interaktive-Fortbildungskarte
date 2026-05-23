import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { districts, schools, trainingNeeds, type PgTrainingNeedInsert } from '../src/lib/db/schema.pg';
import { FORTBILDUNGEN_DEFAULT, SCHULEN } from '../src/data/schools';
import { districtsSeed } from '../src/lib/db/seed/districtsSeed';
import { postgresSchoolsSeed } from '../src/lib/db/seed/schoolsSeed';

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

const schoolRows = postgresSchoolsSeed;

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
      .insert(districts)
      .values(districtsSeed)
      .onConflictDoUpdate({
        target: districts.id,
        set: {
          name: sql`excluded.name`,
          slug: sql`excluded.slug`,
          description: sql`excluded.description`,
          color: sql`excluded.color`,
          boundary_geojson: sql`excluded.boundary_geojson`,
          updated_at: sql`excluded.updated_at`,
        },
      });

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
          district_id: sql`excluded.district_id`,
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

    console.info(`Seed vorbereitet ausgefuehrt: ${districtsSeed.length} Bezirke, ${schoolRows.length} Schulen, ${trainingNeedRows.length} Demo-Bedarfsmeldungen.`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
