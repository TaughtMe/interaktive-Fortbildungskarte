import { getDistrictIdForSchoolLocation } from '@/lib/districts/districtAssignments';
import type { School } from '@/types';
import type { DemoUser, Role } from '@/types/auth';
import { DEMO_USERS, normalizeRole } from '@/types/auth';

export type AccessUser = Pick<DemoUser, 'role' | 'districtId' | 'schoolId'> | null | undefined;

export const DEMO_ACCESS_CONTROL_NOTICE =
  'Demo-Zugriffskontrolle: Nur zur funktionalen Vorschau, nicht produktiv sicher.';

function sameDistrict(user: AccessUser, districtId: string | null | undefined): boolean {
  if (!user || !districtId) return false;
  const role = normalizeRole(user.role);
  if (role === 'superadmin') return true;
  return user.districtId === districtId;
}

function getSchoolDistrictId(school: School): string | null {
  return school.districtId ?? getDistrictIdForSchoolLocation(school);
}

function isOwnSchool(user: AccessUser, schoolId: string | null | undefined): boolean {
  return Boolean(user?.schoolId && schoolId && user.schoolId === schoolId);
}

export function canViewDistrict(user: AccessUser, districtId: string): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'superadmin') return true;
  if (role === 'district_admin' || role === 'coordinator' || role === 'viewer') {
    return sameDistrict(user, districtId);
  }
  return false;
}

export function canManageDistrict(user: AccessUser, districtId: string): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'superadmin') return true;
  if (role === 'district_admin') return sameDistrict(user, districtId);
  return false;
}

export function canCoordinateDistrict(user: AccessUser, districtId: string): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'superadmin') return true;
  if (role === 'coordinator') return sameDistrict(user, districtId);
  return false;
}

export function canOpenSchoolPin(user: AccessUser, school: School): boolean {
  const role = normalizeRole(user?.role ?? 'public');
  if (role === 'public' || role === 'viewer' || role === 'superadmin') return true;
  if (role === 'school_user') return true;
  if (role === 'district_admin' || role === 'coordinator') {
    return sameDistrict(user, getSchoolDistrictId(school));
  }
  return false;
}

export function canViewSchoolBasicInfo(user: AccessUser, school: School): boolean {
  const role = normalizeRole(user?.role ?? 'public');
  if (role === 'public' || role === 'viewer' || role === 'superadmin') return true;
  if (role === 'school_user') return true;
  if (role === 'district_admin' || role === 'coordinator') {
    return sameDistrict(user, getSchoolDistrictId(school));
  }
  return false;
}

export function canViewSchool(user: AccessUser, school: School): boolean {
  return canViewSchoolBasicInfo(user, school);
}

export function canViewTrainingNeeds(user: AccessUser, school: School): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'superadmin') return true;
  if (role === 'school_user') return isOwnSchool(user, school.id);
  if (role === 'viewer') return true;
  if (role === 'district_admin' || role === 'coordinator') {
    return sameDistrict(user, getSchoolDistrictId(school));
  }
  return false;
}

export function canCreateTrainingNeed(user: AccessUser, schoolId: string, school?: School): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'superadmin') return true;
  if (role === 'school_user') return isOwnSchool(user, schoolId);
  if (role === 'district_admin' && school) return sameDistrict(user, getSchoolDistrictId(school));
  return false;
}

export function canManageSchoolTraining(user: AccessUser, school: School): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'superadmin') return true;
  if (role === 'district_admin') return sameDistrict(user, getSchoolDistrictId(school));
  if (role === 'school_user') return isOwnSchool(user, school.id);
  return false;
}

export function canRemoveTrainingNeed(user: AccessUser, school: School): boolean {
  return canManageSchoolTraining(user, school);
}

export function canExportTrainingNeeds(user: AccessUser, districtId: string): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'superadmin') return true;
  if (role === 'district_admin' || role === 'coordinator') {
    return sameDistrict(user, districtId);
  }
  return false;
}

export function filterSchoolsForUser(user: AccessUser, schools: School[]): School[] {
  return schools.filter((school) => canViewSchoolBasicInfo(user, school));
}

export function getAccessDeniedMessage(
  user: AccessUser,
  action: 'openPin' | 'viewSchool' | 'viewTrainingNeeds' | 'createNeed' | 'manageTraining' | 'removeNeed' | 'export',
): string {
  const role = user ? normalizeRole(user.role) : 'public';
  if (action === 'openPin') {
    if (role === 'coordinator' || role === 'district_admin') return 'Diese Demo-Rolle darf nur Schulen im eigenen Demo-Bezirk öffnen.';
    return 'Diese Demo-Rolle darf diesen Pin nicht öffnen.';
  }
  if (action === 'viewSchool') {
    if (role === 'coordinator' || role === 'district_admin') return 'Basisdaten sind nur fuer Schulen im eigenen Demo-Bezirk sichtbar.';
    return 'Basisdaten sind fuer diese Demo-Rolle nicht sichtbar.';
  }
  if (action === 'viewTrainingNeeds') {
    if (role === 'public') return 'Oeffentliche Demo-Ansicht: Fortbildungsdaten sind ausgeblendet.';
    if (role === 'school_user') return 'Diese Demo-Rolle darf Fortbildungsdaten nur fuer die eigene Demo-Schule sehen.';
    return 'Diese Demo-Rolle darf Fortbildungsdaten fuer diese Schule nicht sehen.';
  }
  if (action === 'createNeed') {
    if (role === 'viewer') return 'Lesender Zugriff: Bedarfsmeldungen sind fuer diese Demo-Rolle gesperrt.';
    if (role === 'school_user') return 'Diese Demo-Rolle darf Bedarf nur fuer die eigene Demo-Schule melden.';
    return 'Diese Demo-Rolle darf keinen Fortbildungsbedarf fuer diese Schule melden.';
  }
  if (action === 'removeNeed') return 'Diese Demo-Rolle darf Bedarfsmeldungen fuer diese Schule nicht entfernen.';
  if (action === 'export') return 'Diese Demo-Rolle darf keine Bedarfsmeldungen exportieren.';
  return 'Diese Demo-Rolle darf Fortbildungsdaten fuer diese Schule nicht bearbeiten.';
}

export function getRoleCapabilitySummary(role: Role): string {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'superadmin') return 'Darf alle Schulen, Bezirke, Bedarfsmeldungen und Exporte nutzen.';
  if (normalizedRole === 'district_admin') return 'Darf den eigenen Bezirk verwalten und Bedarfsmeldungen dort exportieren.';
  if (normalizedRole === 'coordinator') return 'Darf Bedarfsmeldungen im eigenen Bezirk sichten und exportieren.';
  if (normalizedRole === 'school_user') return 'Darf nur die eigene Demo-Schule nutzen und dort Bedarf melden.';
  if (normalizedRole === 'viewer') return 'Darf Schulen und Fortbildungsdaten lesen, ohne Formulare oder Exporte.';
  return 'Oeffentliche Demo-Ansicht ohne Schreibrechte.';
}

export function isReadOnlyRole(role: Role): boolean {
  return normalizeRole(role) === 'viewer';
}

export function resolveDemoAccessUserFromRequest(request: Request): AccessUser {
  if (process.env.NODE_ENV === 'production') return null;

  const url = new URL(request.url);
  const rawRole = request.headers.get('x-demo-role') ?? url.searchParams.get('demoRole');
  if (!rawRole || !(rawRole in DEMO_USERS)) return null;

  return DEMO_USERS[rawRole as Role];
}
