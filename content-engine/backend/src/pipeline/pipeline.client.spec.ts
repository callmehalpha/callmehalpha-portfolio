import { loadEnv } from '../config/env';
import { PipelineClient } from './pipeline.client';

const env = loadEnv({
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  INTERNAL_SERVICE_TOKEN: 'x'.repeat(32),
  ADMIN_TOKEN: 'y'.repeat(32),
  APPROVAL_LINK_SECRET: 'z'.repeat(32),
  N8N_WEBHOOK_BASE: 'http://n8n:5678/webhook/',
  N8N_WEBHOOK_SECRET: 'w'.repeat(32),
  PUBLIC_SITE_URL: 'https://site.test',
  PUBLIC_API_URL: 'https://api.test',
});

describe('PipelineClient', () => {
  const client = new PipelineClient(env);
  client.retryDelayMs = 0;
  afterEach(() => jest.restoreAllMocks());

  it('builds webhook URLs without doubling slashes', () => {
    expect(client.url('sourceCreated')).toBe('http://n8n:5678/webhook/pipeline/source-created');
    expect(client.url('cvUploaded')).toBe('http://n8n:5678/webhook/profile/cv-uploaded');
    expect(client.url('personaChanged')).toBe('http://n8n:5678/webhook/persona/changed');
  });

  it('sends the shared secret and retries until n8n answers', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 502 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await client.trigger('sourceCreated', { sourceId: 's1' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, init] = fetchMock.mock.calls[0];
    expect((init!.headers as Record<string, string>)['x-webhook-secret']).toBe('w'.repeat(32));
    expect(init!.body).toBe('{"sourceId":"s1"}');
  });

  it('gives up after three failed attempts', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 500 }));
    await expect(client.trigger('sourceCreated', {})).rejects.toThrow('HTTP 500');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
