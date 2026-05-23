import * as schoolRepo from '@/lib/repositories/schoolRepository';
import type { School, SchoolTypKey } from '@/types';

export function getAllSchools(): School[] {
  return schoolRepo.getAllSchools();
}

export async function getAllSchoolsAsync(): Promise<School[]> {
  return schoolRepo.getAllSchoolsAsync();
}

export function getSchoolsByDistrict(districtId: string): School[] {
  return schoolRepo.getSchoolsByDistrict(districtId);
}

export async function getSchoolsByDistrictAsync(districtId: string): Promise<School[]> {
  return schoolRepo.getSchoolsByDistrictAsync(districtId);
}

export function getSchoolById(id: string): School | undefined {
  return schoolRepo.getSchoolById(id);
}

export async function getSchoolByIdAsync(id: string): Promise<School | undefined> {
  return schoolRepo.getSchoolByIdAsync(id);
}

export function getSchoolsByType(typ: SchoolTypKey): School[] {
  return schoolRepo.getSchoolsByType(typ);
}

export function searchSchools(query: string, typFilter: SchoolTypKey | null): School[] {
  const q = query.trim().toLowerCase();
  return schoolRepo.getAllSchools().filter((s) => {
    if (typFilter && s.typ !== typFilter) return false;
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.ort.toLowerCase().includes(q) ||
      s.leitung.toLowerCase().includes(q)
    );
  });
}
