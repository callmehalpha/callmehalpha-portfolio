import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from '../../src/lib/api';

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('content API client', () => {
  it('is disabled without a base URL and never calls fetch', async () => {
    const fetchImpl = vi.fn();
    const client = createApiClient({ baseUrl: '', fetchImpl });
    expect(client.enabled).toBe(false);
    await expect(client.profile()).rejects.toThrow('not configured');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('builds URLs and query strings', async () => {
    const fetchImpl = vi.fn(async (_url: string) => ok({ items: [], total: 0, page: 2, pageSize: 5 }));
    const client = createApiClient({ baseUrl: 'https://api.test/', fetchImpl: fetchImpl as unknown as typeof fetch });
    await client.notes({ page: 2, pageSize: 5, tag: 'ai' });
    await client.notes();
    await client.note('a b');
    await client.resumes();
    expect(fetchImpl.mock.calls.map((c) => c[0])).toEqual([
      'https://api.test/api/notes?page=2&pageSize=5&tag=ai',
      'https://api.test/api/notes',
      'https://api.test/api/notes/a%20b',
      'https://api.test/api/resume',
    ]);
  });

  it('turns HTTP errors into ApiError with the status', async () => {
    const client = createApiClient({ baseUrl: 'https://api.test', fetchImpl: vi.fn().mockResolvedValue(new Response('', { status: 404 })) });
    const err = await client.note('missing').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
  });

  it('times out slow requests', async () => {
    const fetchImpl = vi.fn((_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))),
    );
    const client = createApiClient({ baseUrl: 'https://api.test', timeoutMs: 20, fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(client.oss()).rejects.toThrow('timed out');
  });

  it('wraps network failures', async () => {
    const client = createApiClient({ baseUrl: 'https://api.test', fetchImpl: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) });
    await expect(client.caseStudies()).rejects.toThrow('GET /api/case-studies failed');
  });

  it('passes an external abort through', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn((_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))),
    );
    const client = createApiClient({ baseUrl: 'https://api.test', fetchImpl: fetchImpl as unknown as typeof fetch });
    const pending = client.profile(controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow('GET /api/profile failed');
  });
});
