import { join } from 'path';
import { seed } from '../src/seed/seed';
import { createTestApp, eventually, resetDb, TestContext } from './helpers';

const SEED_DIR = join(__dirname, '..', '..', 'seed', 'data');

describe('delivery: publications, email, settings, registries (e2e)', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    await seed(ctx.prisma, { dir: SEED_DIR, notifyEmailTo: 'abdulazeezyisau@gmail.com' });
    ctx.smtp.messages = [];
  });
  afterAll(() => ctx.close());

  async function publishedNote(title = 'Fresh note') {
    const { body } = await ctx.internal('post', '/internal/notes').send({ title, excerpt: 'e', bodyMarkdown: 'b' }).expect(201);
    await ctx.internal('post', `/internal/content/note/${body.id}`).send({ action: 'publish' }).expect(200);
    return body as { id: string; slug: string };
  }

  const enable = (key: string) => ctx.admin('patch', `/admin/channels/${key}`).send({ enabled: true }).expect(200);
  const claim = (noteId: string, channelKey: string) =>
    ctx.internal('post', '/internal/publications/claim').send({ noteId, channelKey, content: 'New note: https://site.test/notes/x' });

  describe('publications', () => {
    it('only claims published notes on enabled channels', async () => {
      const { body: draft } = await ctx.internal('post', '/internal/notes').send({ title: 'd', excerpt: 'e', bodyMarkdown: 'b' });
      const note = await publishedNote();
      await claim(note.id, 'linkedin').expect(400); // seeded channels start disabled
      await enable('linkedin');
      await claim(draft.id, 'linkedin').expect(400);
      await claim(note.id, 'myspace').expect(404);
      await claim('missing', 'linkedin').expect(404);
      await claim(note.id, 'linkedin').expect(201);
    });

    it('posts each note at most once per channel, and shows the link on the note page', async () => {
      await enable('linkedin');
      await enable('x');
      const note = await publishedNote();

      const li = await claim(note.id, 'linkedin').expect(201);
      expect(li.body).toMatchObject({ status: 'PENDING', attempts: 1 });
      await ctx
        .internal('patch', `/internal/publications/${li.body.id}`)
        .send({ ok: true, externalId: 'urn:li:1', externalUrl: 'https://www.linkedin.com/feed/update/urn:li:1' })
        .expect(200);

      await claim(note.id, 'linkedin').expect(409);
      await ctx.internal('patch', `/internal/publications/${li.body.id}`).send({ ok: false, error: 'late' }).expect(409);

      const page = await ctx.http().get(`/api/notes/${note.slug}`).expect(200);
      expect(page.body.publications).toEqual([
        expect.objectContaining({ externalUrl: 'https://www.linkedin.com/feed/update/urn:li:1', channel: { key: 'linkedin', name: 'LinkedIn' } }),
      ]);
    });

    it('lets a failed post be retried, counting attempts', async () => {
      await enable('x');
      const note = await publishedNote();
      const first = await claim(note.id, 'x').expect(201);
      await ctx.internal('patch', `/internal/publications/${first.body.id}`).send({ ok: false, error: 'HTTP 429' }).expect(200);

      const retry = await claim(note.id, 'x').expect(201);
      expect(retry.body).toMatchObject({ id: first.body.id, status: 'PENDING', attempts: 2 });
      await ctx.internal('patch', `/internal/publications/${retry.body.id}`).send({ ok: 'skipped', reason: 'too long' }).expect(200);
      expect((await ctx.prisma.publication.findUniqueOrThrow({ where: { id: retry.body.id } })).status).toBe('SKIPPED');
    });

    it('gives a channel to only one of two simultaneous runs', async () => {
      await enable('linkedin');
      const note = await publishedNote();
      const results = await Promise.all([claim(note.id, 'linkedin'), claim(note.id, 'linkedin')]);
      const statuses = results.map((r) => r.status).sort();
      // The second claim either loses the insert race (409) or re-claims the same pending row (201, same id).
      if (statuses[1] === 409) expect(statuses).toEqual([201, 409]);
      else expect(results[0].body.id).toBe(results[1].body.id);
      expect(await ctx.prisma.publication.count({ where: { noteId: note.id } })).toBe(1);
    });

    it('keeps the seeded LinkedIn post linked to the imported note', async () => {
      const page = await ctx.http().get('/api/notes/the-case-for-modular-monoliths').expect(200);
      expect(page.body.publications[0].externalUrl).toMatch(/^https:\/\/www\.linkedin\.com\/feed\/update\//);
    });
  });

  describe('email', () => {
    it('sends to the email notifier address by default, with buttons and attachments', async () => {
      const res = await ctx
        .internal('post', '/internal/notify/email')
        .send({
          subject: 'Approve: Why I chose a modular monolith',
          markdown: '# New draft\n\nA **technical note** is ready.\n\n- Pillar: Engineering',
          actions: [{ label: 'Approve', url: 'https://api.test/approvals/confirm?token=abc', style: 'primary' }],
          attachments: [{ filename: 'resume.pdf', contentBase64: Buffer.from('%PDF-1.4').toString('base64'), contentType: 'application/pdf' }],
        })
        .expect(201);
      expect(res.body.to).toBe('abdulazeezyisau@gmail.com');

      const mail = await eventually(async () => ctx.smtp.messages[0]);
      expect(mail.subject).toBe('Approve: Why I chose a modular monolith');
      expect(mail.from?.value[0]).toMatchObject({ name: 'Content Engine', address: 'engine@test.local' });
      expect(mail.html).toContain('<strong>technical note</strong>');
      expect(mail.html).toContain('href="https://api.test/approvals/confirm?token=abc"');
      expect(mail.text).toContain('Approve: https://api.test/approvals/confirm?token=abc');
      expect(mail.attachments.map((a) => [a.filename, a.contentType])).toEqual([['resume.pdf', 'application/pdf']]);
    });

    it('follows a runtime change of the recipient', async () => {
      await ctx.admin('patch', '/admin/notifiers/email').send({ config: { to: 'other@example.com', events: ['approval'] } }).expect(200);
      await ctx.internal('post', '/internal/notify/email').send({ subject: 's', markdown: 'm' }).expect(201);
      const mail = await eventually(async () => ctx.smtp.messages[0]);
      expect(mail.to && 'text' in mail.to ? mail.to.text : '').toBe('other@example.com');
    });

    it('refuses to send when no recipient is configured, and validates input', async () => {
      await ctx.admin('patch', '/admin/notifiers/email').send({ config: { events: [] } }).expect(200);
      await ctx.internal('post', '/internal/notify/email').send({ subject: 's', markdown: 'm' }).expect(400);
      await ctx.internal('post', '/internal/notify/email').send({ subject: '', markdown: 'm', to: 'not-an-email' }).expect(400);
    });
  });

  describe('settings and registries', () => {
    it('exposes defaults and lets me toggle them at runtime', async () => {
      const defaults = await ctx.internal('get', '/internal/settings').expect(200);
      expect(defaults.body['approval.required.note']).toBe(true);

      const updated = await ctx.admin('patch', '/admin/settings/approval.required.oss').send({ value: false }).expect(200);
      expect(updated.body['approval.required.oss']).toBe(false);
      expect((await ctx.internal('get', '/internal/settings')).body['approval.required.oss']).toBe(false);

      await ctx.admin('patch', '/admin/settings/approval.required.oss').send({ value: 'no' }).expect(400);
      await ctx.admin('patch', '/admin/settings/not.a.setting').send({ value: true }).expect(404);
    });

    it('lists enabled channels and notifiers by event, for the n8n fan-out', async () => {
      expect((await ctx.internal('get', '/internal/channels?enabled=true')).body).toEqual([]);
      const all = await ctx.internal('get', '/internal/channels').expect(200);
      expect(all.body.map((c: { key: string }) => c.key)).toEqual(['instagram', 'linkedin', 'x']);
      expect(all.body.find((c: { key: string }) => c.key === 'instagram').config.requiresMedia).toBe(true);

      await enable('x');
      expect((await ctx.internal('get', '/internal/channels?enabled=true')).body.map((c: { key: string }) => c.key)).toEqual(['x']);

      const approvalNotifiers = await ctx.internal('get', '/internal/notifiers?enabled=true&event=approval').expect(200);
      expect(approvalNotifiers.body.map((n: { key: string }) => n.key)).toEqual(['email']);
      expect((await ctx.internal('get', '/internal/notifiers?enabled=true&event=nothing')).body).toEqual([]);

      await ctx.admin('patch', '/admin/channels/tiktok').send({ enabled: true }).expect(404);
    });

    it('re-triggers a failed source from the admin API', async () => {
      const res = await ctx.internal('post', '/api/ingest').send({ kind: 'source', filename: 'a.md', content: 'x' }).expect(201);
      await ctx.prisma.sourceDocument.update({ where: { id: res.body.source.id }, data: { status: 'FAILED', triggerAttempts: 5 } });
      const retry = await ctx.admin('post', `/admin/sources/${res.body.source.id}/retry`).expect(200);
      expect(retry.body).toMatchObject({ ok: true, source: { status: 'PROCESSING', triggerAttempts: 1 } });
    });
  });

  describe('seed', () => {
    it('is idempotent and never overwrites what is already there', async () => {
      await ctx.admin('patch', '/admin/notifiers/email').send({ config: { to: 'changed@example.com', events: [] } }).expect(200);
      await seed(ctx.prisma, { dir: SEED_DIR, notifyEmailTo: 'abdulazeezyisau@gmail.com' });
      expect(await ctx.prisma.project.count()).toBe(5);
      expect(await ctx.prisma.caseStudyRevision.count()).toBe(5);
      expect(await ctx.prisma.note.count()).toBe(1);
      expect(await ctx.prisma.publication.count()).toBe(1);
      expect(await ctx.prisma.profileRevision.count()).toBe(2); // v1 live + the CV draft
      expect(await ctx.prisma.channel.count()).toBe(3);
      const email = await ctx.prisma.notifier.findUniqueOrThrow({ where: { key: 'email' } });
      expect(email.config).toMatchObject({ to: 'changed@example.com' });
    });

    it('leaves the email notifier disabled when no address is given', async () => {
      await resetDb(ctx.prisma);
      await seed(ctx.prisma, { dir: SEED_DIR });
      expect((await ctx.prisma.notifier.findUniqueOrThrow({ where: { key: 'email' } })).enabled).toBe(false);
    });
  });
});
