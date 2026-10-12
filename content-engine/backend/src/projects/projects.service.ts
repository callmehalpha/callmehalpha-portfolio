import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Project, ProjectKind } from '@prisma/client';
import { z } from 'zod';
import { slugify } from '../common/slug';
import { PrismaService } from '../prisma/prisma.service';

export const projectInput = z.object({
  slug: z.string().min(1).optional(),
  name: z.string().min(1),
  kind: z.nativeEnum(ProjectKind),
  url: z.string().url().nullish(),
  repoUrl: z.string().url().nullish(),
  visible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
export type ProjectInput = z.infer<typeof projectInput>;

export const projectPatch = projectInput.partial().omit({ slug: true });
export type ProjectPatch = z.infer<typeof projectPatch>;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<Project[]> {
    return this.prisma.project.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  }

  async get(slug: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { slug } });
    if (!project) throw new NotFoundException(`Project ${slug} not found`);
    return project;
  }

  /** Creates the project, or updates it when the slug already exists (re-runs are safe). */
  upsert(input: ProjectInput): Promise<Project> {
    const slug = slugify(input.slug ?? input.name);
    const data = { ...input, slug } satisfies Prisma.ProjectCreateInput;
    return this.prisma.project.upsert({ where: { slug }, create: data, update: { ...data, slug: undefined } });
  }

  async update(slug: string, patch: ProjectPatch): Promise<Project> {
    await this.get(slug);
    return this.prisma.project.update({ where: { slug }, data: patch });
  }
}
