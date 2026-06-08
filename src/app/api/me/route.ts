import { NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/lib/auth/serverAuth';
import { resolveProfileFromRequest } from '@/lib/auth/serverAuth';

export async function GET(request: Request) {
  try {
    // Prefer the full profile (real Supabase session) — provides username,
    // realEmail, isLocalAccount, mustChangePassword alongside role/scope.
    const profile = await resolveProfileFromRequest(request);

    if (profile) {
      return NextResponse.json({
        data: {
          // Profile UUID — needed by the frontend to recognize "this is my own
          // account" (P1 Multi-Superadmin-Schutz: self- vs. peer-protection
          // affordances in the Benutzerverwaltung UI). Always from the real
          // session profile — never influenced by preview/demo roles.
          id:                 profile.id,
          role:               profile.role,
          districtId:         profile.district_id         ?? null,
          schoolId:           profile.school_id           ?? null,
          username:           profile.username            ?? null,
          realEmail:          profile.real_email          ?? null,
          isLocalAccount:     profile.is_local_account,
          mustChangePassword: profile.must_change_password,
        },
      });
    }

    // Fallback: dev demo mode — resolveAuthenticatedUser provides the role
    // from x-demo-role header. No real profile exists in this case.
    const accessUser = await resolveAuthenticatedUser(request);

    if (!accessUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    return NextResponse.json({
      data: {
        // Demo mode carries no database profile — no stable id to expose.
        id:                 null,
        role:               accessUser.role,
        districtId:         accessUser.districtId ?? null,
        schoolId:           accessUser.schoolId   ?? null,
        username:           null,
        realEmail:          null,
        isLocalAccount:     false,
        mustChangePassword: false,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Could not resolve user' },
      { status: 500 },
    );
  }
}
