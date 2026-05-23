import { SCHULEN } from '@/data/schools';
import { isD1DataSource, isPostgresDataSource } from '@/lib/config/dataSource';
import { getDbClient } from '@/lib/db/client';
import type { School, SchoolTypKey } from '@/types';

export function getAllSchools(): School[] {
  if (isD1DataSource()) {
    const db = getDbClient();
    if (db) {
      // TODO (DB): Real reads need a server/API boundary; PostgreSQL/Supabase is preferred.
    }
    // Mock fallback stays active while D1 bindings or async API reads are not available.
  }

  return SCHULEN;
}

export function getSchoolById(id: string): School | undefined {
  if (isD1DataSource()) {
    const db = getDbClient();
    if (db) {
      // TODO (DB): Real reads need a server/API boundary before replacing the mock lookup.
    }
    // Mock fallback stays active while D1 bindings or async API reads are not available.
  }

  return SCHULEN.find((s) => s.id === id);
}

export async function getAllSchoolsAsync(): Promise<School[]> {
  if (isPostgresDataSource()) {
    const { getSchoolsFromPostgres } = await import('@/lib/db/postgresClient');
    const result = await getSchoolsFromPostgres();
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }

  return getAllSchools();
}

export async function getSchoolByIdAsync(id: string): Promise<School | undefined> {
  if (isPostgresDataSource()) {
    const { getSchoolByIdFromPostgres } = await import('@/lib/db/postgresClient');
    const result = await getSchoolByIdFromPostgres(id);
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }

  return getSchoolById(id);
}

// TODO (DB): Replace with a server/API-backed query when the database path is activated.
export function getSchoolsByType(typ: SchoolTypKey): School[] {
  return SCHULEN.filter((s) => s.typ === typ);
}
