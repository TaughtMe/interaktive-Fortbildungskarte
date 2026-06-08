import { NextResponse } from 'next/server';
import * as schoolService from '@/lib/services/schoolService';
import {
  canViewDistrict,
  filterSchoolsForUser,
  DEMO_ACCESS_CONTROL_NOTICE,
} from '@/lib/auth/accessControl';
import { resolveAuthenticatedUser, enforcePasswordChangeGate } from '@/lib/auth/serverAuth';

export async function GET(request: Request) {
  try {
    const gate = await enforcePasswordChangeGate(request);
    if (gate) return gate;

    const url = new URL(request.url);
    const districtId = url.searchParams.get('districtId')?.trim();
    const accessUser = await resolveAuthenticatedUser(request);

    if (!accessUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    if (districtId && !canViewDistrict(accessUser, districtId)) {
      return NextResponse.json(
        { error: 'Forbidden', note: DEMO_ACCESS_CONTROL_NOTICE },
        { status: 403 },
      );
    }

    const schools = districtId
      ? await schoolService.getSchoolsByDistrictAsync(districtId)
      : await schoolService.getAllSchoolsAsync();

    return NextResponse.json({ data: filterSchoolsForUser(accessUser, schools) });
  } catch {
    return NextResponse.json(
      { error: 'Schools could not be loaded' },
      { status: 500 },
    );
  }
}
