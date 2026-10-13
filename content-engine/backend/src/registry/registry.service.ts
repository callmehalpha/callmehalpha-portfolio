import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

export const registryPatch = z.object({
  enabled: z.boolean().optional(),
  name: z.string().min(1).optional(),
  workflow: z.string().min(1).optional(),
  config: z.record(z.unknown()).optional(),
});
export type RegistryPatch = z.infer<typeof registryPatch>;

export const registryInput = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_-]*$/),
  name: z.string().min(1),
  enabled: z.boolean().default(false),
  workflow: z.string().min(1),
  config: z.record(z.unknown()).default({}),
});
export type RegistryInput = z.infer<typeof registryInput>;

/** Shallow-merges a config patch: keys in the patch replace old ones, and `null` removes a key. */
export function mergeConfig(current: Prisma.JsonValue, patch: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  if (!patch) return undefined;
  const merged: Record<string, unknown> = { ...((current as Record<string, unknown> | null) ?? {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete merged[key];
    else merged[key] = value;
  }
  return merged as Prisma.InputJsonValue;
}

function eventsOf(config: Prisma.JsonValue): string[] {
  const events = (config as { events?: unknown } | null)?.events;
  return Array.isArray(events) ? events.filter((e): e is string => typeof e === 'string') : [];
}

/** Publishing channels and notifiers: a row plus an n8n sub-workflow each. */
@Injectable()
export class RegistryService {
  constructor(private readonly prisma: PrismaService) {}

  channels(enabledOnly: boolean) {
    return this.prisma.channel.findMany({ where: enabledOnly ? { enabled: true } : {}, orderBy: { key: 'asc' } });
  }

  async notifiers(enabledOnly: boolean, event?: string) {
    const rows = await this.prisma.notifier.findMany({ where: enabledOnly ? { enabled: true } : {}, orderBy: { key: 'asc' } });
    return event ? rows.filter((n) => eventsOf(n.config).includes(event)) : rows;
  }

  upsertChannel(input: RegistryInput) {
    const data = { ...input, config: input.config as Prisma.InputJsonValue };
    return this.prisma.channel.upsert({ where: { key: input.key }, create: data, update: data });
  }

  upsertNotifier(input: RegistryInput) {
    const data = { ...input, config: input.config as Prisma.InputJsonValue };
    return this.prisma.notifier.upsert({ where: { key: input.key }, create: data, update: data });
  }

  async patchChannel(key: string, patch: RegistryPatch) {
    const existing = await this.prisma.channel.findUnique({ where: { key } });
    if (!existing) throw new NotFoundException(`Channel ${key} not found`);
    return this.prisma.channel.update({ where: { key }, data: { ...patch, config: mergeConfig(existing.config, patch.config) } });
  }

  async patchNotifier(key: string, patch: RegistryPatch) {
    const existing = await this.prisma.notifier.findUnique({ where: { key } });
    if (!existing) throw new NotFoundException(`Notifier ${key} not found`);
    return this.prisma.notifier.update({ where: { key }, data: { ...patch, config: mergeConfig(existing.config, patch.config) } });
  }
}
