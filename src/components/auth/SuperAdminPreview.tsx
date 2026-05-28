'use client';
import type { Role } from '@/types/auth';
import { DEMO_USERS } from '@/types/auth';

interface Props {
  previewRole: Role | null;
  onChange: (role: Role | null) => void;
}

const PREVIEW_ROLES: { role: Role; label: string }[] = [
  { role: 'district_admin', label: DEMO_USERS['district_admin'].label },
  { role: 'coordinator',    label: DEMO_USERS['coordinator'].label },
  { role: 'school_user',    label: DEMO_USERS['school_user'].label },
  { role: 'viewer',         label: DEMO_USERS['viewer'].label },
  { role: 'public',         label: DEMO_USERS['public'].label },
];

/**
 * UI-only preview selector for authenticated superadmins.
 *
 * Lets the superadmin simulate how other roles see the interface.
 * Does NOT change backend permissions — Bearer token stays unchanged.
 * Does NOT send x-demo-role headers.
 */
export default function SuperAdminPreview({ previewRole, onChange }: Props) {
  return (
    <div className="preview-bar">
      <span className="preview-label">Ansicht prüfen als:</span>
      <select
        className="preview-select"
        value={previewRole ?? ''}
        onChange={(e) => onChange(e.target.value ? (e.target.value as Role) : null)}
        aria-label="Vorschau-Ansicht wählen"
      >
        <option value="">Eigene Ansicht (Superadmin)</option>
        {PREVIEW_ROLES.map(({ role, label }) => (
          <option key={role} value={role}>{label}</option>
        ))}
      </select>
      {previewRole && (
        <span className="preview-active-badge">Vorschau aktiv</span>
      )}
    </div>
  );
}
