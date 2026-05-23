import { SCHULEN } from '@/data/schools';
import { getDistrictIdForSchoolLocation } from '@/lib/districts/districtAssignments';
import type { School } from '@/types';
import type { DemoUser, Role } from '@/types/auth';
import { normalizeRole } from '@/types/auth';

type AccessUser = Pick<DemoUser, 'role' | 'districtId' | 'schoolId'> | null | undefined;

function sameDistrict(user: AccessUser, districtId: string | null | undefined): boolean {
  if (!user || !districtId) return false;
  const role = normalizeRole(user.role);
  if (role === 'superadmin') return true;
  return user.districtId === districtId;
}

function findSchoolDistrictId(schoolId: string): string | null {
  const school = SCHULEN.find((entry) => entry.id === schoolId);
  return school ? getDistrictIdForSchoolLocation(school) : null;
}

export function canViewDistrict(user: AccessUser, districtId: string): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'superadmin') return true;
  if (role === 'district_admin' || role === 'coordinator' || role === 'viewer') {
    return sameDistrict(user, districtId);
  }
  if (role === 'school_user') return sameDistrict(user, districtId);
  return false;
}

export function canManageDistrict(user: AccessUser, districtId: string): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'superadmin') return true;
  if (role === 'district_admin' || role === 'coordinator') return sameDistrict(user, districtId);
  return false;
}

export function canViewSchool(user: AccessUser, school: School): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'superadmin') return true;
  if (role === 'school_user') return user.schoolId === school.id;
  if (role === 'district_admin' || role === 'coordinator' || role === 'viewer') {
    return sameDistrict(user, school.districtId ?? getDistrictIdForSchoolLocation(school));
  }
  return false;
}

export function canCreateTrainingNeed(user: AccessUser, schoolId: string): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'superadmin') return true;
  if (role === 'school_user') return user.schoolId === schoolId;
  if (role === 'district_admin' || role === 'coordinator') {
    return sameDistrict(user, findSchoolDistrictId(schoolId));
  }
  return false;
}

export function canExportTrainingNeeds(user: AccessUser, districtId: string): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'superadmin') return true;
  if (role === 'district_admin' || role === 'coordinator' || role === 'viewer') {
    return sameDistrict(user, districtId);
  }
  return false;
}

export function isReadOnlyRole(role: Role): boolean {
  return normalizeRole(role) === 'viewer';
}
