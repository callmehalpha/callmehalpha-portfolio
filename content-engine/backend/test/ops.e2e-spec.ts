import { join } from 'path';
import { TokenExpiryService } from '../src/ops/token-expiry.service';
import { SECURITY_HEADERS } from '../src/bootstrap';
import { seed } from '../src/seed/seed';
import { createTestApp, eventually, resetDb, TestContext } from './helpers';

const SEED_DIR = join(__dirname, '..', '..', 'seed', 'data');
const DAY = 86_400_000;

describe('operations hardening (e2e)', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp({
      env: { THROTTLE_LIMIT: '3', TRUST_PROXY: '1', N8N_EDITOR_URL: 'https://n8n.test' },
    });
  });
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    await seed(ctx.prisma, { dir: SEED_DIR, notifyEmailTo: 'abdulazeezyisau@gmail.com' });
    ctx.smtp.messages = [];
  });
  afterAll(() => ctx.close());

  describe('token expiry reminders', () => {
    const service = () => ctx.app.get(TokenExpiryService);
    const expiresAt = new Date('2026-12-01T12:00:00.000Z');
    const at = (daysBefore: number) => new Date(expiresAt.getTime() - daysBefore * DAY);

    async function connectLinkedIn() {
      await ctx
        .admin('patch', '/admin/channels/linkedin')
        .send({ enabled: true, config: { tokenExpiresAt: expiresAt.toISOString() } })
        .expect(200);
    }

    it('records the expiry without losing the channel rules', async () => {
      await connectLinkedIn();
      const channel = await ctx.prisma.channel.findUniqueOrThrow({ where: { key: 'linkedin' } });
      expect(channel.config).toMatchObject({ maxLength: 3000, linkPlacement: 'post', tokenExpiresAt: expiresAt.toISOString() });
    });

    it('emails at 7 days, 1 day and on expiry, once each', async () => {
      await connectLinkedIn();
      expect(await service().check(at(10))).toEqual([]);

      expect(await service().check(at(7))).toEqual([{ channel: 'linkedin', stage: 7 }]);
      expect(await service().check(at(5))).toEqual([]); // already sent
      expect(await service().check(at(1))).toEqual([{ channel: 'linkedin', stage: 1 }]);
      expect(await service().check(at(-1))).toEqual([{ channel: 'linkedin', stage: 0 }]);
      expect(await service().check(at(-3))).toEqual([]);

      await eventually(async () => ctx.smtp.messages.length === 3);
      expect(ctx.smtp.messages.map((m) => m.subject)).toEqual([
        'LinkedIn connection expires in 7 days',
        'LinkedIn connection expires in 1 day',
        'LinkedIn connection has expired: posting is paused',
      ]);
      const [first] = ctx.smtp.messages;
      expect(first.to && 'text' in first.to ? first.to.text : '').toBe('abdulazeezyisau@gmail.com');
      expect(first.html).toContain('href="https://n8n.test/home/credentials"');
    });

    it('starts over after the token is renewed', async () => {
      await connectLinkedIn();
      await service().check(at(-1));
      const renewed = new Date(expiresAt.getTime() + 60 * DAY);
      await ctx.admin('patch', '/admin/channels/linkedin').send({ config: { tokenExpiresAt: renewed.toISOString() } }).expect(200);
      expect(await service().check(new Date(renewed.getTime() - 6 * DAY))).toEqual([{ channel: 'linkedin', stage: 7 }]);
    });

    it('ignores disabled channels, channels without an expiry, and runs without an email notifier', async () => {
      await ctx.admin('patch', '/admin/channels/x').send({ enabled: true }).expect(200);
      await ctx.admin('patch', '/admin/channels/instagram').send({ config: { tokenExpiresAt: at(0).toISOString() } }).expect(200);
      expect(await service().check(at(0))).toEqual([]);

      await connectLinkedIn();
      await ctx.admin('patch', '/admin/notifiers/email').send({ config: { events: ['approval'] } }).expect(200);
      expect(await service().check(at(0))).toEqual([]);
      expect(ctx.smtp.messages).toHaveLength(0);
    });

    it('can be run on demand from the admin API', async () => {
      await ctx
        .admin('patch', '/admin/channels/linkedin')
        .send({ enabled: true, config: { tokenExpiresAt: new Date(Date.now() + 2 * DAY).toISOString() } })
        .expect(200);
      const res = await ctx.admin('post', '/admin/ops/token-expiry/check').expect(200);
      expect(res.body).toEqual([{ channel: 'linkedin', stage: 7 }]);
    });
  });

  describe('HTTP hardening', () => {
    it('sends security headers and hides the framework', async () => {
      const res = await ctx.http().get('/health').expect(200);
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) expect(res.headers[name]).toBe(value);
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('keeps approval tokens out of the Referer header', async () => {
      const res = await ctx.http().get('/approvals/confirm?token=nope');
      expect(res.headers['referrer-policy']).toBe('no-referrer');
    });

    it('rate-limits each real client separately behind the proxy', async () => {
      const hit = (ip: string) => ctx.http().get('/api/case-studies').set('x-forwarded-for', ip);
      for (let i = 0; i < 3; i++) await hit('203.0.113.1').expect(200);
      await hit('203.0.113.1').expect(429);
      await hit('203.0.113.2').expect(200); // another visitor isn't blocked
    });
  });
});
