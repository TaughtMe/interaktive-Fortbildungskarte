import { NextResponse } from 'next/server';
import * as schoolService from '@/lib/services/schoolService';
import * as trainingNeedService from '@/lib/services/trainingNeedService';
import { SCHULTYPEN } from '@/data/schools';
import {
  canExportTrainingNeeds,
  DEMO_ACCESS_CONTROL_NOTICE,
} from '@/lib/auth/accessControl';
import { resolveAuthenticatedUser } from '@/lib/auth/serverAuth';
import { normalizeRole } from '@/types/auth';
import { FORMAT_LABELS, PRIORITY_LABELS, type TrainingNeedPriority } from '@/types/trainingNeed';

type SortMode = 'date-desc' | 'date-asc' | 'priority-desc' | 'priority-asc';

const PRIORITY_WEIGHT: Record<TrainingNeedPriority, number> = {
  hoch: 3,
  mittel: 2,
  niedrig: 1,
};

const CSV_HEADERS = [
  'Schule',
  'Ort',
  'Schulart',
  'Thema',
  'Beschreibung',
  'Priorität',
  'Zielgruppe',
  'Format',
  'Datum',
];

function csvCell(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function normalizeSortMode(value: string | null): SortMode {
  if (value === 'date-asc' || value === 'priority-desc' || value === 'priority-asc') return value;
  return 'date-desc';
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const topic = url.searchParams.get('topic')?.trim() ?? '';
    const priority = url.searchParams.get('priority')?.trim() ?? '';
    const schoolType = url.searchParams.get('schoolType')?.trim() ?? '';
    const location = url.searchParams.get('location')?.trim() ?? '';
    const requestedDistrictId = url.searchParams.get('districtId')?.trim() ?? '';
    const accessUser = await resolveAuthenticatedUser(request);

    if (!accessUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const accessRole = normalizeRole(accessUser.role);
    const districtId = requestedDistrictId || (accessRole !== 'superadmin' ? accessUser.districtId ?? '' : '');
    const sortMode = normalizeSortMode(url.searchParams.get('sort'));

    if (!canExportTrainingNeeds(accessUser, districtId)) {
      return NextResponse.json(
        { error: 'Forbidden', note: DEMO_ACCESS_CONTROL_NOTICE },
        { status: 403 },
      );
    }

    const [schools, trainingNeeds] = await Promise.all([
      districtId ? schoolService.getSchoolsByDistrictAsync(districtId) : schoolService.getAllSchoolsAsync(),
      districtId
        ? trainingNeedService.getTrainingNeedsByDistrictAsync(districtId)
        : trainingNeedService.getAllTrainingNeedEntriesAsync(),
    ]);
    const schoolsById = new Map(schools.map((school) => [school.id, school]));

    const rows = trainingNeeds
      .map((need) => ({ need, school: schoolsById.get(need.schoolId) }))
      .filter((row) => {
        if (!row.school) return false;
        if (topic && row.need.topic !== topic) return false;
        if (priority && row.need.priority !== priority) return false;
        if (schoolType && row.school.typ !== schoolType) return false;
        if (location && row.school.ort !== location) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortMode === 'priority-desc') {
          return PRIORITY_WEIGHT[b.need.priority] - PRIORITY_WEIGHT[a.need.priority]
            || Date.parse(b.need.createdAt) - Date.parse(a.need.createdAt);
        }
        if (sortMode === 'priority-asc') {
          return PRIORITY_WEIGHT[a.need.priority] - PRIORITY_WEIGHT[b.need.priority]
            || Date.parse(b.need.createdAt) - Date.parse(a.need.createdAt);
        }
        if (sortMode === 'date-asc') return Date.parse(a.need.createdAt) - Date.parse(b.need.createdAt);
        return Date.parse(b.need.createdAt) - Date.parse(a.need.createdAt);
      });

    const body = [
      CSV_HEADERS.map(csvCell).join(','),
      ...rows.map(({ need, school }) => [
        school?.name,
        school?.ort,
        school ? (SCHULTYPEN[school.typ]?.label ?? school.typ) : '',
        need.topic,
        need.description,
        PRIORITY_LABELS[need.priority],
        need.targetGroup,
        FORMAT_LABELS[need.preferredFormat],
        need.createdAt,
      ].map(csvCell).join(',')),
    ].join('\n');

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="bedarfsmeldungen.csv"',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Training needs export could not be created' },
      { status: 500 },
    );
  }
}
