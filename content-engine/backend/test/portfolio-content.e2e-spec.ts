import { readFileSync } from 'fs';
import { join } from 'path';
import { seed } from '../src/seed/seed';
import { createTestApp, resetDb, TestContext } from './helpers';

const SEED_DIR = join(__dirname, '..', '..', 'seed', 'data');
const seededCaseStudies = JSON.parse(readFileSync(join(SEED_DIR, 'case-studies.json'), 'utf8'));

const revision = {
  focus: ['Go / PostgreSQL backend', 'Partner bank integration'],
  context: 'New context',
  role: 'Backend Engineer',
  architecture: 'Go services on PostgreSQL',
  decisions: ['Reconcile webhooks against the ledger'],
  challenges: 'Consistency under load',
  outcome: '8,800+ transactions in a week at 98% success',
  lessons: 'Reconcile everything',
  changelog: 'Added partner bank integration and reconciliation',
};

describe('portfolio content: case studies, open source, profile (e2e)', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    await seed(ctx.prisma, { dir: SEED_DIR, notifyEmailTo: 'abdulazeezyisau@gmail.com' });
  });
  afterAll(() => ctx.close());

  describe('case studies', () => {
    it('serves the seeded case studies in the exact shape and order the portfolio uses today', async () => {
      const res = await ctx.http().get('/api/case-studies').expect(200);
      const stripped = res.body.map(({ version, updatedAt, ...rest }: Record<string, unknown>) => {
        expect(version).toBe(1);
        expect(updatedAt).toBeDefined();
        return rest;
      });
      expect(stripped).toEqual(seededCaseStudies);
    });

    it('keeps a new revision as a draft until it is approved, then shows it as version 2', async () => {
      const rev = await ctx.internal('post', '/internal/case-studies/atlax-exchange/revisions').send(revision).expect(201);
      expect(rev.body).toMatchObject({ version: 2, status: 'DRAFT' });

      let pub = await ctx.http().get('/api/case-studies/atlax-exchange').expect(200);
      expect(pub.body.version).toBe(1);

      const approval = await ctx
        .internal('post', '/internal/approvals')
        .send({ entityType: 'case_study_revision', entityId: rev.body.id })
        .expect(201);
      await ctx.http().post('/approvals/decide').type('form').send({ token: new URL(approval.body.approveUrl).searchParams.get('token') }).expect(200);

      pub = await ctx.http().get('/api/case-studies/atlax-exchange').expect(200);
      expect(pub.body).toMatchObject({ version: 2, role: 'Backend Engineer', name: 'Atlax Exchange', url: 'https://atlaxchange.com' });

      const history = await ctx.admin('get', '/admin/case-studies/atlax-exchange/revisions').expect(200);
      expect(history.body.map((r: { version: number; status: string }) => [r.version, r.status])).toEqual([
        [2, 'PUBLISHED'],
        [1, 'PUBLISHED'],
      ]);
    });

    it('rolls back by re-publishing an older revision', async () => {
      const rev = await ctx.internal('post', '/internal/case-studies/atlax-exchange/revisions').send(revision).expect(201);
      await ctx.internal('post', `/internal/content/case_study_revision/${rev.body.id}`).send({ action: 'publish' }).expect(200);
      expect((await ctx.http().get('/api/case-studies/atlax-exchange')).body.version).toBe(2);

      const v1 = (await ctx.admin('get', '/admin/case-studies/atlax-exchange/revisions')).body.find((r: { version: number }) => r.version === 1);
      await ctx.admin('post', `/admin/content/case_study_revision/${v1.id}`).send({ action: 'publish' }).expect(200);
      expect((await ctx.http().get('/api/case-studies/atlax-exchange')).body.version).toBe(1);
    });

    it('falls back to the previous published revision when the live one is withdrawn', async () => {
      const rev = await ctx.internal('post', '/internal/case-studies/atlax-exchange/revisions').send(revision).expect(201);
      await ctx.internal('post', `/internal/content/case_study_revision/${rev.body.id}`).send({ action: 'publish' }).expect(200);
      await ctx.admin('post', `/admin/content/case_study_revision/${rev.body.id}`).send({ action: 'withdraw' }).expect(200);
      expect((await ctx.http().get('/api/case-studies/atlax-exchange')).body.version).toBe(1);

      const v1 = (await ctx.admin('get', '/admin/case-studies/atlax-exchange/revisions')).body.find((r: { version: number }) => r.version === 1);
      await ctx.admin('post', `/admin/content/case_study_revision/${v1.id}`).send({ action: 'withdraw' }).expect(200);
      await ctx.http().get('/api/case-studies/atlax-exchange').expect(404);
      const list = await ctx.http().get('/api/case-studies').expect(200);
      expect(list.body.map((c: { id: string }) => c.id)).not.toContain('atlax-exchange');
    });

    it('creates the first case study for a project that had none (proposed from the CV)', async () => {
      await ctx.internal('post', '/internal/projects').send({ name: 'DOKTA', kind: 'CLIENT', sortOrder: 10 }).expect(201);
      await ctx.internal('get', '/internal/case-studies/dokta').expect(200, { current: null });

      const rev = await ctx.internal('post', '/internal/case-studies/dokta/revisions').send(revision).expect(201);
      expect(rev.body.version).toBe(1);
      await ctx.http().get('/api/case-studies/dokta').expect(404);

      await ctx.internal('post', `/internal/content/case_study_revision/${rev.body.id}`).send({ action: 'approve' }).expect(200);
      const list = await ctx.http().get('/api/case-studies').expect(200);
      expect(list.body.map((c: { id: string }) => c.id).at(-1)).toBe('dokta');
    });

    it('hides a project from the site when it is made invisible', async () => {
      await ctx.admin('patch', '/admin/projects/nogic').send({ visible: false }).expect(200);
      const list = await ctx.http().get('/api/case-studies').expect(200);
      expect(list.body.map((c: { id: string }) => c.id)).not.toContain('nogic');
      await ctx.http().get('/api/case-studies/nogic').expect(404);
    });

    it('validates revisions: at most 6 decisions', async () => {
      const res = await ctx
        .internal('post', '/internal/case-studies/atlax-exchange/revisions')
        .send({ ...revision, decisions: Array(7).fill('d') })
        .expect(400);
      expect(res.body.issues[0].path).toBe('decisions');
      await ctx.internal('post', '/internal/case-studies/unknown/revisions').send(revision).expect(404);
    });
  });

  describe('open source projects', () => {
    beforeEach(async () => {
      await ctx
        .internal('post', '/internal/projects')
        .send({ name: 'Nest Mailer', slug: 'nest-mailer', kind: 'OSS', repoUrl: 'https://github.com/acme/nest-mailer' })
        .expect(201);
    });

    const entry = {
      role: 'CONTRIBUTOR',
      summary: 'A mail module for NestJS',
      myImpact: 'Added streaming attachments',
      stack: ['TypeScript', 'NestJS'],
      highlights: ['Cut memory use for large attachments'],
    };

    it('refuses an OSS entry on a project that is not open source', async () => {
      await ctx.internal('put', '/internal/oss/atlax-exchange').send(entry).expect(400);
    });

    it('stays off the site until approved, then shows with its latest contributions', async () => {
      await ctx.internal('put', '/internal/oss/nest-mailer').send(entry).expect(200);
      await ctx.http().get('/api/oss').expect(200, []);

      const prs = [1, 2, 3, 4].map((n) => ({
        kind: 'pr',
        title: `PR ${n}`,
        url: `https://github.com/acme/nest-mailer/pull/${n}`,
        mergedAt: `2026-0${n}-01T00:00:00Z`,
      }));
      await ctx.internal('post', '/internal/oss/nest-mailer/contributions').send(prs).expect(201);

      const oss = await ctx.internal('get', '/internal/oss/nest-mailer').expect(200);
      await ctx.internal('post', `/internal/content/oss_project/${oss.body.id}`).send({ action: 'approve' }).expect(200);

      const res = await ctx.http().get('/api/oss').expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ slug: 'nest-mailer', role: 'CONTRIBUTOR', repoUrl: 'https://github.com/acme/nest-mailer' });
      expect(res.body[0].contributions.map((c: { title: string }) => c.title)).toEqual(['PR 4', 'PR 3', 'PR 2']);
    });

    it('upserts contributions by URL, so a re-sync never duplicates them', async () => {
      await ctx.internal('put', '/internal/oss/nest-mailer').send(entry).expect(200);
      const pr = { kind: 'pr', title: 'Add streaming', url: 'https://github.com/acme/nest-mailer/pull/7' };
      await ctx.internal('post', '/internal/oss/nest-mailer/contributions').send([pr]).expect(201);
      await ctx.internal('post', '/internal/oss/nest-mailer/contributions').send([{ ...pr, title: 'Add streaming attachments' }]).expect(201);
      const contributions = await ctx.prisma.ossContribution.findMany();
      expect(contributions).toHaveLength(1);
      expect(contributions[0].title).toBe('Add streaming attachments');
    });

    it('refreshes GitHub stats silently, but sends content changes back for approval', async () => {
      await ctx.internal('put', '/internal/oss/nest-mailer').send(entry).expect(200);
      const oss = await ctx.internal('get', '/internal/oss/nest-mailer').expect(200);
      await ctx.internal('post', `/internal/content/oss_project/${oss.body.id}`).send({ action: 'publish' }).expect(200);

      await ctx.internal('patch', '/internal/oss/nest-mailer/stats').send({ stars: 120, forks: 9, language: 'TypeScript' }).expect(200);
      let pub = (await ctx.http().get('/api/oss')).body[0];
      expect(pub.githubStats).toMatchObject({ stars: 120, forks: 9, language: 'TypeScript' });

      await ctx.internal('put', '/internal/oss/nest-mailer').send({ ...entry, myImpact: 'Maintainer now' }).expect(200);
      await ctx.http().get('/api/oss').expect(200, []);
    });

    it('needs an entry before contributions or stats', async () => {
      await ctx.internal('patch', '/internal/oss/nest-mailer/stats').send({ stars: 1, forks: 0 }).expect(404);
    });
  });

  describe('profile', () => {
    it('serves the seeded profile, which matches the current hero copy', async () => {
      const res = await ctx.http().get('/api/profile').expect(200);
      expect(res.body.version).toBe(1);
      expect(res.body.positioning.tagline).toBe('I build high-integrity systems where trust, scale, and real-world constraints matter.');
      expect(res.body.capabilities).toHaveLength(4);
      expect(res.body.philosophies).toHaveLength(5);
    });

    it('never exposes private fields such as the phone number', async () => {
      const current = await ctx.internal('get', '/internal/profile').expect(200);
      const data = { ...current.body.current.data, basics: { ...current.body.current.data.basics, phone: '0000 000 0000', location: { city: 'Ibadan', address: '1 Private Road' } } };
      const rev = await ctx
        .internal('post', '/internal/profile/revisions')
        .send({ data, privacy: { 'basics.email': 'private' }, changelog: 'From CV' })
        .expect(201);
      await ctx.internal('post', `/internal/content/profile_revision/${rev.body.id}`).send({ action: 'approve' }).expect(200);

      const res = await ctx.http().get('/api/profile').expect(200);
      expect(res.body.version).toBe(3);
      expect(res.body.basics).not.toHaveProperty('phone');
      expect(res.body.basics).not.toHaveProperty('email');
      expect(res.body.basics.location).toEqual({ city: 'Ibadan' });

      const internal = await ctx.internal('get', '/internal/profile').expect(200);
      expect(internal.body.current.data.basics.phone).toBe('0000 000 0000'); // n8n still sees everything
    });

    it('seeds the CV-based profile as a draft that goes live only once approved', async () => {
      const draft = await ctx.prisma.profileRevision.findFirstOrThrow({ where: { status: 'DRAFT' } });
      expect(draft.version).toBe(2);
      expect((await ctx.http().get('/api/profile')).body.basics.label).toBe('Systems Engineer & Technical Founder');

      await ctx.admin('post', `/admin/content/profile_revision/${draft.id}`).send({ action: 'approve' }).expect(200);
      const res = await ctx.http().get('/api/profile').expect(200);
      expect(res.body).toMatchObject({
        version: 2,
        basics: { label: 'Technical Product Builder' },
        positioning: { tagline: 'I turn business problems into shipped technology products.' },
      });
      const atlax = res.body.work.find((w: { name: string }) => w.name === 'Atlax Exchange');
      expect(atlax).toMatchObject({ position: 'Full Stack Engineer', startDate: '2025-07' });
      expect(atlax).not.toHaveProperty('endDate');
      expect(res.body.work.find((w: { name: string }) => w.name === 'Frootify').position).toBe('Lead Product Engineer');
      expect(res.body.work.map((w: { projectSlug?: string }) => w.projectSlug)).toContain('virtuo');
      expect(JSON.stringify(res.body)).not.toMatch(/Virtuosphere/);
    });

    it('counts production platforms from the case studies that are live', async () => {
      const stat = () =>
        ctx.http().get('/api/profile').then((r) => r.body.heroStats.find((s: { label: string }) => s.label === 'Production platforms'));
      expect(await stat()).toEqual({ label: 'Production platforms', value: '5', evidence: 'Case studies live on the portfolio' });

      await ctx.admin('patch', '/admin/projects/nogic').send({ visible: false }).expect(200);
      expect((await stat()).value).toBe('4');

      const draft = await ctx.prisma.profileRevision.findFirstOrThrow({ where: { status: 'DRAFT' } });
      await ctx.admin('post', `/admin/content/profile_revision/${draft.id}`).send({ action: 'approve' }).expect(200);
      expect((await stat()).value).toBe('4'); // the CV profile derives it the same way
    });

    it('requires evidence for every hero stat', async () => {
      const current = (await ctx.internal('get', '/internal/profile')).body.current.data;
      const res = await ctx
        .internal('post', '/internal/profile/revisions')
        .send({ data: { ...current, heroStats: [{ label: 'Users', value: '15,000+', evidence: '' }] }, changelog: 'x' })
        .expect(400);
      expect(res.body.issues[0].path).toBe('data.heroStats.0.evidence');
    });
  });
});
