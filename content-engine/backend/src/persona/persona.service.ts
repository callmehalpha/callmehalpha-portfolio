import { Injectable, NotFoundException } from '@nestjs/common';
import { PersonaKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PersonaService {
  constructor(private readonly prisma: PrismaService) {}

  /** What every generator gets: the active personality and branding docs, raw and distilled. */
  async context() {
    const active = await this.prisma.personaDocument.findMany({ where: { active: true } });
    const pick = (kind: PersonaKind) => {
      const doc = active.find((d) => d.kind === kind);
      return doc ? { id: doc.id, version: doc.version, content: doc.content, distilled: doc.distilled } : null;
    };
    return { personality: pick('PERSONALITY'), branding: pick('BRANDING') };
  }

  async setDistilled(id: string, distilled: Record<string, unknown>) {
    if (!(await this.prisma.personaDocument.findUnique({ where: { id } }))) {
      throw new NotFoundException(`Persona document ${id} not found`);
    }
    return this.prisma.personaDocument.update({ where: { id }, data: { distilled: distilled as Prisma.InputJsonValue } });
  }

  versions() {
    return this.prisma.personaDocument.findMany({
      select: { id: true, kind: true, version: true, filename: true, active: true, createdAt: true },
      orderBy: [{ kind: 'asc' }, { version: 'desc' }],
    });
  }
}
