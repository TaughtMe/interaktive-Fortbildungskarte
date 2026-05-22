import { SCHULEN } from '@/data/schools';
import type { School, SchoolTypKey } from '@/types';

// TODO (D1): Replace with `db.prepare('SELECT * FROM schools').all<School>()`
export function getAllSchools(): School[] {
  return SCHULEN;
}

// TODO (D1): Replace with `db.prepare('SELECT * FROM schools WHERE id = ?').first<School>(id)`
export function getSchoolById(id: string): School | undefined {
  return SCHULEN.find((s) => s.id === id);
}

// TODO (D1): Replace with `db.prepare('SELECT * FROM schools WHERE typ = ?').all<School>(typ)`
export function getSchoolsByType(typ: SchoolTypKey): School[] {
  return SCHULEN.filter((s) => s.typ === typ);
}
