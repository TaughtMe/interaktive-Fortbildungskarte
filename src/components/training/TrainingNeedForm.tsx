'use client';
import { useState } from 'react';
import type { TrainingNeed, TrainingNeedFormat, TrainingNeedPriority } from '@/types/trainingNeed';
import { FORMAT_LABELS, PRIORITY_LABELS } from '@/types/trainingNeed';

interface Props {
  schoolId: string;
  onSubmit: (need: TrainingNeed) => void;
  onCreateNeed: (
    schoolId: string,
    input: Omit<TrainingNeed, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>,
    schoolCode: string,
  ) => Promise<TrainingNeed> | TrainingNeed;
}

const FORMAT_OPTIONS: TrainingNeedFormat[]   = ['praesenz', 'online', 'schilf', 'beratung'];
const PRIORITY_OPTIONS: TrainingNeedPriority[] = ['hoch', 'mittel', 'niedrig'];

const EMPTY_FORM = {
  topic:           '',
  description:     '',
  priority:        'mittel' as TrainingNeedPriority,
  targetGroup:     '',
  preferredFormat: 'praesenz' as TrainingNeedFormat,
  schoolCode:      '',
};

export default function TrainingNeedForm({ schoolId, onSubmit, onCreateNeed }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.topic.trim() || !form.description.trim() || !form.targetGroup.trim() || !form.schoolCode.trim()) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const need = await onCreateNeed(schoolId, {
        topic:           form.topic.trim(),
        description:     form.description.trim(),
        priority:        form.priority,
        targetGroup:     form.targetGroup.trim(),
        preferredFormat: form.preferredFormat,
      }, form.schoolCode);
      onSubmit(need);
      setForm(EMPTY_FORM);
      setOpen(false);
      setMessage('Bedarf wurde gespeichert');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Speichern fehlgeschlagen';
      setMessage(message.includes('Invalid or expired school access code') ? 'Der Zugriffscode ist ungültig oder abgelaufen.' : message);
    } finally {
      setIsSaving(false);
    }
  }

  if (!open) {
    return (
      <>
        <button className="btn" style={{ marginTop: 8 }} onClick={() => { setOpen(true); setMessage(null); }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M8 3 V13 M3 8 H13" strokeLinecap="round" />
          </svg>
          Bedarf melden
        </button>
        {message && <div className="tnf-message">{message}</div>}
      </>
    );
  }

  return (
    <form className="training-need-form" onSubmit={handleSubmit}>
      <div className="tnf-title">Neuen Fortbildungsbedarf melden</div>

      <div className="tnf-field">
        <label>Thema / Bereich *</label>
        <input
          type="text"
          required
          placeholder="z. B. KI im Schulalltag, Lese-Rechtschreib-Förderung …"
          value={form.topic}
          onChange={(e) => set('topic', e.target.value)}
        />
      </div>

      <div className="tnf-field">
        <label>Kurze Beschreibung</label>
        <textarea
          rows={2}
          required
          placeholder="Was genau wird benötigt? Für wen?"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </div>

      <div className="tnf-row">
        <div className="tnf-field">
          <label>Priorität</label>
          <select
            value={form.priority}
            onChange={(e) => set('priority', e.target.value as TrainingNeedPriority)}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </select>
        </div>

        <div className="tnf-field">
          <label>Gewünschtes Format</label>
          <select
            value={form.preferredFormat}
            onChange={(e) => set('preferredFormat', e.target.value as TrainingNeedFormat)}
          >
            {FORMAT_OPTIONS.map((f) => (
              <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="tnf-field">
        <label>Zielgruppe</label>
        <input
          type="text"
          required
          placeholder="z. B. Alle Lehrkräfte, Schulleitung, Jgst. 1–4 …"
          value={form.targetGroup}
          onChange={(e) => set('targetGroup', e.target.value)}
        />
      </div>

      <div className="tnf-field">
        <label>Schul-Zugriffscode *</label>
        <input
          type="text"
          required
          autoComplete="off"
          placeholder="Zugriffscode eingeben"
          value={form.schoolCode}
          onChange={(e) => set('schoolCode', e.target.value)}
        />
        <small>Den Zugriffscode erhält die Schule vom Schulamt.</small>
      </div>

      <div className="tnf-actions">
        <button type="button" className="btn" disabled={isSaving} onClick={() => { setOpen(false); setForm(EMPTY_FORM); }}>
          Abbrechen
        </button>
        <button type="submit" className="btn primary" disabled={isSaving}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 8 L7 12 L13 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {isSaving ? 'Speichert …' : 'Melden'}
        </button>
      </div>
      {message && <div className="tnf-message">{message}</div>}
    </form>
  );
}
