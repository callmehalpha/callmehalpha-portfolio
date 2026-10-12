import { ConflictException } from '@nestjs/common';
import { ContentStatus } from '@prisma/client';

const transitions: Record<ContentStatus, ContentStatus[]> = {
  DRAFT: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PUBLISHED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'DRAFT'],
  APPROVED: ['PUBLISHED', 'DRAFT'],
  PUBLISHED: ['DRAFT'],
  REJECTED: ['DRAFT'],
};

export function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(from: ContentStatus, to: ContentStatus): void {
  if (!canTransition(from, to)) {
    throw new ConflictException(`Cannot move from ${from} to ${to}`);
  }
}
