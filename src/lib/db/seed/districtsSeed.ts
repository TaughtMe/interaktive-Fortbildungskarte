import { DEMO_DISTRICTS } from '../../districts/districtAssignments';
import type { PgDistrictInsert } from '../schema.pg';

const SEED_DATE = new Date('2026-05-01T00:00:00.000Z');

export const districtsSeed: PgDistrictInsert[] = DEMO_DISTRICTS.map((district) => ({
  id: district.id,
  name: district.name,
  slug: district.slug,
  description: district.description ?? null,
  color: district.color ?? null,
  boundary_geojson: district.boundaryGeoJson ?? null,
  created_at: SEED_DATE,
  updated_at: SEED_DATE,
}));
