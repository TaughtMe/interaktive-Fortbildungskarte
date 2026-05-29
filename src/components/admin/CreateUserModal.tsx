'use client';
import { useEffect, useReducer, useState } from 'react';
import type { ProductionRole } from '@/lib/db/schema.types';
import type { DistrictOption, SchoolOption } from '@/lib/db/adminUserRepository';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  /** Bearer token — must be a real superadmin session token. */
  accessToken: string;
  onCreated: () => void;
  onClose: () => void;
}

const ROLE_OPTIONS: { value: ProductionRole; label: string }[] = [
  { value: 'superadmin',     label: 'Superadmin' },
  { value: 'district_admin', label: 'Bezirksverwaltung' },
  { value: 'coordinator',    label: 'Koordination' },
  { value: 'school_user',    label: 'Schule' },
  { value: 'viewer',         label: 'Lesend' },
];

/** Roles that require a district assignment. */
const NEEDS_DISTRICT = new Set<ProductionRole>(['district_admin', 'coordinator']);
/** Roles that require a school assignment. */
const NEEDS_SCHOOL   = new Set<ProductionRole>(['school_user']);

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  email:        string;
  displayName:  string;
  role:         ProductionRole;
  districtId:   string;
  schoolId:     string;
  /** UI-only filter: district used to narrow the school list for school_user. */
  schoolFilter: string;
}

type FormAction =
  | { type: 'SET_FIELD'; field: keyof Omit<FormState, 'role'>; value: string }
  | { type: 'SET_ROLE';  value: ProductionRole }
  | { type: 'RESET' };

const initialForm: FormState = {
  email:        '',
  displayName:  '',
  role:         'viewer',
  districtId:   '',
  schoolId:     '',
  schoolFilter: '',
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_ROLE':
      // Clear dependent fields when role changes
      return { ...state, role: action.value, districtId: '', schoolId: '', schoolFilter: '' };
    case 'RESET':
      return initialForm;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CreateUserModal({ accessToken, onCreated, onClose }: Props) {
  const [form, dispatch] = useReducer(formReducer, initialForm);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [allSchools, setAllSchools] = useState<SchoolOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ── Load dropdown options once on mount ────────────────────────────────────
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
      .catch(() => {
        if (!cancelled) setOptionsLoading(false);
      });

    return () => { cancelled = true; };
  }, [accessToken]);

  // ── Derived school list ────────────────────────────────────────────────────
  const filteredSchools = form.schoolFilter
    ? allSchools.filter((s) => s.districtId === form.schoolFilter)
    : allSchools;

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Derive districtId for school_user from the selected school
    let effectiveDistrictId: string | null = form.districtId || null;
    if (NEEDS_SCHOOL.has(form.role) && form.schoolId) {
      const selectedSchool = allSchools.find((s) => s.id === form.schoolId);
      effectiveDistrictId = selectedSchool?.districtId ?? null;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          email:       form.email.trim().toLowerCase(),
          displayName: form.displayName.trim() || null,
          role:        form.role,
          districtId:  effectiveDistrictId,
          schoolId:    form.schoolId || null,
        }),
      });

      const body = await res.json() as { error?: string };

      if (!res.ok) {
        setError(body?.error ?? `Fehler ${res.status}`);
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setSubmitting(false);
      onCreated();

      // Close after brief success display
      setTimeout(onClose, 1200);
    } catch {
      setError('Netzwerkfehler — bitte erneut versuchen.');
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="login-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label="Benutzer erstellen"
    >
      <div
        className="login-card login-card-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="login-head">
          <h2 className="login-title">Benutzer einladen</h2>
          <button className="btn icon" onClick={onClose} aria-label="Schließen" disabled={submitting}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 4 L12 12 M12 4 L4 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {/* E-Mail */}
          <label className="login-label">
            <span>E-Mail *</span>
            <input
              className="login-input"
              type="email"
              value={form.email}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'email', value: e.target.value })}
              autoComplete="off"
              autoFocus
              required
              disabled={submitting || success}
              placeholder="name@schule.de"
            />
          </label>

          {/* Anzeigename */}
          <label className="login-label">
            <span>Anzeigename (optional)</span>
            <input
              className="login-input"
              type="text"
              value={form.displayName}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'displayName', value: e.target.value })}
              disabled={submitting || success}
              placeholder="z. B. Maria Muster"
            />
          </label>

          {/* Rolle */}
          <label className="login-label">
            <span>Rolle *</span>
            <select
              className="login-input"
              value={form.role}
              onChange={(e) => dispatch({ type: 'SET_ROLE', value: e.target.value as ProductionRole })}
              required
              disabled={submitting || success}
            >
              {ROLE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          {/* Bezirk — required for district_admin / coordinator */}
          {NEEDS_DISTRICT.has(form.role) && (
            <label className="login-label">
              <span>Bezirk *</span>
              <select
                className="login-input"
                value={form.districtId}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'districtId', value: e.target.value })}
                required
                disabled={submitting || success || optionsLoading}
              >
                <option value="">
                  {optionsLoading ? 'Wird geladen …' : '— Bezirk wählen —'}
                </option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
          )}

          {/* Schule — required for school_user */}
          {NEEDS_SCHOOL.has(form.role) && (
            <>
              {/* Optional district pre-filter for the school list */}
              {districts.length > 0 && (
                <label className="login-label">
                  <span>Bezirk (Filterhilfe)</span>
                  <select
                    className="login-input"
                    value={form.schoolFilter}
                    onChange={(e) => {
                      dispatch({ type: 'SET_FIELD', field: 'schoolFilter', value: e.target.value });
                      dispatch({ type: 'SET_FIELD', field: 'schoolId', value: '' });
                    }}
                    disabled={submitting || success || optionsLoading}
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
                  disabled={submitting || success || optionsLoading}
                >
                  <option value="">
                    {optionsLoading ? 'Wird geladen …' : '— Schule wählen —'}
                  </option>
                  {filteredSchools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.ort} — {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {/* Feedback */}
          {error && (
            <p className="login-error" role="alert">{error}</p>
          )}
          {success && (
            <p className="login-success" role="status">
              Einladung wurde gesendet. Das Modal schließt sich automatisch.
            </p>
          )}

          {/* Submit */}
          <button
            className="btn primary"
            type="submit"
            disabled={submitting || success}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {submitting ? 'Wird eingeladen …' : 'Einladen'}
          </button>
        </form>
      </div>
    </div>
  );
}
