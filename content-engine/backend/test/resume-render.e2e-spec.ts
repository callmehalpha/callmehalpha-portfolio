import { join } from 'path';
import { countPages } from '../src/resume/gotenberg.client';
import { ResumeService } from '../src/resume/resume.service';
import { extractText } from '../src/ingest/text-extract';
import { seed } from '../src/seed/seed';
import { createTestApp, realGotenbergUrl, resetDb, TestContext } from './helpers';
import { readFileSync } from 'fs';

const SEED_DIR = join(__dirname, '..', '..', 'seed', 'data');

/** Renders the real seeded CV profile through a real Gotenberg and checks the PDF itself. */
describe('resume rendering with Gotenberg (e2e)', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp({ env: { GOTENBERG_URL: realGotenbergUrl() } });
    await resetDb(ctx.prisma);
    await seed(ctx.prisma, { dir: SEED_DIR });
    const draft = await ctx.prisma.profileRevision.findFirstOrThrow({ where: { status: 'DRAFT' } });
    await ctx.admin('post', `/admin/content/profile_revision/${draft.id}`).send({ action: 'approve' }).expect(200);
    await ctx.admin('patch', '/admin/settings/approval.required.resume').send({ value: false }).expect(200);
  }, 60_000);
  afterAll(() => ctx.close());

  it.each(['default', 'backend', 'fullstack'] as const)('the %s resume fits on two pages of real, selectable text', async (variant) => {
    const out = await ctx.app.get(ResumeService).build(variant);
    const pdf = readFileSync(out.build.pdfPath);
    const pages = await countPages(pdf);
    expect(pages).not.toBeNull();
    expect(pages!).toBeGreaterThanOrEqual(1);
    expect(pages!).toBeLessThanOrEqual(2);

    const text = await extractText('resume.pdf', pdf);
    expect(text).toContain('Abdulazeez Yisau Temitope');
    expect(text).toMatch(/\bEXPERIENCE\b/i);
    expect(text).toContain('Atlax Exchange');
    expect(text).toContain('Olabisi Onabanjo University');
    expect(text).not.toMatch(/0916|497 8489/);
  }, 60_000);
});
