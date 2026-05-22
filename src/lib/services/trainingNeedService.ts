import * as trainingNeedRepo from '@/lib/repositories/trainingNeedRepository';
import type { SchoolFortbildungen } from '@/types';
import type { TrainingNeed } from '@/types/trainingNeed';

export function createTrainingNeed(
  schoolId: string,
  partial: Omit<TrainingNeed, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>,
): TrainingNeed {
  return trainingNeedRepo.createTrainingNeed(schoolId, partial);
}

// Demo data initializer — call once for the initial React state.
// TODO (D1): Replace with a useEffect that fetches from the API on mount.
export function initializeDemoData(): Record<string, SchoolFortbildungen> {
  return trainingNeedRepo.initializeDemoData();
}
