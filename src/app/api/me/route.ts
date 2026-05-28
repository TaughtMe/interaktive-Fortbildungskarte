import { NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/lib/auth/serverAuth';

export async function GET(request: Request) {
  try {
    const accessUser = await resolveAuthenticatedUser(request);

    if (!accessUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    return NextResponse.json({
      data: {
        role:       accessUser.role,
        districtId: accessUser.districtId ?? null,
        schoolId:   accessUser.schoolId   ?? null,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Could not resolve user' },
      { status: 500 },
    );
  }
}
