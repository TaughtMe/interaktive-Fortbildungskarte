export type CurrentRole = 'superadmin' | 'district_admin' | 'coordinator' | 'school_user' | 'viewer';
export type LegacyRole = 'school' | 'admin' | 'leadership';
export type Role = 'public' | CurrentRole | LegacyRole;
export type DatabaseRole = CurrentRole | LegacyRole;

export function normalizeRole(role: Role): 'public' | CurrentRole {
  if (role === 'admin' || role === 'leadership') return 'superadmin';
  if (role === 'school') return 'school_user';
  return role;
}

export interface DemoUser {
  role:      Role;
  label:     string;
  name:      string;
  districtId?: string;
  schoolId?: string;
}

export const DEMO_USERS: Record<Role, DemoUser> = {
  public:         { role: 'public',         label: 'Öffentlich',       name: 'Gast' },
  superadmin:     { role: 'superadmin',     label: 'Superadmin',       name: 'Demo-Superadmin' },
  district_admin: { role: 'district_admin', label: 'Bezirksverwaltung', name: 'Demo-Bezirksadmin', districtId: 'district-unterallgaeu' },
  coordinator:    { role: 'coordinator',    label: 'Koordination',     name: 'Demo-Koordinatorin', districtId: 'district-unterallgaeu' },
  school_user:    { role: 'school_user',    label: 'Schule',           name: 'Demo-Lehrkraft', districtId: 'district-unterallgaeu', schoolId: 'bb-gs' },
  viewer:         { role: 'viewer',         label: 'Lesend',           name: 'Demo-Lesezugriff', districtId: 'district-unterallgaeu' },
  school:         { role: 'school',         label: 'Schule (alt)',     name: 'Demo-Lehrkraft', districtId: 'district-unterallgaeu', schoolId: 'bb-gs' },
  admin:          { role: 'admin',          label: 'Verwaltung (alt)', name: 'Demo-Admin' },
  leadership:     { role: 'leadership',     label: 'Leitung (alt)',    name: 'Demo-Schulamtsleitung' },
};
