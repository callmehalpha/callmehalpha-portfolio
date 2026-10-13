import { readFileSync } from 'fs';
import { join } from 'path';
import { ResumeService } from '../src/resume/resume.service';
import { seed } from '../src/seed/seed';
import { createTestApp, eventually, FakeGotenberg, resetDb, TestContext } from './helpers';

const SEED_DIR = join(__dirname, '..', '..', 'seed', 'data');

describe('resume builds (e2e)', () => {
  let ctx: TestContext;
  let gotenberg: FakeGotenberg;

  beforeAll(async () => {
    gotenberg = await new FakeGotenberg().start();
    ctx = await createTestApp({ env: { GOTENBERG_URL: gotenberg.base } });
  });
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    await seed(ctx.prisma, { dir: SEED_DIR, notifyEmailTo: 'abdulazeezyisau@gmail.com' });
    ctx.smtp.messages = [];
    gotenberg.html = [];
    gotenberg.status = 200;
  });
  afterAll(async () => {
    await ctx.close();
    await gotenberg.stop();
  });

  const resume = () => ctx.app.get(ResumeService);
  const approveCvProfile = async () => {
    const draft = await ctx.prisma.profileRevision.findFirstOrThrow({ where: { status: 'DRAFT' } });
    await ctx.admin('post', `/admin/content/profile_revision/${draft.id}`).send({ action: 'approve' }).expect(200);
  };

  it('has nothing to download before the first approved build', async () => {
    await ctx.http().get('/api/resume').expect(200, []);
    await ctx.http().get('/api/resume.pdf').expect(404);
    await ctx.http().get('/api/resume.pdf?variant=designer').expect(400);
  });

  it('builds from public data only, waits for approval, then serves the PDF', async () => {
    await approveCvProfile();
    const res = await ctx.admin('post', '/admin/resume/build').send({ variant: 'default' }).expect(200);
    expect(res.body[0]).toMatchObject({ status: 'built', published: false, build: { variant: 'default', status: 'PENDING_APPROVAL' } });

    const html = gotenberg.html[0];
    expect(html).toContain('<h1>Abdulazeez Yisau Temitope</h1>');
    expect(html).toContain('Technical Product Builder');
    expect(html).toContain('Full Stack Engineer <span class="at">· <a href="https://site.test/#atlax-exchange">Atlax Exchange</a>');
    expect(html).not.toMatch(/0916|phone/i); // private fields never reach the resume
    await ctx.http().get('/api/resume.pdf').expect(404); // not approved yet

    const mail = await eventually(async () => ctx.smtp.messages[0]);
    expect(mail.subject).toBe('Resume ready for approval');
    expect(mail.attachments.map((a) => a.contentType)).toEqual(['application/pdf']);
    const approveUrl = /href="(https:\/\/api\.test\/approvals\/confirm\?token=[^"]+)"/.exec(mail.html as string)![1];
    const token = new URL(approveUrl.replace(/&amp;/g, '&')).searchParams.get('token');
    await ctx.http().post('/approvals/decide').type('form').send({ token }).expect(200);

    const pdf = await ctx.http().get('/api/resume.pdf').buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on('data', (c: Buffer) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    }).expect(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect(pdf.headers['content-disposition']).toMatch(/^attachment; filename="Abdulazeez-Yisau-Resume-\d{4}-\d{2}\.pdf"$/);
    expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');

    await ctx.http().get('/api/resume.pdf').set('if-none-match', pdf.headers.etag).expect(304);
    const available = await ctx.http().get('/api/resume').expect(200);
    expect(available.body).toEqual([expect.objectContaining({ variant: 'default', url: 'https://api.test/api/resume.pdf' })]);
    const json = await ctx.http().get('/api/resume.json').expect(200);
    expect(json.body).toMatchObject({ name: 'Abdulazeez Yisau Temitope', label: 'Technical Product Builder' });
  });

  it('does not rebuild when nothing changed, and rebuilds when approved content changes', async () => {
    await ctx.admin('patch', '/admin/settings/approval.required.resume').send({ value: false }).expect(200);
    const first = await resume().build('default');
    expect(first).toMatchObject({ status: 'built', published: true });
    expect((await resume().build('default')).status).toBe('unchanged');
    expect(gotenberg.html).toHaveLength(1);

    const rev = await ctx
      .internal('post', '/internal/case-studies/circlify/revisions')
      .send({
        focus: ['Ajo'],
        context: 'Updated context.',
        role: 'Founder',
        architecture: 'a',
        decisions: ['d'],
        challenges: 'c',
        outcome: 'o',
        lessons: 'l',
        changelog: 'update',
      })
      .expect(201);
    expect((await resume().build('default')).status).toBe('unchanged'); // a draft revision isn't public
    await ctx.internal('post', `/internal/content/case_study_revision/${rev.body.id}`).send({ action: 'publish' }).expect(200);

    const results = await resume().rebuildChanged();
    expect(results.map((r) => [r.build.variant, r.status])).toEqual([
      ['default', 'built'],
      ['backend', 'built'],
      ['fullstack', 'built'],
    ]);
    expect(gotenberg.html[1]).toContain('Updated context.');
    expect(gotenberg.html[2]).toContain('<p class="label">Backend Engineer</p>');
    expect(gotenberg.html[3]).toContain('<p class="label">Full Stack Engineer</p>');

    const backend = await ctx.http().get('/api/resume.pdf?variant=backend').expect(200);
    expect(backend.headers['content-disposition']).toMatch(/Resume-Backend-/);
    expect((await ctx.http().get('/api/resume')).body.map((v: { variant: string }) => v.variant)).toEqual(['default', 'backend', 'fullstack']);
  });

  it('keeps serving the last approved resume while a new one waits for approval', async () => {
    await ctx.admin('patch', '/admin/settings/approval.required.resume').send({ value: false }).expect(200);
    const first = await resume().build('default');
    await ctx.admin('patch', '/admin/settings/approval.required.resume').send({ value: true }).expect(200);
    await approveCvProfile();
    const second = await resume().build('default');
    expect(second).toMatchObject({ status: 'built', published: false });
    const served = await ctx.http().get('/api/resume.pdf').expect(200);
    expect(served.headers.etag).toBe(`"${first.build.contentHash.slice(0, 32)}"`);
  });

  it('reports a render failure without publishing anything', async () => {
    gotenberg.status = 500;
    await ctx.admin('post', '/admin/resume/build').send({ variant: 'default' }).expect(503);
    expect(await ctx.prisma.resumeBuild.count()).toBe(0);
    await ctx.admin('post', '/admin/resume/build').send({ variant: 'nope' }).expect(400);
  });

  it('can force a rebuild of the same content', async () => {
    await ctx.admin('patch', '/admin/settings/approval.required.resume').send({ value: false }).expect(200);
    await resume().build('default');
    const forced = await ctx.admin('post', '/admin/resume/build').send({ variant: 'default', force: true }).expect(200);
    expect(forced.body[0]).toMatchObject({ status: 'built', published: true });
    expect(gotenberg.html).toHaveLength(2);
    expect(await ctx.prisma.resumeBuild.count()).toBe(1); // same content, same build row
    const list = await ctx.admin('get', '/admin/resume/builds').expect(200);
    expect(list.body).toHaveLength(1);
    expect(readFileSync(list.body[0] && (await ctx.prisma.resumeBuild.findFirstOrThrow()).pdfPath).subarray(0, 5).toString()).toBe('%PDF-');
  });
});
