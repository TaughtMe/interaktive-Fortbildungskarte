'use client';
import { useState, useEffect, useMemo } from 'react';
import type { School, SchoolFortbildungen } from '@/types';
import type { TrainingNeed } from '@/types/trainingNeed';
import { FORMAT_LABELS, PRIORITY_LABELS } from '@/types/trainingNeed';
import { SCHULTYPEN } from '@/data/schools';
import type { AccessUser } from '@/lib/auth/accessControl';
import {
  canCreateTrainingNeed,
  canManageSchoolTraining,
  canRemoveTrainingNeed,
  canViewSchoolBasicInfo,
  canViewTrainingNeeds,
  getAccessDeniedMessage,
} from '@/lib/auth/accessControl';
import TrainingNeedForm from '@/components/training/TrainingNeedForm';

interface Props {
  school: School;
  origin: { x: number; y: number } | null;
  onClose: () => void;
  onCompareToggle: (id: string) => void;
  compared: boolean;
  fortbildungen: Record<string, SchoolFortbildungen>;
  onUpdateFortbildungen: (id: string, data: SchoolFortbildungen) => void;
  onCreateTrainingNeed: (
    schoolId: string,
    input: Omit<TrainingNeed, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>,
    schoolCode: string,
  ) => Promise<TrainingNeed> | TrainingNeed;
  accessUser: AccessUser;
}

export default function SchoolDetail({
  school, origin, onClose, onCompareToggle, compared,
  fortbildungen, onUpdateFortbildungen, onCreateTrainingNeed, accessUser,
}: Props) {
  const t = SCHULTYPEN[school.typ];
  const data: SchoolFortbildungen = fortbildungen[school.id] ?? { laufend: [], bedarf: [] };
  const mayViewBasicInfo = canViewSchoolBasicInfo(accessUser, school);
  const mayViewTrainingNeeds = canViewTrainingNeeds(accessUser, school);
  const mayCreateNeed = canCreateTrainingNeed(accessUser, school.id, school);
  const mayManageTraining = canManageSchoolTraining(accessUser, school);
  const mayRemoveNeed = canRemoveTrainingNeed(accessUser, school);

  const [closing, setClosing] = useState(false);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpened(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function handleClose() {
    if (closing) return;
    setClosing(true);
    setOpened(false);
    setTimeout(onClose, 380);
  }

  // Transform-origin: marker position relative to modal center (which sits at 50%/50% of viewport).
  const transformOrigin = useMemo(() => {
    if (!origin || typeof window === 'undefined') return '50% 50%';
    const ox = origin.x - window.innerWidth / 2;
    const oy = origin.y - window.innerHeight / 2;
    return `${Math.round(ox)}px ${Math.round(oy)}px`;
  }, [origin]);

  const [newLaufend, setNewLaufend] = useState({ titel: '', teilnehmer: '', ende: '' });

  function addLaufend(e: React.FormEvent) {
    e.preventDefault();
    if (!mayManageTraining) return;
    if (!newLaufend.titel.trim()) return;
    onUpdateFortbildungen(school.id, {
      ...data,
      laufend: [
        ...data.laufend,
        {
          titel: newLaufend.titel.trim(),
          teilnehmer: Number(newLaufend.teilnehmer) || 0,
          ende: newLaufend.ende || '—',
        },
      ],
    });
    setNewLaufend({ titel: '', teilnehmer: '', ende: '' });
  }

  function delLaufend(i: number) {
    if (!mayManageTraining) return;
    onUpdateFortbildungen(school.id, {
      ...data,
      laufend: data.laufend.filter((_, idx) => idx !== i),
    });
  }

  function addNeed(need: TrainingNeed) {
    if (!mayCreateNeed) return;
    onUpdateFortbildungen(school.id, {
      ...data,
      bedarf: [...data.bedarf, { ...need, schoolId: school.id }],
    });
  }

  function removeNeed(id: string) {
    if (!mayRemoveNeed) return;
    onUpdateFortbildungen(school.id, {
      ...data,
      bedarf: data.bedarf.filter((n) => n.id !== id),
    });
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.adresse)}`;

  return (
    <>
      <div
        className={`detail-overlay${opened ? ' is-open' : ''}${closing ? ' is-closing' : ''}`}
        onClick={handleClose}
      />
      <div
        className={`detail${opened ? ' is-open' : ' is-collapsed'}${closing ? ' is-closing' : ''}`}
        role="dialog"
        aria-modal="true"
        style={{ transformOrigin }}
      >
        <button className="detail-close-floating" onClick={handleClose} aria-label="Schließen">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="16" height="16">
            <path d="M4 4 L12 12 M12 4 L4 12" strokeLinecap="round" />
          </svg>
        </button>

        <div className="detail-head">
          <div className="bigbadge" style={{ background: t.color }}>{t.short}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="title">{school.name}</div>
            <div className="sub">{t.label} · {school.ort} · ID {school.id}</div>
          </div>
        </div>

        <div className="detail-body">
          <>
          {/* Kontakt */}
          <div className="section">
            <div className="section-title">Kontakt</div>
            {mayViewBasicInfo ? (
              <div className="kv-grid">
              <div className="kv">
                <div className="k">Adresse</div>
                <div className="v">{school.adresse}</div>
              </div>
              <div className="kv">
                <div className="k">Schulleitung</div>
                <div className="v" style={{ color: school.leitung === '—' ? 'var(--ink-4)' : 'var(--ink)' }}>
                  {school.leitung === '—' ? 'nicht hinterlegt' : school.leitung}
                </div>
              </div>
              <div className="kv">
                <div className="k">Telefon</div>
                <div className="v">{school.tel}</div>
              </div>
              <div className="kv">
                <div className="k">Telefax</div>
                <div className="v" style={{ color: school.fax ? 'var(--ink)' : 'var(--ink-4)' }}>
                  {school.fax || '—'}
                </div>
              </div>
              <div className="kv">
                <div className="k">E-Mail</div>
                <div className="v">
                  <a href={`mailto:${school.mail}`}>{school.mail}</a>
                </div>
              </div>
              <div className="kv">
                <div className="k">Website</div>
                <div className="v" style={{ color: school.web ? 'var(--ink)' : 'var(--ink-4)' }}>
                  {school.web
                    ? <a href={`https://${school.web}`} target="_blank" rel="noopener noreferrer">{school.web}</a>
                    : 'nicht hinterlegt'}
                </div>
              </div>
            </div>
            ) : (
              <div className="access-note">
                {getAccessDeniedMessage(accessUser, 'viewSchool')}
              </div>
            )}
          </div>

          {/* Laufende Fortbildungen */}
          <div className="section">
            <div className="section-title">Aktuelle Fortbildungen ({data.laufend.length})</div>
            {mayViewTrainingNeeds ? (
            <>
            <div className="fb-list">
              {data.laufend.length === 0 && (
                <div style={{
                  padding: '14px 16px', background: 'var(--surface)',
                  border: '1px dashed var(--border-2)', borderRadius: 'var(--radius)',
                  color: 'var(--ink-3)', fontSize: 13,
                }}>
                  Noch keine Fortbildungen erfasst.
                </div>
              )}
              {data.laufend.map((fb, i) => (
                <div key={i} className="fb-item">
                  <div className="fb-icon">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                      <path d="M2 6 L8 3 L14 6 L8 9 Z" />
                      <path d="M5 7.5 V11 C 5 11.5, 6.5 12.5, 8 12.5 S 11 11.5, 11 11 V 7.5" />
                    </svg>
                  </div>
                  <div>
                    <div className="fb-title">{fb.titel}</div>
                    <div className="fb-meta">{fb.teilnehmer} Teilnehmende · bis {fb.ende}</div>
                  </div>
                  <div />
                  {mayManageTraining && (
                  <button className="fb-del" onClick={() => delLaufend(i)} title="Entfernen">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M3 5 H13 M6 5 V3 H10 V5 M5 5 V13 H11 V5" />
                    </svg>
                  </button>
                  )}
                </div>
              ))}
            </div>
            {mayManageTraining ? (
            <form className="add-form" onSubmit={addLaufend}>
              <input
                type="text"
                placeholder="Titel der Fortbildung"
                value={newLaufend.titel}
                onChange={(e) => setNewLaufend({ ...newLaufend, titel: e.target.value })}
              />
              <input
                type="number"
                placeholder="Teilnehmer"
                value={newLaufend.teilnehmer}
                onChange={(e) => setNewLaufend({ ...newLaufend, teilnehmer: e.target.value })}
              />
              <button className="btn primary" type="submit">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M8 3 V13 M3 8 H13" strokeLinecap="round" />
                </svg>
                Hinzufügen
              </button>
            </form>
            ) : (
              <div className="access-note">
                {getAccessDeniedMessage(accessUser, 'manageTraining')}
              </div>
            )}
            </>
            ) : (
              <div className="access-note">
                {getAccessDeniedMessage(accessUser, 'viewTrainingNeeds')}
              </div>
            )}
          </div>

          {/* Fortbildungsbedarf */}
          <div className="section">
            <div className="section-title">Fortbildungsbedarf ({data.bedarf.length})</div>
            {mayViewTrainingNeeds ? (
            <>
            <div className="fb-list">
              {data.bedarf.length === 0 && (
                <div style={{
                  padding: '14px 16px', background: 'var(--surface)',
                  border: '1px dashed var(--border-2)', borderRadius: 'var(--radius)',
                  color: 'var(--ink-3)', fontSize: 13,
                }}>
                  Kein Bedarf eingetragen.
                </div>
              )}
              {data.bedarf.map((b) => (
                <div key={b.id || b.topic} className="fb-item fb-need">
                  <div className="fb-icon bedarf">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                      <path d="M8 2 L14 13 H2 Z" strokeLinejoin="round" />
                      <path d="M8 6 V9 M8 11 V11.2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="fb-need-body">
                    <div className="fb-title">{b.topic}</div>
                    {b.description && (
                      <div className="fb-meta">{b.description}</div>
                    )}
                    <div className="fb-need-tags">
                      {b.targetGroup && (
                        <span className="fb-tag">{b.targetGroup}</span>
                      )}
                      <span className="fb-tag format">{FORMAT_LABELS[b.preferredFormat]}</span>
                    </div>
                  </div>
                  <div className={`fb-pill ${b.priority}`}>{PRIORITY_LABELS[b.priority]}</div>
                  {mayRemoveNeed && (
                  <button className="fb-del" onClick={() => removeNeed(b.id)} title="Entfernen">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M3 5 H13 M6 5 V3 H10 V5 M5 5 V13 H11 V5" />
                    </svg>
                  </button>
                  )}
                </div>
              ))}
            </div>
            {!mayRemoveNeed && data.bedarf.length > 0 && (
              <div className="access-note">
                {getAccessDeniedMessage(accessUser, 'removeNeed')}
              </div>
            )}
            </>
            ) : (
              <div className="access-note">
                {getAccessDeniedMessage(accessUser, 'viewTrainingNeeds')}
              </div>
            )}
            {mayCreateNeed ? (
              <TrainingNeedForm
              schoolId={school.id}
              onSubmit={addNeed}
              onCreateNeed={onCreateTrainingNeed}
              />
            ) : (
              <div className="access-note">
                {getAccessDeniedMessage(accessUser, 'createNeed')}
              </div>
            )}
          </div>
          </>
        </div>

        <div className="detail-toolbar">
          <button className="btn" onClick={() => onCompareToggle(school.id)}>
            {compared ? (
              <>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M3 8 L7 12 L13 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Im Vergleich
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
            Route planen
          </button>
          <div className="spacer" />
          <button className="btn primary" onClick={handleClose}>Schließen</button>
        </div>
      </div>
    </>
  );
}
