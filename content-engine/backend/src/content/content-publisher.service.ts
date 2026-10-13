import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { assertTransition } from '../common/content-status';
import { PrismaService } from '../prisma/prisma.service';

export const ENTITY_TYPES = ['note', 'case_study_revision', 'oss_project', 'profile_revision', 'resume_build'] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];
export type ContentAction = 'submit' | 'approve' | 'reject' | 'publish' | 'withdraw';

export function isEntityType(v: string): v is EntityType {
  return (ENTITY_TYPES as readonly string[]).includes(v);
}

/** The approval setting that gates each entity type. */
export const APPROVAL_SETTING: Record<EntityType, string> = {
  note: 'approval.required.note',
  case_study_revision: 'approval.required.case_study',
  oss_project: 'approval.required.oss',
  profile_revision: 'approval.required.profile',
  resume_build: 'approval.required.resume',
};

/**
 * Notes are approved and then published by n8n after the social fan-out is ready.
 * Everything else goes live the moment it's approved.
 */
function targetStatus(type: EntityType, action: ContentAction): ContentStatus {
  switch (action) {
    case 'submit':
      return 'PENDING_APPROVAL';
    case 'withdraw':
      return 'DRAFT';
    case 'reject':
      return 'REJECTED';
    case 'publish':
      return 'PUBLISHED';
    case 'approve':
      return type === 'note' ? 'APPROVED' : 'PUBLISHED';
  }
}

/** One place that moves any content type through its lifecycle, used by approvals, n8n and admin. */
@Injectable()
export class ContentPublisher {
  constructor(private readonly prisma: PrismaService) {}

  async status(type: EntityType, id: string): Promise<ContentStatus> {
    const row = await this.find(type, id);
    if (!row) throw new NotFoundException(`${type} ${id} not found`);
    return row.status;
  }

  async apply(type: EntityType, id: string, action: ContentAction): Promise<{ type: EntityType; id: string; status: ContentStatus }> {
    const to = targetStatus(type, action);
    const from = await this.status(type, id);
    const isRevision = type === 'case_study_revision' || type === 'profile_revision';

    if (from === to) {
      // Re-publishing an older published revision makes it current again: that's the rollback.
      if (isRevision && to === 'PUBLISHED') await this.prisma.$transaction((tx) => this.makeCurrent(tx, type, id));
      return { type, id, status: to };
    }
    // Approval publishes revisions directly, but still passes through APPROVED so the rules hold.
    if (action === 'approve' && to === 'PUBLISHED') {
      assertTransition(from, 'APPROVED');
      assertTransition('APPROVED', to);
    } else {
      assertTransition(from, to);
    }

    await this.prisma.$transaction(async (tx) => {
      switch (type) {
        case 'note': {
          const note = await tx.note.findUniqueOrThrow({ where: { id } });
          await tx.note.update({
            where: { id },
            data: { status: to, publishedAt: to === 'PUBLISHED' ? (note.publishedAt ?? new Date()) : note.publishedAt },
          });
          break;
        }
        case 'oss_project':
          await tx.ossProject.update({ where: { id }, data: { status: to } });
          break;
        case 'resume_build':
          await tx.resumeBuild.update({ where: { id }, data: { status: to, publishedAt: to === 'PUBLISHED' ? new Date() : undefined } });
          break;
        case 'case_study_revision':
          await tx.caseStudyRevision.update({ where: { id }, data: { status: to } });
          break;
        case 'profile_revision':
          await tx.profileRevision.update({ where: { id }, data: { status: to } });
          break;
        default:
          throw new BadRequestException(`Unknown entity type ${type as string}`);
      }
      if (isRevision) {
        if (to === 'PUBLISHED') await this.makeCurrent(tx, type, id);
        else if (from === 'PUBLISHED') await this.fallBack(tx, type, id);
      }
    });
    return { type, id, status: to };
  }

  private async makeCurrent(tx: Prisma.TransactionClient, type: EntityType, id: string) {
    if (type === 'case_study_revision') {
      const rev = await tx.caseStudyRevision.findUniqueOrThrow({ where: { id } });
      await tx.caseStudy.update({ where: { id: rev.caseStudyId }, data: { currentRevisionId: id } });
    } else {
      const rev = await tx.profileRevision.findUniqueOrThrow({ where: { id } });
      await tx.profile.update({ where: { id: rev.profileId }, data: { currentRevisionId: id } });
    }
  }

  /** When the live revision is taken down, the newest other published revision takes its place (or none). */
  private async fallBack(tx: Prisma.TransactionClient, type: EntityType, id: string) {
    if (type === 'case_study_revision') {
      const rev = await tx.caseStudyRevision.findUniqueOrThrow({ where: { id }, include: { currentOf: true } });
      if (!rev.currentOf) return;
      const next = await tx.caseStudyRevision.findFirst({
        where: { caseStudyId: rev.caseStudyId, status: 'PUBLISHED', id: { not: id } },
        orderBy: { version: 'desc' },
      });
      await tx.caseStudy.update({ where: { id: rev.caseStudyId }, data: { currentRevisionId: next?.id ?? null } });
    } else {
      const rev = await tx.profileRevision.findUniqueOrThrow({ where: { id }, include: { currentOf: true } });
      if (!rev.currentOf) return;
      const next = await tx.profileRevision.findFirst({
        where: { profileId: rev.profileId, status: 'PUBLISHED', id: { not: id } },
        orderBy: { version: 'desc' },
      });
      await tx.profile.update({ where: { id: rev.profileId }, data: { currentRevisionId: next?.id ?? null } });
    }
  }

  private find(type: EntityType, id: string): Promise<{ status: ContentStatus } | null> {
    const select = { status: true } as const;
    switch (type) {
      case 'note':
        return this.prisma.note.findUnique({ where: { id }, select });
      case 'oss_project':
        return this.prisma.ossProject.findUnique({ where: { id }, select });
      case 'resume_build':
        return this.prisma.resumeBuild.findUnique({ where: { id }, select });
      case 'case_study_revision':
        return this.prisma.caseStudyRevision.findUnique({ where: { id }, select });
      case 'profile_revision':
        return this.prisma.profileRevision.findUnique({ where: { id }, select });
    }
  }
}
