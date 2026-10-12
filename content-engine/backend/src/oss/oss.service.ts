import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OssProject, OssRole, Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

export const ossInput = z.object({
  role: z.nativeEnum(OssRole),
  summary: z.string().min(1),
  myImpact: z.string().min(1),
  stack: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
  llmMeta: z.record(z.unknown()).optional(),
});
export type OssInput = z.infer<typeof ossInput>;

export const contributionInput = z.object({
  kind: z.enum(['pr', 'issue', 'release', 'review', 'docs']),
  title: z.string().min(1),
  url: z.string().url(),
  mergedAt: z.coerce.date().optional(),
  summary: z.string().optional(),
});
export type ContributionInput = z.infer<typeof contributionInput>;

export const statsInput = z.object({
  stars: z.number().int().min(0),
  forks: z.number().int().min(0),
  language: z.string().nullable().optional(),
  topics: z.array(z.string()).optional(),
  lastCommitAt: z.coerce.date().optional(),
});
export type StatsInput = z.infer<typeof statsInput>;

@Injectable()
export class OssService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(contributionsPerProject = 3) {
    const entries = await this.prisma.ossProject.findMany({
      where: { status: 'PUBLISHED', project: { visible: true } },
      include: {
        project: { select: { slug: true, name: true, url: true, repoUrl: true, sortOrder: true } },
        contributions: { orderBy: [{ mergedAt: { sort: 'desc', nulls: 'last' } }], take: contributionsPerProject },
      },
    });
    return entries
      .sort((a, b) => a.project.sortOrder - b.project.sortOrder || a.project.name.localeCompare(b.project.name))
      .map((e) => ({
        slug: e.project.slug,
        name: e.project.name,
        url: e.project.url,
        repoUrl: e.project.repoUrl,
        role: e.role,
        summary: e.summary,
        myImpact: e.myImpact,
        stack: e.stack,
        highlights: e.highlights,
        githubStats: e.githubStats,
        contributions: e.contributions.map(({ kind, title, url, mergedAt, summary }) => ({ kind, title, url, mergedAt, summary })),
      }));
  }

  async get(projectSlug: string) {
    const project = await this.ossProject(projectSlug);
    return this.prisma.ossProject.findUnique({ where: { projectId: project.id }, include: { contributions: true } });
  }

  /** Creates or updates the entry. Any content change goes back to DRAFT for approval. */
  async upsert(projectSlug: string, input: OssInput): Promise<OssProject> {
    const project = await this.ossProject(projectSlug);
    const data = { ...input, llmMeta: input.llmMeta as Prisma.InputJsonValue, status: 'DRAFT' as const };
    return this.prisma.ossProject.upsert({
      where: { projectId: project.id },
      create: { ...data, projectId: project.id },
      update: data,
    });
  }

  /** Upserts by URL, so re-running the GitHub sync never duplicates a PR. */
  async upsertContributions(projectSlug: string, items: ContributionInput[]) {
    const entry = await this.requireEntry(projectSlug);
    const results = [];
    for (const item of items) {
      results.push(
        await this.prisma.ossContribution.upsert({
          where: { url: item.url },
          create: { ...item, ossProjectId: entry.id },
          update: { ...item, ossProjectId: entry.id },
        }),
      );
    }
    return results;
  }

  /** Stats refresh silently: no approval, no status change. */
  async updateStats(projectSlug: string, stats: StatsInput) {
    const entry = await this.requireEntry(projectSlug);
    return this.prisma.ossProject.update({
      where: { id: entry.id },
      data: { githubStats: { ...stats, syncedAt: new Date().toISOString() } as Prisma.InputJsonValue },
    });
  }

  private async ossProject(slug: string) {
    const project = await this.prisma.project.findUnique({ where: { slug } });
    if (!project) throw new NotFoundException(`Project ${slug} not found`);
    if (project.kind !== 'OSS') throw new BadRequestException(`Project ${slug} is not an open-source project`);
    return project;
  }

  private async requireEntry(slug: string) {
    const project = await this.ossProject(slug);
    const entry = await this.prisma.ossProject.findUnique({ where: { projectId: project.id } });
    if (!entry) throw new NotFoundException(`No open-source entry for ${slug} yet`);
    return entry;
  }
}
