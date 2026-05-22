'use client';
import type { School } from '@/types';
import { SCHULTYPEN } from '@/data/schools';

interface Props {
  school: School;
  style: React.CSSProperties;
  arrowDir: 'up' | 'down';
  arrowOffset: number;
  onClose: () => void;
  onDetail: () => void;
  onCompare: () => void;
  compared: boolean;
}

export default function SchoolPopup({
  school, style, arrowDir, arrowOffset,
  onClose, onDetail, onCompare, compared,
}: Props) {
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
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M8 1 C 4.5 1, 2 3.5, 2 7 C 2 11, 8 15, 8 15 S 14 11, 14 7 C 14 3.5, 11.5 1, 8 1 Z" />
            <circle cx="8" cy="7" r="2.2" />
          </svg>
          <span>{school.adresse}</span>
        </div>
        <div className="popup-row">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M3 4 C 3 3, 4 2, 5 2 H 6 L 7 5 L 5.5 6.5 C 6 8, 8 10, 9.5 10.5 L 11 9 L 14 10 V 11 C 14 12, 13 13, 12 13 C 7 13, 3 9, 3 4 Z" />
          </svg>
          <span>{school.tel}</span>
        </div>
        <div className="popup-row">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
            <path d="M2.5 4.5 L8 9 L13.5 4.5" />
          </svg>
          <a href={`mailto:${school.mail}`}>{school.mail}</a>
        </div>
      </div>

      <div className="popup-actions">
        <button className="btn" onClick={onCompare}>
          {compared ? (
            <>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 8 L7 12 L13 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Vergleich
            </>
          ) : (
            <>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 4 H7 V13 H3 Z M9 4 H13 V13 H9 Z" />
              </svg>
              Vergleichen
            </>
          )}
        </button>
        <button className="btn" onClick={() => window.open(mapsUrl, '_blank')}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M2 4 L6 2 L10 4 L14 2 V12 L10 14 L6 12 L2 14 Z M6 2 V12 M10 4 V14" strokeLinejoin="round" />
          </svg>
          Route
        </button>
        <button className="btn primary" onClick={onDetail}>
          Mehr Infos
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 8 H13 M9 4 L13 8 L9 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
