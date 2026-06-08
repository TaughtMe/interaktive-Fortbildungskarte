import { NextResponse } from 'next/server';
import { resolveProfileFromRequest, passwordChangeBlockResponse } from '@/lib/auth/serverAuth';
import { getProfileById, restoreProfile } from '@/lib/db/adminUserRepository';
import { normalizeRole } from '@/types/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/users/:id/restore
 *
 * Superadmin only. Restores a soft-deleted account within the 30-day grace period.
 *
 * Flow:
 *   1. Verify actor is superadmin.
 *   2. Load target profile.
 *   3. Check that scheduled_deletion_at is set (account is actually soft-deleted).
 *   4. Check that the grace period has not yet expired (scheduled_deletion_at > now).
 *   5. Self-check: a superadmin cannot restore their own account via this route
 *      (they cannot have been soft-deleted since self-deletion is blocked).
 *   6. Restore: clear scheduled_deletion_at, set active = true.
 *
 * Response 200: { data: ProfileRow }   ← restored profile
 * Response 400: account not soft-deleted, or grace period expired
 * Response 401: no valid session
 * Response 403: insufficient role
 * Response 404: target user not found
 * Response 500: DB failure
 */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: targetId } = await params;

    // ── 1. Auth — real session required ──────────────────────────────────────
    const actor = await resolveProfileFromRequest(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const pwBlock = passwordChangeBlockResponse(actor);
    if (pwBlock) return pwBlock;
    if (normalizeRole(actor.role) !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── 2. Load target profile ────────────────────────────────────────────────
    const target = await getProfileById(targetId);
    if (!target) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden.' }, { status: 404 });
    }

    // ── 3. Check soft-delete state ────────────────────────────────────────────
    if (!target.scheduled_deletion_at) {
      return NextResponse.json(
        { error: 'Dieses Konto ist nicht zur Löschung vorgemerkt.' },
        { status: 400 },
      );
    }

    // ── 4. Check grace period not expired ─────────────────────────────────────
    const scheduledAt = new Date(target.scheduled_deletion_at);
    if (scheduledAt <= new Date()) {
      return NextResponse.json(
        { error: 'Das 30-Tage-Wiederherstellungsfenster ist abgelaufen. Das Konto wurde bereits endgültig gelöscht.' },
        { status: 400 },
      );
    }

    // ── 5. Restore ────────────────────────────────────────────────────────────
    const restored = await restoreProfile(targetId);

    return NextResponse.json({ data: restored });

  } catch {
    return NextResponse.json(
      { error: 'Konto konnte nicht wiederhergestellt werden. Bitte erneut versuchen.' },
      { status: 500 },
    );
  }
}
