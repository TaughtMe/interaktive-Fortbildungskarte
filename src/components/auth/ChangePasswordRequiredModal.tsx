'use client';
import { useState } from 'react';

interface Props {
  /** Bearer token of the current session — used to call /api/me/change-password. */
  accessToken: string;
  /** Called after the password was successfully changed. */
  onSuccess: () => void;
  /** Called when the user chooses to log out instead of changing the password. */
  onLogout: () => Promise<void>;
}

const MIN_PASSWORD_LENGTH = 12;

/**
 * Blocking modal that forces a password change before the user can access the app.
 *
 * Shown when /api/me returns mustChangePassword === true.
 *
 * Properties:
 *   - Cannot be closed via X button or backdrop click.
 *   - Logout is still possible (navigates the user out of the forced-change flow).
 *   - z-index 9999 ensures it covers all other UI including other modals.
 */
export default function ChangePasswordRequiredModal({ accessToken, onSuccess, onLogout }: Props) {
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error,           setError]           = useState<string | null>(null);
  const [submitting,      setSubmitting]      = useState(false);
  const [loggingOut,      setLoggingOut]      = useState(false);

  const isDisabled = submitting || loggingOut;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation (server also validates)
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Das neue Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/me/change-password', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });

      const body = await res.json() as { error?: string };

      if (!res.ok) {
        setError(body?.error ?? 'Passwort konnte nicht geändert werden.');
        setSubmitting(false);
        return;
      }

      // Success — clear sensitive data before notifying parent
      setNewPassword('');
      setConfirmPassword('');
      onSuccess();
    } catch {
      setError('Verbindungsfehler — bitte erneut versuchen.');
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await onLogout();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    // Backdrop: position fixed, full screen, high z-index.
    // NO onClick handler — this modal cannot be dismissed by clicking outside.
    <div
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         9999,
        background:     'rgba(0, 0, 0, 0.65)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '16px',
      }}
      role="dialog"
      aria-modal
      aria-label="Passwort ändern erforderlich"
    >
      <div
        className="login-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '400px', width: '100%' }}
      >
        {/* Header — intentionally NO close button */}
        <div className="login-head">
          <h2 className="login-title">Passwort ändern erforderlich</h2>
        </div>

        <div style={{ padding: '0 0 4px' }}>
          <p style={{
            fontSize:    '0.875rem',
            lineHeight:  '1.55',
            color:       'var(--color-muted, #555)',
            marginBottom: '20px',
          }}>
            Für dieses Konto wurde ein Startpasswort vergeben. Bitte legen Sie
            jetzt ein persönliches Passwort fest, bevor Sie fortfahren.
          </p>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <label className="login-label">
              <span>Neues Passwort</span>
              <input
                className="login-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus
                required
                disabled={isDisabled}
                placeholder={`Mind. ${MIN_PASSWORD_LENGTH} Zeichen`}
              />
            </label>

            <label className="login-label">
              <span>Passwort wiederholen</span>
              <input
                className="login-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={isDisabled}
              />
            </label>

            <p style={{ fontSize: '0.78rem', color: 'var(--color-muted, #888)', margin: '-4px 0 0' }}>
              Mindestens {MIN_PASSWORD_LENGTH} Zeichen.
            </p>

            {error && (
              <p className="login-error" role="alert">{error}</p>
            )}

            <button
              className="btn primary"
              type="submit"
              disabled={isDisabled}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {submitting ? 'Wird gespeichert …' : 'Passwort speichern'}
            </button>
          </form>

          {/* Logout option — the only escape from this modal */}
          <div style={{
            marginTop:   '12px',
            paddingTop:  '12px',
            borderTop:   '1px solid var(--color-border, #e0e0e0)',
          }}>
            <button
              type="button"
              className="btn"
              onClick={handleLogout}
              disabled={isDisabled}
              style={{ width: '100%', justifyContent: 'center', opacity: 0.75 }}
            >
              {loggingOut ? 'Abmelden …' : 'Abmelden statt Passwort ändern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
