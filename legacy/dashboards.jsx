// ============================================================
//  Stub-Dashboards für jede Rolle
//  Etappe 1: Gerüst + "kommt in Etappe X"-Hinweise. Inhalte werden
//  in den folgenden Etappen aufgefüllt.
// ============================================================

function EtappeBanner({ etappe, children }) {
  return (
    <div className="etappe-banner">
      <div className="eb-pill">Etappe {etappe}</div>
      <div className="eb-text">{children}</div>
    </div>
  );
}

function DashHeader({ title, subtitle, accent = 'var(--accent)' }) {
  return (
    <div className="dash-head">
      <div className="dash-accent" style={{ background: accent }} />
      <div>
        <div className="dash-title">{title}</div>
        {subtitle && <div className="dash-sub">{subtitle}</div>}
      </div>
    </div>
  );
}

function StatTile({ value, label, accent }) {
  return (
    <div className="stat-tile">
      <div className="stat-val" style={{ color: accent || 'var(--ink)' }}>{value}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}

function PlaceholderCard({ icon, title, body, etappe }) {
  return (
    <div className="ph-card">
      <div className="ph-icon">{icon}</div>
      <div className="ph-body">
        <div className="ph-title">{title}</div>
        <div className="ph-text">{body}</div>
      </div>
      {etappe && <div className="ph-pill">Etappe {etappe}</div>}
    </div>
  );
}

// ----- Schule -----
function SchuleDashboard({ onOpenSchool }) {
  const { user } = useAuth();
  const school = (window.SCHULEN || []).find((s) => s.id === user.schoolId);
  if (!school) return <div className="dash"><DashHeader title="Schule" /></div>;
  const t = SCHULTYPEN[school.typ];

  return (
    <div className="dash">
      <DashHeader
        title={school.name}
        subtitle={`${t.label} · ${school.ort}`}
        accent={t.color}
      />
      <EtappeBanner etappe={2}>
        Hier folgt in Etappe 2 das vollständige Schul-Dashboard zum Eintragen
        und Pflegen von Bedarf und Fortbildungen.
      </EtappeBanner>

      <div className="stat-grid">
        <StatTile value="—" label="Aktive Fortbildungen" />
        <StatTile value="—" label="Gemeldeter Bedarf" />
        <StatTile value="—" label="Fortgebildete Lehrkräfte" />
      </div>

      <div className="ph-list">
        <PlaceholderCard
          icon="📍"
          title="Stammdaten"
          body="Adresse, Schulleitung, Kontaktdaten pflegen."
          etappe={2}
        />
        <PlaceholderCard
          icon="📚"
          title="Eigene Fortbildungen"
          body="Laufende & abgeschlossene Maßnahmen erfassen und nachweisen."
          etappe={2}
        />
        <PlaceholderCard
          icon="🎯"
          title="Bedarf melden"
          body="Was wird gebraucht? Thema + Priorität an den Koordinator senden."
          etappe={2}
        />
        <PlaceholderCard
          icon="🔔"
          title="Vorschläge"
          body="„Sammel-Fortbildung am 12.3., passt zu Ihrem Bedarf“."
          etappe={3}
        />
      </div>

      <div className="dash-actions">
        <button className="btn" onClick={() => onOpenSchool(school)}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14"><path d="M2 6 L8 3 L14 6 L8 9 Z" strokeLinejoin="round" /><path d="M5 7.5 V11 C 5 11.6, 6.5 12.5, 8 12.5 S 11 11.6, 11 11 V 7.5" /></svg>
          Aktuelle Detailansicht öffnen
        </button>
      </div>
    </div>
  );
}

// ----- Koordinator -----
function KoordinatorDashboard() {
  return (
    <div className="dash">
      <DashHeader
        title="Fortbildungs-Koordination"
        subtitle="Schulamtsbezirk Memmingen-Mindelheim"
        accent="var(--type-m)"
      />
      <EtappeBanner etappe={3}>
        Posteingang, KI-Cluster, Bedarfs-Heatmap und Kalender geplanter Fortbildungen
        kommen in Etappe 3.
      </EtappeBanner>

      <div className="stat-grid">
        <StatTile value="0" label="Neue Bedarfe (ungelesen)" accent="var(--type-m)" />
        <StatTile value="—" label="Offene Cluster" />
        <StatTile value="—" label="Geplante Sammel-FB" />
      </div>

      <div className="ph-list">
        <PlaceholderCard
          icon="📥"
          title="Posteingang"
          body="Alle neuen Bedarfsmeldungen, mit ungelesen/gelesen-Status."
          etappe={3}
        />
        <PlaceholderCard
          icon="🧩"
          title="KI-Cluster"
          body="„Diese 5 Schulen haben ähnlichen Bedarf – Sammel-FB sinnvoll.“"
          etappe={5}
        />
        <PlaceholderCard
          icon="🔥"
          title="Bedarfs-Heatmap"
          body="Karte zeigt, wo welche Themen besonders häufig gemeldet sind."
          etappe={3}
        />
        <PlaceholderCard
          icon="📅"
          title="Kalender"
          body="Geplante und durchgeführte Fortbildungen im Überblick."
          etappe={3}
        />
      </div>
    </div>
  );
}

// ----- Admin -----
function AdminDashboard() {
  return (
    <div className="dash">
      <DashHeader
        title="Verwaltung"
        subtitle="Stammdaten · Schulen · Nutzer"
        accent="var(--type-gm)"
      />
      <EtappeBanner etappe={4}>
        Schulen anlegen/bearbeiten und Daten-Exporte folgen in Etappe 4.
      </EtappeBanner>

      <div className="stat-grid">
        <StatTile value={String((window.SCHULEN || []).length)} label="Schulen im System" accent="var(--type-gm)" />
        <StatTile value="—" label="Aktive Schul-Accounts" />
        <StatTile value="—" label="Letzte Änderung" />
      </div>

      <div className="ph-list">
        <PlaceholderCard
          icon="🏫"
          title="Schulen verwalten"
          body="Neue Schulen anlegen, Stammdaten ändern, deaktivieren."
          etappe={4}
        />
        <PlaceholderCard
          icon="📤"
          title="Exporte"
          body="Markdown · CSV · PDF — pro Schule, gesamt oder als Statistik."
          etappe={4}
        />
        <PlaceholderCard
          icon="🤖"
          title="KI-Anbindung"
          body="OpenAI / Claude / Ollama konfigurieren (Endpoint + Schlüssel)."
          etappe={5}
        />
      </div>
    </div>
  );
}

// ----- Schulamtsleitung -----
function LeitungDashboard() {
  return (
    <div className="dash">
      <DashHeader
        title="Schulamtsleitung"
        subtitle="Read-only-Übersicht"
        accent="#c2410c"
      />
      <EtappeBanner etappe={3}>
        Aggregierte Statistik &amp; Heatmap kommen in Etappe 3.
      </EtappeBanner>

      <div className="stat-grid">
        <StatTile value={String((window.SCHULEN || []).length)} label="Schulen" />
        <StatTile value="—" label="Top-Bedarfsthema" />
        <StatTile value="—" label="Fortbildungen / Quartal" />
      </div>

      <div className="ph-list">
        <PlaceholderCard
          icon="📊"
          title="Kennzahlen"
          body="Auslastung, Fortbildungsdichte je Schulart und Region."
          etappe={3}
        />
        <PlaceholderCard
          icon="🗺️"
          title="Bedarfs-Heatmap"
          body="Wo brennt's am stärksten — gefiltert nach Schulart und Thema."
          etappe={3}
        />
      </div>
    </div>
  );
}

// ----- Konto (Public sieht Anmelde-CTA) -----
function KontoView({ onOpenLogin }) {
  const { user, logout } = useAuth();
  if (user.role === 'public') {
    return (
      <div className="dash konto-cta">
        <DashHeader title="Mein Konto" subtitle="Nicht angemeldet" />
        <div className="cta-card">
          <div className="cta-title">Mit Schul-ID anmelden</div>
          <div className="cta-text">
            Als Schule können Sie Ihre Stammdaten pflegen, Bedarf melden und
            Fortbildungen nachweisen. Koordinatoren erhalten einen eigenen Bereich.
          </div>
          <button className="btn primary" onClick={onOpenLogin}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14"><path d="M3 8 H13 M9 4 L13 8 L9 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Anmelden
          </button>
        </div>
      </div>
    );
  }
  const r = ROLES[user.role];
  return (
    <div className="dash">
      <DashHeader title="Mein Konto" subtitle={user.name} accent={r.color} />
      <div className="kv-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="kv"><div className="k">Rolle</div><div className="v">{r.label}{user.demo ? ' (Demo)' : ''}</div></div>
        <div className="kv"><div className="k">Name</div><div className="v">{user.name}</div></div>
        {user.schoolId && <div className="kv"><div className="k">Schul-ID</div><div className="v">{user.schoolId}</div></div>}
      </div>
      <div className="dash-actions">
        <button className="btn" onClick={logout}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14"><path d="M10 4 V3 H3 V13 H10 V12 M6 8 H14 M11 5 L14 8 L11 11" /></svg>
          Abmelden
        </button>
      </div>
    </div>
  );
}

Object.assign(window, {
  SchuleDashboard, KoordinatorDashboard, AdminDashboard, LeitungDashboard,
  KontoView, EtappeBanner, DashHeader, StatTile, PlaceholderCard,
});
