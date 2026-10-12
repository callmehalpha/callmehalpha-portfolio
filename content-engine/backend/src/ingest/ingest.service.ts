import { Inject, Injectable, Logger } from '@nestjs/common';
import { PersonaKind, Prisma, SourceDocument, SourceKind } from '@prisma/client';
import { mkdir, writeFile } from 'fs/promises';
import { basename, extname, join } from 'path';
import { ENV, Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { PipelineClient } from '../pipeline/pipeline.client';
import { parseMarkdown, sha256 } from './frontmatter';
import { extractText, isSupportedCv } from './text-extract';

export type IngestOutcome =
  | { status: 'created'; source: SourceDocument; triggered: boolean; warnings: string[] }
  | { status: 'duplicate'; source: SourceDocument };

export type PersonaOutcome =
  | { status: 'created'; id: string; kind: PersonaKind; version: number; triggered: boolean }
  | { status: 'unchanged'; kind: PersonaKind }
  | { status: 'ignored'; reason: string };

export function personaKindFor(filename: string): PersonaKind | null {
  const name = basename(filename).toLowerCase();
  if (extname(name) !== '.md') return null;
  if (name.startsWith('personality')) return PersonaKind.PERSONALITY;
  if (name.startsWith('branding')) return PersonaKind.BRANDING;
  return null;
}

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pipeline: PipelineClient,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** A project-update markdown file: stored, deduped by content hash, then handed to the n8n router. */
  async ingestMarkdown(filename: string, raw: string): Promise<IngestOutcome> {
    const contentHash = sha256(raw);
    const existing = await this.prisma.sourceDocument.findUnique({ where: { contentHash } });
    if (existing) return { status: 'duplicate', source: existing };

    const { frontmatter, warnings } = parseMarkdown(raw);
    const project = frontmatter.project
      ? await this.prisma.project.findUnique({ where: { slug: frontmatter.project } })
      : null;

    const source = await this.createOrGetDuplicate({
      kind: SourceKind.PROJECT_UPDATE,
      filename: basename(filename),
      contentHash,
      frontmatter: frontmatter as Prisma.InputJsonValue,
      rawMarkdown: raw,
      projectId: project?.id,
    });
    if ('duplicate' in source) return { status: 'duplicate', source: source.duplicate };

    const triggered = await this.triggerSource(source.created, 'sourceCreated');
    return { status: 'created', source: triggered.source, triggered: triggered.ok, warnings };
  }

  /** A CV (pdf/docx/md): text extracted, original kept privately in storage, then handed to the profile workflow. */
  async ingestCv(filename: string, data: Buffer): Promise<IngestOutcome> {
    if (!isSupportedCv(filename)) throw new Error(`Unsupported CV format: ${filename}`);
    const contentHash = sha256(data);
    const existing = await this.prisma.sourceDocument.findUnique({ where: { contentHash } });
    if (existing) return { status: 'duplicate', source: existing };

    const text = await extractText(filename, data);
    const dir = join(this.env.STORAGE_DIR, 'cv');
    await mkdir(dir, { recursive: true });
    const originalPath = join(dir, `${contentHash}${extname(filename).toLowerCase()}`);
    await writeFile(originalPath, data);

    const source = await this.createOrGetDuplicate({
      kind: SourceKind.CV,
      filename: basename(filename),
      contentHash,
      rawMarkdown: text,
      originalPath,
    });
    if ('duplicate' in source) return { status: 'duplicate', source: source.duplicate };

    const triggered = await this.triggerSource(source.created, 'cvUploaded');
    return { status: 'created', source: triggered.source, triggered: triggered.ok, warnings: [] };
  }

  /** A persona file: a new active version when its content changed, then the persona agent re-distils it. */
  async ingestPersona(filename: string, content: string): Promise<PersonaOutcome> {
    const kind = personaKindFor(filename);
    if (!kind) return { status: 'ignored', reason: `Not a persona file: ${basename(filename)}` };

    const contentHash = sha256(content);
    const doc = await this.prisma.$transaction(async (tx) => {
      const active = await tx.personaDocument.findFirst({ where: { kind, active: true } });
      if (active?.contentHash === contentHash) return null;
      const latest = await tx.personaDocument.findFirst({ where: { kind }, orderBy: { version: 'desc' } });
      await tx.personaDocument.updateMany({ where: { kind, active: true }, data: { active: false } });
      return tx.personaDocument.create({
        data: {
          kind,
          version: (latest?.version ?? 0) + 1,
          filename: basename(filename),
          content,
          contentHash,
          active: true,
        },
      });
    });
    if (!doc) return { status: 'unchanged', kind };

    let triggered = true;
    try {
      await this.pipeline.trigger('personaChanged', { personaId: doc.id, kind: doc.kind, version: doc.version });
    } catch (err) {
      triggered = false;
      this.logger.error(`Persona ${doc.kind} v${doc.version} stored but n8n was not reached: ${(err as Error).message}`);
    }
    return { status: 'created', id: doc.id, kind: doc.kind, version: doc.version, triggered };
  }

  /**
   * Hands a stored source to n8n. On success it moves to PROCESSING; on failure it stays RECEIVED
   * so the sweeper retries it later. Never throws: the document is safe in the database either way.
   */
  async triggerSource(source: SourceDocument, webhook?: 'sourceCreated' | 'cvUploaded'): Promise<{ ok: boolean; source: SourceDocument }> {
    const name = webhook ?? (source.kind === SourceKind.CV ? 'cvUploaded' : 'sourceCreated');
    try {
      await this.pipeline.trigger(name, { sourceId: source.id });
      const updated = await this.prisma.sourceDocument.update({
        where: { id: source.id },
        data: { status: 'PROCESSING', triggerAttempts: { increment: 1 }, lastTriggeredAt: new Date(), error: null },
      });
      return { ok: true, source: updated };
    } catch (err) {
      const message = (err as Error).message;
      this.logger.warn(`Source ${source.id} stored but not handed to n8n: ${message}`);
      const updated = await this.prisma.sourceDocument.update({
        where: { id: source.id },
        data: { triggerAttempts: { increment: 1 }, lastTriggeredAt: new Date(), error: `Trigger failed: ${message}` },
      });
      return { ok: false, source: updated };
    }
  }

  /** Inserts a source; if a concurrent ingest of the same content won the race, returns that one. */
  private async createOrGetDuplicate(
    data: Prisma.SourceDocumentUncheckedCreateInput,
  ): Promise<{ created: SourceDocument } | { duplicate: SourceDocument }> {
    try {
      return { created: await this.prisma.sourceDocument.create({ data }) };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const dup = await this.prisma.sourceDocument.findUniqueOrThrow({ where: { contentHash: data.contentHash } });
        return { duplicate: dup };
      }
      throw err;
    }
  }
}
