'use client';
import { useState } from 'react';
import type { TrainingNeed, TrainingNeedFormat, TrainingNeedPriority } from '@/types/trainingNeed';
import { FORMAT_LABELS, PRIORITY_LABELS } from '@/types/trainingNeed';
import * as trainingNeedService from '@/lib/services/trainingNeedService';

interface Props {
  schoolId: string;
  onSubmit: (need: TrainingNeed) => void;
}

const FORMAT_OPTIONS: TrainingNeedFormat[]   = ['praesenz', 'online', 'schilf', 'beratung'];
const PRIORITY_OPTIONS: TrainingNeedPriority[] = ['hoch', 'mittel', 'niedrig'];

const EMPTY_FORM = {
  topic:           '',
  description:     '',
  priority:        'mittel' as TrainingNeedPriority,
  targetGroup:     '',
  preferredFormat: 'praesenz' as TrainingNeedFormat,
};

export default function TrainingNeedForm({ schoolId, onSubmit }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [open, setOpen] = useState(false);

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.topic.trim()) return;
    onSubmit(trainingNeedService.createTrainingNeed(schoolId, {
      topic:           form.topic.trim(),
      description:     form.description.trim(),
      priority:        form.priority,
      targetGroup:     form.targetGroup.trim(),
      preferredFormat: form.preferredFormat,
    }));
    setForm(EMPTY_FORM);
    setOpen(false);
  }

  if (!open) {
    return (
      <button className="btn" style={{ marginTop: 8 }} onClick={() => setOpen(true)}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M8 3 V13 M3 8 H13" strokeLinecap="round" />
        </svg>
        Bedarf melden
      </button>
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
          placeholder="z. B. Alle Lehrkräfte, Schulleitung, Jgst. 1–4 …"
          value={form.targetGroup}
          onChange={(e) => set('targetGroup', e.target.value)}
        />
      </div>

      <div className="tnf-actions">
        <button type="button" className="btn" onClick={() => { setOpen(false); setForm(EMPTY_FORM); }}>
          Abbrechen
        </button>
        <button type="submit" className="btn primary">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 8 L7 12 L13 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Melden
        </button>
      </div>
    </form>
  );
}
