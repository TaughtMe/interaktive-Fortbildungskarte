import { SCHULEN } from '@/data/schools';
import type { SchoolInsert } from '../schema';

const SEED_TIMESTAMP = '2026-05-01T00:00:00.000Z';

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' || trimmed === '—' ? null : trimmed;
}

export const schoolsSeed: SchoolInsert[] = SCHULEN.map((school) => ({
  id: school.id,
  name: school.name,
  ort: school.ort,
  typ: school.typ,
  lat: school.lat,
  lng: school.lng,
  adresse: school.adresse,
  tel: school.tel,
  fax: optionalText(school.fax),
  mail: school.mail,
  web: optionalText(school.web),
  leitung: optionalText(school.leitung),
  created_at: SEED_TIMESTAMP,
  updated_at: SEED_TIMESTAMP,
}));
