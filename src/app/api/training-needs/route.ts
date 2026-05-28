import { NextResponse } from 'next/server';
import * as schoolService from '@/lib/services/schoolService';
import * as trainingNeedService from '@/lib/services/trainingNeedService';
import {
  canCreateTrainingNeed,
  canViewDistrict,
  canViewTrainingNeeds,
  DEMO_ACCESS_CONTROL_NOTICE,
} from '@/lib/auth/accessControl';
import { resolveAuthenticatedUser } from '@/lib/auth/serverAuth';
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

    const trainingNeeds = districtId
      ? await trainingNeedService.getTrainingNeedsByDistrictAsync(districtId)
      : await trainingNeedService.getAllTrainingNeedEntriesAsync();

    const schools = districtId
      ? await schoolService.getSchoolsByDistrictAsync(districtId)
      : await schoolService.getAllSchoolsAsync();
    const schoolsById = new Map(schools.map((school) => [school.id, school]));
    const allowedNeeds = trainingNeeds.filter((need) => {
      const school = schoolsById.get(need.schoolId);
      return school ? canViewTrainingNeeds(accessUser, school) : false;
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
  // schoolCode ist optional: Auth-User brauchen ihn nicht; Schulen ohne Account nutzen ihn als Pilot-Gate.
  const schoolCode = typeof body.schoolCode === 'string' && body.schoolCode.trim()
    ? body.schoolCode.trim()
    : null;
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

  if (!school) {
    return NextResponse.json(
      { error: 'Unknown schoolId' },
      { status: 404 },
    );
  }

  const accessUser = await resolveAuthenticatedUser(request);

  // Fall C: kein Auth-User und kein schoolCode → 401
  if (!accessUser && !schoolCode) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const input = {
    topic: topic!,
    description: description!,
    priority: validatedPriority,
    targetGroup: targetGroup!,
    preferredFormat: validatedPreferredFormat,
  };

  let trainingNeed;

  try {
    if (accessUser) {
      // Fall A: Auth-User — Rollenprüfung, dann direktes Erstellen ohne schoolCode
      if (!canCreateTrainingNeed(accessUser, school.id, school)) {
        return NextResponse.json(
          { error: 'Forbidden', note: DEMO_ACCESS_CONTROL_NOTICE },
          { status: 403 },
        );
      }
      trainingNeed = await trainingNeedService.createTrainingNeedAsync(schoolId!, input);
    } else {
      // Fall B: kein Auth-User, schoolCode vorhanden (Fall-C-Gate stellt sicher: schoolCode !== null)
      trainingNeed = await trainingNeedService.createTrainingNeedWithSchoolCodeAsync(schoolId!, schoolCode!, input);
    }
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
