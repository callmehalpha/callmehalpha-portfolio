import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus } from '@prisma/client';
import { assertTransition } from '../common/content-status';
import { PrismaService } from '../prisma/prisma.service';

export const ENTITY_TYPES = ['note', 'case_study_revision', 'oss_project', 'profile_revision'] as const;
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
    if (from === to) return { type, id, status: to };
    assertTransition(from, to);

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
        case 'case_study_revision': {
          const rev = await tx.caseStudyRevision.update({ where: { id }, data: { status: to } });
          if (to === 'PUBLISHED') {
            await tx.caseStudy.update({ where: { id: rev.caseStudyId }, data: { currentRevisionId: id } });
          }
          break;
        }
        case 'profile_revision': {
          const rev = await tx.profileRevision.update({ where: { id }, data: { status: to } });
          if (to === 'PUBLISHED') {
            await tx.profile.update({ where: { id: rev.profileId }, data: { currentRevisionId: id } });
          }
          break;
        }
        default:
          throw new BadRequestException(`Unknown entity type ${type as string}`);
      }
    });
    return { type, id, status: to };
  }

  private find(type: EntityType, id: string): Promise<{ status: ContentStatus } | null> {
    const select = { status: true } as const;
    switch (type) {
      case 'note':
        return this.prisma.note.findUnique({ where: { id }, select });
      case 'oss_project':
        return this.prisma.ossProject.findUnique({ where: { id }, select });
      case 'case_study_revision':
        return this.prisma.caseStudyRevision.findUnique({ where: { id }, select });
      case 'profile_revision':
        return this.prisma.profileRevision.findUnique({ where: { id }, select });
    }
  }
}
