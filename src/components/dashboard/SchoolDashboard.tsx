'use client';
import type { SchoolFortbildungen } from '@/types';
import type { School } from '@/types';
import { FORMAT_LABELS, PRIORITY_LABELS } from '@/types/trainingNeed';

interface Props {
  school: School;
  fortbildungen: SchoolFortbildungen;
}

export default function SchoolDashboard({ school, fortbildungen }: Props) {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title">Meine Schule</div>
        <div className="dashboard-sub">{school.name}</div>
      </div>

      <div className="dashboard-grid">
        <div className="dash-card">
          <div className="dash-card-label">Aktuelle Fortbildungen</div>
          <div className="dash-card-value">{fortbildungen.laufend.length}</div>
        </div>
        <div className="dash-card">
          <div className="dash-card-label">Gemeldeter Bedarf</div>
          <div className="dash-card-value">{fortbildungen.bedarf.length}</div>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section-title">Fortbildungsbedarf</div>
        {fortbildungen.bedarf.length === 0 ? (
          <div className="dash-empty">Kein Bedarf eingetragen.</div>
        ) : (
          <div className="dash-list">
            {fortbildungen.bedarf.map((b) => (
              <div key={b.id || b.topic} className="dash-item">
                <div className="dash-item-main">
                  <div className="dash-item-title">{b.topic}</div>
                  {b.description && <div className="dash-item-sub">{b.description}</div>}
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

      <div className="dashboard-section">
        <div className="dashboard-section-title">Laufende Fortbildungen</div>
        {fortbildungen.laufend.length === 0 ? (
          <div className="dash-empty">Keine Fortbildungen erfasst.</div>
        ) : (
          <div className="dash-list">
            {fortbildungen.laufend.map((fb, i) => (
              <div key={i} className="dash-item">
                <div className="dash-item-main">
                  <div className="dash-item-title">{fb.titel}</div>
                  <div className="dash-item-sub">{fb.teilnehmer} Teilnehmende · bis {fb.ende}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
