// Leaflet-Karte: OpenStreetMap (CARTO Positron / Dark Matter)
// Marker als L.divIcon mit unseren Stilen (Pin / Punkt / Icon).
// Popup wird als React-Komponente überlagert und an Container-Position des Markers fixiert.

function MapView({
  schulen, selected, onSelect, hoveredId, onHover,
  popup, onPopupAction, markerStyle, compareIds, onCompareToggle, theme,
}) {
  const wrapRef = React.useRef(null);
  const mapDivRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const tileRef = React.useRef(null);
  const markersRef = React.useRef({});
  const [popupPx, setPopupPx] = React.useState(null);
  const [hoverPx, setHoverPx] = React.useState(null);
  const [, forceTick] = React.useReducer((x) => x + 1, 0);

  // --- init map ---
  React.useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(mapDivRef.current, {
      center: MAP_DEFAULT_VIEW.center,
      zoom: MAP_DEFAULT_VIEW.zoom,
      zoomControl: false,
      attributionControl: true,
      worldCopyJump: false,
      zoomSnap: 0.5,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 120 }).addTo(map);
    map.attributionControl.setPrefix('');
    mapRef.current = map;

    // Klick auf leere Karte schließt Popup
    map.on('click', () => onSelect(null));
    // Pan/Zoom -> Popup-/Hover-Positionen neu berechnen
    const onMove = () => forceTick();
    map.on('move', onMove);
    map.on('zoom', onMove);

    // ResizeObserver, falls Container wächst
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(mapDivRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line
  }, []);

  // --- Tiles bei Theme-Wechsel ---
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileRef.current) {
      tileRef.current.remove();
      tileRef.current = null;
    }
    const url = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
    const labelUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png';
    const base = L.tileLayer(url, {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &middot; &copy; <a href="https://carto.com/attributions">CARTO</a>',
    });
    const labels = L.tileLayer(labelUrl, {
      subdomains: 'abcd',
      maxZoom: 19,
      pane: 'shadowPane', // damit Labels unter Markern liegen
    });
    const group = L.layerGroup([base, labels]).addTo(map);
    tileRef.current = group;
  }, [theme]);

  // --- Marker rendern ---
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // alte Marker entfernen
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    schulen.forEach((s) => {
      const t = SCHULTYPEN[s.typ];
      const isSelected = selected?.id === s.id;
      const isCompared = compareIds.includes(s.id);
      const html = markerHtml(markerStyle, t, s.typ, isSelected, isCompared);
      const size = markerStyle === 'pin' ? [40, 50] : (markerStyle === 'icon' ? [34, 34] : [22, 22]);
      const anchor = markerStyle === 'pin' ? [20, 46] : (markerStyle === 'icon' ? [17, 17] : [11, 11]);
      const icon = L.divIcon({
        className: `school-marker style-${markerStyle} ${isSelected ? 'is-selected' : ''} ${isCompared ? 'is-compared' : ''}`,
        html,
        iconSize: size,
        iconAnchor: anchor,
      });
      const marker = L.marker([s.lat, s.lng], { icon, riseOnHover: true, keyboard: false }).addTo(map);
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelect(s);
      });
      marker.on('mouseover', () => onHover(s.id));
      marker.on('mouseout', () => onHover(null));
      markersRef.current[s.id] = marker;
    });
  }, [schulen, markerStyle, selected?.id, compareIds.join(',')]);

  // --- Auswahl: hinfliegen ---
  const lastFlownId = React.useRef(null);
  React.useEffect(() => {
    if (!selected || !mapRef.current) return;
    if (lastFlownId.current === selected.id) return;
    lastFlownId.current = selected.id;
    const map = mapRef.current;
    const targetZoom = Math.max(map.getZoom(), 12);
    // Versatz nach unten, damit Popup oben Platz hat
    const containerH = map.getSize().y;
    const offsetY = -Math.min(120, containerH * 0.18);
    const point = map.project([selected.lat, selected.lng], targetZoom).add([0, offsetY]);
    const newCenter = map.unproject(point, targetZoom);
    map.flyTo(newCenter, targetZoom, { duration: 0.6 });
  }, [selected?.id]);

  React.useEffect(() => {
    if (!selected) lastFlownId.current = null;
  }, [selected?.id]);

  // --- Popup-Position berechnen ---
  const popupPos = (() => {
    const map = mapRef.current;
    if (!map || !selected) return null;
    return map.latLngToContainerPoint([selected.lat, selected.lng]);
  })();

  // --- Hover-Position berechnen ---
  const hoverPos = (() => {
    const map = mapRef.current;
    if (!map || !hoveredId) return null;
    const s = schulen.find((x) => x.id === hoveredId);
    if (!s) return null;
    return { p: map.latLngToContainerPoint([s.lat, s.lng]), s };
  })();

  return (
    <div className="map-wrap" ref={wrapRef}>
      <div ref={mapDivRef} className="leaflet-mount" />

      {/* Legende */}
      <div className="map-legend">
        <div className="legend-title">Schultypen</div>
        {Object.values(SCHULTYPEN).map((t) => (
          <div key={t.key} className="legend-row">
            <div className="swatch" style={{ background: t.color }}>{t.short[0]}</div>
            <span>{t.label}</span>
          </div>
        ))}
      </div>

      {/* Hover-Tooltip */}
      {hoverPos && !popup && (
        <div
          className="hover-card"
          style={{
            left: hoverPos.p.x + 16,
            top: hoverPos.p.y - 8,
          }}
        >
          <div className="hc-name">{hoverPos.s.name}</div>
          <div className="hc-meta">{SCHULTYPEN[hoverPos.s.typ].label} · {hoverPos.s.ort}</div>
        </div>
      )}

      {/* Popup */}
      {popup && popupPos && (() => {
        const popupW = 300;
        const popupH = 230;
        const containerW = wrapRef.current?.clientWidth ?? 800;
        const containerH = wrapRef.current?.clientHeight ?? 600;
        let left = popupPos.x - popupW / 2;
        left = Math.max(8, Math.min(left, containerW - popupW - 8));
        // standardmäßig oberhalb
        let top = popupPos.y - popupH - 16;
        let arrowDir = 'down';
        if (top < 8) {
          top = popupPos.y + 20;
          arrowDir = 'up';
        }
        const arrowOffset = popupPos.x - left;
        return (
          <SchoolPopup
            school={popup}
            style={{ left, top, width: popupW }}
            arrowDir={arrowDir}
            arrowOffset={arrowOffset}
            onClose={() => onPopupAction('close')}
            onDetail={() => {
              const rect = wrapRef.current?.getBoundingClientRect();
              const origin = rect
                ? { x: rect.left + popupPos.x, y: rect.top + popupPos.y }
                : null;
              onPopupAction('detail', popup, origin);
            }}
            onCompare={() => onCompareToggle(popup.id)}
            compared={compareIds.includes(popup.id)}
          />
        );
      })()}
    </div>
  );
}

// --- Marker-HTML-Generatoren ---

function markerHtml(style, t, typ, isSelected, isCompared) {
  const color = t.color;
  const ringClass = isCompared ? 'is-compared' : (isSelected ? 'is-selected' : '');
  if (style === 'pin') {
    return `
      <div class="mk mk-pin ${ringClass}">
        ${isSelected ? '<span class="mk-pulse"></span>' : ''}
        <svg viewBox="-20 -32 40 48" width="40" height="50" aria-hidden="true">
          <path d="M 0 -28 C -10 -28 -16 -22 -16 -14 C -16 -6 -8 4 0 16 C 8 4 16 -6 16 -14 C 16 -22 10 -28 0 -28 Z"
            fill="${color}" stroke="white" stroke-width="1.5"/>
          <circle cx="0" cy="-14" r="9" fill="rgba(255,255,255,.18)"/>
          <text x="0" y="-11" text-anchor="middle" fill="white"
            style="font-family: var(--font-mono); font-size: 9px; font-weight: 700;">${typ}</text>
        </svg>
      </div>`;
  }
  if (style === 'dot') {
    return `
      <div class="mk mk-dot ${ringClass}">
        ${isSelected ? '<span class="mk-pulse"></span>' : ''}
        <span class="dot" style="background:${color}"></span>
      </div>`;
  }
  // icon
  return `
    <div class="mk mk-icon ${ringClass}">
      ${isSelected ? '<span class="mk-pulse"></span>' : ''}
      <span class="tile" style="background:${color}">
        <svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="white" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
          <path d="M 1.5 7 L 8 3 L 14.5 7 L 8 11 Z"/>
          <path d="M 4.5 8 V 11.5 C 4.5 12.2, 6 13, 8 13 S 11.5 12.2, 11.5 11.5 V 8"/>
        </svg>
      </span>
    </div>`;
}

function SchoolPopup({ school, style, arrowDir, arrowOffset, onClose, onDetail, onCompare, compared }) {
  const t = SCHULTYPEN[school.typ];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.adresse)}`;
  return (
    <div className={`popup arrow-${arrowDir}`} style={style}>
      <div className="popup-arrow" style={{ left: arrowOffset }} />
      <div className="popup-head">
        <div className="badge" style={{ background: t.color }}>{t.short}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="name">{school.name}</div>
          <div className="typ">{t.label} · {school.ort}</div>
        </div>
        <button className="popup-close" onClick={onClose} aria-label="Schließen">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
            <path d="M4 4 L12 12 M12 4 L4 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="popup-body">
        <div className="popup-row">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M8 1 C 4.5 1, 2 3.5, 2 7 C 2 11, 8 15, 8 15 S 14 11, 14 7 C 14 3.5, 11.5 1, 8 1 Z" /><circle cx="8" cy="7" r="2.2" /></svg>
          <span>{school.adresse}</span>
        </div>
        <div className="popup-row">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 4 C 3 3, 4 2, 5 2 H 6 L 7 5 L 5.5 6.5 C 6 8, 8 10, 9.5 10.5 L 11 9 L 14 10 V 11 C 14 12, 13 13, 12 13 C 7 13, 3 9, 3 4 Z" /></svg>
          <span>{school.tel}</span>
        </div>
        <div className="popup-row">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3.5" width="12" height="9" rx="1.5" /><path d="M2.5 4.5 L8 9 L13.5 4.5" /></svg>
          <a href={`mailto:${school.mail}`}>{school.mail}</a>
        </div>
      </div>
      <div className="popup-actions">
        <button className="btn" onClick={onCompare}>
          {compared ? (
            <>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8 L7 12 L13 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Vergleich
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
          Route
        </button>
        <button className="btn primary" onClick={onDetail}>
          Mehr Infos
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8 H13 M9 4 L13 8 L9 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { MapView });
