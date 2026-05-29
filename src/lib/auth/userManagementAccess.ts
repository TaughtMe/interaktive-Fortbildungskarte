import type { AccessUser } from '@/lib/auth/accessControl';
import { normalizeRole } from '@/types/auth';
import type { ProfileRow, ProductionRole } from '@/lib/db/schema.types';

/**
 * Access control for Benutzerverwaltung (user management).
 *
 * All functions take an `actor` (the authenticated user performing the action)
 * and answer specific authorization questions. These checks run server-side and
 * always complement — never replace — resolveAuthenticatedUser().
 *
 * Role matrix (V–VI light pilot):
 *   superadmin     — full access: list/view/create/update all profiles, all roles
 *   district_admin — view own district profiles only; cannot create (pilot)
 *   coordinator    — view own district profiles only; cannot create (pilot)
 *   school_user    — view own school's profiles only; cannot create (pilot)
 *   viewer         — no access
 *   null/undefined — no access
 *
 * TODO (post-pilot): enable district_admin / coordinator creation when approved.
 */

// ── List ──────────────────────────────────────────────────────────────────────

/** True if the actor may access the user list at any scope. */
export function canListUsers(actor: AccessUser): boolean {
  if (!actor) return false;
  const r = normalizeRole(actor.role);
  return (
    r === 'superadmin' ||
    r === 'district_admin' ||
    r === 'coordinator' ||
    r === 'school_user'
  );
}

// ── View ──────────────────────────────────────────────────────────────────────

/**
 * True if the actor may view a specific profile row.
 *
 * Scope:
 *   superadmin     — any profile
 *   district_admin — same district (profile.district_id === actor.districtId)
 *   coordinator    — same district
 *   school_user    — same school (profile.school_id === actor.schoolId)
 */
export function canViewProfile(actor: AccessUser, target: ProfileRow): boolean {
  if (!actor) return false;
  const r = normalizeRole(actor.role);

  if (r === 'superadmin') return true;

  if (r === 'district_admin' || r === 'coordinator') {
    return !!actor.districtId && target.district_id === actor.districtId;
  }

  if (r === 'school_user') {
    return !!actor.schoolId && target.school_id === actor.schoolId;
  }

  return false;
}

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * True if the actor may create a new user.
 *
 * V–VI light pilot: only superadmin is permitted.
 * district_admin / coordinator support is planned but not yet enabled.
 *
 * @param _targetRole        Reserved — will be used when sub-role creation is enabled.
 * @param _targetDistrictId  Reserved.
 * @param _targetSchoolId    Reserved.
 */
export function canCreateUser(
  actor: AccessUser,
  _targetRole: ProductionRole,
  _targetDistrictId: string | null,
  _targetSchoolId: string | null,
): boolean {
  if (!actor) return false;
  // Pilot: superadmin only.
  // TODO (post-pilot): re-enable district_admin / coordinator branches.
  return normalizeRole(actor.role) === 'superadmin';
}

/**
 * Returns the roles the actor may assign when creating a new user.
 *
 * V–VI light pilot: only superadmin may create, and may assign all roles.
 */
export function getAllowedRolesForCreation(actor: AccessUser): ProductionRole[] {
  if (!actor) return [];
  // Pilot: superadmin only.
  if (normalizeRole(actor.role) === 'superadmin') {
    return ['superadmin', 'district_admin', 'coordinator', 'school_user', 'viewer'];
  }
  // TODO (post-pilot): district_admin → ['district_admin', 'coordinator', 'school_user', 'viewer']
  // TODO (post-pilot): coordinator   → ['coordinator', 'school_user', 'viewer']
  return [];
}

// ── Update ────────────────────────────────────────────────────────────────────

/**
 * True if the actor may update a profile (role, display_name, active, assignments).
 *
 * Invariant: an actor cannot manage profiles with a role above their own creation
 * authority (e.g. a coordinator cannot edit a district_admin profile).
 */
export function canUpdateProfile(actor: AccessUser, target: ProfileRow): boolean {
  if (!actor) return false;
  const r = normalizeRole(actor.role);

  if (r === 'superadmin') return true;

  if (r === 'district_admin') {
    if (!actor.districtId || target.district_id !== actor.districtId) return false;
    // Cannot touch superadmin profiles
    return target.role !== 'superadmin';
  }

  if (r === 'coordinator') {
    if (!actor.districtId || target.district_id !== actor.districtId) return false;
    // Coordinators may only manage school_user and viewer profiles
    return target.role === 'school_user' || target.role === 'viewer';
  }

  return false;
}
