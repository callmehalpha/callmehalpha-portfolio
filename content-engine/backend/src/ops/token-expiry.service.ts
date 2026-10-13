import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { ENV, Env } from '../config/env';
import { MailService } from '../notify/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegistryService } from '../registry/registry.service';
import { dueReminder, ExpiryState, parseExpiry, reminderSubject } from './token-expiry';

/**
 * LinkedIn member tokens last ~60 days and usually can't be refreshed, so posting stops
 * silently when one expires. Record the expiry on the channel (`config.tokenExpiresAt`)
 * when you connect it in n8n, and this emails you 7 days and 1 day before, and on expiry.
 */
@Injectable()
export class TokenExpiryService {
  private readonly logger = new Logger(TokenExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: RegistryService,
    private readonly mail: MailService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async scheduled() {
    if (this.env.NODE_ENV === 'test') return;
    await this.check();
  }

  async check(now = new Date()): Promise<{ channel: string; stage: number }[]> {
    const notifiers = await this.registry.notifiers(true, 'token_expiry');
    if (!notifiers.some((n) => n.key === 'email')) return [];

    const sent: { channel: string; stage: number }[] = [];
    for (const channel of await this.registry.channels(true)) {
      const expiresAt = parseExpiry(channel.config);
      if (!expiresAt) continue;
      const config = channel.config as Record<string, unknown>;
      const stage = dueReminder(expiresAt, now, config.expiryReminder as ExpiryState | undefined);
      if (stage === null) continue;

      try {
        await this.mail.send({
          subject: reminderSubject(channel.name, stage),
          markdown: [
            `# ${reminderSubject(channel.name, stage)}`,
            stage === 0
              ? `The **${channel.name}** connection expired on ${expiresAt.toUTCString()}. New notes will not be posted there until you reconnect it.`
              : `The **${channel.name}** connection expires on ${expiresAt.toUTCString()}. Reconnect it in n8n before then so posting doesn't stop.`,
            '- Open n8n → Credentials → reconnect the account',
            `- Then record the new expiry: \`PATCH /admin/channels/${channel.key}\` with \`config.tokenExpiresAt\``,
          ].join('\n\n'),
          actions: this.env.N8N_EDITOR_URL ? [{ label: 'Open n8n credentials', url: `${this.env.N8N_EDITOR_URL.replace(/\/+$/, '')}/home/credentials`, style: 'primary' }] : [],
          attachments: [],
        });
        await this.prisma.channel.update({
          where: { id: channel.id },
          data: { config: { ...config, expiryReminder: { for: expiresAt.toISOString(), stage } } as Prisma.InputJsonValue },
        });
        sent.push({ channel: channel.key, stage });
      } catch (err) {
        // Not recorded as sent, so the next hourly run tries again.
        this.logger.error(`Could not send the ${channel.key} expiry reminder: ${(err as Error).message}`);
      }
    }
    return sent;
  }
}
