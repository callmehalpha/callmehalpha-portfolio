import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProfileRevision } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { applyPrivacy, PrivacyMap } from './privacy';
import { ProfileData, ProfileRevisionInput } from './profile.schema';

export const PROFILE_ID = 'me';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /** The current profile with private fields removed. */
  async getPublic(): Promise<ProfileData & { version: number; updatedAt: Date }> {
    const current = await this.current();
    if (!current) throw new NotFoundException('No published profile yet');
    const data = applyPrivacy(current.data as ProfileData, current.privacy as PrivacyMap);
    return { ...data, version: current.version, updatedAt: current.createdAt };
  }

  async current(): Promise<ProfileRevision | null> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: PROFILE_ID },
      include: { currentRevision: true },
    });
    return profile?.currentRevision ?? null;
  }

  async createRevision(input: ProfileRevisionInput): Promise<ProfileRevision> {
    return this.prisma.$transaction(async (tx) => {
      await tx.profile.upsert({ where: { id: PROFILE_ID }, create: { id: PROFILE_ID }, update: {} });
      const latest = await tx.profileRevision.findFirst({ where: { profileId: PROFILE_ID }, orderBy: { version: 'desc' } });
      return tx.profileRevision.create({
        data: {
          profileId: PROFILE_ID,
          version: (latest?.version ?? 0) + 1,
          data: input.data as Prisma.InputJsonValue,
          privacy: input.privacy as Prisma.InputJsonValue,
          changelog: input.changelog,
          sourceIds: input.sourceIds,
          llmMeta: input.llmMeta as Prisma.InputJsonValue,
        },
      });
    });
  }

  async getRevision(id: string): Promise<ProfileRevision> {
    const rev = await this.prisma.profileRevision.findUnique({ where: { id } });
    if (!rev) throw new NotFoundException(`Profile revision ${id} not found`);
    return rev;
  }
}
