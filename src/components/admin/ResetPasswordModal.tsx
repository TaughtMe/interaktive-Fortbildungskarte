'use client';
import { useState } from 'react';
import type { ProfileRow } from '@/lib/db/schema.types';

type ResetMode = 'generate' | 'manual';

interface SuccessData {
  loginIdentifier:   string;
  temporaryPassword: string;
}

interface Props {
  /** The user whose password will be reset. */
  user:        ProfileRow;
  accessToken: string;
  /** Called (before close) when the password was successfully reset. */
  onSuccess:   () => void;
  /** Called when the modal is closed (including after success). */
  onClose:     () => void;
}

const MIN_PASSWORD_LENGTH = 12;

const BACKDROP_STYLE: React.CSSProperties = {
  position:       'fixed',
  inset:          0,
  zIndex:         3000,
  background:     'rgba(0, 0, 0, 0.55)',
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  padding:        '16px',
};

/**
 * Modal for admin-initiated password reset.
 *
 * Two modes:
 *   generate — server creates a secure random password
 *   manual   — admin sets an explicit password (≥ 12 chars)
 *
 * Success view displays the temporary password once, with a copy button.
 * Sensitive state (password fields) is cleared on close.
 */
export default function ResetPasswordModal({ user, accessToken, onSuccess, onClose }: Props) {
  const [mode,            setMode]            = useState<ResetMode>('generate');
  const [password,        setPassword]        = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error,           setError]           = useState<string | null>(null);
  const [submitting,      setSubmitting]      = useState(false);
  const [success,         setSuccess]         = useState<SuccessData | null>(null);
  const [copied,          setCopied]          = useState(false);

  const displayName =
    user.display_name ??
    (user.is_local_account ? user.username : null) ??
    user.email;

  function handleModeChange(next: ResetMode) {
    setMode(next);
    setError(null);
    setPassword('');
    setPasswordConfirm('');
  }

  function handleClose() {
    // Clear sensitive data before notifying parent
    setPassword('');
    setPasswordConfirm('');
    setSuccess(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'manual') {
      if (!password) {
        setError('Passwort ist erforderlich.');
        return;
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`);
        return;
      }
      if (password !== passwordConfirm) {
        setError('Passwörter stimmen nicht überein.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const body: Record<string, string> = { mode };
      if (mode === 'manual') body.password = password;

      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json() as {
        temporaryPassword?: string;
        loginIdentifier?:   string;
        error?:             string;
      };

      if (!res.ok) {
        setError(data?.error ?? 'Passwort konnte nicht zurückgesetzt werden.');
        setSubmitting(false);
        return;
      }

      // Clear password fields before showing success view
      setPassword('');
      setPasswordConfirm('');
      setSuccess({
        loginIdentifier:   data.loginIdentifier   ?? '',
        temporaryPassword: data.temporaryPassword ?? '',
      });
      onSuccess();
    } catch {
      setError('Verbindungsfehler — bitte erneut versuchen.');
      setSubmitting(false);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — silently ignore
    }
  }

  // ── Success view ─────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={BACKDROP_STYLE} role="dialog" aria-modal aria-label="Passwort zurückgesetzt">
        <div
          className="login-card"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '420px', width: '100%' }}
        >
          <div className="login-head">
            <h2 className="login-title">Passwort zurückgesetzt</h2>
            <button
              type="button"
              className="btn"
              onClick={handleClose}
              aria-label="Schließen"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 4 L12 12 M12 4 L4 12" />
              </svg>
            </button>
          </div>

          <div style={{ padding: '0 0 4px' }}>
            <p style={{ fontSize: '0.875rem', marginBottom: '16px', color: 'var(--color-muted, #555)' }}>
              Das Passwort für <strong>{displayName}</strong> wurde zurückgesetzt.
            </p>

            {/* Login identifier */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-muted, #888)', marginBottom: '4px' }}>
                Login (Benutzerkennung oder E-Mail)
              </div>
              <div style={{
                fontFamily: 'monospace',
                padding: '6px 10px',
                background: 'var(--color-surface-alt, #f5f5f5)',
                borderRadius: '4px',
                fontSize: '0.875rem',
                wordBreak: 'break-all',
              }}>
                {success.loginIdentifier}
              </div>
            </div>

            {/* Temporary password */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-muted, #888)', marginBottom: '4px' }}>
                Temporäres Passwort
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                <div style={{
                  fontFamily: 'monospace',
                  flex: 1,
                  padding: '6px 10px',
                  background: 'var(--color-surface-alt, #f5f5f5)',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  wordBreak: 'break-all',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  {success.temporaryPassword}
                </div>
                <button
                  type="button"
                  className="btn compact"
                  onClick={() => copyToClipboard(success.temporaryPassword)}
                  title={copied ? 'Kopiert!' : 'In Zwischenablage kopieren'}
                  style={{ flexShrink: 0 }}
                >
                  {copied ? (
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M2 8 L6 12 L14 4" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <rect x="5" y="5" width="8" height="9" rx="1" />
                      <path d="M3 11 V3 A1 1 0 0 1 4 2 H11" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <p style={{
              fontSize:     '0.78rem',
              color:        'var(--color-warning, #b45309)',
              fontWeight:   600,
              marginBottom: '8px',
            }}>
              ⚠ Dieses Passwort wird nur einmal angezeigt. Jetzt notieren oder kopieren.
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-muted, #888)', marginBottom: '20px' }}>
              Der Nutzer wird beim nächsten Login zur Passwortänderung aufgefordert.
            </p>

            <button
              className="btn primary"
              type="button"
              onClick={handleClose}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form view ─────────────────────────────────────────────────────────────────
  return (
    <div style={BACKDROP_STYLE} role="dialog" aria-modal aria-label="Passwort zurücksetzen">
      <div
        className="login-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px', width: '100%' }}
      >
        <div className="login-head">
          <h2 className="login-title">Passwort zurücksetzen</h2>
          <button
            type="button"
            className="btn"
            onClick={handleClose}
            disabled={submitting}
            aria-label="Abbrechen"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 4 L12 12 M12 4 L4 12" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '0 0 4px' }}>
          <p style={{ fontSize: '0.875rem', marginBottom: '16px', color: 'var(--color-muted, #555)' }}>
            Passwort zurücksetzen für <strong>{displayName}</strong>
          </p>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Mode selector */}
            <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="resetMode"
                  value="generate"
                  checked={mode === 'generate'}
                  onChange={() => handleModeChange('generate')}
                  disabled={submitting}
                />
                <span style={{ fontSize: '0.875rem' }}>Passwort automatisch generieren</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="resetMode"
                  value="manual"
                  checked={mode === 'manual'}
                  onChange={() => handleModeChange('manual')}
                  disabled={submitting}
                />
                <span style={{ fontSize: '0.875rem' }}>Passwort manuell festlegen</span>
              </label>
            </div>

            {/* Manual password fields */}
            {mode === 'manual' && (
              <>
                <label className="login-label">
                  <span>Neues Passwort</span>
                  <input
                    className="login-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                    required
                    disabled={submitting}
                    placeholder={`Mind. ${MIN_PASSWORD_LENGTH} Zeichen`}
                  />
                </label>
                <label className="login-label">
                  <span>Passwort wiederholen</span>
                  <input
                    className="login-input"
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                    disabled={submitting}
                  />
                </label>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-muted, #888)', margin: '-4px 0 0' }}>
                  Mindestens {MIN_PASSWORD_LENGTH} Zeichen.
                </p>
              </>
            )}

            {error && (
              <p className="login-error" role="alert">{error}</p>
            )}

            <button
              className="btn primary"
              type="submit"
              disabled={submitting}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {submitting ? 'Wird zurückgesetzt …' : 'Passwort zurücksetzen'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
