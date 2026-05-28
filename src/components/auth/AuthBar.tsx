'use client';

interface Props {
  email: string | null;
  loading: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
}

export default function AuthBar({ email, loading, onLoginClick, onLogout }: Props) {
  if (loading) return null;

  if (email) {
    return (
      <div className="auth-bar">
        <span className="auth-email">{email}</span>
        <button className="btn compact" onClick={onLogout}>Abmelden</button>
      </div>
    );
  }

  return (
    <button className="btn primary compact" onClick={onLoginClick}>
      Anmelden
    </button>
  );
}
