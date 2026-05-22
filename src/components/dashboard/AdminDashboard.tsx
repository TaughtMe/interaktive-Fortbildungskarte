'use client';
import type { School } from '@/types';
import { SCHULTYPEN } from '@/data/schools';

interface Props {
  schools: School[];
}

export default function AdminDashboard({ schools }: Props) {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title">Verwaltung</div>
        <div className="dashboard-sub">Schulübersicht & Benutzerverwaltung</div>
      </div>

      <div className="dashboard-grid">
        <div className="dash-card">
          <div className="dash-card-label">Schulen gesamt</div>
          <div className="dash-card-value">{schools.length}</div>
        </div>
        <div className="dash-card">
          <div className="dash-card-label">Grundschulen</div>
          <div className="dash-card-value">{schools.filter((s) => s.typ === 'G').length}</div>
        </div>
        <div className="dash-card">
          <div className="dash-card-label">Mittelschulen</div>
          <div className="dash-card-value">{schools.filter((s) => s.typ === 'M').length}</div>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section-title">Schulliste</div>
        <div className="dash-list">
          {schools.map((s) => {
            const t = SCHULTYPEN[s.typ];
            return (
              <div key={s.id} className="dash-item">
                <div className="bigbadge sm" style={{ background: t.color }}>{t.short}</div>
                <div className="dash-item-main">
                  <div className="dash-item-title">{s.name}</div>
                  <div className="dash-item-sub">{s.ort} · {s.leitung === '—' ? 'Schulleitung nicht hinterlegt' : s.leitung}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section-title">Benutzerverwaltung</div>
        <div className="dash-placeholder">
          Benutzerverwaltung wird nach Datenbankanbindung implementiert.
        </div>
      </div>
    </div>
  );
}
