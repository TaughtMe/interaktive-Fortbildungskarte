'use client';
import { useCallback, useEffect, useState } from 'react';
import type { ProfileRow, ProductionRole } from '@/lib/db/schema.types';
import CreateUserModal from './CreateUserModal';

const ROLE_LABELS: Record<ProductionRole, string> = {
  superadmin:     'Superadmin',
  district_admin: 'Bezirksverwaltung',
  coordinator:    'Koordination',
  school_user:    'Schule',
  viewer:         'Lesend',
};

interface Props {
  /** Bearer token for /api/admin/users. Pass null when not authenticated. */
  accessToken: string | null;
  /**
   * True when the authenticated user is a superadmin and may create new accounts.
   * Based on the REAL session role — never derived from the preview role.
   */
  canCreate: boolean;
}

/**
 * User management dashboard — list + (superadmin only) create action.
 *
 * The server filters the list to the actor's scope (district, school, or all).
 * Create is gated both here (canCreate prop) and in POST /api/admin/users.
 */
export default function UserManagementDashboard({ accessToken, canCreate }: Props) {
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadUsers = useCallback(() => {
    if (!accessToken) {
      setUsers([]);
      setLoading(false);
      setError('Keine aktive Sitzung — bitte erneut anmelden.');
      return () => { /* nothing to cancel */ };
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store',
    })
      .then((r) => {
        if (!r.ok) {
          return r.json().then((body: { error?: string }) => {
            throw new Error(body?.error ?? `HTTP ${r.status}`);
          });
        }
        return r.json() as Promise<{ data: ProfileRow[] }>;
      })
      .then((body) => {
        if (!cancelled) {
          setUsers(body?.data ?? []);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Fehler beim Laden der Benutzerliste.');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [accessToken]);

  useEffect(() => {
    return loadUsers();
  }, [loadUsers]);

  function handleCreated() {
    setShowCreate(false);
    loadUsers();
  }

  return (
    <>
      <div className="dashboard">
        <div className="dashboard-header">
          <div className="dashboard-title">Benutzerverwaltung</div>
          <div className="dashboard-sub">Konten und Rollen in Ihrem Zugriffsbereich</div>
        </div>

        {loading && (
          <div className="api-status api-loading">Benutzerliste wird geladen …</div>
        )}

        {error && !loading && (
          <div className="api-status api-error">{error}</div>
        )}

        {!loading && !error && (
          <div className="dashboard-section">
            <div className="dashboard-section-head">
              <div>
                <div className="dashboard-section-title">Benutzerkonten</div>
                <div className="dashboard-section-sub">
                  {users.length} {users.length === 1 ? 'Konto' : 'Konten'}
                </div>
              </div>

              {/* Create button — superadmin only */}
              {canCreate && (
                <button
                  className="btn primary compact"
                  onClick={() => setShowCreate(true)}
                  disabled={loading}
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M8 3 V13 M3 8 H13" />
                  </svg>
                  Benutzer einladen
                </button>
              )}
            </div>

            {users.length === 0 ? (
              <div className="dash-empty">Keine Benutzerkonten in Ihrem Zugriffsbereich.</div>
            ) : (
              <div className="dash-list">
                {users.map((user) => (
                  <div key={user.id} className="dash-item">
                    <div className="dash-item-main">
                      <div className="dash-item-title">
                        {user.display_name ?? user.email}
                      </div>
                      {user.display_name && (
                        <div className="dash-item-sub">{user.email}</div>
                      )}
                    </div>
                    <div className="dash-item-meta">
                      <span className="fb-tag">
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                      {!user.active && (
                        <span className="fb-tag" style={{ opacity: 0.5 }}>Inaktiv</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && accessToken && (
        <CreateUserModal
          accessToken={accessToken}
          onCreated={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}
    </>
  );
}
