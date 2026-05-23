import { SCHULEN } from '../../../data/schools';
import { getDistrictIdForSchoolLocation } from '../../districts/districtAssignments';
import type { SchoolInsert } from '../schema';
import type { PgSchoolInsert } from '../schema.pg';

const SEED_TIMESTAMP = '2026-05-01T00:00:00.000Z';
const SEED_DATE = new Date(SEED_TIMESTAMP);

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

export const postgresSchoolsSeed: PgSchoolInsert[] = SCHULEN.map((school) => ({
  id: school.id,
  district_id: getDistrictIdForSchoolLocation(school),
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
  created_at: SEED_DATE,
  updated_at: SEED_DATE,
}));
