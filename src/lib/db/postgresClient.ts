import type { School } from '@/types';
import type { TrainingNeed } from '@/types/trainingNeed';

export type PostgresAdapterResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function missingImplementation(): PostgresAdapterResult<never> {
  return {
    ok: false,
    error: 'PostgreSQL/Supabase adapter is prepared but not active.',
  };
}

export function getPostgresDatabaseUrl(): string | null {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  return databaseUrl && databaseUrl.length > 0 ? databaseUrl : null;
}

// Placeholder only: do not open a connection at import time. Real Drizzle/
// postgres-js wiring happens later after explicit DATABASE_URL approval.
export async function getSchoolsFromPostgres(): Promise<PostgresAdapterResult<School[]>> {
  return missingImplementation();
}

export async function getTrainingNeedsFromPostgres(): Promise<PostgresAdapterResult<TrainingNeed[]>> {
  return missingImplementation();
}

export async function createTrainingNeedInPostgres(
  _schoolId: string,
  _input: Omit<TrainingNeed, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>,
): Promise<PostgresAdapterResult<TrainingNeed>> {
  return missingImplementation();
}
