import { NextResponse } from 'next/server';
import * as schoolService from '@/lib/services/schoolService';
import * as trainingNeedService from '@/lib/services/trainingNeedService';
import type { TrainingNeedFormat, TrainingNeedPriority } from '@/types/trainingNeed';

const VALID_PRIORITIES: TrainingNeedPriority[] = ['hoch', 'mittel', 'niedrig'];
const VALID_FORMATS: TrainingNeedFormat[] = ['praesenz', 'online', 'schilf', 'beratung'];

interface TrainingNeedRequestBody {
  schoolId?: unknown;
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

export async function GET() {
  try {
    const trainingNeeds = await trainingNeedService.getAllTrainingNeedEntriesAsync();

    return NextResponse.json({ data: trainingNeeds });
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
      { status: 400 },
    );
  }

  let trainingNeed;

  try {
    trainingNeed = await trainingNeedService.createTrainingNeedAsync(schoolId!, {
      topic: topic!,
      description: description!,
      priority: validatedPriority,
      targetGroup: targetGroup!,
      preferredFormat: validatedPreferredFormat,
    });
  } catch {
    return NextResponse.json(
      { error: 'Training need could not be created' },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: trainingNeed }, { status: 201 });
}
