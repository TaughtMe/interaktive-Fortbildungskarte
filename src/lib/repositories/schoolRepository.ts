import { SCHULEN } from '@/data/schools';
import { isD1DataSource, isPostgresDataSource } from '@/lib/config/dataSource';
import { getDbClient } from '@/lib/db/client';
import { getDistrictIdForSchoolLocation } from '@/lib/districts/districtAssignments';
import type { School, SchoolTypKey } from '@/types';

function withDemoDistrict(school: School): School {
  return { ...school, districtId: school.districtId ?? getDistrictIdForSchoolLocation(school) };
}

export function getAllSchools(): School[] {
  if (isD1DataSource()) {
    const db = getDbClient();
    if (db) {
      // TODO (DB): Real reads need a server/API boundary; PostgreSQL/Supabase is preferred.
    }
    // Mock fallback stays active while D1 bindings or async API reads are not available.
  }

  return SCHULEN.map(withDemoDistrict);
}

export function getSchoolById(id: string): School | undefined {
  if (isD1DataSource()) {
    const db = getDbClient();
    if (db) {
      // TODO (DB): Real reads need a server/API boundary before replacing the mock lookup.
    }
    // Mock fallback stays active while D1 bindings or async API reads are not available.
  }

  const school = SCHULEN.find((s) => s.id === id);
  return school ? withDemoDistrict(school) : undefined;
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

export function getSchoolsByDistrict(districtId: string): School[] {
  return getAllSchools().filter((school) => school.districtId === districtId);
}

export async function getSchoolsByDistrictAsync(districtId: string): Promise<School[]> {
  if (isPostgresDataSource()) {
    const { getSchoolsByDistrictFromPostgres } = await import('@/lib/db/postgresClient');
    const result = await getSchoolsByDistrictFromPostgres(districtId);
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }

  return getSchoolsByDistrict(districtId);
}

// TODO (DB): Replace with a server/API-backed query when the database path is activated.
export function getSchoolsByType(typ: SchoolTypKey): School[] {
  return getAllSchools().filter((s) => s.typ === typ);
}
