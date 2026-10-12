import { loadEnv } from './env';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  INTERNAL_SERVICE_TOKEN: 'x'.repeat(32),
  ADMIN_TOKEN: 'y'.repeat(32),
  APPROVAL_LINK_SECRET: 'z'.repeat(32),
  N8N_WEBHOOK_BASE: 'http://n8n:5678/webhook',
  N8N_WEBHOOK_SECRET: 'w'.repeat(32),
  PUBLIC_SITE_URL: 'https://abdulazeez.usaiy.xyz',
  PUBLIC_API_URL: 'https://api.usaiy.xyz',
};

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv(valid);
    expect(env.PORT).toBe(3000);
    expect(env.WATCH_ENABLED).toBe(true);
    expect(env.SMTP_HOST).toBe('mailpit');
    expect(env.SMTP_SECURE).toBe(false);
    expect(env.APPROVAL_TTL_HOURS).toBe(168);
  });

  it('parses booleans and numbers from strings', () => {
    const env = loadEnv({ ...valid, WATCH_ENABLED: 'false', SMTP_PORT: '587', SMTP_SECURE: 'true' });
    expect(env.WATCH_ENABLED).toBe(false);
    expect(env.SMTP_PORT).toBe(587);
    expect(env.SMTP_SECURE).toBe(true);
  });

  it('refuses short secrets and lists every problem', () => {
    expect(() => loadEnv({ ...valid, ADMIN_TOKEN: 'short', DATABASE_URL: 'nope' })).toThrow(
      /ADMIN_TOKEN.*DATABASE_URL|DATABASE_URL.*ADMIN_TOKEN/,
    );
  });
});
