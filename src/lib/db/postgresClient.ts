import type { School } from '@/types';
import type { TrainingNeed } from '@/types/trainingNeed';
import { asc, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { mapSchoolRowToSchool } from './mappers/schoolMapper';
import { mapTrainingNeedRowToTrainingNeed } from './mappers/trainingNeedMapper';
import { schools, trainingNeeds } from './schema.pg';

export type PostgresAdapterResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const PLACEHOLDER_HOST = 'missing-database-url.invalid';

export function getPostgresDatabaseUrl(): string | null {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl || databaseUrl.length === 0) return null;
  if (databaseUrl.includes(PLACEHOLDER_HOST)) return null;
  return databaseUrl;
}

function getPostgresClient() {
  const databaseUrl = getPostgresDatabaseUrl();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for PostgreSQL data source.');
  }

  const client = postgres(databaseUrl, { max: 1, ssl: 'require' });
  const db = drizzle(client);
  return { client, db };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unknown PostgreSQL error';
}

export async function getSchoolsFromPostgres(): Promise<PostgresAdapterResult<School[]>> {
  const { client, db } = getPostgresClient();

  try {
    const rows = await db.select().from(schools).orderBy(asc(schools.ort), asc(schools.name));
    return { ok: true, data: rows.map(mapSchoolRowToSchool) };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  } finally {
    await client.end();
  }
}

export async function getSchoolByIdFromPostgres(id: string): Promise<PostgresAdapterResult<School | undefined>> {
  const { client, db } = getPostgresClient();

  try {
    const [row] = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
    return { ok: true, data: row ? mapSchoolRowToSchool(row) : undefined };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  } finally {
    await client.end();
  }
}

export async function getTrainingNeedsFromPostgres(): Promise<PostgresAdapterResult<TrainingNeed[]>> {
  const { client, db } = getPostgresClient();

  try {
    const rows = await db
      .select()
      .from(trainingNeeds)
      .orderBy(desc(trainingNeeds.created_at));
    return { ok: true, data: rows.map(mapTrainingNeedRowToTrainingNeed) };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  } finally {
    await client.end();
  }
}

export async function createTrainingNeedInPostgres(
  schoolId: string,
  input: Omit<TrainingNeed, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>,
): Promise<PostgresAdapterResult<TrainingNeed>> {
  const { client, db } = getPostgresClient();
  const now = new Date();

  try {
    const [row] = await db
      .insert(trainingNeeds)
      .values({
        id: crypto.randomUUID(),
        school_id: schoolId,
        created_by: null,
        topic: input.topic,
        description: input.description,
        priority: input.priority,
        target_group: input.targetGroup,
        preferred_format: input.preferredFormat,
        status: input.status ?? 'open',
        created_at: now,
        updated_at: now,
      })
      .returning();

    if (!row) {
      return { ok: false, error: 'PostgreSQL did not return the created training need.' };
    }

    return { ok: true, data: mapTrainingNeedRowToTrainingNeed(row) };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  } finally {
    await client.end();
  }
}
