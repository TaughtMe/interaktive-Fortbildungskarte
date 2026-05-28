import { NextResponse } from 'next/server';
import * as schoolService from '@/lib/services/schoolService';
import {
  canViewDistrict,
  filterSchoolsForUser,
  resolveDemoAccessUserFromRequest,
  DEMO_ACCESS_CONTROL_NOTICE,
} from '@/lib/auth/accessControl';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const districtId = url.searchParams.get('districtId')?.trim();
    const demoUser = resolveDemoAccessUserFromRequest(request);

    if (!demoUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    if (districtId && !canViewDistrict(demoUser, districtId)) {
      return NextResponse.json(
        { error: 'Forbidden', note: DEMO_ACCESS_CONTROL_NOTICE },
        { status: 403 },
      );
    }

    const schools = districtId
      ? await schoolService.getSchoolsByDistrictAsync(districtId)
      : await schoolService.getAllSchoolsAsync();

    return NextResponse.json({ data: filterSchoolsForUser(demoUser, schools) });
  } catch {
    return NextResponse.json(
      { error: 'Schools could not be loaded' },
      { status: 500 },
    );
  }
}
