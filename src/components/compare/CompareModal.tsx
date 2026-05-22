'use client';
import { Fragment } from 'react';
import type { School, SchoolFortbildungen } from '@/types';
import { SCHULTYPEN } from '@/data/schools';

interface Props {
  schools: School[];
  onClose: () => void;
  onRemove: (id: string) => void;
  fortbildungen: Record<string, SchoolFortbildungen>;
}

export default function CompareModal({ schools, onClose, onRemove, fortbildungen }: Props) {
  if (schools.length === 0) return null;

  const rows: { k: string; v: (s: School) => React.ReactNode }[] = [
    { k: 'Schultyp',      v: (s) => SCHULTYPEN[s.typ].label },
    { k: 'Ort',           v: (s) => s.ort },
    { k: 'Adresse',       v: (s) => s.adresse },
    {
      k: 'Schulleitung',
      v: (s) =>
        s.leitung === '—'
          ? <span style={{ color: 'var(--ink-4)' }}>nicht hinterlegt</span>
          : s.leitung,
    },
    { k: 'Telefon',       v: (s) => s.tel },
    {
      k: 'Telefax',
      v: (s) => s.fax || <span style={{ color: 'var(--ink-4)' }}>—</span>,
    },
    {
      k: 'E-Mail',
      v: (s) => (
        <a href={`mailto:${s.mail}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          {s.mail}
        </a>
      ),
    },
    {
      k: 'Website',
      v: (s) =>
        s.web ? (
          <a
            href={`https://${s.web}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'none' }}
          >
            {s.web}
          </a>
        ) : (
          <span style={{ color: 'var(--ink-4)' }}>—</span>
        ),
    },
    { k: 'Laufende Fobi', v: (s) => fortbildungen[s.id]?.laufend?.length ?? 0 },
    { k: 'Bedarf',        v: (s) => fortbildungen[s.id]?.bedarf?.length ?? 0 },
  ];

  return (
    <div
      className="compare-modal"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
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
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 4 L12 12 M12 4 L4 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="compare-body">
          <div
            className="compare-grid"
            style={{ gridTemplateColumns: `200px ${schools.map(() => '1fr').join(' ')}` }}
          >
            <div />
            {schools.map((s) => {
              const tp = SCHULTYPEN[s.typ];
              return (
                <div key={s.id} className="header-cell">
                  <div className="badge" style={{ background: tp.color }}>{tp.short}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                      {s.ort}
                    </div>
                  </div>
                  <button
                    className="btn icon"
                    style={{ width: 24, height: 24 }}
                    onClick={() => onRemove(s.id)}
                    aria-label="Entfernen"
                  >
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M4 4 L12 12 M12 4 L4 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              );
            })}

            {rows.map((r, i) => (
              <Fragment key={i}>
                <div>{r.k}</div>
                {schools.map((s) => <div key={s.id}>{r.v(s)}</div>)}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
