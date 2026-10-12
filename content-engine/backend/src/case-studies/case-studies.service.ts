import { Injectable, NotFoundException } from '@nestjs/common';
import { CaseStudyRevision, Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

export const revisionInput = z.object({
  focus: z.array(z.string().min(1)).max(8),
  context: z.string().min(1),
  role: z.string().min(1),
  architecture: z.string().min(1),
  decisions: z.array(z.string().min(1)).max(6),
  challenges: z.string().min(1),
  outcome: z.string().min(1),
  lessons: z.string().min(1),
  changelog: z.string().min(1),
  sourceIds: z.array(z.string()).default([]),
  llmMeta: z.record(z.unknown()).optional(),
});
export type RevisionInput = z.infer<typeof revisionInput>;

/** The same shape as the frontend's `CaseStudy` type, so `CaseStudyCard` renders it unchanged. */
export interface PublicCaseStudy {
  id: string;
  name: string;
  url: string;
  focus: string[];
  context: string;
  role: string;
  architecture: string;
  decisions: string[];
  challenges: string;
  outcome: string;
  lessons: string;
  version: number;
  updatedAt: Date;
}

@Injectable()
export class CaseStudiesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(): Promise<PublicCaseStudy[]> {
    const projects = await this.prisma.project.findMany({
      where: { visible: true, caseStudy: { currentRevisionId: { not: null } } },
      include: { caseStudy: { include: { currentRevision: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return projects.map((p) => this.toPublic(p, p.caseStudy!.currentRevision!));
  }

  async getPublic(slug: string): Promise<PublicCaseStudy> {
    const p = await this.prisma.project.findFirst({
      where: { slug, visible: true },
      include: { caseStudy: { include: { currentRevision: true } } },
    });
    if (!p?.caseStudy?.currentRevision) throw new NotFoundException(`Case study ${slug} not found`);
    return this.toPublic(p, p.caseStudy.currentRevision);
  }

  /** The revision n8n merges new information into; null when the project has no case study yet. */
  async current(projectSlug: string): Promise<CaseStudyRevision | null> {
    const project = await this.prisma.project.findUnique({
      where: { slug: projectSlug },
      include: { caseStudy: { include: { currentRevision: true } } },
    });
    if (!project) throw new NotFoundException(`Project ${projectSlug} not found`);
    return project.caseStudy?.currentRevision ?? null;
  }

  async revisions(projectSlug: string) {
    const project = await this.prisma.project.findUnique({ where: { slug: projectSlug }, include: { caseStudy: true } });
    if (!project) throw new NotFoundException(`Project ${projectSlug} not found`);
    if (!project.caseStudy) return [];
    return this.prisma.caseStudyRevision.findMany({
      where: { caseStudyId: project.caseStudy.id },
      orderBy: { version: 'desc' },
    });
  }

  /** Adds a DRAFT revision with the next version number. The site keeps showing the current one. */
  async createRevision(projectSlug: string, input: RevisionInput): Promise<CaseStudyRevision> {
    const project = await this.prisma.project.findUnique({ where: { slug: projectSlug } });
    if (!project) throw new NotFoundException(`Project ${projectSlug} not found`);

    return this.prisma.$transaction(async (tx) => {
      const caseStudy = await tx.caseStudy.upsert({
        where: { projectId: project.id },
        create: { projectId: project.id },
        update: {},
      });
      const latest = await tx.caseStudyRevision.findFirst({
        where: { caseStudyId: caseStudy.id },
        orderBy: { version: 'desc' },
      });
      return tx.caseStudyRevision.create({
        data: {
          ...input,
          llmMeta: input.llmMeta as Prisma.InputJsonValue,
          caseStudyId: caseStudy.id,
          version: (latest?.version ?? 0) + 1,
        },
      });
    });
  }

  async getRevision(id: string): Promise<CaseStudyRevision> {
    const rev = await this.prisma.caseStudyRevision.findUnique({ where: { id } });
    if (!rev) throw new NotFoundException(`Case study revision ${id} not found`);
    return rev;
  }

  private toPublic(
    p: { slug: string; name: string; url: string | null },
    r: CaseStudyRevision,
  ): PublicCaseStudy {
    return {
      id: p.slug,
      name: p.name,
      url: p.url ?? '',
      focus: r.focus,
      context: r.context,
      role: r.role,
      architecture: r.architecture,
      decisions: r.decisions,
      challenges: r.challenges,
      outcome: r.outcome,
      lessons: r.lessons,
      version: r.version,
      updatedAt: r.createdAt,
    };
  }
}
