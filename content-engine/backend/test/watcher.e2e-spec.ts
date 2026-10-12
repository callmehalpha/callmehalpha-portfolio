import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createTestApp, eventually, makePdf, resetDb, TestContext } from './helpers';

describe('folder watcher (e2e)', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp({ watch: true });
  });
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    ctx.n8n.reset();
  });
  afterAll(() => ctx.close());

  const files = (dir: string) => (existsSync(dir) ? readdirSync(dir) : []);

  it('ingests a markdown file dropped into the inbox and moves it to processed/', async () => {
    writeFileSync(join(ctx.dirs.inbox, 'atlax-week-41.md'), '---\nproject: atlax-exchange\n---\n- feat: failover');

    await eventually(() => ctx.prisma.sourceDocument.findFirst({ where: { filename: 'atlax-week-41.md', status: 'PROCESSING' } }));
    await eventually(async () => files(join(ctx.dirs.inbox, 'processed')).some((f) => f.endsWith('-atlax-week-41.md')));
    expect(existsSync(join(ctx.dirs.inbox, 'atlax-week-41.md'))).toBe(false);
    expect(ctx.n8n.calls('/webhook/pipeline/source-created')).toHaveLength(1);
  });

  it('ingests a CV dropped into inbox/cv/', async () => {
    writeFileSync(join(ctx.dirs.inbox, 'cv', 'Backend_CV.pdf'), makePdf('Backend Engineer CV'));
    const source = await eventually(() => ctx.prisma.sourceDocument.findFirst({ where: { kind: 'CV' } }));
    expect(source.rawMarkdown).toContain('Backend Engineer CV');
    await eventually(async () => files(join(ctx.dirs.inbox, 'processed')).some((f) => f.endsWith('-Backend_CV.pdf')));
  });

  it('moves a file that fails to ingest to failed/ with the reason next to it', async () => {
    writeFileSync(join(ctx.dirs.inbox, 'cv', 'broken.pdf'), 'this is not a pdf');
    const failedName = await eventually(async () => files(join(ctx.dirs.inbox, 'failed')).find((f) => f.endsWith('-broken.pdf')));
    expect(readFileSync(join(ctx.dirs.inbox, 'failed', `${failedName}.error.txt`), 'utf8').length).toBeGreaterThan(0);
    expect(await ctx.prisma.sourceDocument.count()).toBe(0);
  });

  it('leaves files it does not handle where they are', async () => {
    writeFileSync(join(ctx.dirs.inbox, 'notes.txt'), 'not markdown');
    writeFileSync(join(ctx.dirs.inbox, 'marker.md'), '# marker');
    await eventually(() => ctx.prisma.sourceDocument.findFirst({ where: { filename: 'marker.md' } }));
    expect(existsSync(join(ctx.dirs.inbox, 'notes.txt'))).toBe(true);
  });

  it('versions persona files: new content makes a new active version, unchanged content does not', async () => {
    const path = join(ctx.dirs.persona, 'branding-plan.md');
    writeFileSync(path, '# Brand v1');
    const v1 = await eventually(() => ctx.prisma.personaDocument.findFirst({ where: { kind: 'BRANDING', version: 1 } }));
    expect(v1.active).toBe(true);
    await eventually(async () => ctx.n8n.calls('/webhook/persona/changed').length === 1);

    writeFileSync(path, '# Brand v2');
    const v2 = await eventually(() => ctx.prisma.personaDocument.findFirst({ where: { kind: 'BRANDING', version: 2 } }));
    expect(v2.active).toBe(true);
    expect((await ctx.prisma.personaDocument.findUniqueOrThrow({ where: { id: v1.id } })).active).toBe(false);

    writeFileSync(path, '# Brand v2'); // same content rewritten
    await new Promise((r) => setTimeout(r, 1000));
    expect(await ctx.prisma.personaDocument.count({ where: { kind: 'BRANDING' } })).toBe(2);
    expect(existsSync(path)).toBe(true); // persona files are committed, never moved

    const context = await ctx.internal('get', '/internal/persona/context').expect(200);
    expect(context.body).toMatchObject({ branding: { version: 2, content: '# Brand v2' }, personality: null });
  });

  it('ignores files in persona/ that are not personality or branding docs', async () => {
    writeFileSync(join(ctx.dirs.persona, 'README.md'), 'hello');
    writeFileSync(join(ctx.dirs.persona, 'personality.md'), '# Me');
    await eventually(() => ctx.prisma.personaDocument.findFirst({ where: { kind: 'PERSONALITY' } }));
    expect(await ctx.prisma.personaDocument.count()).toBe(1);
  });
});
