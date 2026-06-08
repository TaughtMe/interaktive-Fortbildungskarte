'use client';
import { useEffect, useReducer, useState } from 'react';
import type { ProfileRow, ProductionRole } from '@/lib/db/schema.types';
import type { DistrictOption, SchoolOption } from '@/lib/db/adminUserRepository';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  user:        ProfileRow;
  accessToken: string;
  onSaved:     (updated: ProfileRow) => void;
  onClose:     () => void;
}

const ROLE_OPTIONS: { value: ProductionRole; label: string }[] = [
  { value: 'superadmin',     label: 'Superadmin' },
  { value: 'district_admin', label: 'Bezirksverwaltung' },
  { value: 'coordinator',    label: 'Koordination' },
  { value: 'school_user',    label: 'Schule' },
  { value: 'viewer',         label: 'Lesend' },
];

const NEEDS_DISTRICT = new Set<ProductionRole>(['district_admin', 'coordinator']);
const NEEDS_SCHOOL   = new Set<ProductionRole>(['school_user']);

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  displayName:  string;
  role:         ProductionRole;
  districtId:   string;
  schoolId:     string;
  schoolFilter: string;
  realEmail:    string;
  username:     string;
}

type FormAction =
  | { type: 'SET_FIELD'; field: keyof Omit<FormState, 'role'>; value: string }
  | { type: 'SET_ROLE';  value: ProductionRole };

function buildInitialForm(user: ProfileRow): FormState {
  return {
    displayName:  user.display_name  ?? '',
    role:         user.role,
    districtId:   user.district_id   ?? '',
    schoolId:     user.school_id     ?? '',
    schoolFilter: user.district_id   ?? '',
    realEmail:    user.real_email     ?? '',
    username:     user.username       ?? '',
  };
}

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_ROLE':
      // When role changes, reset scope fields (they may no longer apply)
      return {
        ...state,
        role:         action.value,
        districtId:   '',
        schoolId:     '',
        schoolFilter: '',
      };
  }
}

// ── Section label helper ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize:      '0.73rem',
      fontWeight:    700,
      letterSpacing: '0.07em',
      textTransform: 'uppercase',
      opacity:       0.45,
      paddingTop:    '6px',
    }}>
      {children}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditUserModal({ user, accessToken, onSaved, onClose }: Props) {
  const [form, dispatch] = useReducer(formReducer, buildInitialForm(user));

  const [districts,     setDistricts]     = useState<DistrictOption[]>([]);
  const [allSchools,    setAllSchools]    = useState<SchoolOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // ── Load dropdown options ──────────────────────────────────────────────────
  useEffect(() => {
    const headers = { 'Authorization': `Bearer ${accessToken}` };
    let cancelled = false;

    Promise.all([
      fetch('/api/admin/districts', { headers }).then((r) => r.json()),
      fetch('/api/admin/schools',   { headers }).then((r) => r.json()),
    ])
      .then(([dRes, sRes]: [{ data?: DistrictOption[] }, { data?: SchoolOption[] }]) => {
        if (!cancelled) {
          setDistricts(dRes?.data ?? []);
          setAllSchools(sRes?.data ?? []);
          setOptionsLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setOptionsLoading(false); });

    return () => { cancelled = true; };
  }, [accessToken]);

  // ── Filtered schools ───────────────────────────────────────────────────────
  const filteredSchools = form.schoolFilter
    ? allSchools.filter((s) => s.districtId === form.schoolFilter)
    : allSchools;

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Build the PATCH body — only include fields that changed
    const body: Record<string, unknown> = {};

    const trimmedDisplayName = form.displayName.trim();
    const newDisplayName = trimmedDisplayName || null;
    if (newDisplayName !== (user.display_name ?? null)) {
      body.displayName = newDisplayName;
    }

    if (form.role !== user.role) {
      body.role = form.role;
    }

    const newDistrictId = form.districtId || null;
    if (newDistrictId !== (user.district_id ?? null)) {
      body.districtId = newDistrictId;
    }

    const newSchoolId = form.schoolId || null;
    if (newSchoolId !== (user.school_id ?? null)) {
      body.schoolId = newSchoolId;
    }

    const trimmedRealEmail = form.realEmail.trim().toLowerCase();
    const newRealEmail = trimmedRealEmail || null;
    if (newRealEmail !== (user.real_email ?? null)) {
      body.realEmail = newRealEmail;
    }

    const trimmedUsername = form.username.trim().toLowerCase();
    const newUsername = trimmedUsername || null;
    if (newUsername !== (user.username ?? null)) {
      body.username = newUsername;
    }

    if (Object.keys(body).length === 0) {
      // Nothing changed — close without a request
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method:  'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(body),
      });

      const responseBody = await res.json() as { data?: ProfileRow; error?: string };

      if (!res.ok) {
        setError(responseBody?.error ?? `Fehler ${res.status}`);
        setSubmitting(false);
        return;
      }

      if (responseBody.data) {
        onSaved(responseBody.data);
      }
    } catch {
      setError('Netzwerkfehler — bitte erneut versuchen.');
      setSubmitting(false);
    }
  }

  // ── Display label for user identity ───────────────────────────────────────
  const userLabel = user.display_name ?? user.username ?? user.email;
  const isSelf = false; // Server enforces self-protection; no client-side block needed

  const isDisabled = submitting;

  return (
    <div
      className="login-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label="Benutzer bearbeiten"
    >
      <div className="login-card login-card-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="login-head">
          <h2 className="login-title">Benutzer bearbeiten</h2>
          <button className="btn icon" onClick={onClose} aria-label="Schließen" disabled={isDisabled}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 4 L12 12 M12 4 L4 12" />
            </svg>
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>

          {/* Readonly info */}
          <div style={{
            fontSize:     '0.82rem',
            color:        'var(--color-muted, #666)',
            padding:      '6px 10px',
            background:   'var(--color-surface, #f4f4f4)',
            borderRadius: '6px',
            lineHeight:   '1.5',
          }}>
            <strong>{userLabel}</strong>
            {user.is_local_account ? (
              <span style={{ marginLeft: 8 }}>· Lokalkonto</span>
            ) : (
              <span style={{ marginLeft: 8, fontFamily: 'monospace', fontSize: '0.8rem' }}>{user.email}</span>
            )}
          </div>

          {/* ── Anzeigename ───────────────────────────────────────────────── */}
          <SectionLabel>Profil</SectionLabel>

          <label className="login-label">
            <span>Anzeigename</span>
            <input
              className="login-input"
              type="text"
              value={form.displayName}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'displayName', value: e.target.value })}
              disabled={isDisabled}
              placeholder="z. B. Maria Muster"
              autoFocus
            />
          </label>

          {/* Benutzerkennung */}
          <label className="login-label">
            <span>Benutzerkennung</span>
            <input
              className="login-input"
              type="text"
              value={form.username}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'username', value: e.target.value })}
              disabled={isDisabled}
              placeholder={user.is_local_account ? 'z. B. schule-musterstadt' : 'optional'}
              autoComplete="off"
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--color-muted, #888)', marginTop: '2px' }}>
              a–z, 0–9, Punkt, Bindestrich, Unterstrich
            </span>
          </label>

          {/* Echte E-Mail */}
          <label className="login-label">
            <span>Kontakt-E-Mail</span>
            <input
              className="login-input"
              type="email"
              value={form.realEmail}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'realEmail', value: e.target.value })}
              disabled={isDisabled}
              placeholder="name@schule.de (für Passwort-Reset)"
              autoComplete="off"
            />
          </label>

          {/* ── Berechtigung ───────────────────────────────────────────────── */}
          <SectionLabel>Berechtigung</SectionLabel>

          <label className="login-label">
            <span>Rolle</span>
            <select
              className="login-input"
              value={form.role}
              onChange={(e) => dispatch({ type: 'SET_ROLE', value: e.target.value as ProductionRole })}
              disabled={isDisabled || isSelf}
            >
              {ROLE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          {/* Bezirk — only when role requires it */}
          {NEEDS_DISTRICT.has(form.role) && (
            <label className="login-label">
              <span>Bezirk *</span>
              <select
                className="login-input"
                value={form.districtId}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'districtId', value: e.target.value })}
                required
                disabled={isDisabled || optionsLoading}
              >
                <option value="">{optionsLoading ? 'Wird geladen …' : '— Bezirk wählen —'}</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
          )}

          {/* Schule — only when role requires it */}
          {NEEDS_SCHOOL.has(form.role) && (
            <>
              {districts.length > 0 && (
                <label className="login-label">
                  <span>Bezirk (Filterhilfe)</span>
                  <select
                    className="login-input"
                    value={form.schoolFilter}
                    onChange={(e) => {
                      dispatch({ type: 'SET_FIELD', field: 'schoolFilter', value: e.target.value });
                      dispatch({ type: 'SET_FIELD', field: 'schoolId',     value: '' });
                    }}
                    disabled={isDisabled || optionsLoading}
                  >
                    <option value="">Alle Bezirke</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </label>
              )}

              <label className="login-label">
                <span>Schule *</span>
                <select
                  className="login-input"
                  value={form.schoolId}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'schoolId', value: e.target.value })}
                  required
                  disabled={isDisabled || optionsLoading}
                >
                  <option value="">{optionsLoading ? 'Wird geladen …' : '— Schule wählen —'}</option>
                  {filteredSchools.map((s) => (
                    <option key={s.id} value={s.id}>{s.ort} — {s.name}</option>
                  ))}
                </select>
              </label>
            </>
          )}

          {/* Feedback */}
          {error && <p className="login-error" role="alert">{error}</p>}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn"
              onClick={onClose}
              disabled={isDisabled}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              Abbrechen
            </button>
            <button
              className="btn primary"
              type="submit"
              disabled={isDisabled}
              style={{ flex: 2, justifyContent: 'center' }}
            >
              {submitting ? 'Wird gespeichert …' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
