import { NextResponse } from 'next/server';
import * as schoolService from '@/lib/services/schoolService';
import {
  canViewSchoolBasicInfo,
  resolveDemoAccessUserFromRequest,
  DEMO_ACCESS_CONTROL_NOTICE,
} from '@/lib/auth/accessControl';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const school = await schoolService.getSchoolByIdAsync(id);
    const demoUser = resolveDemoAccessUserFromRequest(request);

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 },
      );
    }

    if (demoUser && !canViewSchoolBasicInfo(demoUser, school)) {
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
