import { NextResponse } from 'next/server';
import * as schoolService from '@/lib/services/schoolService';

export async function GET() {
  try {
    const schools = await schoolService.getAllSchoolsAsync();

    return NextResponse.json({ data: schools });
  } catch {
    return NextResponse.json(
      { error: 'Schools could not be loaded' },
      { status: 500 },
    );
  }
}
