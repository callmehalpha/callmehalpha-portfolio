import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ENV, Env } from '../config/env';
import { IngestService } from '../ingest/ingest.service';
import { PrismaService } from '../prisma/prisma.service';

/** Re-triggers sources that were stored but never reached n8n (n8n down, network blip). */
@Injectable()
export class SweeperService {
  private readonly logger = new Logger(SweeperService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ingest: IngestService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async scheduled() {
    if (this.env.NODE_ENV === 'test') return;
    await this.sweep();
  }

  async sweep(now = new Date()): Promise<{ retried: number; succeeded: number; gaveUp: number }> {
    if (this.running) return { retried: 0, succeeded: 0, gaveUp: 0 };
    this.running = true;
    try {
      const cutoff = new Date(now.getTime() - this.env.SWEEP_STUCK_AFTER_MINUTES * 60_000);
      const stuck = await this.prisma.sourceDocument.findMany({
        where: {
          status: 'RECEIVED',
          triggerAttempts: { lt: this.env.SWEEP_MAX_ATTEMPTS },
          OR: [{ lastTriggeredAt: null }, { lastTriggeredAt: { lt: cutoff } }],
        },
        orderBy: { receivedAt: 'asc' },
        take: 20,
      });

      let succeeded = 0;
      let gaveUp = 0;
      for (const source of stuck) {
        const result = await this.ingest.triggerSource(source);
        if (result.ok) succeeded++;
        else if (result.source.triggerAttempts >= this.env.SWEEP_MAX_ATTEMPTS) {
          gaveUp++;
          await this.prisma.sourceDocument.update({
            where: { id: source.id },
            data: { status: 'FAILED', error: `Gave up after ${result.source.triggerAttempts} attempts: ${result.source.error}` },
          });
          this.logger.error(`Source ${source.id} marked FAILED after ${result.source.triggerAttempts} trigger attempts`);
        }
      }
      return { retried: stuck.length, succeeded, gaveUp };
    } finally {
      this.running = false;
    }
  }
}
