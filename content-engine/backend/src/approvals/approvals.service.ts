import { ConflictException, GoneException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApprovalItem } from '@prisma/client';
import { ENV, Env } from '../config/env';
import { ContentPublisher, EntityType } from '../content/content-publisher.service';
import { PipelineClient } from '../pipeline/pipeline.client';
import { PrismaService } from '../prisma/prisma.service';
import { ApprovalAction, createApprovalToken, verifyApprovalToken } from './approval-token';

export interface CreatedApproval {
  id: string;
  entityType: EntityType;
  entityId: string;
  expiresAt: Date;
  approveUrl: string;
  rejectUrl: string;
}

export type Decision = 'approve' | 'reject';

export const ENTITY_LABEL: Record<EntityType, string> = {
  note: 'technical note',
  case_study_revision: 'case study update',
  oss_project: 'open-source entry',
  profile_revision: 'profile update',
};

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly content: ContentPublisher,
    private readonly pipeline: PipelineClient,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /**
   * Puts an entity up for approval and returns signed one-click links.
   * An older pending request for the same entity is expired, so only the newest links work.
   */
  async create(entityType: EntityType, entityId: string, resumeUrl?: string): Promise<CreatedApproval> {
    await this.content.apply(entityType, entityId, 'submit');
    const expiresAt = new Date(Date.now() + this.env.APPROVAL_TTL_HOURS * 3_600_000);

    const item = await this.prisma.$transaction(async (tx) => {
      await tx.approvalItem.updateMany({
        where: { entityType, entityId, status: 'PENDING' },
        data: { status: 'EXPIRED', decidedAt: new Date() },
      });
      return tx.approvalItem.create({ data: { entityType, entityId, resumeUrl, expiresAt } });
    });

    return {
      id: item.id,
      entityType,
      entityId,
      expiresAt,
      approveUrl: this.link(item, 'approve'),
      rejectUrl: this.link(item, 'reject'),
    };
  }

  link(item: Pick<ApprovalItem, 'id' | 'expiresAt'>, action: ApprovalAction): string {
    const token = createApprovalToken(
      { itemId: item.id, action, exp: Math.floor(item.expiresAt.getTime() / 1000) },
      this.env.APPROVAL_LINK_SECRET,
    );
    return `${this.env.PUBLIC_API_URL.replace(/\/+$/, '')}/approvals/confirm?token=${encodeURIComponent(token)}`;
  }

  /** Checks a token without using it up; for the confirm page. */
  async inspect(token: string): Promise<{ item: ApprovalItem; action: ApprovalAction }> {
    const verified = verifyApprovalToken(token, this.env.APPROVAL_LINK_SECRET);
    if (!verified.ok) {
      if (verified.reason === 'expired') throw new GoneException('This link has expired');
      throw new NotFoundException('This link is not valid');
    }
    const item = await this.prisma.approvalItem.findUnique({ where: { id: verified.payload.itemId } });
    if (!item) throw new NotFoundException('This link is not valid');
    return { item, action: verified.payload.action };
  }

  async decideByToken(token: string) {
    const { item, action } = await this.inspect(token);
    return this.decide(item.id, action);
  }

  /** Records the decision exactly once, applies it to the content, then resumes the waiting n8n workflow. */
  async decide(itemId: string, decision: Decision) {
    const item = await this.prisma.approvalItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException(`Approval ${itemId} not found`);
    if (item.status !== 'PENDING') throw new ConflictException(`Already ${item.status.toLowerCase()}`);
    if (item.expiresAt <= new Date()) {
      await this.expire(item);
      throw new GoneException('This approval has expired');
    }

    // Claim the item atomically so two clicks can't both decide.
    const claimed = await this.prisma.approvalItem.updateMany({
      where: { id: itemId, status: 'PENDING' },
      data: { status: decision === 'approve' ? 'APPROVED' : 'REJECTED', decidedAt: new Date() },
    });
    if (claimed.count !== 1) throw new ConflictException('Already decided');

    const entityType = item.entityType as EntityType;
    let result;
    try {
      result = await this.content.apply(entityType, item.entityId, decision);
    } catch (err) {
      // The content couldn't take the decision (e.g. it changed meanwhile): release the claim.
      await this.prisma.approvalItem.update({ where: { id: itemId }, data: { status: 'PENDING', decidedAt: null } });
      throw err;
    }
    const delivered = await this.resume(item, decision);
    return { itemId, decision, entity: result, resumed: delivered };
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async scheduledExpiry() {
    if (this.env.NODE_ENV === 'test') return;
    await this.expireOverdue();
  }

  /** Expires overdue requests and tells n8n, so its Wait node doesn't hang forever. */
  async expireOverdue(now = new Date()): Promise<number> {
    const overdue = await this.prisma.approvalItem.findMany({ where: { status: 'PENDING', expiresAt: { lte: now } } });
    for (const item of overdue) await this.expire(item);
    return overdue.length;
  }

  private async expire(item: ApprovalItem) {
    const updated = await this.prisma.approvalItem.updateMany({
      where: { id: item.id, status: 'PENDING' },
      data: { status: 'EXPIRED', decidedAt: new Date() },
    });
    if (updated.count === 1) {
      // Back to DRAFT so it can be resubmitted later. A newer request may already have moved it on.
      await this.content.apply(item.entityType as EntityType, item.entityId, 'withdraw').catch(() => undefined);
      await this.resume(item, 'expired');
    }
  }

  private async resume(item: ApprovalItem, decision: Decision | 'expired'): Promise<boolean> {
    if (!item.resumeUrl) return false;
    try {
      await this.pipeline.resume(item.resumeUrl, {
        approvalId: item.id,
        decision,
        entityType: item.entityType,
        entityId: item.entityId,
      });
      await this.prisma.approvalItem.update({ where: { id: item.id }, data: { resumeDeliveredAt: new Date() } });
      return true;
    } catch (err) {
      this.logger.error(`Decision on ${item.id} recorded but n8n was not resumed: ${(err as Error).message}`);
      return false;
    }
  }
}
