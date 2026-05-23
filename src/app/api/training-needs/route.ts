import { NextResponse } from 'next/server';
import * as schoolService from '@/lib/services/schoolService';
import * as trainingNeedService from '@/lib/services/trainingNeedService';
import {
  canCreateTrainingNeed,
  canViewDistrict,
  canViewTrainingNeeds,
  resolveDemoAccessUserFromRequest,
  DEMO_ACCESS_CONTROL_NOTICE,
} from '@/lib/auth/accessControl';
import type { TrainingNeedFormat, TrainingNeedPriority } from '@/types/trainingNeed';

const VALID_PRIORITIES: TrainingNeedPriority[] = ['hoch', 'mittel', 'niedrig'];
const VALID_FORMATS: TrainingNeedFormat[] = ['praesenz', 'online', 'schilf', 'beratung'];

interface TrainingNeedRequestBody {
  schoolId?: unknown;
  schoolCode?: unknown;
  topic?: unknown;
  description?: unknown;
  priority?: unknown;
  targetGroup?: unknown;
  preferredFormat?: unknown;
}

function isTrainingNeedRequestBody(value: unknown): value is TrainingNeedRequestBody {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRequiredString(
  body: TrainingNeedRequestBody,
  field: keyof TrainingNeedRequestBody,
  errors: Record<string, string>,
): string | undefined {
  const value = body[field];
  if (typeof value !== 'string' || value.trim() === '') {
    errors[field] = 'required';
    return undefined;
  }

  return value.trim();
}

function isTrainingNeedPriority(value: string): value is TrainingNeedPriority {
  return VALID_PRIORITIES.includes(value as TrainingNeedPriority);
}

function isTrainingNeedFormat(value: string): value is TrainingNeedFormat {
  return VALID_FORMATS.includes(value as TrainingNeedFormat);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const districtId = url.searchParams.get('districtId')?.trim();
    const demoUser = resolveDemoAccessUserFromRequest(request);

    if (demoUser && districtId && !canViewDistrict(demoUser, districtId)) {
      return NextResponse.json(
        { error: 'Forbidden', note: DEMO_ACCESS_CONTROL_NOTICE },
        { status: 403 },
      );
    }

    const trainingNeeds = districtId
      ? await trainingNeedService.getTrainingNeedsByDistrictAsync(districtId)
      : await trainingNeedService.getAllTrainingNeedEntriesAsync();

    if (!demoUser) return NextResponse.json({ data: trainingNeeds });

    const schools = districtId
      ? await schoolService.getSchoolsByDistrictAsync(districtId)
      : await schoolService.getAllSchoolsAsync();
    const schoolsById = new Map(schools.map((school) => [school.id, school]));
    const allowedNeeds = trainingNeeds.filter((need) => {
      const school = schoolsById.get(need.schoolId);
      return school ? canViewTrainingNeeds(demoUser, school) : false;
    });

    return NextResponse.json({ data: allowedNeeds });
  } catch {
    return NextResponse.json(
      { error: 'Training needs could not be loaded' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: TrainingNeedRequestBody;

  try {
    const parsedBody: unknown = await request.json();
    if (!isTrainingNeedRequestBody(parsedBody)) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }
    body = parsedBody;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const errors: Record<string, string> = {};
  const schoolId = readRequiredString(body, 'schoolId', errors);
  const schoolCode = readRequiredString(body, 'schoolCode', errors);
  const topic = readRequiredString(body, 'topic', errors);
  const description = readRequiredString(body, 'description', errors);
  const priority = readRequiredString(body, 'priority', errors);
  const targetGroup = readRequiredString(body, 'targetGroup', errors);
  const preferredFormat = readRequiredString(body, 'preferredFormat', errors);

  if (priority && !isTrainingNeedPriority(priority)) {
    errors.priority = `must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }

  if (preferredFormat && !isTrainingNeedFormat(preferredFormat)) {
    errors.preferredFormat = `must be one of: ${VALID_FORMATS.join(', ')}`;
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: 'Validation failed', fields: errors },
      { status: 400 },
    );
  }

  const validatedPriority = priority as TrainingNeedPriority;
  const validatedPreferredFormat = preferredFormat as TrainingNeedFormat;
  const school = await schoolService.getSchoolByIdAsync(schoolId!);
  const demoUser = resolveDemoAccessUserFromRequest(request);

  if (!school) {
    return NextResponse.json(
      { error: 'Unknown schoolId' },
      { status: 404 },
    );
  }

  if (demoUser && !canCreateTrainingNeed(demoUser, school.id, school)) {
    return NextResponse.json(
      { error: 'Forbidden', note: DEMO_ACCESS_CONTROL_NOTICE },
      { status: 403 },
    );
  }

  let trainingNeed;

  try {
    trainingNeed = await trainingNeedService.createTrainingNeedWithSchoolCodeAsync(schoolId!, schoolCode!, {
      topic: topic!,
      description: description!,
      priority: validatedPriority,
      targetGroup: targetGroup!,
      preferredFormat: validatedPreferredFormat,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_SCHOOL_ACCESS_CODE') {
      return NextResponse.json(
        { error: 'Invalid or expired school access code' },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: 'Training need could not be created' },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: trainingNeed }, { status: 201 });
}
