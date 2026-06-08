'use client';
import { useState } from 'react';
import type { ProfileRow } from '@/lib/db/schema.types';

interface Props {
  /** The user to be deleted. */
  user:        ProfileRow;
  accessToken: string;
  /** Called after the user was successfully deleted — close the dialog and reload. */
  onDeleted:   () => void;
  /** Called when the dialog is cancelled. */
  onClose:     () => void;
}

const CONFIRM_WORD = 'LÖSCHEN';

/**
 * Confirmation dialog for permanent account deletion.
 *
 * Requires the admin to type "LÖSCHEN" before the confirm button activates.
 * Warns that school-related data (Fortbildungsbedarfe etc.) is preserved.
 *
 * The backend enforces:
 *   - Superadmin role check
 *   - Deletion log written before the auth user is removed
 *   - Self-deletion is blocked
 */
export default function DeleteConfirmDialog({ user, accessToken, onDeleted, onClose }: Props) {
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
        setError(body?.error ?? 'Konto konnte nicht gelöscht werden.');
        setDeleting(false);
        return;
      }

      onDeleted();
    } catch {
      setError('Verbindungsfehler — bitte erneut versuchen.');
      setDeleting(false);
    }
  }

  return (
    <div
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         3000,
        background:     'rgba(0, 0, 0, 0.55)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '16px',
      }}
      role="dialog"
      aria-modal
      aria-label="Konto löschen"
    >
      <div
        className="login-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px', width: '100%' }}
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

          <p style={{
            fontSize:     '0.875rem',
            color:        'var(--color-muted, #555)',
            marginBottom: '16px',
            lineHeight:   '1.55',
          }}>
            Das Konto wird unwiderruflich gelöscht.{' '}
            Schulbezogene Daten (Fortbildungsbedarfe u. a.) bleiben erhalten.
          </p>

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
              {deleting ? 'Wird gelöscht …' : 'Endgültig löschen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
