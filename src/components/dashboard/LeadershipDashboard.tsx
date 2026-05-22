'use client';
import type { School, SchoolFortbildungen } from '@/types';
import { SCHULTYPEN } from '@/data/schools';

interface Props {
  schools: School[];
  fortbildungen: Record<string, SchoolFortbildungen>;
}

export default function LeadershipDashboard({ schools, fortbildungen }: Props) {
  const totalLaufend  = schools.reduce((acc, s) => acc + (fortbildungen[s.id]?.laufend.length  ?? 0), 0);
  const totalBedarf   = schools.reduce((acc, s) => acc + (fortbildungen[s.id]?.bedarf.length   ?? 0), 0);
  const hochPrioCount = schools.reduce((acc, s) =>
    acc + (fortbildungen[s.id]?.bedarf.filter((b) => b.priority === 'hoch').length ?? 0), 0
  );

  const byTyp = (['G', 'M', 'GM'] as const).map((typ) => ({
    ...SCHULTYPEN[typ],
    count: schools.filter((s) => s.typ === typ).length,
  }));

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title">Schulamtsleitung</div>
        <div className="dashboard-sub">Gesamtübersicht Fortbildungslandschaft</div>
      </div>

      <div className="dashboard-grid">
        <div className="dash-card">
          <div className="dash-card-label">Schulen gesamt</div>
          <div className="dash-card-value">{schools.length}</div>
        </div>
        <div className="dash-card">
          <div className="dash-card-label">Laufende Fortbildungen</div>
          <div className="dash-card-value">{totalLaufend}</div>
        </div>
        <div className="dash-card">
          <div className="dash-card-label">Offene Bedarfe</div>
          <div className="dash-card-value">{totalBedarf}</div>
        </div>
        <div className="dash-card accent">
          <div className="dash-card-label">Hohe Priorität</div>
          <div className="dash-card-value">{hochPrioCount}</div>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section-title">Schulen nach Typ</div>
        <div className="dashboard-grid">
          {byTyp.map((t) => (
            <div key={t.key} className="dash-card" style={{ borderLeft: `3px solid ${t.color}` }}>
              <div className="dash-card-label">{t.label}</div>
              <div className="dash-card-value">{t.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section-title">Top-Bedarfe (hohe Priorität)</div>
        {hochPrioCount === 0 ? (
          <div className="dash-empty">Keine dringenden Bedarfe gemeldet.</div>
        ) : (
          <div className="dash-list">
            {schools.flatMap((s) =>
              (fortbildungen[s.id]?.bedarf ?? [])
                .filter((b) => b.priority === 'hoch')
                .map((b) => (
                  <div key={`${s.id}-${b.id || b.topic}`} className="dash-item">
                    <div className="dash-item-main">
                      <div className="dash-item-title">{b.topic}</div>
                      <div className="dash-item-sub">{s.name}</div>
                    </div>
                    <span className="fb-pill hoch">Hoch</span>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
