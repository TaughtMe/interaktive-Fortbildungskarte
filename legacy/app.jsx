// Hauptkomponente: Interaktive Karte Schulamtsbezirk Memmingen-Mindelheim
// Etappe 1: Mobile-First-Shell + Auth + Rollen-Dashboards

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "markerStyle": "pin"
}/*EDITMODE-END*/;

function Brand({ compact }) {
  return (
    <div className="brand">
      <div className="brand-mark">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M2 6 L8 3 L14 6 L8 9 Z" strokeLinejoin="round" />
          <path d="M5 7.5 V11 C 5 11.6, 6.5 12.5, 8 12.5 S 11 11.6, 11 11 V 7.5" strokeLinejoin="round" />
        </svg>
      </div>
      {!compact && (
        <div className="brand-text">
          <div className="t1">Schulamt Memmingen — Mindelheim</div>
          <div className="t2">SCHULVERZEICHNIS · UNTERALLGÄU</div>
        </div>
      )}
      {compact && (
        <div className="brand-text">
          <div className="t1">Schulamt</div>
          <div className="t2">MM · MN</div>
        </div>
      )}
    </div>
  );
}

function AppInner() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const vp = useViewport();
  const { user, switchRoleDemo } = useAuth();

  // ----- Tab-State -----
  const [tab, setTab] = React.useState('liste');
  const [showLogin, setShowLogin] = React.useState(false);

  // ----- Schul-/Karten-State -----
  const [query, setQuery] = React.useState('');
  const [typFilter, setTypFilter] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const [hovered, setHovered] = React.useState(null);
  const [detail, setDetail] = React.useState(null);
  const [compareIds, setCompareIds] = React.useState([]);
  const [showCompare, setShowCompare] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  // Fortbildungen pro Schule
  const [fortbildungen, setFortbildungen] = React.useState(() => {
    const map = {};
    SCHULEN.forEach((s, i) => {
      if (i % 3 === 0) map[s.id] = JSON.parse(JSON.stringify(FORTBILDUNGEN_DEFAULT));
      else if (i % 5 === 0) map[s.id] = { laufend: [FORTBILDUNGEN_DEFAULT.laufend[0]], bedarf: [] };
      else map[s.id] = { laufend: [], bedarf: [] };
    });
    return map;
  });

  // ----- Theme -----
  React.useEffect(() => { document.documentElement.dataset.theme = t.theme; }, [t.theme]);

  // ----- Tab-Verhalten auf Mobile resetten, wenn Rolle wechselt -----
  React.useEffect(() => {
    if (user.role !== 'public' && tab === 'login') setTab('me');
  }, [user.role]); // eslint-disable-line

  // Wenn 'login' Tab auf Mobile gewählt -> Login-Sheet öffnen
  React.useEffect(() => {
    if (tab === 'login') setShowLogin(true);
  }, [tab]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  // ----- Filtern -----
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return SCHULEN.filter((s) => {
      if (typFilter && s.typ !== typFilter) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) ||
             s.ort.toLowerCase().includes(q) ||
             s.leitung.toLowerCase().includes(q);
    });
  }, [query, typFilter]);

  function toggleCompare(id) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) {
        showToast('Max. 2 Schulen vergleichbar – erste wird ersetzt');
        return [prev[1], id];
      }
      return [...prev, id];
    });
  }

  function selectSchool(s) {
    setSelected(s);
    // Auf Mobile: bei Auswahl aus Liste -> Karten-Tab anzeigen
    if (vp === 'mobile' && tab === 'liste') setTab('karte');
  }

  function popupAction(action, school, origin) {
    if (action === 'close') setSelected(null);
    if (action === 'detail' && school) setDetail({ school, origin: origin || null });
  }

  function updateFortbildungen(id, data) {
    setFortbildungen((prev) => ({ ...prev, [id]: data }));
  }

  const compareSchools = compareIds.map((id) => SCHULEN.find((s) => s.id === id)).filter(Boolean);

  // ----- Stats-Strip oben (kontextabhängig) -----
  const headerActions = (
    <React.Fragment>
      {compareSchools.length > 0 && (
        <button className="btn primary compact" onClick={() => setShowCompare(true)}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 4 H7 V13 H3 Z M9 4 H13 V13 H9 Z" /></svg>
          {vp === 'mobile' ? compareSchools.length : `Vergleichen (${compareSchools.length})`}
        </button>
      )}
      <RoleBadge
        onOpenLogin={() => setShowLogin(true)}
        onSwitchDemo={(role) => switchRoleDemo(role)}
      />
    </React.Fragment>
  );

  // ----- Inhalt je Tab -----
  function renderContent() {
    // Auf Desktop zeigen 'liste' und 'karte' beides (Liste+Karte). Auf Mobile getrennt.
    const showList = (tab === 'liste') || vp !== 'mobile' && tab === 'karte';
    const showMap  = (tab === 'karte') || vp !== 'mobile' && tab === 'liste';

    if (tab === 'liste' || tab === 'karte') {
      return (
        <div className={`workview vp-${vp} ${tab === 'karte' ? 'map-primary' : 'list-primary'}`}>
          {showList && (
            <Sidebar
              schulen={filtered}
              allSchulen={SCHULEN}
              query={query}
              onQuery={setQuery}
              typFilter={typFilter}
              onTypFilter={setTypFilter}
              selectedId={selected?.id}
              onSelect={selectSchool}
              compareIds={compareIds}
              onCompareToggle={toggleCompare}
            />
          )}
          {showMap && (
            <MapView
              schulen={filtered}
              selected={selected}
              hoveredId={hovered}
              onHover={setHovered}
              onSelect={(s) => setSelected(s)}
              popup={selected}
              onPopupAction={popupAction}
              markerStyle={t.markerStyle}
              compareIds={compareIds}
              onCompareToggle={toggleCompare}
              theme={t.theme}
            />
          )}
        </div>
      );
    }
    if (tab === 'me') {
      if (user.role === 'public') return <KontoView onOpenLogin={() => setShowLogin(true)} />;
      if (user.role === 'schule') return <SchuleDashboard onOpenSchool={(s) => setDetail({ school: s, origin: null })} />;
      return <KontoView onOpenLogin={() => setShowLogin(true)} />;
    }
    if (tab === 'inbox')    return <KoordinatorDashboard />;
    if (tab === 'admin')    return <AdminDashboard />;
    if (tab === 'overview') return <LeitungDashboard />;
    if (tab === 'login')    return <KontoView onOpenLogin={() => setShowLogin(true)} />;
    return null;
  }

  return (
    <React.Fragment>
      <Shell
        tab={tab}
        onTab={setTab}
        viewport={vp}
        brand={<Brand compact={vp === 'mobile'} />}
        headerActions={headerActions}
        unreadCount={0}
      >
        {renderContent()}
      </Shell>

      {/* Compare-Hinweis-Leiste */}
      {compareSchools.length > 0 && !showCompare && (tab === 'liste' || tab === 'karte') && (
        <div className="compare-bar">
          <span>Vergleich:</span>
          {compareSchools.map((s) => {
            const tp = SCHULTYPEN[s.typ];
            return (
              <span key={s.id} className="pill">
                <span className="b" style={{ background: tp.color }}>{tp.short}</span>
                {s.ort}
                <button className="x" onClick={() => toggleCompare(s.id)} aria-label="Entfernen">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="10" height="10"><path d="M4 4 L12 12 M12 4 L4 12" strokeLinecap="round" /></svg>
                </button>
              </span>
            );
          })}
          <button className="btn primary compact" onClick={() => setShowCompare(true)} disabled={compareSchools.length < 2}>
            Öffnen
          </button>
        </div>
      )}

      {/* Detail-Drawer */}
      {detail && (
        <SchoolDetail
          school={detail.school}
          origin={detail.origin}
          onClose={() => setDetail(null)}
          onCompareToggle={toggleCompare}
          compared={compareIds.includes(detail.school.id)}
          fortbildungen={fortbildungen}
          onUpdateFortbildungen={updateFortbildungen}
        />
      )}

      {/* Compare-Modal */}
      {showCompare && (
        <CompareModal
          schools={compareSchools}
          onClose={() => setShowCompare(false)}
          onRemove={toggleCompare}
          fortbildungen={fortbildungen}
        />
      )}

      {/* Login-Screen */}
      {showLogin && (
        <LoginScreen onClose={() => {
          setShowLogin(false);
          if (tab === 'login') setTab('liste');
        }} />
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* Tweaks */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Darstellung" />
        <TweakRadio
          label="Modus"
          value={t.theme}
          options={[{ value: 'light', label: 'Tag' }, { value: 'dark', label: 'Nacht' }]}
          onChange={(v) => setTweak('theme', v)}
        />
        <TweakSection label="Marker-Stil" />
        <TweakRadio
          label="Form"
          value={t.markerStyle}
          options={[{ value: 'pin', label: 'Pin' }, { value: 'dot', label: 'Punkt' }, { value: 'icon', label: 'Icon' }]}
          onChange={(v) => setTweak('markerStyle', v)}
        />
        <TweakSection label="Demo-Rolle (Etappen-Test)" />
        <TweakSelect
          label="Aktive Rolle"
          value={user.role}
          options={Object.values(ROLES).map((r) => ({ value: r.key, label: r.label }))}
          onChange={(v) => switchRoleDemo(v)}
        />
      </TweaksPanel>
    </React.Fragment>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
