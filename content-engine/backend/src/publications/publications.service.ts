import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Publication } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

export const claimInput = z.object({
  noteId: z.string().min(1),
  channelKey: z.string().min(1),
  content: z.string().min(1),
  mediaUrls: z.array(z.string().url()).default([]),
});
export type ClaimInput = z.infer<typeof claimInput>;

export const resultInput = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), externalId: z.string().optional(), externalUrl: z.string().url().optional() }),
  z.object({ ok: z.literal(false), error: z.string().min(1) }),
  z.object({ ok: z.literal('skipped'), reason: z.string().min(1) }),
]);
export type ResultInput = z.infer<typeof resultInput>;

/** Per-channel posting records. A note is posted to each channel at most once, however often n8n retries. */
@Injectable()
export class PublicationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Claims the right to post a note on a channel. Returns the publication to post with, or
   * 409 when that note is already live on that channel. Failed attempts can be claimed again.
   */
  async claim(input: ClaimInput): Promise<Publication> {
    const note = await this.prisma.note.findUnique({ where: { id: input.noteId } });
    if (!note) throw new NotFoundException(`Note ${input.noteId} not found`);
    if (note.status !== 'PUBLISHED') throw new BadRequestException('Only published notes can be posted');
    const channel = await this.prisma.channel.findUnique({ where: { key: input.channelKey } });
    if (!channel) throw new NotFoundException(`Channel ${input.channelKey} not found`);
    if (!channel.enabled) throw new BadRequestException(`Channel ${input.channelKey} is disabled`);

    const where = { noteId_channelId: { noteId: note.id, channelId: channel.id } };
    const existing = await this.prisma.publication.findUnique({ where });
    if (existing?.status === 'PUBLISHED') throw new ConflictException('Already published on this channel');

    try {
      if (existing) {
        const reclaimed = await this.prisma.publication.updateMany({
          where: { id: existing.id, status: { not: 'PUBLISHED' } },
          data: { content: input.content, mediaUrls: input.mediaUrls, status: 'PENDING', attempts: { increment: 1 } },
        });
        if (reclaimed.count !== 1) throw new ConflictException('Already published on this channel');
        return this.prisma.publication.findUniqueOrThrow({ where: { id: existing.id } });
      }
      return await this.prisma.publication.create({
        data: { noteId: note.id, channelId: channel.id, content: input.content, mediaUrls: input.mediaUrls, attempts: 1 },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Another run already claimed this channel');
      }
      throw err;
    }
  }

  async record(id: string, result: ResultInput): Promise<Publication> {
    const pub = await this.prisma.publication.findUnique({ where: { id } });
    if (!pub) throw new NotFoundException(`Publication ${id} not found`);
    if (pub.status === 'PUBLISHED') throw new ConflictException('Already published');

    if (result.ok === true) {
      return this.prisma.publication.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          externalId: result.externalId,
          externalUrl: result.externalUrl,
          lastError: null,
          publishedAt: new Date(),
        },
      });
    }
    if (result.ok === 'skipped') {
      return this.prisma.publication.update({ where: { id }, data: { status: 'SKIPPED', lastError: result.reason } });
    }
    return this.prisma.publication.update({ where: { id }, data: { status: 'FAILED', lastError: result.error } });
  }

  forNote(noteId: string) {
    return this.prisma.publication.findMany({ where: { noteId }, include: { channel: { select: { key: true } } } });
  }
}
