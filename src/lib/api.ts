import type { CaseStudy } from '../types';
import type { NoteDetail, NoteList, OssProject, Profile } from '../types/content';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Typed client for the content engine. With no base URL it is disabled and every call rejects. */
export function createApiClient({ baseUrl = '', timeoutMs = 5000, fetchImpl }: ApiClientOptions = {}) {
  const base = baseUrl.replace(/\/+$/, '');
  const doFetch = fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
    if (!base) throw new ApiError('Content API is not configured');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort);
    try {
      const res = await doFetch(`${base}${path}`, { signal: controller.signal, headers: { accept: 'application/json' } });
      if (!res.ok) throw new ApiError(`GET ${path} failed with HTTP ${res.status}`, res.status);
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(controller.signal.aborted && !signal?.aborted ? `GET ${path} timed out` : `GET ${path} failed`);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  return {
    enabled: Boolean(base),
    notes: (params: { page?: number; pageSize?: number; tag?: string } = {}, signal?: AbortSignal) => {
      const q = new URLSearchParams();
      if (params.page) q.set('page', String(params.page));
      if (params.pageSize) q.set('pageSize', String(params.pageSize));
      if (params.tag) q.set('tag', params.tag);
      const qs = q.toString();
      return get<NoteList>(`/api/notes${qs ? `?${qs}` : ''}`, signal);
    },
    note: (slug: string, signal?: AbortSignal) => get<NoteDetail>(`/api/notes/${encodeURIComponent(slug)}`, signal),
    caseStudies: (signal?: AbortSignal) => get<(CaseStudy & { version?: number })[]>('/api/case-studies', signal),
    oss: (signal?: AbortSignal) => get<OssProject[]>('/api/oss', signal),
    profile: (signal?: AbortSignal) => get<Profile>('/api/profile', signal),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export const api = createApiClient({ baseUrl: import.meta.env.VITE_CONTENT_API_URL ?? '' });
