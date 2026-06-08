'use client';
import { useState } from 'react';
import type { ProfileRow } from '@/lib/db/schema.types';
import { describeAdminActionError } from '@/lib/auth/userManagementAccess';

interface Props {
  /** The user to be soft-deleted. */
  user:          ProfileRow;
  accessToken:   string;
  /**
   * Called after the soft-deletion succeeded.
   * Receives the updated ProfileRow (active=false, scheduled_deletion_at set).
   * The caller should update the user in the list in-place — no full reload needed.
   */
  onSoftDeleted: (updated: ProfileRow) => void;
  /** Called when the dialog is cancelled. */
  onClose:       () => void;
}

const CONFIRM_WORD = 'LÖSCHEN';

/**
 * Confirmation dialog for soft-deletion (30-day grace period).
 *
 * Requires the admin to type "LÖSCHEN" before the confirm button activates.
 * Explains that the account is preserved for 30 days and can be restored.
 *
 * The backend enforces:
 *   - Superadmin role check
 *   - Deletion log written before the profile is marked
 *   - Self-deletion is blocked
 *   - Last-superadmin protection
 */
export default function DeleteConfirmDialog({ user, accessToken, onSoftDeleted, onClose }: Props) {
  const [input,    setInput]    = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const displayName =
    user.display_name ??
    (user.is_local_account ? user.username : null) ??
    user.email;

  const canConfirm = input === CONFIRM_WORD && !deleting;

  async function handleDelete() {
    if (!canConfirm) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method:  'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setError(describeAdminActionError(body?.error, 'Konto konnte nicht gelöscht werden.'));
        setDeleting(false);
        return;
      }

      const body = await res.json() as { data?: ProfileRow };
      if (body.data) {
        onSoftDeleted(body.data);
      } else {
        // Fallback: close without update (list will resync on next load)
        onClose();
      }
    } catch {
      setError('Verbindungsfehler — bitte erneut versuchen.');
      setDeleting(false);
    }
  }

  return (
    <div
      className="login-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label="Konto löschen"
    >
      <div
        className="login-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', width: '100%' }}
      >
        <div className="login-head">
          <h2 className="login-title">Konto löschen</h2>
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={deleting}
            aria-label="Abbrechen"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 4 L12 12 M12 4 L4 12" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '0 0 4px' }}>
          {/* User info */}
          <p style={{ fontSize: '0.875rem', marginBottom: '6px' }}>
            Konto <strong>{displayName}</strong> löschen?
          </p>
          {user.is_local_account && user.username && (
            <p style={{ fontSize: '0.78rem', color: 'var(--color-muted, #888)', marginBottom: '6px' }}>
              Benutzerkennung: {user.username}
            </p>
          )}
          {!user.is_local_account && (
            <p style={{ fontSize: '0.78rem', color: 'var(--color-muted, #888)', marginBottom: '6px' }}>
              {user.email}
            </p>
          )}

          {/* 30-day soft-delete explanation */}
          <div style={{
            background:   'rgba(220,38,38,0.06)',
            border:       '1px solid rgba(220,38,38,0.2)',
            borderRadius: '6px',
            padding:      '10px 12px',
            marginBottom: '14px',
            fontSize:     '0.82rem',
            lineHeight:   '1.55',
            color:        'var(--ink-1)',
          }}>
            <strong>30-Tage-Wiederherstellungsfenster:</strong> Das Konto wird
            zunächst deaktiviert und erst nach 30 Tagen endgültig gelöscht.
            Innerhalb dieser Frist kann es jederzeit wiederhergestellt werden.
            Schulbezogene Daten (Fortbildungsbedarfe u. a.) bleiben in jedem Fall erhalten.
          </div>

          {/* Confirmation input */}
          <label className="login-label" style={{ marginBottom: '12px' }}>
            <span>
              Zur Bestätigung <strong>{CONFIRM_WORD}</strong> eingeben
            </span>
            <input
              className="login-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
              disabled={deleting}
              aria-label={`${CONFIRM_WORD} eingeben zur Bestätigung`}
            />
          </label>

          {error && (
            <p className="login-error" role="alert">{error}</p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn"
              onClick={onClose}
              disabled={deleting}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleDelete}
              disabled={!canConfirm}
              aria-disabled={!canConfirm}
              style={{
                flex:        1,
                justifyContent: 'center',
                ...(canConfirm
                  ? {
                      background:  'var(--color-danger, #dc2626)',
                      color:       '#fff',
                      borderColor: 'var(--color-danger, #dc2626)',
                    }
                  : {}),
              }}
            >
              {deleting ? 'Wird vorgemerkt …' : 'Löschen vormerken'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
