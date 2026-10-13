import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),

  INTERNAL_SERVICE_TOKEN: z.string().min(16),
  ADMIN_TOKEN: z.string().min(16),
  APPROVAL_LINK_SECRET: z.string().min(16),
  APPROVAL_TTL_HOURS: z.coerce.number().int().positive().default(168),

  N8N_WEBHOOK_BASE: z.string().url(),
  N8N_WEBHOOK_SECRET: z.string().min(16),

  PUBLIC_SITE_URL: z.string().url(),
  PUBLIC_API_URL: z.string().url(),
  /** n8n editor, linked from token-expiry emails. */
  N8N_EDITOR_URL: z.string().url().optional(),
  /** Number of reverse proxies in front of the app (Caddy = 1), so rate limits see real client IPs. */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  INBOX_DIR: z.string().default('/data/inbox'),
  PERSONA_DIR: z.string().default('/data/persona'),
  STORAGE_DIR: z.string().default('/data/storage'),
  /** Gotenberg (HTML → PDF) for resume builds; builds are skipped when unset. */
  GOTENBERG_URL: z.string().url().optional(),
  WATCH_ENABLED: bool.default('true'),
  WATCH_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  SWEEP_STUCK_AFTER_MINUTES: z.coerce.number().int().positive().default(5),
  SWEEP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),

  SMTP_HOST: z.string().default('mailpit'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: bool.default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('Content Engine <no-reply@localhost>'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${issues}`);
  }
  return parsed.data;
}

export const ENV = Symbol('ENV');
