import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SourceStatus } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

export const runInput = z.object({
  sourceId: z.string().min(1),
  stage: z.string().min(1),
  status: z.string().min(1),
  n8nExecutionId: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});
export const runPatch = z.object({
  status: z.string().min(1),
  meta: z.record(z.unknown()).optional(),
  finished: z.boolean().default(false),
});
export const sourcePatch = z.object({
  status: z.nativeEnum(SourceStatus).optional(),
  error: z.string().nullable().optional(),
  routing: z.record(z.unknown()).optional(),
  projectSlug: z.string().optional(),
});

@Injectable()
export class RunsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSource(id: string) {
    const source = await this.prisma.sourceDocument.findUnique({
      where: { id },
      include: { project: { select: { slug: true, name: true, kind: true } } },
    });
    if (!source) throw new NotFoundException(`Source ${id} not found`);
    return source;
  }

  async patchSource(id: string, patch: z.infer<typeof sourcePatch>) {
    await this.getSource(id);
    let projectId: string | undefined;
    if (patch.projectSlug) {
      const project = await this.prisma.project.findUnique({ where: { slug: patch.projectSlug } });
      if (!project) throw new NotFoundException(`Project ${patch.projectSlug} not found`);
      projectId = project.id;
    }
    return this.prisma.sourceDocument.update({
      where: { id },
      data: {
        status: patch.status,
        error: patch.error,
        routing: patch.routing as Prisma.InputJsonValue | undefined,
        projectId,
      },
    });
  }

  async create(input: z.infer<typeof runInput>) {
    await this.getSource(input.sourceId);
    return this.prisma.pipelineRun.create({ data: { ...input, meta: input.meta as Prisma.InputJsonValue } });
  }

  async patch(id: string, patch: z.infer<typeof runPatch>) {
    if (!(await this.prisma.pipelineRun.findUnique({ where: { id } }))) throw new NotFoundException(`Run ${id} not found`);
    return this.prisma.pipelineRun.update({
      where: { id },
      data: {
        status: patch.status,
        meta: patch.meta as Prisma.InputJsonValue | undefined,
        finishedAt: patch.finished ? new Date() : undefined,
      },
    });
  }
}
