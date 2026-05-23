import { SCHULEN, FORTBILDUNGEN_DEFAULT } from '@/data/schools';
import { isD1DataSource, isPostgresDataSource } from '@/lib/config/dataSource';
import { getDbClient } from '@/lib/db/client';
import { getDistrictIdForSchoolLocation } from '@/lib/districts/districtAssignments';
import type { SchoolFortbildungen } from '@/types';
import type { TrainingNeed } from '@/types/trainingNeed';

export function createTrainingNeed(
  schoolId: string,
  partial: Omit<TrainingNeed, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>,
): TrainingNeed {
  if (isD1DataSource()) {
    const db = getDbClient();
    if (db) {
      // TODO (DB): Real writes need a server/API boundary; PostgreSQL/Supabase is preferred.
    }
    // Mock fallback keeps local Bedarfsmeldungen working without D1 bindings.
  }

  const now = new Date().toISOString();
  return {
    id:        crypto.randomUUID(),
    schoolId,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function getTrainingNeeds(): Record<string, SchoolFortbildungen> {
  if (isD1DataSource()) {
    const db = getDbClient();
    if (db) {
      // TODO (DB): Query `training_needs` through a server/API boundary and map rows to UI types.
    }
    // Mock fallback stays active until D1 reads are moved behind a server/API boundary.
  }

  return initializeDemoData();
}

export async function createTrainingNeedAsync(
  schoolId: string,
  partial: Omit<TrainingNeed, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>,
): Promise<TrainingNeed> {
  if (isPostgresDataSource()) {
    const { createTrainingNeedInPostgres } = await import('@/lib/db/postgresClient');
    const result = await createTrainingNeedInPostgres(schoolId, partial);
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }

  return createTrainingNeed(schoolId, partial);
}

export async function createTrainingNeedWithSchoolCodeAsync(
  schoolId: string,
  schoolCode: string,
  partial: Omit<TrainingNeed, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>,
): Promise<TrainingNeed> {
  if (isPostgresDataSource()) {
    const { createTrainingNeedWithSchoolCodeInPostgres } = await import('@/lib/db/postgresClient');
    const result = await createTrainingNeedWithSchoolCodeInPostgres(schoolId, schoolCode, partial);
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }

  return createTrainingNeed(schoolId, partial);
}

export async function getAllTrainingNeedEntriesAsync(): Promise<TrainingNeed[]> {
  if (isPostgresDataSource()) {
    const { getTrainingNeedsFromPostgres } = await import('@/lib/db/postgresClient');
    const result = await getTrainingNeedsFromPostgres();
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }

  return Object.values(getTrainingNeeds()).flatMap((schoolData) => schoolData.bedarf);
}

export function getTrainingNeedsByDistrict(districtId: string): TrainingNeed[] {
  const schoolIds = new Set(
    SCHULEN
      .filter((school) => getDistrictIdForSchoolLocation(school) === districtId)
      .map((school) => school.id),
  );

  return Object.values(getTrainingNeeds())
    .flatMap((schoolData) => schoolData.bedarf)
    .filter((need) => schoolIds.has(need.schoolId));
}

export async function getTrainingNeedsByDistrictAsync(districtId: string): Promise<TrainingNeed[]> {
  if (isPostgresDataSource()) {
    const { getTrainingNeedsByDistrictFromPostgres } = await import('@/lib/db/postgresClient');
    const result = await getTrainingNeedsByDistrictFromPostgres(districtId);
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }

  return getTrainingNeedsByDistrict(districtId);
}

export async function getTrainingNeedsAsync(): Promise<Record<string, SchoolFortbildungen>> {
  const needs = await getAllTrainingNeedEntriesAsync();
  const map: Record<string, SchoolFortbildungen> = {};

  SCHULEN.forEach((school) => {
    map[school.id] = { laufend: [], bedarf: [] };
  });

  needs.forEach((need) => {
    const existing = map[need.schoolId] ?? { laufend: [], bedarf: [] };
    map[need.schoolId] = { ...existing, bedarf: [...existing.bedarf, need] };
  });

  return map;
}

// Demo data stays the default until a real server/API data source is activated.
export function initializeDemoData(): Record<string, SchoolFortbildungen> {
  const map: Record<string, SchoolFortbildungen> = {};
  SCHULEN.forEach((s, i) => {
    if (i % 3 === 0)      map[s.id] = JSON.parse(JSON.stringify(FORTBILDUNGEN_DEFAULT));
    else if (i % 5 === 0) map[s.id] = { laufend: [FORTBILDUNGEN_DEFAULT.laufend[0]], bedarf: [] };
    else                  map[s.id] = { laufend: [], bedarf: [] };
  });
  return map;
}
