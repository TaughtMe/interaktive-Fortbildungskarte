import type { TrainingNeed } from '@/types/trainingNeed';
import type { Role } from '@/types/auth';

export interface ApiError {
  message: string;
  status?: number;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export type CreateTrainingNeedInput = Omit<TrainingNeed, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>;

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

function toApiError(error: unknown, fallbackMessage: string): ApiError {
  if (error instanceof Error) return { message: error.message };
  return { message: fallbackMessage };
}

async function readJson<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

/**
 * Build request headers.
 *
 * Priority: Bearer token (production + dev) > x-demo-role (dev fallback only).
 * The server ignores x-demo-role in production, so this is safe either way.
 */
function buildAuthHeaders(token?: string | null, demoRole?: Role): Record<string, string> {
  if (token) return { 'Authorization': `Bearer ${token}` };
  if (demoRole) return { 'x-demo-role': demoRole };
  return {};
}

export async function fetchTrainingNeeds(token?: string | null, demoRole?: Role): Promise<ApiResult<TrainingNeed[]>> {
  try {
    const response = await fetch('/api/training-needs', {
      cache: 'no-store',
      headers: buildAuthHeaders(token, demoRole),
    });
    const payload = await readJson<TrainingNeed[]>(response);

    if (!response.ok) {
      return {
        ok: false,
        error: {
          message: payload.error ?? 'Fortbildungsbedarfe konnten nicht geladen werden.',
          status: response.status,
        },
      };
    }

    if (!Array.isArray(payload.data)) {
      return { ok: false, error: { message: 'Ungueltige Antwort fuer Fortbildungsbedarfe.' } };
    }

    return { ok: true, data: payload.data };
  } catch (error) {
    return { ok: false, error: toApiError(error, 'Fortbildungsbedarfe konnten nicht geladen werden.') };
  }
}

export async function createTrainingNeedViaApi(
  schoolId: string,
  input: CreateTrainingNeedInput,
  schoolCode: string,
  token?: string | null,
  demoRole?: Role,
): Promise<ApiResult<TrainingNeed>> {
  try {
    const response = await fetch('/api/training-needs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(token, demoRole),
      },
      body: JSON.stringify({ schoolId, schoolCode, ...input }),
    });
    const payload = await readJson<TrainingNeed>(response);

    if (!response.ok) {
      return {
        ok: false,
        error: {
          message: payload.error ?? 'Fortbildungsbedarf konnte nicht gesendet werden.',
          status: response.status,
        },
      };
    }

    if (!payload.data) {
      return { ok: false, error: { message: 'Ungueltige Antwort fuer Fortbildungsbedarf.' } };
    }

    return { ok: true, data: payload.data };
  } catch (error) {
    return { ok: false, error: toApiError(error, 'Fortbildungsbedarf konnte nicht gesendet werden.') };
  }
}
