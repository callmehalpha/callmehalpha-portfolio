import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { createServer, IncomingMessage, Server } from 'http';
import { AddressInfo } from 'net';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { SMTPServer } from 'smtp-server';
import { ParsedMail, simpleParser } from 'mailparser';
import request from 'supertest';
import { STATE_FILE } from './setup/global-setup';

export const TOKENS = {
  service: 'service-token-'.padEnd(40, 's'),
  admin: 'admin-token-'.padEnd(40, 'a'),
  approvalSecret: 'approval-secret-'.padEnd(40, 'x'),
  webhookSecret: 'webhook-secret-'.padEnd(40, 'w'),
};

export function databaseUrl(): string {
  return (JSON.parse(readFileSync(STATE_FILE, 'utf8')) as { url: string }).url;
}

/** The real Gotenberg started by the global setup (or CI's service container). */
export function realGotenbergUrl(): string {
  return (JSON.parse(readFileSync(STATE_FILE, 'utf8')) as { gotenbergUrl: string }).gotenbergUrl;
}

/** Stands in for Gotenberg: records the HTML it was sent and answers with a small PDF. */
export class FakeGotenberg {
  html: string[] = [];
  status = 200;
  private server!: Server;
  base = '';

  async start() {
    this.server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const start = body.indexOf('<!doctype html>');
        const end = body.indexOf('</html>');
        if (start >= 0 && end > start) this.html.push(body.slice(start, end + 7));
        if (this.status !== 200) {
          res.statusCode = this.status;
          return res.end('render failed');
        }
        res.setHeader('content-type', 'application/pdf');
        res.end(makePdf(`Rendered resume ${this.html.length}`));
      });
    });
    await new Promise<void>((r) => this.server.listen(0, '127.0.0.1', () => r()));
    this.base = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
    return this;
  }

  stop() {
    return new Promise<void>((r) => this.server.close(() => r()));
  }
}

// ── Fake n8n ──────────────────────────────────────────────────────
export interface RecordedRequest {
  path: string;
  headers: IncomingMessage['headers'];
  body: Record<string, unknown>;
}

/** Stands in for n8n's webhook endpoints. Records every call; `status` controls the reply. */
export class FakeN8n {
  requests: RecordedRequest[] = [];
  status = 200;
  private server!: Server;
  base = '';

  async start() {
    this.server = createServer((req, res) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        this.requests.push({ path: req.url ?? '', headers: req.headers, body: raw ? JSON.parse(raw) : {} });
        res.statusCode = this.status;
        res.end('{}');
      });
    });
    await new Promise<void>((r) => this.server.listen(0, '127.0.0.1', () => r()));
    this.base = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
    return this;
  }

  calls(path: string) {
    return this.requests.filter((r) => r.path === path);
  }

  reset() {
    this.requests = [];
    this.status = 200;
  }

  stop() {
    return new Promise<void>((r) => this.server.close(() => r()));
  }
}

// ── Fake SMTP ─────────────────────────────────────────────────────
export class FakeSmtp {
  messages: ParsedMail[] = [];
  port = 0;
  private server!: SMTPServer;

  async start() {
    this.server = new SMTPServer({
      authOptional: true,
      disabledCommands: ['STARTTLS'],
      onData: (stream, _session, cb) => {
        simpleParser(stream)
          .then((mail) => {
            this.messages.push(mail);
            cb();
          })
          .catch(cb);
      },
    });
    await new Promise<void>((r) => this.server.listen(0, '127.0.0.1', () => r()));
    this.port = (this.server.server.address() as AddressInfo).port;
    return this;
  }

  stop() {
    return new Promise<void>((r) => this.server.close(() => r()));
  }
}

// ── App ───────────────────────────────────────────────────────────
export interface TestContext {
  app: INestApplication;
  prisma: PrismaClient;
  n8n: FakeN8n;
  smtp: FakeSmtp;
  dirs: { inbox: string; persona: string; storage: string };
  http: () => ReturnType<typeof request>;
  internal: (method: 'get' | 'post' | 'put' | 'patch', path: string) => request.Test;
  admin: (method: 'get' | 'post' | 'put' | 'patch', path: string) => request.Test;
  close: () => Promise<void>;
}

export interface AppOptions {
  watch?: boolean;
  env?: Record<string, string>;
}

export async function createTestApp(opts: AppOptions = {}): Promise<TestContext> {
  const n8n = await new FakeN8n().start();
  const smtp = await new FakeSmtp().start();
  const root = mkdtempSync(join(tmpdir(), 'content-engine-e2e-'));
  const dirs = { inbox: join(root, 'inbox'), persona: join(root, 'persona'), storage: join(root, 'storage') };

  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: databaseUrl(),
    INTERNAL_SERVICE_TOKEN: TOKENS.service,
    ADMIN_TOKEN: TOKENS.admin,
    APPROVAL_LINK_SECRET: TOKENS.approvalSecret,
    N8N_WEBHOOK_BASE: `${n8n.base}/webhook`,
    N8N_WEBHOOK_SECRET: TOKENS.webhookSecret,
    PUBLIC_SITE_URL: 'https://site.test',
    PUBLIC_API_URL: 'https://api.test',
    INBOX_DIR: dirs.inbox,
    PERSONA_DIR: dirs.persona,
    STORAGE_DIR: dirs.storage,
    WATCH_ENABLED: opts.watch ? 'true' : 'false',
    WATCH_POLL_INTERVAL_MS: '100',
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: String(smtp.port),
    SMTP_SECURE: 'false',
    MAIL_FROM: 'Content Engine <engine@test.local>',
    THROTTLE_LIMIT: '10000',
    ...opts.env,
  });

  // Import after the env is set: the module reads it at construction time.
  const { AppModule } = await import('../src/app.module');
  const { configureApp } = await import('../src/bootstrap');
  const { PipelineClient } = await import('../src/pipeline/pipeline.client');

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  moduleRef.get(PipelineClient).retryDelayMs = 1;
  const app = configureApp(moduleRef.createNestApplication({ bodyParser: false, logger: false }));
  await app.init();

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });
  const http = () => request(app.getHttpServer());
  const withToken = (token: string) => (method: 'get' | 'post' | 'put' | 'patch', path: string) =>
    http()[method](path).set('authorization', `Bearer ${token}`);

  return {
    app,
    prisma,
    n8n,
    smtp,
    dirs,
    http,
    internal: withToken(TOKENS.service),
    admin: withToken(TOKENS.admin),
    close: async () => {
      await app.close();
      await prisma.$disconnect();
      await n8n.stop();
      await smtp.stop();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

/** Empties every table between tests. */
export async function resetDb(prisma: PrismaClient) {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
}

/** Polls until `fn` returns a truthy value. */
export async function eventually<T>(fn: () => Promise<T | null | undefined | false>, timeoutMs = 10_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Condition not met in time');
    await new Promise((r) => setTimeout(r, 100));
  }
}

/** Builds a minimal valid one-page PDF containing `text`, with a correct xref table. */
export function makePdf(text: string): Buffer {
  const esc = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const stream = `BT /F1 12 Tf 72 720 Td (${esc}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'binary');
}
