import { SCHULEN, FORTBILDUNGEN_DEFAULT } from '@/data/schools';
import { isD1DataSource } from '@/lib/config/dataSource';
import { getDbClient } from '@/lib/db/client';
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
