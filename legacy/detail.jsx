// Detail-Ansicht (Schul-Seite): vollständige Infos + Fortbildungen + Fortbildungsbedarf editierbar

function SchoolDetail({ school, origin, onClose, onCompareToggle, compared, fortbildungen, onUpdateFortbildungen }) {
  const t = SCHULTYPEN[school.typ];
  const data = fortbildungen[school.id] || { laufend: [], bedarf: [] };

  // Wachs-/Kollaps-Animation aus dem Marker heraus.
  const [closing, setClosing] = React.useState(false);
  const [opened, setOpened] = React.useState(false);
  React.useEffect(() => {
    // nach erstem Frame Klasse setzen, damit die Transition startet
    const id = requestAnimationFrame(() => setOpened(true));
    return () => cancelAnimationFrame(id);
  }, []);
  function handleClose() {
    if (closing) return;
    setClosing(true);
    setOpened(false);
    setTimeout(onClose, 380);
  }
  // Transform-Origin: Marker in Element-lokalen Koordinaten.
  // Element sitzt bei top:50%/left:50% (vor Translate) -> seine
  // (0,0)-Ecke liegt im Viewport-Zentrum. Marker-Position relativ
  // dazu ergibt den Anker, von dem aus die Karte wächst/kollabiert.
  const transformOrigin = React.useMemo(() => {
    if (!origin || typeof window === 'undefined') return '50% 50%';
    const ox = origin.x - window.innerWidth / 2;
    const oy = origin.y - window.innerHeight / 2;
    return `${Math.round(ox)}px ${Math.round(oy)}px`;
  }, [origin]);

  const [newLaufend, setNewLaufend] = React.useState({ titel: '', teilnehmer: '', ende: '' });
  const [newBedarf, setNewBedarf] = React.useState({ titel: '', prio: 'mittel' });

  function addLaufend(e) {
    e.preventDefault();
    if (!newLaufend.titel.trim()) return;
    const item = {
      titel: newLaufend.titel.trim(),
      teilnehmer: Number(newLaufend.teilnehmer) || 0,
      ende: newLaufend.ende || '—',
    };
    onUpdateFortbildungen(school.id, { ...data, laufend: [...data.laufend, item] });
    setNewLaufend({ titel: '', teilnehmer: '', ende: '' });
  }
  function delLaufend(i) {
    onUpdateFortbildungen(school.id, { ...data, laufend: data.laufend.filter((_, idx) => idx !== i) });
  }
  function addBedarf(e) {
    e.preventDefault();
    if (!newBedarf.titel.trim()) return;
    onUpdateFortbildungen(school.id, {
      ...data,
      bedarf: [...data.bedarf, { titel: newBedarf.titel.trim(), prio: newBedarf.prio }],
    });
    setNewBedarf({ titel: '', prio: 'mittel' });
  }
  function delBedarf(i) {
    onUpdateFortbildungen(school.id, { ...data, bedarf: data.bedarf.filter((_, idx) => idx !== i) });
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.adresse)}`;

  return (
    <React.Fragment>
      <div
        className={`detail-overlay ${opened ? 'is-open' : ''} ${closing ? 'is-closing' : ''}`}
        onClick={handleClose}
      />
      <div
        className={`detail ${opened ? 'is-open' : 'is-collapsed'} ${closing ? 'is-closing' : ''}`}
        role="dialog"
        aria-modal="true"
        style={{ transformOrigin }}
      >
        <button className="detail-close-floating" onClick={handleClose} aria-label="Schließen">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="16" height="16">
            <path d="M4 4 L12 12 M12 4 L4 12" strokeLinecap="round" />
          </svg>
        </button>
        <div className="detail-head">
          <div className="bigbadge" style={{ background: t.color }}>{t.short}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="title">{school.name}</div>
            <div className="sub">{t.label} · {school.ort} · ID {school.id}</div>
          </div>
        </div>

        <div className="detail-body">
          {/* Kontakt */}
          <div className="section">
            <div className="section-title">Kontakt</div>
            <div className="kv-grid">
              <div className="kv">
                <div className="k">Adresse</div>
                <div className="v">{school.adresse}</div>
              </div>
              <div className="kv">
                <div className="k">Schulleitung</div>
                <div className="v" style={{ color: school.leitung === '—' ? 'var(--ink-4)' : 'var(--ink)' }}>
                  {school.leitung === '—' ? 'nicht hinterlegt' : school.leitung}
                </div>
              </div>
              <div className="kv">
                <div className="k">Telefon</div>
                <div className="v">{school.tel}</div>
              </div>
              <div className="kv">
                <div className="k">Telefax</div>
                <div className="v" style={{ color: school.fax ? 'var(--ink)' : 'var(--ink-4)' }}>
                  {school.fax || '—'}
                </div>
              </div>
              <div className="kv">
                <div className="k">E-Mail</div>
                <div className="v"><a href={`mailto:${school.mail}`}>{school.mail}</a></div>
              </div>
              <div className="kv">
                <div className="k">Website</div>
                <div className="v" style={{ color: school.web ? 'var(--ink)' : 'var(--ink-4)' }}>
                  {school.web
                    ? <a href={`https://${school.web}`} target="_blank" rel="noopener">{school.web}</a>
                    : 'nicht hinterlegt'}
                </div>
              </div>
            </div>
          </div>

          {/* Laufende Fortbildungen */}
          <div className="section">
            <div className="section-title">Aktuelle Fortbildungen ({data.laufend.length})</div>
            <div className="fb-list">
              {data.laufend.length === 0 && (
                <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px dashed var(--border-2)', borderRadius: 'var(--radius)', color: 'var(--ink-3)', fontSize: 13 }}>
                  Noch keine Fortbildungen erfasst.
                </div>
              )}
              {data.laufend.map((fb, i) => (
                <div key={i} className="fb-item">
                  <div className="fb-icon">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                      <path d="M2 6 L8 3 L14 6 L8 9 Z" /><path d="M5 7.5 V11 C 5 11.5, 6.5 12.5, 8 12.5 S 11 11.5, 11 11 V 7.5" />
                    </svg>
                  </div>
                  <div>
                    <div className="fb-title">{fb.titel}</div>
                    <div className="fb-meta">{fb.teilnehmer} Teilnehmende · bis {fb.ende}</div>
                  </div>
                  <div />
                  <button className="fb-del" onClick={() => delLaufend(i)} title="Entfernen">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 5 H13 M6 5 V3 H10 V5 M5 5 V13 H11 V5" /></svg>
                  </button>
                </div>
              ))}
            </div>
            <form className="add-form" onSubmit={addLaufend}>
              <input
                type="text"
                placeholder="Titel der Fortbildung"
                value={newLaufend.titel}
                onChange={(e) => setNewLaufend({ ...newLaufend, titel: e.target.value })}
              />
              <input
                type="number"
                placeholder="Teilnehmer"
                value={newLaufend.teilnehmer}
                onChange={(e) => setNewLaufend({ ...newLaufend, teilnehmer: e.target.value })}
              />
              <button className="btn primary" type="submit">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 3 V13 M3 8 H13" strokeLinecap="round" /></svg>
                Hinzufügen
              </button>
            </form>
          </div>

          {/* Fortbildungsbedarf */}
          <div className="section">
            <div className="section-title">Fortbildungsbedarf ({data.bedarf.length})</div>
            <div className="fb-list">
              {data.bedarf.length === 0 && (
                <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px dashed var(--border-2)', borderRadius: 'var(--radius)', color: 'var(--ink-3)', fontSize: 13 }}>
                  Kein Bedarf eingetragen.
                </div>
              )}
              {data.bedarf.map((b, i) => (
                <div key={i} className="fb-item">
                  <div className="fb-icon bedarf">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                      <path d="M8 2 L14 13 H2 Z" strokeLinejoin="round" /><path d="M8 6 V9 M8 11 V11.2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <div className="fb-title">{b.titel}</div>
                    <div className="fb-meta">Priorität gemeldet</div>
                  </div>
                  <div className={`fb-pill ${b.prio}`}>{b.prio}</div>
                  <button className="fb-del" onClick={() => delBedarf(i)} title="Entfernen">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 5 H13 M6 5 V3 H10 V5 M5 5 V13 H11 V5" /></svg>
                  </button>
                </div>
              ))}
            </div>
            <form className="add-form" onSubmit={addBedarf}>
              <input
                type="text"
                placeholder="Bedarf eintragen, z. B. 'KI im Schulalltag'"
                value={newBedarf.titel}
                onChange={(e) => setNewBedarf({ ...newBedarf, titel: e.target.value })}
              />
              <select
                value={newBedarf.prio}
                onChange={(e) => setNewBedarf({ ...newBedarf, prio: e.target.value })}
              >
                <option value="niedrig">Priorität: niedrig</option>
                <option value="mittel">Priorität: mittel</option>
                <option value="hoch">Priorität: hoch</option>
              </select>
              <button className="btn primary" type="submit">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 3 V13 M3 8 H13" strokeLinecap="round" /></svg>
                Melden
              </button>
            </form>
          </div>
        </div>

        <div className="detail-toolbar">
          <button className="btn" onClick={() => onCompareToggle(school.id)}>
            {compared ? (
              <>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8 L7 12 L13 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Im Vergleich
              </>
            ) : (
              <>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 4 H7 V13 H3 Z M9 4 H13 V13 H9 Z" /></svg>
                Vergleichen
              </>
            )}
          </button>
          <button className="btn" onClick={() => window.open(mapsUrl, '_blank')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 4 L6 2 L10 4 L14 2 V12 L10 14 L6 12 L2 14 Z M6 2 V12 M10 4 V14" strokeLinejoin="round" /></svg>
            Route planen
          </button>
          <div className="spacer" />
          <button className="btn primary" onClick={handleClose}>Schließen</button>
        </div>
      </div>
    </React.Fragment>
  );
}

function CompareModal({ schools, onClose, onRemove, fortbildungen }) {
  if (schools.length === 0) return null;
  return (
    <div className="compare-modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="compare-card">
        <div className="compare-head">
          <div>
            <div className="title">Schulvergleich</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {schools.length} von 2 Schulen ausgewählt
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn icon" onClick={onClose} aria-label="Schließen">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 4 L12 12 M12 4 L4 12" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="compare-body">
          <CompareGrid schools={schools} onRemove={onRemove} fortbildungen={fortbildungen} />
        </div>
      </div>
    </div>
  );
}

function CompareGrid({ schools, onRemove, fortbildungen }) {
  const rows = [
    { k: 'Schultyp',          v: (s) => SCHULTYPEN[s.typ].label },
    { k: 'Ort',               v: (s) => s.ort },
    { k: 'Adresse',           v: (s) => s.adresse },
    { k: 'Schulleitung',      v: (s) => s.leitung === '—' ? <span style={{ color: 'var(--ink-4)' }}>nicht hinterlegt</span> : s.leitung },
    { k: 'Telefon',           v: (s) => s.tel },
    { k: 'Telefax',           v: (s) => s.fax || <span style={{ color: 'var(--ink-4)' }}>—</span> },
    { k: 'E-Mail',            v: (s) => <a href={`mailto:${s.mail}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{s.mail}</a> },
    { k: 'Website',           v: (s) => s.web ? <a href={`https://${s.web}`} target="_blank" rel="noopener" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{s.web}</a> : <span style={{ color: 'var(--ink-4)' }}>—</span> },
    { k: 'Laufende Fobi',     v: (s) => (fortbildungen[s.id]?.laufend?.length ?? 0) },
    { k: 'Bedarf',            v: (s) => (fortbildungen[s.id]?.bedarf?.length ?? 0) },
  ];
  return (
    <div className="compare-grid" style={{ gridTemplateColumns: `200px ${schools.map(() => '1fr').join(' ')}` }}>
      <div />
      {schools.map((s) => {
        const t = SCHULTYPEN[s.typ];
        return (
          <div key={s.id} className="header-cell">
            <div className="badge" style={{ background: t.color }}>{t.short}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{s.ort}</div>
            </div>
            <button className="btn icon" style={{ width: 24, height: 24 }} onClick={() => onRemove(s.id)} aria-label="Entfernen">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 4 L12 12 M12 4 L4 12" strokeLinecap="round" /></svg>
            </button>
          </div>
        );
      })}
      {rows.map((r, i) => (
        <React.Fragment key={i}>
          <div>{r.k}</div>
          {schools.map((s) => <div key={s.id}>{r.v(s)}</div>)}
        </React.Fragment>
      ))}
    </div>
  );
}

Object.assign(window, { SchoolDetail, CompareModal });
