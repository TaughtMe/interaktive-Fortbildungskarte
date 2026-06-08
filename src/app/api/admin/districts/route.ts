import { NextResponse } from 'next/server';
import { resolveAuthenticatedUser, enforcePasswordChangeGate } from '@/lib/auth/serverAuth';
import { getAllDistricts } from '@/lib/db/adminUserRepository';
import { normalizeRole } from '@/types/auth';

/**
 * GET /api/admin/districts
 *
 * Returns all districts for the CreateUserModal dropdown.
 * Superadmin only (V–VI light: only superadmin creates users).
 *
 * Response: { data: { id: string; name: string }[] }
 */
export async function GET(request: Request) {
  try {
    const gate = await enforcePasswordChangeGate(request);
    if (gate) return gate;

    const actor = await resolveAuthenticatedUser(request);
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (normalizeRole(actor.role) !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await getAllDistricts();
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
