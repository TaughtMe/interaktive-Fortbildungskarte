import { NextResponse } from 'next/server';
import * as schoolService from '@/lib/services/schoolService';
import {
  canViewSchoolBasicInfo,
  DEMO_ACCESS_CONTROL_NOTICE,
} from '@/lib/auth/accessControl';
import { resolveAuthenticatedUser, enforcePasswordChangeGate } from '@/lib/auth/serverAuth';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const gate = await enforcePasswordChangeGate(request);
    if (gate) return gate;

    const { id } = await params;
    const accessUser = await resolveAuthenticatedUser(request);

    if (!accessUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const school = await schoolService.getSchoolByIdAsync(id);

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 },
      );
    }

    if (!canViewSchoolBasicInfo(accessUser, school)) {
      return NextResponse.json(
        { error: 'Forbidden', note: DEMO_ACCESS_CONTROL_NOTICE },
        { status: 403 },
      );
    }

    return NextResponse.json({ data: school });
  } catch {
    return NextResponse.json(
      { error: 'School could not be loaded' },
      { status: 500 },
    );
  }
}
