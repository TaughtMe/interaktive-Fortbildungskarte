import { NextResponse } from 'next/server';
import * as schoolService from '@/lib/services/schoolService';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const school = await schoolService.getSchoolByIdAsync(id);

  if (!school) {
    return NextResponse.json(
      { error: 'School not found' },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: school });
}
