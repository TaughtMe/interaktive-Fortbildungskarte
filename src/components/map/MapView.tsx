'use client';
import { useEffect, useRef, useReducer } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { School, MarkerStyle, Theme } from '@/types';
import { SCHULTYPEN, MAP_DEFAULT_VIEW } from '@/data/schools';
import SchoolPopup from './SchoolPopup';

interface PopupOrigin { x: number; y: number; }

interface Props {
  schulen: School[];
  selected: School | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (school: School | null) => void;
  popup: School | null;
  onPopupAction: (action: 'close' | 'detail', school?: School, origin?: PopupOrigin) => void;
  markerStyle: MarkerStyle;
  compareIds: string[];
  onCompareToggle: (id: string) => void;
  theme: Theme;
}

function markerHtml(
  style: MarkerStyle,
  color: string,
  typ: string,
  isSelected: boolean,
  isCompared: boolean,
): string {
  const ringClass = isCompared ? 'is-compared' : isSelected ? 'is-selected' : '';
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
  return `
    <div class="mk mk-icon ${ringClass}">
      ${isSelected ? '<span class="mk-pulse"></span>' : ''}
      <span class="tile" style="background:${color}">
        <svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="white" stroke-width="1.6"
          stroke-linejoin="round" stroke-linecap="round">
          <path d="M 1.5 7 L 8 3 L 14.5 7 L 8 11 Z"/>
          <path d="M 4.5 8 V 11.5 C 4.5 12.2, 6 13, 8 13 S 11.5 12.2, 11.5 11.5 V 8"/>
        </svg>
      </span>
    </div>`;
}

export default function MapView({
  schulen, selected, hoveredId, onHover, onSelect,
  popup, onPopupAction, markerStyle, compareIds, onCompareToggle, theme,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const lastFlownId = useRef<string | null>(null);
  const [, forceTick] = useReducer((x: number) => x + 1, 0);

  // init map once
  useEffect(() => {
    if (mapRef.current || !mapDivRef.current) return;
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

    map.on('click', () => onSelect(null));
    const onMove = () => forceTick();
    map.on('move', onMove);
    map.on('zoom', onMove);

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(mapDivRef.current!);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // swap tile layers on theme change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileRef.current) { tileRef.current.remove(); tileRef.current = null; }
    const base = L.tileLayer(
      theme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
      {
        subdomains: 'abcd',
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &middot; ' +
          '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    );
    const labels = L.tileLayer(
      theme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
      { subdomains: 'abcd', maxZoom: 19, pane: 'shadowPane' },
    );
    tileRef.current = L.layerGroup([base, labels]).addTo(map);
  }, [theme]);

  // rebuild markers when deps change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    schulen.forEach((s) => {
      const t = SCHULTYPEN[s.typ];
      const isSelected = selected?.id === s.id;
      const isCompared = compareIds.includes(s.id);
      const html = markerHtml(markerStyle, t.color, s.typ, isSelected, isCompared);
      const size: [number, number] =
        markerStyle === 'pin' ? [40, 50] : markerStyle === 'icon' ? [34, 34] : [22, 22];
      const anchor: [number, number] =
        markerStyle === 'pin' ? [20, 46] : markerStyle === 'icon' ? [17, 17] : [11, 11];

      const icon = L.divIcon({
        className: [
          'school-marker',
          `style-${markerStyle}`,
          isSelected ? 'is-selected' : '',
          isCompared ? 'is-compared' : '',
        ]
          .filter(Boolean)
          .join(' '),
        html,
        iconSize: size,
        iconAnchor: anchor,
      });

      const marker = L.marker([s.lat, s.lng] as [number, number], {
        icon,
        riseOnHover: true,
        keyboard: false,
      }).addTo(map);

      marker.on('click', (e: L.LeafletMouseEvent) => {
        e.originalEvent?.stopPropagation();
        onSelect(s);
      });
      marker.on('mouseover', () => onHover(s.id));
      marker.on('mouseout', () => onHover(null));
      markersRef.current[s.id] = marker;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schulen, markerStyle, selected?.id, compareIds.join(',')]);

  // fly to newly selected school
  useEffect(() => {
    if (!selected || !mapRef.current) return;
    if (lastFlownId.current === selected.id) return;
    lastFlownId.current = selected.id;
    const map = mapRef.current;
    const targetZoom = Math.max(map.getZoom(), 12);
    const containerH = map.getSize().y;
    const offsetY = -Math.min(120, containerH * 0.18);
    const point = map
      .project(L.latLng(selected.lat, selected.lng), targetZoom)
      .add(L.point(0, offsetY));
    const newCenter = map.unproject(point, targetZoom);
    map.flyTo(newCenter, targetZoom, { duration: 0.6 });
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected) lastFlownId.current = null;
  }, [selected]);

  // popup pixel position (recomputed every forceTick / re-render)
  const popupPos = (() => {
    const map = mapRef.current;
    if (!map || !selected) return null;
    return map.latLngToContainerPoint(L.latLng(selected.lat, selected.lng));
  })();

  // hover tooltip pixel position
  const hoverPos = (() => {
    const map = mapRef.current;
    if (!map || !hoveredId) return null;
    const s = schulen.find((x) => x.id === hoveredId);
    if (!s) return null;
    return { p: map.latLngToContainerPoint(L.latLng(s.lat, s.lng)), s };
  })();

  return (
    <div className="map-wrap" ref={wrapRef}>
      <div ref={mapDivRef} className="leaflet-mount" />

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-title">Schultypen</div>
        {Object.values(SCHULTYPEN).map((t) => (
          <div key={t.key} className="legend-row">
            <div className="swatch" style={{ background: t.color }}>{t.short[0]}</div>
            <span>{t.label}</span>
          </div>
        ))}
      </div>

      {/* Hover tooltip (only when no popup open) */}
      {hoverPos && !popup && (
        <div
          className="hover-card"
          style={{ left: hoverPos.p.x + 16, top: hoverPos.p.y - 8 }}
        >
          <div className="hc-name">{hoverPos.s.name}</div>
          <div className="hc-meta">{SCHULTYPEN[hoverPos.s.typ].label} · {hoverPos.s.ort}</div>
        </div>
      )}

      {/* Popup overlay */}
      {popup && popupPos && (() => {
        const popupW = 300;
        const popupH = 230;
        const containerW = wrapRef.current?.clientWidth ?? 800;
        const containerH = wrapRef.current?.clientHeight ?? 600;
        let left = popupPos.x - popupW / 2;
        left = Math.max(8, Math.min(left, containerW - popupW - 8));
        let top = popupPos.y - popupH - 16;
        let arrowDir: 'up' | 'down' = 'down';
        if (top < 8) { top = popupPos.y + 20; arrowDir = 'up'; }
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
                : undefined;
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
