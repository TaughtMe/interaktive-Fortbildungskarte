import type { District, School } from '@/types';

export const DISTRICT_MEMMINGEN_ID = 'district-memmingen';
export const DISTRICT_KEMPTEN_ID = 'district-kempten';
export const DISTRICT_UNTERALLGAEU_ID = 'district-unterallgaeu';

export const DEMO_DISTRICTS: District[] = [
  {
    id: DISTRICT_MEMMINGEN_ID,
    name: 'Schulamtsbezirk Memmingen',
    slug: 'memmingen',
    description: 'Demo-Bezirk fuer Schulen im Stadtgebiet Memmingen.',
    color: '#1f77b4',
    boundaryGeoJson: null,
  },
  {
    id: DISTRICT_KEMPTEN_ID,
    name: 'Schulamtsbezirk Kempten',
    slug: 'kempten',
    description: 'Demo-Bezirk fuer spaetere bezirksuebergreifende Tests.',
    color: '#2ca02c',
    boundaryGeoJson: null,
  },
  {
    id: DISTRICT_UNTERALLGAEU_ID,
    name: 'Schulamtsbezirk Unterallgaeu',
    slug: 'unterallgaeu',
    description: 'Demo-Bezirk fuer Schulen im Landkreis Unterallgaeu.',
    color: '#ff7f0e',
    boundaryGeoJson: null,
  },
];

export function getDistrictIdForSchoolLocation(school: Pick<School, 'ort'>): string | null {
  if (school.ort.startsWith('Memmingen')) return DISTRICT_MEMMINGEN_ID;
  if (school.ort === 'Kempten') return DISTRICT_KEMPTEN_ID;
  return DISTRICT_UNTERALLGAEU_ID;
}
