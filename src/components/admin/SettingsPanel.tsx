'use client';
import UserManagementDashboard from './UserManagementDashboard';

interface Props {
  /** Real Bearer token — used for all API calls inside the panel. */
  accessToken: string | null;
  /**
   * True when the authenticated user is a superadmin.
   * Derived from currentUser (real auth), never from previewRole.
   */
  canCreate: boolean;
  /**
   * UUID of the real, authenticated user's own profile — or null (demo mode /
   * no profile). Passed through to UserManagementDashboard for P1
   * Multi-Superadmin-Schutz self-detection. Never derived from preview roles.
   */
  currentUserId: string | null;
  onClose: () => void;
}

/**
 * Right-side settings drawer.
 *
 * Visibility is controlled by the parent (page.tsx) which shows this panel
 * only when the real authenticated user is a superadmin — regardless of the
 * active preview role.
 *
 * The inner CreateUserModal (z-index: 3000) renders on top of this panel
 * (z-index: 2000) automatically because it uses position:fixed.
 */
export default function SettingsPanel({ accessToken, canCreate, currentUserId, onClose }: Props) {
  return (
    <div
      className="settings-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label="Einstellungen"
    >
      <div
        className="settings-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="settings-head">
          <h2 className="settings-title">Einstellungen</h2>
          <button
            className="btn icon"
            onClick={onClose}
            aria-label="Schließen"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M4 4 L12 12 M12 4 L4 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="settings-body">
          <UserManagementDashboard
            accessToken={accessToken}
            canCreate={canCreate}
            currentUserId={currentUserId}
          />
        </div>
      </div>
    </div>
  );
}
