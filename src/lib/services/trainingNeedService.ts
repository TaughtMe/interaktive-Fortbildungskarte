import * as trainingNeedRepo from '@/lib/repositories/trainingNeedRepository';
import type { SchoolFortbildungen } from '@/types';
import type { TrainingNeed } from '@/types/trainingNeed';

export function createTrainingNeed(
  schoolId: string,
  partial: Omit<TrainingNeed, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>,
): TrainingNeed {
  return trainingNeedRepo.createTrainingNeed(schoolId, partial);
}

export async function createTrainingNeedAsync(
  schoolId: string,
  partial: Omit<TrainingNeed, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>,
): Promise<TrainingNeed> {
  return trainingNeedRepo.createTrainingNeedAsync(schoolId, partial);
}

export function getTrainingNeeds(): Record<string, SchoolFortbildungen> {
  return trainingNeedRepo.getTrainingNeeds();
}

export async function getTrainingNeedsAsync(): Promise<Record<string, SchoolFortbildungen>> {
  return trainingNeedRepo.getTrainingNeedsAsync();
}

export function getAllTrainingNeedEntries(): TrainingNeed[] {
  return Object.values(getTrainingNeeds()).flatMap((schoolData) => schoolData.bedarf);
}

export async function getAllTrainingNeedEntriesAsync(): Promise<TrainingNeed[]> {
  return trainingNeedRepo.getAllTrainingNeedEntriesAsync();
}

export function getTrainingNeedsByDistrict(districtId: string): TrainingNeed[] {
  return trainingNeedRepo.getTrainingNeedsByDistrict(districtId);
}

export async function getTrainingNeedsByDistrictAsync(districtId: string): Promise<TrainingNeed[]> {
  return trainingNeedRepo.getTrainingNeedsByDistrictAsync(districtId);
}

// Demo data initializer — call once for the initial React state.
// TODO (D1): Replace with a useEffect that fetches from the API on mount.
export function initializeDemoData(): Record<string, SchoolFortbildungen> {
  return trainingNeedRepo.getTrainingNeeds();
}
