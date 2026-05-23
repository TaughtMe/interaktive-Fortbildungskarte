'use client';
import { useMemo, useState } from 'react';
import type { School, SchoolFortbildungen } from '@/types';
import { SCHULTYPEN } from '@/data/schools';
import { FORMAT_LABELS, PRIORITY_LABELS } from '@/types/trainingNeed';

interface Props {
  schools: School[];
  fortbildungen: Record<string, SchoolFortbildungen>;
}

type SortMode = 'date-desc' | 'date-asc' | 'priority-desc' | 'priority-asc';

const PRIORITY_WEIGHT = {
  hoch: 3,
  mittel: 2,
  niedrig: 1,
};

export default function CoordinatorDashboard({ schools, fortbildungen }: Props) {
  const [topicFilter, setTopicFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [schoolTypeFilter, setSchoolTypeFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('date-desc');

  const allNeeds = useMemo(() => schools.flatMap((s) =>
    (fortbildungen[s.id]?.bedarf ?? []).map((b, i) => ({
      ...b,
      schoolName: s.name,
      schoolOrt: s.ort,
      schoolTyp: s.typ,
      schoolTypLabel: SCHULTYPEN[s.typ]?.label ?? s.typ,
      _key: `${s.id}-${b.id || i}`,
    }))
  ), [fortbildungen, schools]);

  const topics = useMemo(() => Array.from(new Set(allNeeds.map((n) => n.topic))).sort((a, b) =>
    a.localeCompare(b, 'de')
  ), [allNeeds]);

  const locations = useMemo(() => Array.from(new Set(schools.map((s) => s.ort))).sort((a, b) =>
    a.localeCompare(b, 'de')
  ), [schools]);

  const visibleNeeds = useMemo(() => {
    return allNeeds
      .filter((need) => {
        if (topicFilter && need.topic !== topicFilter) return false;
        if (priorityFilter && need.priority !== priorityFilter) return false;
        if (schoolTypeFilter && need.schoolTyp !== schoolTypeFilter) return false;
        if (locationFilter && need.schoolOrt !== locationFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortMode === 'priority-desc') {
          return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]
            || Date.parse(b.createdAt) - Date.parse(a.createdAt);
        }
        if (sortMode === 'priority-asc') {
          return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
            || Date.parse(b.createdAt) - Date.parse(a.createdAt);
        }
        if (sortMode === 'date-asc') return Date.parse(a.createdAt) - Date.parse(b.createdAt);
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      });
  }, [allNeeds, locationFilter, priorityFilter, schoolTypeFilter, sortMode, topicFilter]);

  const hochPrio = allNeeds.filter((n) => n.priority === 'hoch');
  const hasActiveFilters = Boolean(topicFilter || priorityFilter || schoolTypeFilter || locationFilter);

  function resetFilters() {
    setTopicFilter('');
    setPriorityFilter('');
    setSchoolTypeFilter('');
    setLocationFilter('');
    setSortMode('date-desc');
  }

  function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Ohne Datum';
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function exportHref() {
    const params = new URLSearchParams();
    if (topicFilter) params.set('topic', topicFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    if (schoolTypeFilter) params.set('schoolType', schoolTypeFilter);
    if (locationFilter) params.set('location', locationFilter);
    if (sortMode) params.set('sort', sortMode);
    const query = params.toString();
    return `/api/training-needs/export${query ? `?${query}` : ''}`;
  }

  const schoolTypeOptions = (['G', 'M', 'GM'] as const).filter((typ) =>
    schools.some((school) => school.typ === typ)
  );

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
        <div className="dashboard-section-head">
          <div>
            <div className="dashboard-section-title">Alle Bedarfsmeldungen</div>
            <div className="dashboard-section-sub">
              {visibleNeeds.length} von {allNeeds.length} Bedarfsmeldungen
            </div>
          </div>
          <a className="btn compact" href={exportHref()}>
            CSV exportieren
          </a>
        </div>

        <div className="dashboard-filters" aria-label="Bedarfsmeldungen filtern">
          <label>
            Thema
            <select value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)}>
              <option value="">Alle Themen</option>
              {topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
            </select>
          </label>
          <label>
            Priorität
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              <option value="">Alle Prioritäten</option>
              <option value="hoch">Hoch</option>
              <option value="mittel">Mittel</option>
              <option value="niedrig">Niedrig</option>
            </select>
          </label>
          <label>
            Schulart
            <select value={schoolTypeFilter} onChange={(event) => setSchoolTypeFilter(event.target.value)}>
              <option value="">Alle Schularten</option>
              {schoolTypeOptions.map((typ) => (
                <option key={typ} value={typ}>{SCHULTYPEN[typ].label}</option>
              ))}
            </select>
          </label>
          <label>
            Ort
            <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
              <option value="">Alle Orte</option>
              {locations.map((location) => <option key={location} value={location}>{location}</option>)}
            </select>
          </label>
          <label>
            Sortierung
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="date-desc">Neueste zuerst</option>
              <option value="date-asc">Älteste zuerst</option>
              <option value="priority-desc">Priorität absteigend</option>
              <option value="priority-asc">Priorität aufsteigend</option>
            </select>
          </label>
          <button className="btn compact" type="button" onClick={resetFilters} disabled={!hasActiveFilters && sortMode === 'date-desc'}>
            Zurücksetzen
          </button>
        </div>

        {allNeeds.length === 0 ? (
          <div className="dash-empty">Keine Bedarfsmeldungen vorhanden.</div>
        ) : visibleNeeds.length === 0 ? (
          <div className="dash-empty">Keine Bedarfsmeldungen für die aktiven Filter.</div>
        ) : (
          <div className="dash-list">
            {visibleNeeds.map((b) => (
              <div key={b._key} className="dash-item">
                <div className="dash-item-main">
                  <div className="dash-item-title">{b.topic}</div>
                  <div className="dash-item-sub">
                    {b.schoolName} · {b.schoolOrt} · {b.schoolTypLabel}
                  </div>
                  <div className="dash-item-text">{b.description}</div>
                  <div className="dash-item-sub">
                    Zielgruppe: {b.targetGroup}
                  </div>
                </div>
                <div className="dash-item-meta">
                  <span className="fb-tag">{formatDate(b.createdAt)}</span>
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
