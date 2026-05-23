'use client';
import { DEMO_USERS } from '@/types/auth';
import type { Role } from '@/types/auth';

interface Props {
  role: Role;
  onChange: (role: Role) => void;
}

const ROLES: Role[] = ['public', 'school_user', 'coordinator', 'district_admin', 'viewer', 'superadmin'];

export default function DemoRoleSwitcher({ role, onChange }: Props) {
  const current = DEMO_USERS[role];

  return (
    <div className="demo-role-switcher">
      <span className="demo-badge">Demo</span>
      <select
        value={role}
        onChange={(e) => onChange(e.target.value as Role)}
        aria-label="Demo-Rolle wechseln"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>{DEMO_USERS[r].label} – {DEMO_USERS[r].name}</option>
        ))}
      </select>
      <span className="demo-hint">Keine echte Anmeldung</span>
    </div>
  );
}
