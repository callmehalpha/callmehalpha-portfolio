import { existsSync, readFileSync } from 'fs';
import { SweeperService } from '../src/pipeline/sweeper.service';
import { createTestApp, makePdf, resetDb, TestContext, TOKENS } from './helpers';

const DOC = `---
project: atlax-exchange
outputs: [note, case_study]
---
## Commits
- 3f2a1c feat(settlement): batch ledger writes
`;

describe('ingest (e2e)', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    ctx.n8n.reset();
  });
  afterAll(() => ctx.close());

  const ingest = (body: object) => ctx.internal('post', '/api/ingest').send(body);

  it('stores a markdown doc, links its project and hands it to the n8n router', async () => {
    const project = await ctx.prisma.project.create({ data: { slug: 'atlax-exchange', name: 'Atlax Exchange', kind: 'CLIENT' } });

    const res = await ingest({ kind: 'source', filename: 'atlax.md', content: DOC }).expect(201);

    expect(res.body.status).toBe('created');
    expect(res.body.triggered).toBe(true);
    const source = await ctx.prisma.sourceDocument.findUniqueOrThrow({ where: { id: res.body.source.id } });
    expect(source).toMatchObject({
      kind: 'PROJECT_UPDATE',
      filename: 'atlax.md',
      projectId: project.id,
      status: 'PROCESSING',
      triggerAttempts: 1,
      frontmatter: { project: 'atlax-exchange', outputs: ['note', 'case_study'] },
    });

    const [call] = ctx.n8n.calls('/webhook/pipeline/source-created');
    expect(call.body).toEqual({ sourceId: source.id });
    expect(call.headers['x-webhook-secret']).toBe(TOKENS.webhookSecret);
  });

  it('keeps an unknown project slug in the frontmatter for the router to resolve', async () => {
    const res = await ingest({ kind: 'source', filename: 'new.md', content: '---\nproject: brand-new\n---\nhi' }).expect(201);
    const source = await ctx.prisma.sourceDocument.findUniqueOrThrow({ where: { id: res.body.source.id } });
    expect(source.projectId).toBeNull();
    expect(source.frontmatter).toEqual({ project: 'brand-new' });
  });

  it('reports invalid frontmatter fields as warnings but still accepts the doc', async () => {
    const res = await ingest({ kind: 'source', filename: 'w.md', content: '---\nkind: spaceship\n---\nhi' }).expect(201);
    expect(res.body.warnings).toEqual(['Ignored invalid frontmatter field "kind"']);
  });

  it('ignores an identical re-drop and does not trigger n8n twice', async () => {
    await ingest({ kind: 'source', filename: 'a.md', content: DOC }).expect(201);
    const again = await ingest({ kind: 'source', filename: 'a-copy.md', content: DOC }).expect(201);

    expect(again.body.status).toBe('duplicate');
    expect(await ctx.prisma.sourceDocument.count()).toBe(1);
    expect(ctx.n8n.calls('/webhook/pipeline/source-created')).toHaveLength(1);
  });

  it('handles the same doc arriving twice at once without a duplicate or an error', async () => {
    const [a, b] = await Promise.all([
      ingest({ kind: 'source', filename: 'a.md', content: DOC }),
      ingest({ kind: 'source', filename: 'b.md', content: DOC }),
    ]);
    expect([a.status, b.status]).toEqual([201, 201]);
    expect([a.body.status, b.body.status].sort()).toEqual(['created', 'duplicate']);
    expect(await ctx.prisma.sourceDocument.count()).toBe(1);
  });

  it('keeps the doc when n8n is down, and the sweeper delivers it once n8n is back', async () => {
    ctx.n8n.status = 503;
    const res = await ingest({ kind: 'source', filename: 'a.md', content: DOC }).expect(201);
    expect(res.body.triggered).toBe(false);
    let source = await ctx.prisma.sourceDocument.findUniqueOrThrow({ where: { id: res.body.source.id } });
    expect(source.status).toBe('RECEIVED');
    expect(source.error).toMatch(/HTTP 503/);
    expect(ctx.n8n.calls('/webhook/pipeline/source-created')).toHaveLength(3); // 3 retries per trigger

    const sweeper = ctx.app.get(SweeperService);
    const soon = new Date(Date.now() + 60_000);
    expect(await sweeper.sweep(soon)).toEqual({ retried: 0, succeeded: 0, gaveUp: 0 }); // not stuck long enough yet

    ctx.n8n.status = 200;
    const later = new Date(Date.now() + 6 * 60_000);
    expect(await sweeper.sweep(later)).toEqual({ retried: 1, succeeded: 1, gaveUp: 0 });
    source = await ctx.prisma.sourceDocument.findUniqueOrThrow({ where: { id: source.id } });
    expect(source).toMatchObject({ status: 'PROCESSING', error: null, triggerAttempts: 2 });
  });

  it('marks a doc FAILED once the sweeper runs out of attempts', async () => {
    ctx.n8n.status = 500;
    const res = await ingest({ kind: 'source', filename: 'a.md', content: DOC }).expect(201);
    const sweeper = ctx.app.get(SweeperService);
    let at = Date.now();
    for (let i = 0; i < 4; i++) {
      at += 6 * 60_000;
      await sweeper.sweep(new Date(at));
    }
    const source = await ctx.prisma.sourceDocument.findUniqueOrThrow({ where: { id: res.body.source.id } });
    expect(source.status).toBe('FAILED');
    expect(source.triggerAttempts).toBe(5);
    expect(source.error).toMatch(/Gave up after 5 attempts/);

    at += 6 * 60_000;
    expect(await sweeper.sweep(new Date(at))).toEqual({ retried: 0, succeeded: 0, gaveUp: 0 });
  });

  it('extracts text from a PDF CV, keeps the original privately and triggers the profile workflow', async () => {
    const pdf = makePdf('Abdulazeez Yisau Temitope - Technical Product Builder');
    const res = await ingest({ kind: 'cv', filename: 'CV.pdf', contentBase64: pdf.toString('base64') }).expect(201);

    const source = await ctx.prisma.sourceDocument.findUniqueOrThrow({ where: { id: res.body.source.id } });
    expect(source.kind).toBe('CV');
    expect(source.rawMarkdown).toContain('Abdulazeez Yisau Temitope - Technical Product Builder');
    expect(source.originalPath).toMatch(new RegExp(`^${ctx.dirs.storage}/cv/[0-9a-f]{64}\\.pdf$`));
    expect(readFileSync(source.originalPath!)).toEqual(pdf);

    expect(ctx.n8n.calls('/webhook/profile/cv-uploaded')).toHaveLength(1);
    expect(ctx.n8n.calls('/webhook/pipeline/source-created')).toHaveLength(0);

    const text = await ctx.internal('get', `/internal/cv/${source.id}/text`).expect(200);
    expect(text.body.text).toContain('Technical Product Builder');
  });

  it('accepts a markdown CV and refuses unsupported formats', async () => {
    await ingest({ kind: 'cv', filename: 'cv.md', contentBase64: Buffer.from('# Me').toString('base64') }).expect(201);
    const bad = await ingest({ kind: 'cv', filename: 'cv.pages', contentBase64: 'AAAA' }).expect(400);
    expect(bad.body.message).toMatch(/Unsupported CV format/);
    expect(existsSync(`${ctx.dirs.storage}/cv`)).toBe(true);
  });

  it('refuses the CV text endpoint for a non-CV source', async () => {
    const res = await ingest({ kind: 'source', filename: 'a.md', content: DOC }).expect(201);
    await ctx.internal('get', `/internal/cv/${res.body.source.id}/text`).expect(400);
  });

  it('validates the ingest body', async () => {
    const res = await ingest({ kind: 'source', filename: 'a.md' }).expect(400);
    expect(res.body.issues[0].path).toBe('content');
    await ingest({ kind: 'video', filename: 'a.mp4' }).expect(400);
  });

  it('lets n8n read and update a source, and attach it to a project', async () => {
    await ctx.prisma.project.create({ data: { slug: 'circlify', name: 'Circlify', kind: 'PRODUCT' } });
    const res = await ingest({ kind: 'source', filename: 'a.md', content: 'hello' }).expect(201);
    const id = res.body.source.id;

    await ctx
      .internal('patch', `/internal/sources/${id}`)
      .send({ status: 'DONE', routing: { note: { do: true } }, projectSlug: 'circlify' })
      .expect(200);
    const got = await ctx.internal('get', `/internal/sources/${id}`).expect(200);
    expect(got.body).toMatchObject({ status: 'DONE', routing: { note: { do: true } }, project: { slug: 'circlify' } });

    await ctx.internal('patch', `/internal/sources/${id}`).send({ projectSlug: 'nope' }).expect(404);
    await ctx.internal('get', '/internal/sources/missing').expect(404);
  });

  it('tracks pipeline runs against a source', async () => {
    const res = await ingest({ kind: 'source', filename: 'a.md', content: 'hello' }).expect(201);
    const run = await ctx
      .internal('post', '/internal/runs')
      .send({ sourceId: res.body.source.id, stage: 'analyze', status: 'running', n8nExecutionId: '42' })
      .expect(201);
    const done = await ctx.internal('patch', `/internal/runs/${run.body.id}`).send({ status: 'done', finished: true }).expect(200);
    expect(done.body.finishedAt).not.toBeNull();
    await ctx.internal('post', '/internal/runs').send({ sourceId: 'missing', stage: 'x', status: 'y' }).expect(404);
  });
});
