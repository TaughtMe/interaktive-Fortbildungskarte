'use client';
import { useMemo } from 'react';
import type { School, SchoolFortbildungen } from '@/types';
import { DEMO_DISTRICTS, getDistrictIdForSchoolLocation } from '@/lib/districts/districtAssignments';

interface Props {
  schools: School[];
  fortbildungen: Record<string, SchoolFortbildungen>;
}

export default function SuperAdminDashboard({ schools, fortbildungen }: Props) {
  const rows = useMemo(() => DEMO_DISTRICTS.map((district) => {
    const districtSchools = schools.filter((school) =>
      (school.districtId ?? getDistrictIdForSchoolLocation(school)) === district.id
    );
    const needCount = districtSchools.reduce(
      (sum, school) => sum + (fortbildungen[school.id]?.bedarf.length ?? 0),
      0,
    );

    return {
      district,
      schoolCount: districtSchools.length,
      needCount,
    };
  }), [fortbildungen, schools]);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title">Superadmin</div>
        <div className="dashboard-sub">Schulamtsbezirke und mandantenweite Kennzahlen</div>
      </div>

      <div className="dashboard-grid">
        <div className="dash-card">
          <div className="dash-card-label">Bezirke</div>
          <div className="dash-card-value">{rows.length}</div>
        </div>
        <div className="dash-card">
          <div className="dash-card-label">Schulen gesamt</div>
          <div className="dash-card-value">{schools.length}</div>
        </div>
        <div className="dash-card accent">
          <div className="dash-card-label">Bedarfsmeldungen</div>
          <div className="dash-card-value">
            {rows.reduce((sum, row) => sum + row.needCount, 0)}
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section-head">
          <div>
            <div className="dashboard-section-title">Schulamtsbezirke</div>
            <div className="dashboard-section-sub">Anlegen und Bearbeiten kommt spaeter.</div>
          </div>
        </div>

        <div className="dash-list">
          {rows.map(({ district, schoolCount, needCount }) => (
            <div key={district.id} className="dash-item">
              <div className="dash-item-main">
                <div className="dash-item-title">{district.name}</div>
                <div className="dash-item-sub">{district.description}</div>
              </div>
              <div className="dash-item-meta">
                <span className="fb-tag">{schoolCount} Schulen</span>
                <span className="fb-tag format">{needCount} Bedarfe</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
