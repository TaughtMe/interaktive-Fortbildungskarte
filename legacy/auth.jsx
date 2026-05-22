// ============================================================
//  Auth + Rollen
//  Mock-Backend: Schul-ID/Passwort wird gegen SCHULEN.id geprüft.
//  Passwort-Konvention: schulkennung == id (Demo). Koordinator/Admin/
//  Leitung haben feste Demo-Accounts.
// ============================================================

const ROLES = {
  public:       { key: 'public',       label: 'Öffentlich',          short: 'Ö',  color: 'var(--ink-3)' },
  schule:       { key: 'schule',       label: 'Schule',              short: 'S',  color: 'var(--type-g)' },
  koordinator:  { key: 'koordinator',  label: 'Fortbildungs-Koord.', short: 'K',  color: 'var(--type-m)' },
  admin:        { key: 'admin',        label: 'Admin',               short: 'A',  color: 'var(--type-gm)' },
  leitung:      { key: 'leitung',      label: 'Schulamtsleitung',    short: 'L',  color: '#c2410c' },
};

const DEMO_ACCOUNTS = {
  // username : { password, role, name, schoolId? }
  'koordinator': { password: 'demo', role: 'koordinator', name: 'F. Koordinator' },
  'admin':       { password: 'demo', role: 'admin',       name: 'A. Verwalter' },
  'leitung':     { password: 'demo', role: 'leitung',     name: 'Schulamtsleitung' },
};

const AuthContext = React.createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = React.useState(() => {
    try {
      const raw = localStorage.getItem('skm-auth');
      return raw ? JSON.parse(raw) : { role: 'public' };
    } catch { return { role: 'public' }; }
  });

  React.useEffect(() => {
    try { localStorage.setItem('skm-auth', JSON.stringify(user)); } catch {}
  }, [user]);

  function login({ username, password }) {
    // 1) Schul-Account?
    const school = (window.SCHULEN || []).find((s) => s.id === username);
    if (school && password === school.id) {
      setUser({ role: 'schule', schoolId: school.id, name: school.name });
      return { ok: true };
    }
    // 2) System-Account?
    const acc = DEMO_ACCOUNTS[username];
    if (acc && acc.password === password) {
      setUser({ role: acc.role, name: acc.name });
      return { ok: true };
    }
    return { ok: false, error: 'Schul-ID oder Passwort falsch.' };
  }

  function logout() { setUser({ role: 'public' }); }

  // Demo: ohne Login Rolle wechseln, damit man die Etappen testen kann
  function switchRoleDemo(role, schoolId) {
    if (role === 'public') { setUser({ role: 'public' }); return; }
    if (role === 'schule') {
      const s = (window.SCHULEN || []).find((x) => x.id === schoolId) || window.SCHULEN[0];
      setUser({ role: 'schule', schoolId: s.id, name: s.name, demo: true });
      return;
    }
    const acc = Object.values(DEMO_ACCOUNTS).find((a) => a.role === role);
    setUser({ role, name: acc?.name || ROLES[role].label, demo: true });
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, switchRoleDemo }}>
      {children}
    </AuthContext.Provider>
  );
}
function useAuth() { return React.useContext(AuthContext); }

// ============================================================
//  Login-Screen
// ============================================================
function LoginScreen({ onClose }) {
  const { login } = useAuth();
  const [mode, setMode] = React.useState('schule'); // 'schule' | 'system'
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [err, setErr] = React.useState(null);
  const [showHint, setShowHint] = React.useState(false);

  function submit(e) {
    e.preventDefault();
    const res = login({ username: username.trim(), password });
    if (res.ok) onClose();
    else setErr(res.error);
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <button className="auth-close" onClick={onClose} aria-label="Schließen">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14">
            <path d="M4 4 L12 12 M12 4 L4 12" strokeLinecap="round" />
          </svg>
        </button>

        <div className="auth-brand">
          <div className="brand-mark">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M2 6 L8 3 L14 6 L8 9 Z" strokeLinejoin="round" />
              <path d="M5 7.5 V11 C 5 11.6, 6.5 12.5, 8 12.5 S 11 11.6, 11 11 V 7.5" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="auth-title">Anmelden</div>
            <div className="auth-sub">Staatliches Schulamt · Memmingen-Mindelheim</div>
          </div>
        </div>

        <div className="auth-tabs">
          <button className={mode === 'schule' ? 'on' : ''} onClick={() => { setMode('schule'); setErr(null); }}>
            Schule
          </button>
          <button className={mode === 'system' ? 'on' : ''} onClick={() => { setMode('system'); setErr(null); }}>
            Koordinator / Admin
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>{mode === 'schule' ? 'Schul-ID' : 'Benutzername'}</span>
            <input
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={mode === 'schule' ? 'z. B. mm-gs-bismarck' : 'z. B. koordinator'}
            />
          </label>
          <label>
            <span>Passwort</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {err && <div className="auth-err">{err}</div>}

          <button type="submit" className="btn primary auth-submit">
            Anmelden
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14"><path d="M3 8 H13 M9 4 L13 8 L9 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>

          <button type="button" className="auth-hint" onClick={() => setShowHint((v) => !v)}>
            {showHint ? 'Demo-Zugänge ausblenden' : 'Demo-Zugänge anzeigen'}
          </button>

          {showHint && (
            <div className="auth-demo-hints">
              {mode === 'schule' ? (
                <>
                  <div>Schul-ID: <code>{(window.SCHULEN?.[0]?.id) || 'bb-gs'}</code></div>
                  <div>Passwort: <code>{(window.SCHULEN?.[0]?.id) || 'bb-gs'}</code> (= ID)</div>
                  <div className="mt">Jede Schul-ID funktioniert als eigenes Passwort (Demo).</div>
                </>
              ) : (
                <>
                  <div>Koordinator: <code>koordinator</code> / <code>demo</code></div>
                  <div>Admin: <code>admin</code> / <code>demo</code></div>
                  <div>Leitung: <code>leitung</code> / <code>demo</code></div>
                </>
              )}
            </div>
          )}
        </form>

        <div className="auth-foot">
          Etappe 1 · Demo-Login (lokal, kein echter Server)
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  Rollen-Badge + Switcher (für Header)
// ============================================================
function RoleBadge({ onOpenLogin, onSwitchDemo }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const r = ROLES[user.role];

  React.useEffect(() => {
    function onDoc(e) { if (!ref.current?.contains(e.target)) setOpen(false); }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (user.role === 'public') {
    return (
      <button className="btn primary login-btn" onClick={onOpenLogin}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14">
          <path d="M3 8 H13 M9 4 L13 8 L9 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Anmelden
      </button>
    );
  }

  return (
    <div className="role-badge-wrap" ref={ref}>
      <button className="role-badge" onClick={() => setOpen((v) => !v)}>
        <span className="rb-avatar" style={{ background: r.color }}>{r.short}</span>
        <span className="rb-text">
          <span className="rb-name">{user.name}</span>
          <span className="rb-role">{r.label}{user.demo ? ' · Demo' : ''}</span>
        </span>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="12" height="12" className="rb-chev">
          <path d="M4 6 L8 10 L12 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="role-menu">
          <div className="rm-section">Eingeloggt als</div>
          <div className="rm-current">
            <span className="rb-avatar" style={{ background: r.color }}>{r.short}</span>
            <div>
              <div className="rm-name">{user.name}</div>
              <div className="rm-role">{r.label}</div>
            </div>
          </div>
          <div className="rm-sep" />
          <button className="rm-item" onClick={() => { setOpen(false); logout(); }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><path d="M10 4 V3 H3 V13 H10 V12 M6 8 H14 M11 5 L14 8 L11 11" strokeLinejoin="round" strokeLinecap="round" /></svg>
            Abmelden
          </button>
          <div className="rm-sep" />
          <div className="rm-section">Etappen-Demo · Rolle wechseln</div>
          {Object.values(ROLES).filter((x) => x.key !== 'public' && x.key !== user.role).map((rr) => (
            <button key={rr.key} className="rm-item" onClick={() => { setOpen(false); onSwitchDemo(rr.key); }}>
              <span className="rb-avatar sm" style={{ background: rr.color }}>{rr.short}</span>
              {rr.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { AuthProvider, useAuth, LoginScreen, RoleBadge, ROLES });
