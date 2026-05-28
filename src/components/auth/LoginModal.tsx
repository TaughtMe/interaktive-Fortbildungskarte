'use client';
import { useState } from 'react';

interface Props {
  onLogin: (email: string, password: string) => Promise<{ error: string | null }>;
  onClose: () => void;
}

export default function LoginModal({ onLogin, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await onLogin(email.trim(), password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
  }

  return (
    <div className="login-backdrop" onClick={onClose} role="dialog" aria-modal aria-label="Anmelden">
      <div className="login-card" onClick={(e) => e.stopPropagation()}>
        <div className="login-head">
          <h2 className="login-title">Anmelden</h2>
          <button
            className="btn icon"
            onClick={onClose}
            aria-label="Schließen"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 4 L12 12 M12 4 L4 12" />
            </svg>
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label className="login-label">
            <span>E-Mail</span>
            <input
              className="login-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
              disabled={submitting}
            />
          </label>

          <label className="login-label">
            <span>Passwort</span>
            <input
              className="login-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={submitting}
            />
          </label>

          {error && (
            <p className="login-error" role="alert">{error}</p>
          )}

          <button
            className="btn primary"
            type="submit"
            disabled={submitting}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {submitting ? 'Wird eingeloggt …' : 'Einloggen'}
          </button>
        </form>
      </div>
    </div>
  );
}
