// Sidebar: Suche + Filter + Schul-Liste

function Sidebar({
  schulen, allSchulen, query, onQuery, typFilter, onTypFilter,
  selectedId, onSelect, compareIds, onCompareToggle,
}) {
  return (
    <aside className="sidebar">
      <div className="sb-header">
        <div className="sb-title">Schulverzeichnis</div>
        <div className="sb-sub">{allSchulen.length} Einrichtungen · {Object.keys(SCHULTYPEN).length} Schularten</div>
      </div>

      <div className="search">
        <svg className="s-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="7" cy="7" r="5" /><path d="M11 11 L14 14" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Schule, Ort oder Leitung suchen…"
        />
        {query && (
          <button className="s-clear" onClick={() => onQuery('')} aria-label="Löschen">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="12" height="12">
              <path d="M4 4 L12 12 M12 4 L4 12" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <div className="filters">
        <button
          className={`chip ${typFilter === null ? 'active' : ''}`}
          onClick={() => onTypFilter(null)}
        >
          Alle <span className="meta" style={{ opacity: .6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{allSchulen.length}</span>
        </button>
        {Object.values(SCHULTYPEN).map((t) => {
          const count = allSchulen.filter((s) => s.typ === t.key).length;
          const active = typFilter === t.key;
          return (
            <button
              key={t.key}
              className={`chip ${active ? 'active' : ''}`}
              onClick={() => onTypFilter(active ? null : t.key)}
            >
              <span className="dot" style={{ background: t.color }} />
              {t.short}
              <span style={{ opacity: .6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="sb-list">
        {schulen.length === 0 && (
          <div className="sb-empty">
            <div style={{ marginBottom: 6 }}>Keine Treffer</div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-4)' }}>
              Suche oder Filter anpassen
            </div>
          </div>
        )}
        {schulen.map((s) => {
          const t = SCHULTYPEN[s.typ];
          const isActive = selectedId === s.id;
          const isCompared = compareIds.includes(s.id);
          return (
            <div
              key={s.id}
              className={`school-row ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(s)}
            >
              <div className="badge" style={{ background: t.color }}>{t.short}</div>
              <div style={{ minWidth: 0 }}>
                <div className="name">{s.name}</div>
                <div className="meta">{s.ort}</div>
              </div>
              <div className="actions">
                <button
                  className={`row-btn ${isCompared ? 'is-on' : ''}`}
                  title={isCompared ? 'Aus Vergleich entfernen' : 'Zum Vergleich hinzufügen'}
                  onClick={(e) => { e.stopPropagation(); onCompareToggle(s.id); }}
                >
                  {isCompared ? (
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M3 8 L7 12 L13 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M8 3 V13 M3 8 H13" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sb-footer">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8" cy="8" r="6" /><path d="M8 5 V9 M8 11 V11.5" strokeLinecap="round" />
        </svg>
        Klicke einen Marker oder Eintrag für Details
      </div>
    </aside>
  );
}

Object.assign(window, { Sidebar });
