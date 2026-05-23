import { NextResponse } from 'next/server';
import * as schoolService from '@/lib/services/schoolService';

export async function GET() {
  const schools = await schoolService.getAllSchoolsAsync();

  return NextResponse.json({ data: schools });
}
