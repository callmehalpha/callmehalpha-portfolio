import { createTestApp, resetDb, TestContext, TOKENS } from './helpers';

describe('auth and health (e2e)', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(() => resetDb(ctx.prisma));
  afterAll(() => ctx.close());

  it('reports healthy when the database answers', async () => {
    await ctx.http().get('/health').expect(200, { status: 'ok' });
  });

  it.each([
    ['get', '/internal/settings'],
    ['post', '/api/ingest'],
    ['get', '/internal/channels'],
    ['post', '/internal/notify/email'],
  ] as const)('refuses %s %s without the service token', async (method, path) => {
    await ctx.http()[method](path).expect(401);
    await ctx.http()[method](path).set('authorization', 'Bearer wrong-token-of-some-length').expect(401);
    await ctx.http()[method](path).set('authorization', TOKENS.service).expect(401); // missing "Bearer "
  });

  it('does not accept the admin token on internal routes, or the service token on admin routes', async () => {
    await ctx.http().get('/internal/settings').set('authorization', `Bearer ${TOKENS.admin}`).expect(401);
    await ctx.http().get('/admin/settings').set('authorization', `Bearer ${TOKENS.service}`).expect(401);
  });

  it('lets each token through to its own routes', async () => {
    await ctx.internal('get', '/internal/settings').expect(200);
    await ctx.admin('get', '/admin/settings').expect(200);
  });

  it('serves the public API without any token', async () => {
    await ctx.http().get('/api/notes').expect(200, { items: [], total: 0, page: 1, pageSize: 10 });
    await ctx.http().get('/api/case-studies').expect(200, []);
    await ctx.http().get('/api/oss').expect(200, []);
    await ctx.http().get('/api/profile').expect(404);
  });
});
