import { ApprovalsService } from '../src/approvals/approvals.service';
import { createApprovalToken } from '../src/approvals/approval-token';
import { createTestApp, resetDb, TestContext, TOKENS } from './helpers';

describe('approvals (e2e)', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    ctx.n8n.reset();
  });
  afterAll(() => ctx.close());

  async function draftNote(title = 'Draft') {
    const res = await ctx
      .internal('post', '/internal/notes')
      .send({ title, excerpt: 'e', bodyMarkdown: 'b' })
      .expect(201);
    return res.body as { id: string; slug: string };
  }

  async function requestApproval(entityId: string, entityType = 'note') {
    const res = await ctx
      .internal('post', '/internal/approvals')
      .send({ entityType, entityId, resumeUrl: `${ctx.n8n.base}/webhook-waiting/exec-1` })
      .expect(201);
    return res.body as { id: string; approveUrl: string; rejectUrl: string; expiresAt: string };
  }

  const tokenOf = (url: string) => new URL(url).searchParams.get('token')!;
  const confirmPath = (url: string) => {
    const u = new URL(url);
    return `${u.pathname}${u.search}`;
  };

  it('moves the content to PENDING_APPROVAL and returns signed links on the public API host', async () => {
    const note = await draftNote();
    const approval = await requestApproval(note.id);
    expect(approval.approveUrl).toMatch(/^https:\/\/api\.test\/approvals\/confirm\?token=/);
    expect(approval.rejectUrl).not.toBe(approval.approveUrl);
    expect((await ctx.prisma.note.findUniqueOrThrow({ where: { id: note.id } })).status).toBe('PENDING_APPROVAL');
    expect(new Date(approval.expiresAt).getTime() - Date.now()).toBeGreaterThan(167 * 3600_000);
  });

  it('shows a confirm page on GET without deciding anything (safe against link scanners)', async () => {
    const note = await draftNote();
    const approval = await requestApproval(note.id);

    const page = await ctx.http().get(confirmPath(approval.approveUrl)).expect(200);
    expect(page.headers['content-type']).toMatch(/text\/html/);
    expect(page.headers['cache-control']).toBe('no-store');
    expect(page.text).toContain('Approve technical note?');
    expect(page.text).toContain('<form method="post" action="/approvals/decide">');

    await ctx.http().get(confirmPath(approval.approveUrl)).expect(200); // still pending after repeated GETs
    expect((await ctx.prisma.approvalItem.findUniqueOrThrow({ where: { id: approval.id } })).status).toBe('PENDING');
    expect(ctx.n8n.requests).toHaveLength(0);
  });

  it('approves on POST, applies it to the note and resumes the waiting n8n workflow', async () => {
    const note = await draftNote();
    const approval = await requestApproval(note.id);

    const res = await ctx
      .http()
      .post('/approvals/decide')
      .type('form')
      .send({ token: tokenOf(approval.approveUrl) })
      .expect(200);
    expect(res.text).toContain('Approved');

    expect((await ctx.prisma.note.findUniqueOrThrow({ where: { id: note.id } })).status).toBe('APPROVED');
    const item = await ctx.prisma.approvalItem.findUniqueOrThrow({ where: { id: approval.id } });
    expect(item.status).toBe('APPROVED');
    expect(item.resumeDeliveredAt).not.toBeNull();

    const [resume] = ctx.n8n.calls('/webhook-waiting/exec-1');
    expect(resume.body).toEqual({ approvalId: approval.id, decision: 'approve', entityType: 'note', entityId: note.id });
    expect(resume.headers['x-webhook-secret']).toBe(TOKENS.webhookSecret);
  });

  it('rejects through the reject link', async () => {
    const note = await draftNote();
    const approval = await requestApproval(note.id);
    await ctx.http().post('/approvals/decide').type('form').send({ token: tokenOf(approval.rejectUrl) }).expect(200);
    expect((await ctx.prisma.note.findUniqueOrThrow({ where: { id: note.id } })).status).toBe('REJECTED');
    expect(ctx.n8n.calls('/webhook-waiting/exec-1')[0].body.decision).toBe('reject');
  });

  it('works once: a second click on either link is refused', async () => {
    const note = await draftNote();
    const approval = await requestApproval(note.id);
    await ctx.http().post('/approvals/decide').type('form').send({ token: tokenOf(approval.approveUrl) }).expect(200);

    await ctx.http().post('/approvals/decide').type('form').send({ token: tokenOf(approval.approveUrl) }).expect(409);
    await ctx.http().post('/approvals/decide').type('form').send({ token: tokenOf(approval.rejectUrl) }).expect(409);
    const page = await ctx.http().get(confirmPath(approval.rejectUrl)).expect(409);
    expect(page.text).toContain('This request is approved.');
    expect((await ctx.prisma.note.findUniqueOrThrow({ where: { id: note.id } })).status).toBe('APPROVED');
  });

  it('lets only one of two simultaneous clicks decide', async () => {
    const note = await draftNote();
    const approval = await requestApproval(note.id);
    const statuses = await Promise.all(
      [approval.approveUrl, approval.rejectUrl].map((u) =>
        ctx.http().post('/approvals/decide').type('form').send({ token: tokenOf(u) }).then((r) => r.status),
      ),
    );
    expect(statuses.sort()).toEqual([200, 409]);
    expect(ctx.n8n.calls('/webhook-waiting/exec-1')).toHaveLength(1);
  });

  it('refuses forged, tampered and expired tokens', async () => {
    const note = await draftNote();
    const approval = await requestApproval(note.id);

    const forged = createApprovalToken({ itemId: approval.id, action: 'approve', exp: 9_999_999_999 }, 'not-the-secret'.repeat(3));
    await ctx.http().post('/approvals/decide').type('form').send({ token: forged }).expect(404);
    await ctx.http().post('/approvals/decide').type('form').send({ token: 'garbage' }).expect(404);
    await ctx.http().post('/approvals/decide').type('form').send({}).expect(404);

    const expired = createApprovalToken({ itemId: approval.id, action: 'approve', exp: 1 }, TOKENS.approvalSecret);
    const res = await ctx.http().get(`/approvals/confirm?token=${encodeURIComponent(expired)}`).expect(410);
    expect(res.text).toContain('This link has expired');

    expect((await ctx.prisma.approvalItem.findUniqueOrThrow({ where: { id: approval.id } })).status).toBe('PENDING');
  });

  it('invalidates older links when a new approval is requested for the same content', async () => {
    const note = await draftNote();
    const first = await requestApproval(note.id);
    const second = await requestApproval(note.id);

    await ctx.http().post('/approvals/decide').type('form').send({ token: tokenOf(first.approveUrl) }).expect(409);
    await ctx.http().post('/approvals/decide').type('form').send({ token: tokenOf(second.approveUrl) }).expect(200);
    expect((await ctx.prisma.approvalItem.findUniqueOrThrow({ where: { id: first.id } })).status).toBe('EXPIRED');
  });

  it('expires overdue requests, puts the content back to DRAFT and tells n8n', async () => {
    const note = await draftNote();
    const approval = await requestApproval(note.id);

    const service = ctx.app.get(ApprovalsService);
    expect(await service.expireOverdue(new Date())).toBe(0);
    expect(await service.expireOverdue(new Date(Date.now() + 8 * 24 * 3600_000))).toBe(1);

    expect((await ctx.prisma.approvalItem.findUniqueOrThrow({ where: { id: approval.id } })).status).toBe('EXPIRED');
    expect((await ctx.prisma.note.findUniqueOrThrow({ where: { id: note.id } })).status).toBe('DRAFT');
    expect(ctx.n8n.calls('/webhook-waiting/exec-1')[0].body.decision).toBe('expired');
  });

  it('records the decision even when n8n cannot be resumed', async () => {
    const note = await draftNote();
    const approval = await requestApproval(note.id);
    ctx.n8n.status = 500;
    await ctx.http().post('/approvals/decide').type('form').send({ token: tokenOf(approval.approveUrl) }).expect(200);
    const item = await ctx.prisma.approvalItem.findUniqueOrThrow({ where: { id: approval.id } });
    expect(item).toMatchObject({ status: 'APPROVED', resumeDeliveredAt: null });
  });

  it('refuses to request approval for content that is already live', async () => {
    const note = await draftNote();
    await ctx.internal('post', `/internal/content/note/${note.id}`).send({ action: 'publish' }).expect(200);
    await ctx.internal('post', '/internal/approvals').send({ entityType: 'note', entityId: note.id }).expect(409);
    await ctx.internal('post', '/internal/approvals').send({ entityType: 'note', entityId: 'missing' }).expect(404);
    await ctx.internal('post', '/internal/approvals').send({ entityType: 'poem', entityId: note.id }).expect(400);
  });

  it('lets me decide from the admin API too', async () => {
    const note = await draftNote();
    const approval = await requestApproval(note.id);
    const pending = await ctx.admin('get', '/admin/approvals').expect(200);
    expect(pending.body.map((a: { id: string }) => a.id)).toEqual([approval.id]);

    const res = await ctx.admin('post', `/admin/approvals/${approval.id}`).send({ decision: 'approve' }).expect(200);
    expect(res.body).toMatchObject({ decision: 'approve', entity: { status: 'APPROVED' }, resumed: true });
  });

  it('reports whether approval is required, following the runtime toggle', async () => {
    await ctx.internal('get', '/internal/approvals/required/note').expect(200, { required: true });
    await ctx.admin('patch', '/admin/settings/approval.required.note').send({ value: false }).expect(200);
    await ctx.internal('get', '/internal/approvals/required/note').expect(200, { required: false });
    await ctx.internal('get', '/internal/approvals/required/case_study_revision').expect(200, { required: true });
    await ctx.internal('get', '/internal/approvals/required/poem').expect(400);
  });
});
