import { NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/lib/auth/serverAuth';
import { getAllSchoolOptions } from '@/lib/db/adminUserRepository';
import { normalizeRole } from '@/types/auth';

/**
 * GET /api/admin/schools
 *
 * Returns all schools for the CreateUserModal school dropdown.
 * Superadmin only (V–VI light: only superadmin creates users).
 *
 * Response: { data: { id, name, ort, districtId }[] }
 */
export async function GET(request: Request) {
  try {
    const actor = await resolveAuthenticatedUser(request);
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (normalizeRole(actor.role) !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await getAllSchoolOptions();
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
