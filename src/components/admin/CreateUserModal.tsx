'use client';
import { useEffect, useReducer, useState } from 'react';
import type { ProfileRow, ProductionRole } from '@/lib/db/schema.types';
import type { DistrictOption, SchoolOption } from '@/lib/db/adminUserRepository';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  accessToken: string;
  onCreated:   () => void;
  onClose:     () => void;
}

type AccountType        = 'email_account' | 'local_account';
type CredentialDelivery = 'invite_link' | 'generated_password_show_admin' | 'manual_password';

interface SuccessResult {
  /** What the user types to log in (email or username). */
  loginIdentifier:   string;
  /** null = invite-link mode (no password to show). */
  temporaryPassword: string | null;
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
  accountType:           AccountType;
  credentialDelivery:    CredentialDelivery;
  email:                 string;
  username:              string;
  displayName:           string;
  role:                  ProductionRole;
  districtId:            string;
  schoolId:              string;
  schoolFilter:          string;
  manualPassword:        string;
  manualPasswordConfirm: string;
}

type FormAction =
  | { type: 'SET_ACCOUNT_TYPE';        value: AccountType }
  | { type: 'SET_CREDENTIAL_DELIVERY'; value: CredentialDelivery }
  | { type: 'SET_FIELD'; field: keyof Omit<FormState, 'role' | 'accountType' | 'credentialDelivery'>; value: string }
  | { type: 'SET_ROLE';  value: ProductionRole }
  | { type: 'RESET' };

const initialForm: FormState = {
  accountType:           'email_account',
  credentialDelivery:    'invite_link',
  email:                 '',
  username:              '',
  displayName:           '',
  role:                  'viewer',
  districtId:            '',
  schoolId:              '',
  schoolFilter:          '',
  manualPassword:        '',
  manualPasswordConfirm: '',
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_ACCOUNT_TYPE': {
      // If switching to local_account and invite_link is selected → auto-switch delivery
      const delivery = action.value === 'local_account' && state.credentialDelivery === 'invite_link'
        ? 'generated_password_show_admin' as CredentialDelivery
        : state.credentialDelivery;
      return { ...initialForm, accountType: action.value, credentialDelivery: delivery, role: state.role };
    }
    case 'SET_CREDENTIAL_DELIVERY':
      return { ...state, credentialDelivery: action.value, manualPassword: '', manualPasswordConfirm: '' };
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_ROLE':
      return { ...state, role: action.value, districtId: '', schoolId: '', schoolFilter: '' };
    case 'RESET':
      return initialForm;
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

export default function CreateUserModal({ accessToken, onCreated, onClose }: Props) {
  const [form, dispatch] = useReducer(formReducer, initialForm);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [allSchools, setAllSchools] = useState<SchoolOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<SuccessResult | null>(null);
  const [copied, setCopied] = useState(false);

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

  const filteredSchools = form.schoolFilter
    ? allSchools.filter((s) => s.districtId === form.schoolFilter)
    : allSchools;

  // ── Copy handler ───────────────────────────────────────────────────────────
  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }

  // ── Close: clear sensitive data ────────────────────────────────────────────
  function handleClose() {
    setSuccessResult(null);
    setCopied(false);
    onClose();
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side password validation for manual_password
    if (form.credentialDelivery === 'manual_password') {
      if (form.manualPassword.length < 8) {
        setError('Passwort muss mindestens 8 Zeichen lang sein.');
        return;
      }
      if (form.manualPassword !== form.manualPasswordConfirm) {
        setError('Passwörter stimmen nicht überein.');
        return;
      }
    }

    setSubmitting(true);

    // Derive districtId for school_user from the selected school
    let effectiveDistrictId: string | null = form.districtId || null;
    if (NEEDS_SCHOOL.has(form.role) && form.schoolId) {
      const sel = allSchools.find((s) => s.id === form.schoolId);
      effectiveDistrictId = sel?.districtId ?? null;
    }

    const body: Record<string, unknown> = {
      accountType:        form.accountType,
      credentialDelivery: form.credentialDelivery,
      role:               form.role,
      displayName:        form.displayName.trim() || null,
      districtId:         effectiveDistrictId,
      schoolId:           form.schoolId || null,
    };

    if (form.accountType === 'email_account') {
      body.email = form.email.trim().toLowerCase();
    } else {
      body.username = form.username.trim().toLowerCase();
    }

    if (form.credentialDelivery === 'manual_password') {
      body.password = form.manualPassword;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(body),
      });

      const responseBody = await res.json() as {
        data?:              ProfileRow;
        temporaryPassword?: string;
        loginIdentifier?:   string;
        error?:             string;
      };

      if (!res.ok) {
        setError(responseBody?.error ?? `Fehler ${res.status}`);
        setSubmitting(false);
        return;
      }

      onCreated(); // trigger list refresh

      const identifier = responseBody.loginIdentifier
        ?? (form.accountType === 'email_account' ? form.email : form.username);

      if (form.credentialDelivery === 'invite_link') {
        setSuccessResult({ loginIdentifier: identifier, temporaryPassword: null });
        // Auto-close after showing confirmation
        setTimeout(handleClose, 2000);
      } else {
        setSuccessResult({
          loginIdentifier:   identifier,
          temporaryPassword: responseBody.temporaryPassword ?? '',
        });
        // No auto-close — user must note and close manually
      }
      setSubmitting(false);
    } catch {
      setError('Netzwerkfehler — bitte erneut versuchen.');
      setSubmitting(false);
    }
  }

  // ── Success view: invite link ──────────────────────────────────────────────
  if (successResult && successResult.temporaryPassword === null) {
    return (
      <div className="login-backdrop" onClick={handleClose} role="dialog" aria-modal aria-label="Einladung gesendet">
        <div className="login-card login-card-lg" onClick={(e) => e.stopPropagation()}>
          <div className="login-head">
            <h2 className="login-title">Einladung gesendet</h2>
            <button className="btn icon" onClick={handleClose} aria-label="Schließen">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 4 L12 12 M12 4 L4 12" />
              </svg>
            </button>
          </div>
          <div className="login-form">
            <p className="login-success" role="status">
              Eine Einladung wurde an <strong>{successResult.loginIdentifier}</strong> gesendet.
              Der Link ist 24 Stunden gültig.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Success view: password modes ───────────────────────────────────────────
  if (successResult && successResult.temporaryPassword !== null) {
    const isEmail = successResult.loginIdentifier.includes('@');
    return (
      <div className="login-backdrop" onClick={handleClose} role="dialog" aria-modal aria-label="Konto erstellt">
        <div className="login-card login-card-lg" onClick={(e) => e.stopPropagation()}>
          <div className="login-head">
            <h2 className="login-title">Konto erstellt</h2>
            <button className="btn icon" onClick={handleClose} aria-label="Schließen">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 4 L12 12 M12 4 L4 12" />
              </svg>
            </button>
          </div>

          <div className="login-form" style={{ gap: '14px' }}>
            {/* Warning */}
            <div style={{
              background:   'var(--color-warn-bg, #fff8e1)',
              border:       '1px solid var(--color-warn-border, #f0c040)',
              borderRadius: '6px',
              padding:      '10px 14px',
              fontSize:     '0.85rem',
              lineHeight:   '1.5',
              color:        'var(--color-warn-text, #7a5c00)',
            }} role="alert">
              <strong>Dieses Passwort wird nur einmal angezeigt und nicht gespeichert.</strong><br />
              Bitte sicher notieren und an die betreffende Person weitergeben.<br />
              Der Nutzer wird beim ersten Login aufgefordert, das Passwort zu ändern.
            </div>

            {/* Login-Identifier */}
            <div className="login-label">
              <span style={{ fontSize: '0.8rem', opacity: 0.65, marginBottom: '4px', display: 'block' }}>
                {isEmail ? 'E-Mail' : 'Benutzerkennung'}
              </span>
              <div style={{
                fontFamily:    'monospace',
                fontSize:      '0.95rem',
                background:    'var(--color-surface, #f4f4f4)',
                borderRadius:  '6px',
                padding:       '8px 12px',
                letterSpacing: '0.03em',
              }}>
                {successResult.loginIdentifier}
              </div>
            </div>

            {/* Password with copy button */}
            <div className="login-label">
              <span style={{ fontSize: '0.8rem', opacity: 0.65, marginBottom: '4px', display: 'block' }}>
                Startpasswort
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                <div style={{
                  flex:          1,
                  fontFamily:    'monospace',
                  fontSize:      '1rem',
                  background:    'var(--color-surface, #f4f4f4)',
                  borderRadius:  '6px',
                  padding:       '8px 12px',
                  letterSpacing: '0.07em',
                  wordBreak:     'break-all',
                  lineHeight:    '1.5',
                }}>
                  {successResult.temporaryPassword}
                </div>
                <button
                  type="button"
                  className="btn compact"
                  onClick={() => handleCopy(successResult.temporaryPassword!)}
                  aria-label="Passwort kopieren"
                  style={{ flexShrink: 0, alignSelf: 'stretch' }}
                >
                  {copied ? (
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M3 8 L6.5 12 L13 4" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <rect x="5" y="5" width="8" height="9" rx="1.2" />
                      <path d="M5 5 V3.5 A1.2 1.2 0 0 1 6.2 2.3 H11 V5" />
                    </svg>
                  )}
                  {copied ? 'Kopiert' : 'Kopieren'}
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn primary"
              onClick={handleClose}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form view ──────────────────────────────────────────────────────────────
  const isDisabled   = submitting;
  const isEmailAcct  = form.accountType === 'email_account';
  const isManualPw   = form.credentialDelivery === 'manual_password';
  const showPassword = form.credentialDelivery !== 'invite_link';

  // Delivery options differ per account type
  const deliveryOptions: { value: CredentialDelivery; label: string; hint: string }[] = isEmailAcct
    ? [
        { value: 'invite_link',                  label: 'Einladungslink senden',       hint: 'Nutzer setzt Passwort selbst' },
        { value: 'generated_password_show_admin', label: 'Einmalpasswort generieren',   hint: 'Admin zeigt Zugangsdaten weiter' },
        { value: 'manual_password',               label: 'Passwort festlegen',          hint: 'Admin legt Startpasswort fest' },
      ]
    : [
        { value: 'generated_password_show_admin', label: 'Einmalpasswort generieren',   hint: 'Empfohlen' },
        { value: 'manual_password',               label: 'Passwort festlegen',          hint: 'Admin legt Startpasswort fest' },
      ];

  const modalTitle = isEmailAcct
    ? (form.credentialDelivery === 'invite_link' ? 'Benutzer einladen' : 'Benutzer erstellen')
    : 'Lokalkonto erstellen';

  return (
    <div
      className="login-backdrop"
      onClick={handleClose}
      role="dialog"
      aria-modal
      aria-label="Benutzer erstellen"
    >
      <div className="login-card login-card-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="login-head">
          <h2 className="login-title">{modalTitle}</h2>
          <button className="btn icon" onClick={handleClose} aria-label="Schließen" disabled={isDisabled}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 4 L12 12 M12 4 L4 12" />
            </svg>
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>

          {/* ── 1. Kontoart ───────────────────────────────────────────────── */}
          <SectionLabel>Kontoart</SectionLabel>
          <div style={{ display: 'flex', gap: '8px' }}>
            {([
              { value: 'email_account' as AccountType, label: 'E-Mail-Konto' },
              { value: 'local_account' as AccountType, label: 'Lokalkonto / Benutzerkennung' },
            ]).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`btn compact${form.accountType === value ? ' primary' : ''}`}
                onClick={() => dispatch({ type: 'SET_ACCOUNT_TYPE', value })}
                disabled={isDisabled}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── 2. Zugangsdaten ────────────────────────────────────────────── */}
          <SectionLabel>Zugangsdaten</SectionLabel>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {deliveryOptions.map(({ value, label, hint }) => (
              <button
                key={value}
                type="button"
                className={`btn compact${form.credentialDelivery === value ? ' primary' : ''}`}
                onClick={() => dispatch({ type: 'SET_CREDENTIAL_DELIVERY', value })}
                disabled={isDisabled}
                title={hint}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Kontexthinweis für Lokalkonto */}
          {!isEmailAcct && (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted, #666)', margin: 0 }}>
              Ohne hinterlegte E-Mail kann das Passwort nur durch einen Administrator zurückgesetzt werden.
            </p>
          )}

          {/* ── 3. Konto-Identifikator ─────────────────────────────────────── */}
          <SectionLabel>Konto</SectionLabel>

          {isEmailAcct ? (
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
                disabled={isDisabled}
                placeholder="name@schule.de"
              />
            </label>
          ) : (
            <label className="login-label">
              <span>Benutzerkennung *</span>
              <input
                className="login-input"
                type="text"
                value={form.username}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'username', value: e.target.value })}
                autoComplete="off"
                autoFocus
                required
                disabled={isDisabled}
                placeholder="z. B. schule-musterstadt"
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--color-muted, #888)', marginTop: '3px' }}>
                a–z, 0–9, Punkt, Bindestrich, Unterstrich · mind. 3 Zeichen
              </span>
            </label>
          )}

          {/* Anzeigename */}
          <label className="login-label">
            <span>Anzeigename (optional)</span>
            <input
              className="login-input"
              type="text"
              value={form.displayName}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'displayName', value: e.target.value })}
              disabled={isDisabled}
              placeholder="z. B. Maria Muster"
            />
          </label>

          {/* ── 4. Berechtigung ────────────────────────────────────────────── */}
          <SectionLabel>Berechtigung</SectionLabel>

          {/* Rolle */}
          <label className="login-label">
            <span>Rolle *</span>
            <select
              className="login-input"
              value={form.role}
              onChange={(e) => dispatch({ type: 'SET_ROLE', value: e.target.value as ProductionRole })}
              required
              disabled={isDisabled}
            >
              {ROLE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          {/* Bezirk */}
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

          {/* Schule */}
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
                    {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
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

          {/* ── 5. Passwort (manual_password only) ────────────────────────── */}
          {isManualPw && (
            <>
              <SectionLabel>Passwort</SectionLabel>

              <label className="login-label">
                <span>Startpasswort *</span>
                <input
                  className="login-input"
                  type="password"
                  value={form.manualPassword}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'manualPassword', value: e.target.value })}
                  autoComplete="new-password"
                  required
                  disabled={isDisabled}
                  placeholder="Mind. 8 Zeichen"
                />
              </label>

              <label className="login-label">
                <span>Passwort wiederholen *</span>
                <input
                  className="login-input"
                  type="password"
                  value={form.manualPasswordConfirm}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'manualPasswordConfirm', value: e.target.value })}
                  autoComplete="new-password"
                  required
                  disabled={isDisabled}
                />
              </label>

              <p style={{ fontSize: '0.8rem', color: 'var(--color-muted, #666)', margin: 0 }}>
                Mindestens 8 Zeichen. Der Nutzer muss das Passwort beim ersten Login ändern.
              </p>
            </>
          )}

          {/* Hint for generated password */}
          {showPassword && !isManualPw && (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted, #666)', margin: 0 }}>
              Ein sicheres Startpasswort wird automatisch generiert und nach der Erstellung einmalig angezeigt.
            </p>
          )}

          {/* Feedback */}
          {error && <p className="login-error" role="alert">{error}</p>}

          {/* Submit */}
          <button
            className="btn primary"
            type="submit"
            disabled={isDisabled}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {submitting
              ? 'Wird erstellt …'
              : form.credentialDelivery === 'invite_link'
                ? 'Einladung senden'
                : 'Konto erstellen'
            }
          </button>
        </form>
      </div>
    </div>
  );
}
