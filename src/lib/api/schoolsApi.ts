import type { School } from '@/types';
import type { Role } from '@/types/auth';

export interface ApiError {
  message: string;
  status?: number;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

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

export async function fetchSchools(demoRole?: Role): Promise<ApiResult<School[]>> {
  try {
    const response = await fetch('/api/schools', {
      cache: 'no-store',
      headers: demoRole ? { 'x-demo-role': demoRole } : undefined,
    });
    const payload = await readJson<School[]>(response);

    if (!response.ok) {
      return {
        ok: false,
        error: { message: payload.error ?? 'Schulen konnten nicht geladen werden.', status: response.status },
      };
    }

    if (!Array.isArray(payload.data)) {
      return { ok: false, error: { message: 'Ungueltige Antwort fuer Schulen.' } };
    }

    return { ok: true, data: payload.data };
  } catch (error) {
    return { ok: false, error: toApiError(error, 'Schulen konnten nicht geladen werden.') };
  }
}

export async function fetchSchoolById(id: string): Promise<ApiResult<School>> {
  try {
    const response = await fetch(`/api/schools/${encodeURIComponent(id)}`, { cache: 'no-store' });
    const payload = await readJson<School>(response);

    if (!response.ok) {
      return {
        ok: false,
        error: { message: payload.error ?? 'Schule konnte nicht geladen werden.', status: response.status },
      };
    }

    if (!payload.data) {
      return { ok: false, error: { message: 'Ungueltige Antwort fuer Schule.' } };
    }

    return { ok: true, data: payload.data };
  } catch (error) {
    return { ok: false, error: toApiError(error, 'Schule konnte nicht geladen werden.') };
  }
}
