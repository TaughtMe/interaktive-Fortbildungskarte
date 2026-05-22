import { SCHULEN, FORTBILDUNGEN_DEFAULT } from '@/data/schools';
import type { SchoolFortbildungen } from '@/types';
import type { TrainingNeed } from '@/types/trainingNeed';

// TODO (D1): Replace with INSERT INTO training_needs (...) VALUES (...)
export function createTrainingNeed(
  schoolId: string,
  partial: Omit<TrainingNeed, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>,
): TrainingNeed {
  const now = new Date().toISOString();
  return {
    id:        crypto.randomUUID(),
    schoolId,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

// Demo data: distributes FORTBILDUNGEN_DEFAULT across schools by index pattern.
// TODO (D1): Remove entirely — initial state will come from SELECT queries at startup.
export function initializeDemoData(): Record<string, SchoolFortbildungen> {
  const map: Record<string, SchoolFortbildungen> = {};
  SCHULEN.forEach((s, i) => {
    if (i % 3 === 0)      map[s.id] = JSON.parse(JSON.stringify(FORTBILDUNGEN_DEFAULT));
    else if (i % 5 === 0) map[s.id] = { laufend: [FORTBILDUNGEN_DEFAULT.laufend[0]], bedarf: [] };
    else                  map[s.id] = { laufend: [], bedarf: [] };
  });
  return map;
}
