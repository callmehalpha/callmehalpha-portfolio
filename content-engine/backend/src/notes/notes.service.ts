import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, Note, Prisma } from '@prisma/client';
import { z } from 'zod';
import { assertTransition } from '../common/content-status';
import { uniqueSlug } from '../common/slug';
import { previewText } from './preview';
import { PrismaService } from '../prisma/prisma.service';

export const noteInput = z.object({
  sourceId: z.string().optional(),
  projectSlug: z.string().optional(),
  slug: z.string().optional(),
  title: z.string().min(1).max(200),
  excerpt: z.string().min(1).max(500),
  bodyMarkdown: z.string().min(1),
  tags: z.array(z.string()).default([]),
  pillars: z.array(z.string()).default([]),
  coverImageUrl: z.string().url().optional(),
  seo: z.record(z.unknown()).optional(),
  socialDrafts: z.record(z.unknown()).optional(),
  llmMeta: z.record(z.unknown()).optional(),
});
export type NoteInput = z.infer<typeof noteInput>;

export const notePatch = noteInput.omit({ sourceId: true, projectSlug: true, slug: true }).partial();
export type NotePatch = z.infer<typeof notePatch>;

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  tag: z.string().optional(),
  project: z.string().optional(),
});
export type ListQuery = z.infer<typeof listQuery>;

const publicSelect = {
  slug: true,
  title: true,
  excerpt: true,
  tags: true,
  pillars: true,
  coverImageUrl: true,
  publishedAt: true,
  project: { select: { slug: true, name: true } },
} satisfies Prisma.NoteSelect;

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(q: ListQuery) {
    const where: Prisma.NoteWhereInput = {
      status: 'PUBLISHED',
      ...(q.tag ? { tags: { has: q.tag } } : {}),
      ...(q.project ? { project: { slug: q.project } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.note.findMany({
        where,
        select: { ...publicSelect, bodyMarkdown: true },
        orderBy: { publishedAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.note.count({ where }),
    ]);
    return {
      items: items.map(({ bodyMarkdown, ...rest }) => ({ ...rest, preview: previewText(bodyMarkdown) })),
      total,
      page: q.page,
      pageSize: q.pageSize,
    };
  }

  async getPublished(slug: string) {
    const note = await this.prisma.note.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: {
        ...publicSelect,
        bodyMarkdown: true,
        seo: true,
        publications: {
          where: { status: 'PUBLISHED' },
          select: { externalUrl: true, publishedAt: true, channel: { select: { key: true, name: true } } },
        },
      },
    });
    if (!note) throw new NotFoundException(`Note ${slug} not found`);
    return note;
  }

  recent(limit: number) {
    return this.prisma.note.findMany({
      where: { status: { in: ['PUBLISHED', 'APPROVED', 'PENDING_APPROVAL'] } },
      select: { id: true, slug: true, title: true, tags: true, pillars: true, status: true, publishedAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async get(id: string): Promise<Note> {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) throw new NotFoundException(`Note ${id} not found`);
    return note;
  }

  async createDraft(input: NoteInput): Promise<Note> {
    const project = input.projectSlug
      ? await this.prisma.project.findUnique({ where: { slug: input.projectSlug } })
      : null;
    if (input.projectSlug && !project) throw new NotFoundException(`Project ${input.projectSlug} not found`);

    const slug = await uniqueSlug(input.slug ?? input.title, async (s) =>
      Boolean(await this.prisma.note.findUnique({ where: { slug: s }, select: { id: true } })),
    );
    return this.prisma.note.create({
      data: {
        slug,
        title: input.title,
        excerpt: input.excerpt,
        bodyMarkdown: input.bodyMarkdown,
        tags: input.tags,
        pillars: input.pillars,
        coverImageUrl: input.coverImageUrl,
        seo: input.seo as Prisma.InputJsonValue,
        socialDrafts: input.socialDrafts as Prisma.InputJsonValue,
        llmMeta: input.llmMeta as Prisma.InputJsonValue,
        sourceId: input.sourceId,
        projectId: project?.id,
      },
    });
  }

  async update(id: string, patch: NotePatch): Promise<Note> {
    await this.get(id);
    return this.prisma.note.update({
      where: { id },
      data: {
        ...patch,
        seo: patch.seo as Prisma.InputJsonValue | undefined,
        socialDrafts: patch.socialDrafts as Prisma.InputJsonValue | undefined,
        llmMeta: patch.llmMeta as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async transition(id: string, to: ContentStatus): Promise<Note> {
    const note = await this.get(id);
    if (note.status === to) return note;
    assertTransition(note.status, to);
    return this.prisma.note.update({
      where: { id },
      data: {
        status: to,
        publishedAt: to === 'PUBLISHED' ? (note.publishedAt ?? new Date()) : note.publishedAt,
      },
    });
  }

  url(siteUrl: string, slug: string): string {
    return `${siteUrl.replace(/\/+$/, '')}/notes/${slug}`;
  }
}
