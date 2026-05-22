// ============================================================
//  Shell: Mobile-First-Navigation
//  Tabs auf Mobile = Bottom-Nav, auf Desktop = inline im Header
//  Tabs hängen von der Rolle ab.
// ============================================================

function getTabsForRole(role) {
  // base tabs: Liste + Karte
  const base = [
    { key: 'liste', label: 'Schulen',  icon: 'list' },
    { key: 'karte', label: 'Karte',    icon: 'map'  },
  ];
  if (role === 'public') {
    return [...base, { key: 'login', label: 'Anmelden', icon: 'user' }];
  }
  if (role === 'schule') {
    return [...base, { key: 'me', label: 'Mein Konto', icon: 'user' }];
  }
  if (role === 'koordinator') {
    return [
      ...base,
      { key: 'inbox', label: 'Posteingang', icon: 'inbox', badge: 'unread' },
      { key: 'me',    label: 'Konto',       icon: 'user' },
    ];
  }
  if (role === 'admin') {
    return [
      ...base,
      { key: 'admin', label: 'Verwalten', icon: 'gear' },
      { key: 'me',    label: 'Konto',     icon: 'user' },
    ];
  }
  if (role === 'leitung') {
    return [
      ...base,
      { key: 'overview', label: 'Übersicht', icon: 'chart' },
      { key: 'me',       label: 'Konto',     icon: 'user' },
    ];
  }
  return base;
}

function TabIcon({ name }) {
  const props = { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'list':  return <svg {...props}><path d="M5 4 H14 M5 8 H14 M5 12 H14 M2 4 H2.5 M2 8 H2.5 M2 12 H2.5" /></svg>;
    case 'map':   return <svg {...props}><path d="M2 4 L6 2 L10 4 L14 2 V12 L10 14 L6 12 L2 14 Z M6 2 V12 M10 4 V14" /></svg>;
    case 'user':  return <svg {...props}><circle cx="8" cy="6" r="3" /><path d="M3 14 C 3 11, 5 9.5, 8 9.5 S 13 11, 13 14" /></svg>;
    case 'inbox': return <svg {...props}><path d="M2 9 V13 H14 V9 M2 9 L4 4 H12 L14 9 M2 9 H6 L7 11 H9 L10 9 H14" /></svg>;
    case 'gear':  return <svg {...props}><circle cx="8" cy="8" r="2.2" /><path d="M8 1.5 V3.5 M8 12.5 V14.5 M1.5 8 H3.5 M12.5 8 H14.5 M3.3 3.3 L4.7 4.7 M11.3 11.3 L12.7 12.7 M3.3 12.7 L4.7 11.3 M11.3 4.7 L12.7 3.3" /></svg>;
    case 'chart': return <svg {...props}><path d="M2 14 H14 M4 14 V8 M7 14 V5 M10 14 V10 M13 14 V3" /></svg>;
    default:      return null;
  }
}

function Shell({
  tab, onTab, viewport, children,
  brand, headerActions, unreadCount,
}) {
  const { user } = useAuth();
  const tabs = getTabsForRole(user.role);

  // Wenn aktiver Tab nicht mehr in der Rolle existiert -> auf Liste
  React.useEffect(() => {
    if (!tabs.find((t) => t.key === tab)) onTab('liste');
  }, [user.role]); // eslint-disable-line

  return (
    <div className="shell">
      <header className="shell-top">
        <div className="shell-brand">{brand}</div>
        {viewport !== 'mobile' && (
          <nav className="shell-tabs">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`shell-tab ${tab === t.key ? 'on' : ''}`}
                onClick={() => onTab(t.key)}
              >
                <TabIcon name={t.icon} />
                <span>{t.label}</span>
                {t.badge === 'unread' && unreadCount > 0 && (
                  <span className="tab-badge">{unreadCount}</span>
                )}
              </button>
            ))}
          </nav>
        )}
        <div className="shell-actions">{headerActions}</div>
      </header>

      <main className="shell-main">{children}</main>

      {viewport === 'mobile' && (
        <nav className="shell-bottom" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`bnav-item ${tab === t.key ? 'on' : ''}`}
              onClick={() => onTab(t.key)}
            >
              <span className="bnav-icon">
                <TabIcon name={t.icon} />
                {t.badge === 'unread' && unreadCount > 0 && (
                  <span className="bnav-dot">{unreadCount}</span>
                )}
              </span>
              <span className="bnav-label">{t.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

// ============================================================
//  useViewport — 'mobile' | 'tablet' | 'desktop'
// ============================================================
function useViewport() {
  const [vp, setVp] = React.useState(() => detectVp());
  React.useEffect(() => {
    function onResize() { setVp(detectVp()); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return vp;
}
function detectVp() {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1100) return 'tablet';
  return 'desktop';
}

Object.assign(window, { Shell, useViewport, getTabsForRole });
