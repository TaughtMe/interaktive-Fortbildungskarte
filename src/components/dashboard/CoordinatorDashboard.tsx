'use client';
import type { School, SchoolFortbildungen } from '@/types';
import { FORMAT_LABELS, PRIORITY_LABELS } from '@/types/trainingNeed';

interface Props {
  schools: School[];
  fortbildungen: Record<string, SchoolFortbildungen>;
}

export default function CoordinatorDashboard({ schools, fortbildungen }: Props) {
  const allNeeds = schools.flatMap((s) =>
    (fortbildungen[s.id]?.bedarf ?? []).map((b, i) => ({ ...b, schoolName: s.name, _key: `${s.id}-${b.id || i}` }))
  );
  const hochPrio = allNeeds.filter((n) => n.priority === 'hoch');

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title">Koordination</div>
        <div className="dashboard-sub">Fortbildungsbedarfe aller Schulen</div>
      </div>

      <div className="dashboard-grid">
        <div className="dash-card">
          <div className="dash-card-label">Schulen gesamt</div>
          <div className="dash-card-value">{schools.length}</div>
        </div>
        <div className="dash-card">
          <div className="dash-card-label">Bedarfsmeldungen</div>
          <div className="dash-card-value">{allNeeds.length}</div>
        </div>
        <div className="dash-card accent">
          <div className="dash-card-label">Hohe Priorität</div>
          <div className="dash-card-value">{hochPrio.length}</div>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section-title">Alle Bedarfsmeldungen</div>
        {allNeeds.length === 0 ? (
          <div className="dash-empty">Keine Bedarfsmeldungen vorhanden.</div>
        ) : (
          <div className="dash-list">
            {allNeeds.map((b) => (
              <div key={b._key} className="dash-item">
                <div className="dash-item-main">
                  <div className="dash-item-title">{b.topic}</div>
                  <div className="dash-item-sub">{b.schoolName}</div>
                </div>
                <div className="dash-item-meta">
                  <span className="fb-tag format">{FORMAT_LABELS[b.preferredFormat]}</span>
                  <span className={`fb-pill ${b.priority}`}>{PRIORITY_LABELS[b.priority]}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
