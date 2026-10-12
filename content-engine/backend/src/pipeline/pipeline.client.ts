import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENV, Env } from '../config/env';
import { withRetry } from '../common/retry';

/** Webhook paths on n8n, one per workflow entry point. */
export const WEBHOOKS = {
  sourceCreated: 'pipeline/source-created',
  cvUploaded: 'profile/cv-uploaded',
  personaChanged: 'persona/changed',
} as const;

export type WebhookName = keyof typeof WEBHOOKS;

@Injectable()
export class PipelineClient {
  private readonly logger = new Logger(PipelineClient.name);
  /** Overridable in tests so retries don't wait. */
  retryDelayMs = 1000;

  constructor(@Inject(ENV) private readonly env: Env) {}

  url(name: WebhookName): string {
    return `${this.env.N8N_WEBHOOK_BASE.replace(/\/+$/, '')}/${WEBHOOKS[name]}`;
  }

  /** POSTs to an n8n webhook with the shared secret, retrying with backoff. Throws when every attempt fails. */
  async trigger(name: WebhookName, payload: Record<string, unknown>): Promise<void> {
    const url = this.url(name);
    await withRetry(
      async (attempt) => {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-webhook-secret': this.env.N8N_WEBHOOK_SECRET },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) {
          this.logger.warn(`Webhook ${name} attempt ${attempt} failed: HTTP ${res.status}`);
          throw new Error(`Webhook ${name} returned HTTP ${res.status}`);
        }
      },
      { attempts: 3, baseDelayMs: this.retryDelayMs },
    );
  }

  /** POSTs an approval decision to the n8n Wait-node resume URL. */
  async resume(resumeUrl: string, body: Record<string, unknown>): Promise<void> {
    await withRetry(
      async () => {
        const res = await fetch(resumeUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-webhook-secret': this.env.N8N_WEBHOOK_SECRET },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error(`Resume URL returned HTTP ${res.status}`);
      },
      { attempts: 3, baseDelayMs: this.retryDelayMs },
    );
  }
}
