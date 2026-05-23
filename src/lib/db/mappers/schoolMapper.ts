import type { School } from '@/types';
import type { PgSchoolSelect } from '../schema.pg';
import type { SchoolRow } from '../schema.types';

export function mapSchoolRowToSchool(row: SchoolRow | PgSchoolSelect): School {
  return {
    id: row.id,
    name: row.name,
    ort: row.ort,
    typ: row.typ,
    lat: row.lat,
    lng: row.lng,
    adresse: row.adresse,
    tel: row.tel,
    fax: row.fax ?? '',
    mail: row.mail,
    web: row.web ?? '',
    leitung: row.leitung ?? '',
    districtId: 'district_id' in row ? row.district_id : null,
  };
}
