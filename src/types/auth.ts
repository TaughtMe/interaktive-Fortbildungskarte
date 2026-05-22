export type Role = 'public' | 'school' | 'coordinator' | 'admin' | 'leadership';

export interface DemoUser {
  role:      Role;
  label:     string;
  name:      string;
  schoolId?: string;
}

export const DEMO_USERS: Record<Role, DemoUser> = {
  public:      { role: 'public',      label: 'Öffentlich',       name: 'Gast' },
  school:      { role: 'school',      label: 'Schule',           name: 'Demo-Lehrkraft',       schoolId: 'bb-gs' },
  coordinator: { role: 'coordinator', label: 'Koordination',     name: 'Demo-Koordinatorin' },
  admin:       { role: 'admin',       label: 'Verwaltung',       name: 'Demo-Admin' },
  leadership:  { role: 'leadership',  label: 'Schulamtsleitung', name: 'Demo-Schulamtsleitung' },
};
