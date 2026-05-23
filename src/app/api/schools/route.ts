import { NextResponse } from 'next/server';
import * as schoolService from '@/lib/services/schoolService';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const districtId = url.searchParams.get('districtId')?.trim();
    const schools = districtId
      ? await schoolService.getSchoolsByDistrictAsync(districtId)
      : await schoolService.getAllSchoolsAsync();

    return NextResponse.json({ data: schools });
  } catch {
    return NextResponse.json(
      { error: 'Schools could not be loaded' },
      { status: 500 },
    );
  }
}
