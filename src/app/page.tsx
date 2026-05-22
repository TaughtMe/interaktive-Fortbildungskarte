'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { School, SchoolTypKey, MarkerStyle, Theme, DetailState, SchoolFortbildungen } from '@/types';
import type { Role } from '@/types/auth';
import { DEMO_USERS } from '@/types/auth';
import { SCHULEN, SCHULTYPEN, FORTBILDUNGEN_DEFAULT } from '@/data/schools';
import Sidebar from '@/components/sidebar/Sidebar';
import SchoolDetail from '@/components/detail/SchoolDetail';
import CompareModal from '@/components/compare/CompareModal';
import DemoRoleSwitcher from '@/components/auth/DemoRoleSwitcher';
import SchoolDashboard from '@/components/dashboard/SchoolDashboard';
import CoordinatorDashboard from '@/components/dashboard/CoordinatorDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import LeadershipDashboard from '@/components/dashboard/LeadershipDashboard';

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false });

// ── Viewport detection ────────────────────────────────────────────────────────

type Viewport = 'mobile' | 'tablet' | 'desktop';

function detectVp(): Viewport {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1100) return 'tablet';
  return 'desktop';
}

function useViewport(): Viewport {
  const [vp, setVp] = useState<Viewport>('desktop');
  useEffect(() => {
    setVp(detectVp());
    function onResize() { setVp(detectVp()); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return vp;
}

// ── Tab definitions ───────────────────────────────────────────────────────────

type Tab = 'liste' | 'karte' | 'me' | 'inbox' | 'admin' | 'overview';

const ALL_TABS = [
  { key: 'liste'    as Tab, label: 'Schulen',    d: 'M5 4 H14 M5 8 H14 M5 12 H14 M2 4 H2.5 M2 8 H2.5 M2 12 H2.5' },
  { key: 'karte'    as Tab, label: 'Karte',      d: 'M2 4 L6 2 L10 4 L14 2 V12 L10 14 L6 12 L2 14 Z M6 2 V12 M10 4 V14' },
  { key: 'me'       as Tab, label: 'Meine Schule', d: 'M8 2 L14 6 V14 H10 V10 H6 V14 H2 V6 Z' },
  { key: 'inbox'    as Tab, label: 'Koordination', d: 'M2 4 H14 V12 H2 Z M2 4 L8 9 L14 4' },
  { key: 'admin'    as Tab, label: 'Verwaltung',   d: 'M3 4 H13 M3 8 H13 M3 12 H8' },
  { key: 'overview' as Tab, label: 'Überblick',    d: 'M2 12 L5 8 L8 10 L11 5 L14 7 M2 14 H14' },
];

function getTabsForRole(role: Role) {
  const base = ['liste', 'karte'] as Tab[];
  const extras: Record<Role, Tab[]> = {
    public:      [],
    school:      ['me'],
    coordinator: ['inbox'],
    admin:       ['admin'],
    leadership:  ['overview'],
  };
  return ALL_TABS.filter((t) => [...base, ...extras[role]].includes(t.key));
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function Home() {
  const vp = useViewport();

  const [theme, setTheme] = useState<Theme>('light');
  const [markerStyle, setMarkerStyle] = useState<MarkerStyle>('pin');
  const [role, setRole] = useState<Role>('public');
  const [tab, setTab] = useState<Tab>('liste');

  const [query, setQuery] = useState('');
  const [typFilter, setTypFilter] = useState<SchoolTypKey | null>(null);
  const [selected, setSelected] = useState<School | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [fortbildungen, setFortbildungen] = useState<Record<string, SchoolFortbildungen>>(() => {
    const map: Record<string, SchoolFortbildungen> = {};
    SCHULEN.forEach((s, i) => {
      if (i % 3 === 0) map[s.id] = JSON.parse(JSON.stringify(FORTBILDUNGEN_DEFAULT));
      else if (i % 5 === 0) map[s.id] = { laufend: [FORTBILDUNGEN_DEFAULT.laufend[0]], bedarf: [] };
      else map[s.id] = { laufend: [], bedarf: [] };
    });
    return map;
  });

  // Apply theme to <html>
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  // When role changes, ensure current tab is still valid for the new role
  useEffect(() => {
    const available = getTabsForRole(role).map((t) => t.key);
    if (!available.includes(tab)) setTab('liste');
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SCHULEN.filter((s) => {
      if (typFilter && s.typ !== typFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.ort.toLowerCase().includes(q) ||
        s.leitung.toLowerCase().includes(q)
      );
    });
  }, [query, typFilter]);

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) {
        showToast('Max. 2 Schulen vergleichbar – erste wird ersetzt');
        return [prev[1], id];
      }
      return [...prev, id];
    });
  }

  // Use refs so the stable selectSchool callback always sees current vp/tab.
  const vpRef = useRef(vp);
  const tabRef = useRef(tab);
  useEffect(() => { vpRef.current = vp; }, [vp]);
  useEffect(() => { tabRef.current = tab; }, [tab]);

  const selectSchool = useCallback((s: School | null) => {
    setSelected(s);
    if (s && vpRef.current === 'mobile' && tabRef.current === 'liste') setTab('karte');
  }, []);

  function popupAction(
    action: 'close' | 'detail',
    school?: School,
    origin?: { x: number; y: number },
  ) {
    if (action === 'close') setSelected(null);
    if (action === 'detail' && school) setDetail({ school, origin: origin ?? null });
  }

  function updateFortbildungen(id: string, data: SchoolFortbildungen) {
    setFortbildungen((prev) => ({ ...prev, [id]: data }));
  }

  const compareSchools = compareIds
    .map((id) => SCHULEN.find((s) => s.id === id))
    .filter((s): s is School => Boolean(s));

  const visibleTabs = getTabsForRole(role);
  const isDashboardTab = !['liste', 'karte'].includes(tab);
  const showList = !isDashboardTab && (tab === 'liste' || (vp !== 'mobile' && tab === 'karte'));
  const showMap  = !isDashboardTab && (tab === 'karte' || (vp !== 'mobile' && tab === 'liste'));

  const demoUser = DEMO_USERS[role];
  const mySchool = demoUser.schoolId ? SCHULEN.find((s) => s.id === demoUser.schoolId) : null;
  const myFortbildungen = mySchool ? (fortbildungen[mySchool.id] ?? { laufend: [], bedarf: [] }) : null;

  return (
    <>
      <div className="shell">
        {/* ── Top bar ── */}
        <header className="shell-top">
          <div className="shell-brand">
            <div className="brand">
              <div className="brand-mark">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M2 6 L8 3 L14 6 L8 9 Z" strokeLinejoin="round" />
                  <path d="M5 7.5 V11 C 5 11.6, 6.5 12.5, 8 12.5 S 11 11.6, 11 11 V 7.5" strokeLinejoin="round" />
                </svg>
              </div>
              {vp === 'mobile' ? (
                <div className="brand-text">
                  <div className="t1">Schulamt</div>
                  <div className="t2">MM · MN</div>
                </div>
              ) : (
                <div className="brand-text">
                  <div className="t1">Schulamt Memmingen — Mindelheim</div>
                  <div className="t2">SCHULVERZEICHNIS · UNTERALLGÄU</div>
                </div>
              )}
            </div>
          </div>

          {vp !== 'mobile' && (
            <nav className="shell-tabs">
              {visibleTabs.map((t) => (
                <button
                  key={t.key}
                  className={`shell-tab ${tab === t.key ? 'on' : ''}`}
                  onClick={() => setTab(t.key)}
                >
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={t.d} />
                  </svg>
                  <span>{t.label}</span>
                </button>
              ))}
            </nav>
          )}

          <div className="shell-actions">
            {compareSchools.length > 0 && (
              <button className="btn primary compact" onClick={() => setShowCompare(true)}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M3 4 H7 V13 H3 Z M9 4 H13 V13 H9 Z" />
                </svg>
                {vp === 'mobile' ? compareSchools.length : `Vergleichen (${compareSchools.length})`}
              </button>
            )}

            {/* Theme toggle */}
            <button
              className="btn"
              title={theme === 'light' ? 'Dunkel-Modus' : 'Hell-Modus'}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <circle cx="8" cy="8" r="3" />
                  <path d="M8 1 V2.5 M8 13.5 V15 M1 8 H2.5 M13.5 8 H15 M3.2 3.2 L4.2 4.2 M11.8 11.8 L12.8 12.8 M3.2 12.8 L4.2 11.8 M11.8 4.2 L12.8 3.2" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M12 8.5 C 12 11.5, 9.8 14, 7 14 C 4 14, 2 11.8, 2 8.8 C 2 6, 3.8 3.5, 6.5 2.8 C 5.8 4, 5.8 5.5, 6.5 6.8 C 7.5 8.5, 9.5 9.5, 12 8.5 Z" />
                </svg>
              )}
            </button>

            {/* Marker style */}
            <select
              className="btn"
              value={markerStyle}
              onChange={(e) => setMarkerStyle(e.target.value as MarkerStyle)}
              title="Marker-Stil"
            >
              <option value="pin">Pin</option>
              <option value="dot">Punkt</option>
              <option value="icon">Icon</option>
            </select>
          </div>
        </header>

        {/* ── Demo role switcher ── */}
        <DemoRoleSwitcher role={role} onChange={setRole} />

        {/* ── Main content ── */}
        <main className="shell-main">
          {isDashboardTab ? (
            <div className="dashboard-wrap">
              {tab === 'me' && mySchool && myFortbildungen && (
                <SchoolDashboard school={mySchool} fortbildungen={myFortbildungen} />
              )}
              {tab === 'inbox' && (
                <CoordinatorDashboard schools={SCHULEN} fortbildungen={fortbildungen} />
              )}
              {tab === 'admin' && (
                <AdminDashboard schools={SCHULEN} />
              )}
              {tab === 'overview' && (
                <LeadershipDashboard schools={SCHULEN} fortbildungen={fortbildungen} />
              )}
            </div>
          ) : (
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
                  onSelect={selectSchool}
                  popup={selected}
                  onPopupAction={popupAction}
                  markerStyle={markerStyle}
                  compareIds={compareIds}
                  onCompareToggle={toggleCompare}
                  theme={theme}
                />
              )}
            </div>
          )}
        </main>

        {/* ── Mobile bottom nav ── */}
        {vp === 'mobile' && (
          <nav className="shell-bottom" role="tablist">
            {visibleTabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                className={`bnav-item ${tab === t.key ? 'on' : ''}`}
                onClick={() => setTab(t.key)}
              >
                <span className="bnav-icon">
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={t.d} />
                  </svg>
                </span>
                <span className="bnav-label">{t.label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* ── Compare bar (floating, below map) ── */}
      {compareSchools.length > 0 && !showCompare && (
        <div className="compare-bar">
          <span>Vergleich:</span>
          {compareSchools.map((s) => {
            const tp = SCHULTYPEN[s.typ];
            return (
              <span key={s.id} className="pill">
                <span className="b" style={{ background: tp.color }}>{tp.short}</span>
                {s.ort}
                <button className="x" onClick={() => toggleCompare(s.id)} aria-label="Entfernen">
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    width="10"
                    height="10"
                  >
                    <path d="M4 4 L12 12 M12 4 L4 12" strokeLinecap="round" />
                  </svg>
                </button>
              </span>
            );
          })}
          <button
            className="btn primary compact"
            onClick={() => setShowCompare(true)}
            disabled={compareSchools.length < 2}
          >
            Öffnen
          </button>
        </div>
      )}

      {/* ── Detail modal ── */}
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

      {/* ── Compare modal ── */}
      {showCompare && (
        <CompareModal
          schools={compareSchools}
          onClose={() => setShowCompare(false)}
          onRemove={toggleCompare}
          fortbildungen={fortbildungen}
        />
      )}

      {/* ── Toast ── */}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
