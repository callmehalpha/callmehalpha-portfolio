import { createTestApp, resetDb, TestContext } from './helpers';

const draft = {
  title: 'Why I chose a modular monolith for a fintech product',
  excerpt: 'Trade-offs behind the architecture.',
  bodyMarkdown: '## Context\nWe needed transactional integrity.',
  tags: ['architecture', 'fintech'],
  pillars: ['Engineering'],
  socialDrafts: { linkedin: 'Post text', x: 'Tweet text' },
};

describe('technical notes (e2e)', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(() => resetDb(ctx.prisma));
  afterAll(() => ctx.close());

  const create = (body: object) => ctx.internal('post', '/internal/notes').send(body);
  const act = (id: string, action: string) => ctx.internal('post', `/internal/content/note/${id}`).send({ action });

  it('creates drafts with a slug from the title, adding a suffix when it is taken', async () => {
    const a = await create(draft).expect(201);
    const b = await create(draft).expect(201);
    const c = await create({ ...draft, slug: 'custom slug' }).expect(201);
    expect(a.body).toMatchObject({ slug: 'why-i-chose-a-modular-monolith-for-a-fintech-product', status: 'DRAFT' });
    expect(b.body.slug).toBe('why-i-chose-a-modular-monolith-for-a-fintech-product-2');
    expect(c.body.slug).toBe('custom-slug');
  });

  it('links a note to its project, and refuses an unknown project', async () => {
    await ctx.prisma.project.create({ data: { slug: 'atlax-exchange', name: 'Atlax Exchange', kind: 'CLIENT' } });
    const res = await create({ ...draft, projectSlug: 'atlax-exchange' }).expect(201);
    expect(res.body.projectId).not.toBeNull();
    await create({ ...draft, projectSlug: 'nope' }).expect(404);
  });

  it('validates input', async () => {
    const res = await create({ title: '', excerpt: 'x' }).expect(400);
    expect(res.body.issues.map((i: { path: string }) => i.path)).toEqual(expect.arrayContaining(['title', 'bodyMarkdown']));
  });

  it('keeps drafts off the public site until they are published', async () => {
    const { body: note } = await create(draft).expect(201);
    await ctx.http().get('/api/notes').expect(200, { items: [], total: 0, page: 1, pageSize: 10 });
    await ctx.http().get(`/api/notes/${note.slug}`).expect(404);

    await act(note.id, 'approve').expect(200, { type: 'note', id: note.id, status: 'APPROVED' });
    await ctx.http().get(`/api/notes/${note.slug}`).expect(404);

    await act(note.id, 'publish').expect(200);
    const list = await ctx.http().get('/api/notes').expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0]).toMatchObject({ slug: note.slug, title: draft.title, tags: draft.tags });
    expect(list.body.items[0].preview).toBe('Context We needed transactional integrity.');
    expect(list.body.items[0]).not.toHaveProperty('bodyMarkdown');
    expect(list.body.items[0]).not.toHaveProperty('socialDrafts');
    expect(list.body.items[0]).not.toHaveProperty('llmMeta');

    const detail = await ctx.http().get(`/api/notes/${note.slug}`).expect(200);
    expect(detail.body).toMatchObject({ bodyMarkdown: draft.bodyMarkdown, publications: [] });
    expect(new Date(detail.body.publishedAt).getTime()).toBeGreaterThan(Date.now() - 60_000);
  });

  it('enforces the status machine', async () => {
    const { body: note } = await create(draft).expect(201);
    await act(note.id, 'reject').expect(200);
    const res = await act(note.id, 'publish').expect(409);
    expect(res.body.message).toBe('Cannot move from REJECTED to PUBLISHED');
    await act(note.id, 'withdraw').expect(200, { type: 'note', id: note.id, status: 'DRAFT' });
    await act('missing', 'publish').expect(404);
    await ctx.internal('post', `/internal/content/spaceship/${note.id}`).send({ action: 'publish' }).expect(400);
  });

  it('lets n8n publish by status and returns the public URL', async () => {
    const { body: note } = await create(draft).expect(201);
    const res = await ctx.internal('patch', `/internal/notes/${note.id}`).send({ status: 'PUBLISHED' }).expect(200);
    expect(res.body.url).toBe(`https://site.test/notes/${note.slug}`);
  });

  it('keeps the original publish date when a note is unpublished and republished', async () => {
    const { body: note } = await create(draft).expect(201);
    await act(note.id, 'publish').expect(200);
    const first = (await ctx.prisma.note.findUniqueOrThrow({ where: { id: note.id } })).publishedAt;
    await act(note.id, 'withdraw').expect(200);
    await act(note.id, 'publish').expect(200);
    expect((await ctx.prisma.note.findUniqueOrThrow({ where: { id: note.id } })).publishedAt).toEqual(first);
  });

  it('edits a note without touching its status', async () => {
    const { body: note } = await create(draft).expect(201);
    const res = await ctx.internal('patch', `/internal/notes/${note.id}`).send({ title: 'Better title' }).expect(200);
    expect(res.body).toMatchObject({ title: 'Better title', status: 'DRAFT', slug: note.slug });
    await ctx.internal('patch', `/internal/notes/${note.id}`).send({ title: '' }).expect(400);
  });

  it('paginates, filters by tag and project, and orders newest first', async () => {
    await ctx.prisma.project.create({ data: { slug: 'virtuo', name: 'Virtuo', kind: 'PRODUCT' } });
    for (let i = 1; i <= 3; i++) {
      const { body } = await create({ ...draft, title: `Note ${i}`, tags: i === 2 ? ['ai'] : ['fintech'], projectSlug: i === 3 ? 'virtuo' : undefined });
      await act(body.id, 'publish').expect(200);
      await ctx.prisma.note.update({ where: { id: body.id }, data: { publishedAt: new Date(2026, 0, i) } });
    }
    const page1 = await ctx.http().get('/api/notes?pageSize=2').expect(200);
    expect(page1.body.items.map((n: { title: string }) => n.title)).toEqual(['Note 3', 'Note 2']);
    expect(page1.body.total).toBe(3);
    const page2 = await ctx.http().get('/api/notes?pageSize=2&page=2').expect(200);
    expect(page2.body.items.map((n: { title: string }) => n.title)).toEqual(['Note 1']);

    const ai = await ctx.http().get('/api/notes?tag=ai').expect(200);
    expect(ai.body.items.map((n: { title: string }) => n.title)).toEqual(['Note 2']);
    const virtuo = await ctx.http().get('/api/notes?project=virtuo').expect(200);
    expect(virtuo.body.items[0]).toMatchObject({ title: 'Note 3', project: { slug: 'virtuo' } });

    await ctx.http().get('/api/notes?pageSize=500').expect(400);
  });

  it('lists recent notes for n8n so it can avoid repeating itself', async () => {
    const { body: a } = await create({ ...draft, title: 'A' });
    await create({ ...draft, title: 'B' }); // a draft: not "recent" content yet
    await act(a.id, 'publish');
    const res = await ctx.internal('get', '/internal/notes/recent?limit=5').expect(200);
    expect(res.body.map((n: { title: string }) => n.title)).toEqual(['A']);
  });
});
