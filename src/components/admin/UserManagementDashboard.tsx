'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ProfileRow, ProductionRole } from '@/lib/db/schema.types';
import CreateUserModal   from './CreateUserModal';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import EditUserModal     from './EditUserModal';
import ResetPasswordModal from './ResetPasswordModal';

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<ProductionRole, string> = {
  superadmin:     'Superadmin',
  district_admin: 'Bezirksverwaltung',
  coordinator:    'Koordination',
  school_user:    'Schule',
  viewer:         'Lesend',
};

const ROLE_ORDER: Record<ProductionRole, number> = {
  superadmin:     0,
  district_admin: 1,
  coordinator:    2,
  school_user:    3,
  viewer:         4,
};

// ── Filter state ──────────────────────────────────────────────────────────────

type FilterRole        = ProductionRole | 'all';
type FilterStatus      = 'all' | 'active' | 'inactive' | 'must_change_pw';
type FilterAccountType = 'all' | 'email' | 'local';

interface FilterState {
  role:        FilterRole;
  status:      FilterStatus;
  accountType: FilterAccountType;
}

const DEFAULT_FILTERS: FilterState = {
  role:        'all',
  status:      'all',
  accountType: 'all',
};

// ── Sort & filter helpers ─────────────────────────────────────────────────────

function getUserLabel(user: ProfileRow): string {
  return (user.display_name ?? user.username ?? user.email).toLowerCase();
}

function sortUsers(users: ProfileRow[]): ProfileRow[] {
  return [...users].sort((a, b) => {
    // Active first, then inactive
    if (a.active !== b.active) return a.active ? -1 : 1;
    // Within same active state: sort by role order
    const ra = ROLE_ORDER[a.role] ?? 99;
    const rb = ROLE_ORDER[b.role] ?? 99;
    if (ra !== rb) return ra - rb;
    // Same role: alphabetically (German locale)
    return getUserLabel(a).localeCompare(getUserLabel(b), 'de');
  });
}

function matchesSearch(user: ProfileRow, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    (user.display_name ?? '').toLowerCase().includes(q) ||
    user.email.toLowerCase().includes(q) ||
    (user.real_email ?? '').toLowerCase().includes(q) ||
    (user.username ?? '').toLowerCase().includes(q)
  );
}

function matchesFilters(user: ProfileRow, filters: FilterState): boolean {
  if (filters.role !== 'all' && user.role !== filters.role) return false;
  if (filters.status !== 'all') {
    if (filters.status === 'active'        && (!user.active || user.must_change_password)) return false;
    if (filters.status === 'inactive'      && user.active)   return false;
    if (filters.status === 'must_change_pw' && (!user.active || !user.must_change_password)) return false;
  }
  if (filters.accountType !== 'all') {
    if (filters.accountType === 'local' && !user.is_local_account) return false;
    if (filters.accountType === 'email' &&  user.is_local_account) return false;
  }
  return true;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  /** Bearer token for /api/admin/users. Pass null when not authenticated. */
  accessToken: string | null;
  /**
   * True when the authenticated user is a superadmin and may create/manage accounts.
   * Based on the REAL session role — never derived from the preview role.
   */
  canCreate: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * User management dashboard — list, search, filter, sort, create,
 * edit, activate/deactivate, reset password, and delete.
 */
export default function UserManagementDashboard({ accessToken, canCreate }: Props) {
  const [users,   setUsers]   = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // ── Search & filter state ─────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filters,     setFilters]     = useState<FilterState>(DEFAULT_FILTERS);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showCreate,        setShowCreate]        = useState(false);
  const [editUser,          setEditUser]          = useState<ProfileRow | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<ProfileRow | null>(null);
  const [deleteUser,        setDeleteUser]        = useState<ProfileRow | null>(null);

  // ── Inline action state ────────────────────────────────────────────────────
  const [togglingId,  setTogglingId]  = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ userId: string; message: string } | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

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
      cache:   'no-store',
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

  // ── Derived: sorted + filtered list ──────────────────────────────────────

  const visibleUsers = useMemo(() => {
    const sorted = sortUsers(users);
    return sorted.filter(
      (u) => matchesSearch(u, searchQuery) && matchesFilters(u, filters),
    );
  }, [users, searchQuery, filters]);

  // ── Active filter helpers ─────────────────────────────────────────────────

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.role        !== 'all') n++;
    if (filters.status      !== 'all') n++;
    if (filters.accountType !== 'all') n++;
    return n;
  }, [filters]);

  function setFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleCreated() {
    setShowCreate(false);
    loadUsers();
  }

  function handleEdited(updated: ProfileRow) {
    setEditUser(null);
    // Optimistic update — replace the user in the list immediately
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  async function handleToggleActive(user: ProfileRow) {
    if (!accessToken) return;
    setTogglingId(user.id);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method:  'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ active: !user.active }),
      });
      const body = await res.json() as { data?: ProfileRow; error?: string };
      if (!res.ok) {
        setActionError({
          userId:  user.id,
          message: body.error ?? 'Aktion fehlgeschlagen.',
        });
      } else {
        if (body.data) {
          setUsers((prev) => prev.map((u) => (u.id === body.data!.id ? body.data! : u)));
        } else {
          loadUsers();
        }
      }
    } catch {
      setActionError({
        userId:  user.id,
        message: 'Verbindungsfehler — bitte erneut versuchen.',
      });
    } finally {
      setTogglingId(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

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
                  {visibleUsers.length !== users.length
                    ? `${visibleUsers.length} von ${users.length} ${users.length === 1 ? 'Konto' : 'Konten'}`
                    : `${users.length} ${users.length === 1 ? 'Konto' : 'Konten'}`
                  }
                </div>
              </div>

              {canCreate && (
                <button
                  className="btn primary compact"
                  onClick={() => setShowCreate(true)}
                  disabled={loading}
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M8 3 V13 M3 8 H13" />
                  </svg>
                  Benutzer erstellen
                </button>
              )}
            </div>

            {/* ── Search bar ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  style={{
                    position: 'absolute',
                    left:     '9px',
                    top:      '50%',
                    transform: 'translateY(-50%)',
                    width:    '14px',
                    height:   '14px',
                    opacity:  0.4,
                    pointerEvents: 'none',
                  }}
                >
                  <circle cx="6.5" cy="6.5" r="4" />
                  <path d="M10 10 L14 14" />
                </svg>
                <input
                  type="search"
                  className="login-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Suche nach Name, E-Mail, Kennung …"
                  style={{ paddingLeft: '30px', margin: 0 }}
                />
              </div>
              {searchQuery && (
                <button
                  type="button"
                  className="btn compact"
                  onClick={() => setSearchQuery('')}
                  style={{ flexShrink: 0, fontSize: '0.78rem' }}
                >
                  Löschen
                </button>
              )}
            </div>

            {/* ── Filter chips ───────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {/* Role filter */}
              <select
                className="btn compact"
                value={filters.role}
                onChange={(e) => setFilter('role', e.target.value as FilterRole)}
                style={{ fontSize: '0.78rem', cursor: 'pointer' }}
              >
                <option value="all">Alle Rollen</option>
                {(Object.entries(ROLE_LABELS) as [ProductionRole, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              {/* Status filter */}
              <select
                className="btn compact"
                value={filters.status}
                onChange={(e) => setFilter('status', e.target.value as FilterStatus)}
                style={{ fontSize: '0.78rem', cursor: 'pointer' }}
              >
                <option value="all">Alle Status</option>
                <option value="active">Aktiv</option>
                <option value="inactive">Inaktiv</option>
                <option value="must_change_pw">Pw-Wechsel ausstehend</option>
              </select>

              {/* Account type filter */}
              <select
                className="btn compact"
                value={filters.accountType}
                onChange={(e) => setFilter('accountType', e.target.value as FilterAccountType)}
                style={{ fontSize: '0.78rem', cursor: 'pointer' }}
              >
                <option value="all">Alle Kontoarten</option>
                <option value="email">E-Mail-Konto</option>
                <option value="local">Lokalkonto</option>
              </select>

              {/* Clear filters */}
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  className="btn compact"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  style={{ fontSize: '0.78rem' }}
                >
                  Filter zurücksetzen ({activeFilterCount})
                </button>
              )}
            </div>

            {/* ── User list ──────────────────────────────────────────────── */}
            {visibleUsers.length === 0 ? (
              <div className="dash-empty">
                {users.length === 0
                  ? 'Keine Benutzerkonten in Ihrem Zugriffsbereich.'
                  : 'Keine Konten entsprechen den aktuellen Filtern.'
                }
              </div>
            ) : (
              <div className="dash-list">
                {visibleUsers.map((user) => (
                  <div key={user.id}>
                    <div
                      className="dash-item"
                      style={!user.active ? { opacity: 0.6 } : undefined}
                    >
                      <div className="dash-item-main">
                        {/* Main line: display_name / username / email */}
                        <div className="dash-item-title">
                          {user.display_name
                            ?? (user.is_local_account ? user.username : null)
                            ?? user.email}
                        </div>

                        {/* Sub line: secondary identifiers */}
                        <div className="dash-item-sub" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {user.is_local_account ? (
                            <>
                              {user.username && (
                                <span>@{user.username}</span>
                              )}
                              {user.real_email && (
                                <span style={{ opacity: 0.7 }}>{user.real_email}</span>
                              )}
                            </>
                          ) : (
                            <>
                              {user.display_name && (
                                <span style={{ opacity: 0.7 }}>{user.email}</span>
                              )}
                              {user.real_email && user.real_email !== user.email && (
                                <span style={{ opacity: 0.7 }}>{user.real_email}</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="dash-item-meta">
                        <span className="fb-tag">
                          {ROLE_LABELS[user.role] ?? user.role}
                        </span>
                        {user.is_local_account && (
                          <span className="fb-tag">Lokalkonto</span>
                        )}
                        {!user.active && (
                          <span className="fb-tag" style={{ opacity: 0.5 }}>Inaktiv</span>
                        )}
                        {user.must_change_password && user.active && (
                          <span className="fb-tag" style={{ opacity: 0.7 }}>Pw-Wechsel</span>
                        )}
                      </div>
                    </div>

                    {/* Per-user action buttons — superadmin only */}
                    {canCreate && (
                      <div style={{
                        display:      'flex',
                        gap:          '6px',
                        flexWrap:     'wrap',
                        padding:      '4px 0 10px',
                        borderBottom: '1px solid var(--color-border, #e5e5e5)',
                        marginBottom: '-1px',
                      }}>
                        {/* Edit */}
                        <button
                          type="button"
                          className="btn compact"
                          onClick={() => { setActionError(null); setEditUser(user); }}
                          disabled={!!togglingId}
                          style={{ fontSize: '0.78rem' }}
                        >
                          Bearbeiten
                        </button>

                        {/* Reset password */}
                        <button
                          type="button"
                          className="btn compact"
                          onClick={() => { setActionError(null); setResetPasswordUser(user); }}
                          disabled={!!togglingId || !user.active}
                          title={!user.active ? 'Konto ist deaktiviert' : 'Passwort zurücksetzen'}
                          style={{ fontSize: '0.78rem' }}
                        >
                          Passwort
                        </button>

                        {/* Activate / deactivate */}
                        <button
                          type="button"
                          className="btn compact"
                          onClick={() => handleToggleActive(user)}
                          disabled={togglingId === user.id}
                          style={{ fontSize: '0.78rem' }}
                        >
                          {togglingId === user.id
                            ? '…'
                            : user.active ? 'Deaktivieren' : 'Aktivieren'
                          }
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          className="btn compact"
                          onClick={() => { setActionError(null); setDeleteUser(user); }}
                          disabled={!!togglingId}
                          style={{
                            fontSize:    '0.78rem',
                            color:       'var(--color-danger, #dc2626)',
                            borderColor: 'var(--color-danger, #dc2626)',
                          }}
                        >
                          Löschen
                        </button>
                      </div>
                    )}

                    {/* Inline action error */}
                    {actionError?.userId === user.id && (
                      <p style={{
                        fontSize: '0.78rem',
                        color:    'var(--color-danger, #dc2626)',
                        margin:   '4px 0 8px',
                      }}>
                        {actionError.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showCreate && accessToken && (
        <CreateUserModal
          accessToken={accessToken}
          onCreated={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editUser && accessToken && (
        <EditUserModal
          user={editUser}
          accessToken={accessToken}
          onSaved={handleEdited}
          onClose={() => setEditUser(null)}
        />
      )}

      {resetPasswordUser && accessToken && (
        <ResetPasswordModal
          user={resetPasswordUser}
          accessToken={accessToken}
          onSuccess={() => loadUsers()}
          onClose={() => setResetPasswordUser(null)}
        />
      )}

      {deleteUser && accessToken && (
        <DeleteConfirmDialog
          user={deleteUser}
          accessToken={accessToken}
          onDeleted={() => { setDeleteUser(null); loadUsers(); }}
          onClose={() => setDeleteUser(null)}
        />
      )}
    </>
  );
}
