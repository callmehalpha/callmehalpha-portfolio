import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, ResumeBuild } from '@prisma/client';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { ApprovalsService } from '../approvals/approvals.service';
import { CaseStudiesService } from '../case-studies/case-studies.service';
import { ENV, Env } from '../config/env';
import { sha256 } from '../ingest/frontmatter';
import { MailService } from '../notify/mail.service';
import { OssService } from '../oss/oss.service';
import { ProfileService } from '../profile/profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegistryService } from '../registry/registry.service';
import { SettingsService } from '../settings/settings.service';
import { curateResume, ResumeProfileInput } from './curate';
import { countPages, GotenbergClient } from './gotenberg.client';
import { renderResumeHtml } from './template';
import { RESUME_TEMPLATE_VERSION, RESUME_VARIANTS, ResumeVariant, VARIANT_NAMES } from './variants';

export type BuildOutcome =
  | { status: 'unchanged'; build: ResumeBuild }
  | { status: 'built'; build: ResumeBuild; approvalId?: string; published: boolean };

/** Stable JSON: object keys sorted, so the same content always hashes the same. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as object)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly profile: ProfileService,
    private readonly caseStudies: CaseStudiesService,
    private readonly oss: OssService,
    private readonly gotenberg: GotenbergClient,
    private readonly approvals: ApprovalsService,
    private readonly settings: SettingsService,
    private readonly registry: RegistryService,
    private readonly mail: MailService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Everything public the resume is built from. Changing any of it changes the hash. */
  async inputs() {
    const profile = await this.profile.getPublic().catch(() => null);
    if (!profile) return null;
    const { version: _v, updatedAt: _u, ...profileData } = profile;
    const caseStudies = (await this.caseStudies.listPublic()).map(({ id, name, url, context, role, focus }) => ({ id, name, url, context, role, focus }));
    const oss = (await this.oss.listPublic()).map(({ slug, name, repoUrl, role, myImpact }) => ({ slug, name, repoUrl, role, myImpact }));
    return { profile: profileData as unknown as ResumeProfileInput, caseStudies, oss };
  }

  hashFor(variant: ResumeVariant, inputs: NonNullable<Awaited<ReturnType<ResumeService['inputs']>>>): string {
    return sha256(stableStringify({ variant, templateVersion: RESUME_TEMPLATE_VERSION, siteUrl: this.env.PUBLIC_SITE_URL, inputs }));
  }

  /** Builds the variant if its inputs changed since the last build (or always, with force). */
  async build(variant: ResumeVariant, opts: { force?: boolean } = {}): Promise<BuildOutcome> {
    const inputs = await this.inputs();
    if (!inputs) throw new NotFoundException('No published profile to build a resume from');
    const contentHash = this.hashFor(variant, inputs);

    const existing = await this.prisma.resumeBuild.findUnique({ where: { variant_contentHash: { variant, contentHash } } });
    if (existing && !opts.force) return { status: 'unchanged', build: existing };

    const curated = curateResume(inputs.profile, inputs.caseStudies, inputs.oss, variant, this.env.PUBLIC_SITE_URL);
    const html = renderResumeHtml(curated);
    const pdf = await this.gotenberg.htmlToPdf(html);
    const pages = await countPages(pdf);
    if (pages !== null && pages > 2) this.logger.warn(`Resume ${variant} is ${pages} pages; the template aims for 2`);

    const dir = join(this.env.STORAGE_DIR, 'resume');
    await mkdir(dir, { recursive: true });
    const base = join(dir, `${variant}-${contentHash.slice(0, 16)}`);
    await writeFile(`${base}.pdf`, pdf);
    await writeFile(`${base}.html`, html);

    const data = {
      variant,
      contentHash,
      inputs: inputs as unknown as Prisma.InputJsonValue,
      curated: curated as unknown as Prisma.InputJsonValue,
      pdfPath: `${base}.pdf`,
      htmlPath: `${base}.html`,
      pages,
      status: 'DRAFT' as const,
      publishedAt: null,
    };
    const build = existing
      ? await this.prisma.resumeBuild.update({ where: { id: existing.id }, data })
      : await this.prisma.resumeBuild.create({ data });

    if (!(await this.settings.get('approval.required.resume'))) {
      const published = await this.publish(build.id);
      return { status: 'built', build: published, published: true };
    }

    const approval = await this.approvals.create('resume_build', build.id);
    await this.emailForApproval(build, pdf, approval.approveUrl, approval.rejectUrl).catch((err) =>
      this.logger.error(`Resume ${variant} built but the approval email failed: ${(err as Error).message}`),
    );
    return { status: 'built', build: await this.get(build.id), approvalId: approval.id, published: false };
  }

  async publish(id: string): Promise<ResumeBuild> {
    return this.prisma.resumeBuild.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
  }

  async get(id: string): Promise<ResumeBuild> {
    const build = await this.prisma.resumeBuild.findUnique({ where: { id } });
    if (!build) throw new NotFoundException(`Resume build ${id} not found`);
    return build;
  }

  list() {
    return this.prisma.resumeBuild.findMany({
      select: { id: true, variant: true, status: true, pages: true, createdAt: true, publishedAt: true, contentHash: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async latestPublished(variant: ResumeVariant): Promise<ResumeBuild | null> {
    return this.prisma.resumeBuild.findFirst({ where: { variant, status: 'PUBLISHED' }, orderBy: { publishedAt: 'desc' } });
  }

  /** What the site can offer for download. */
  async available() {
    const out: { variant: ResumeVariant; publishedAt: Date; pages: number | null; url: string }[] = [];
    for (const variant of VARIANT_NAMES) {
      const b = await this.latestPublished(variant);
      if (b?.publishedAt) {
        out.push({ variant, publishedAt: b.publishedAt, pages: b.pages, url: `${this.env.PUBLIC_API_URL.replace(/\/+$/, '')}/api/resume.pdf${variant === 'default' ? '' : `?variant=${variant}`}` });
      }
    }
    return out;
  }

  async file(variant: ResumeVariant): Promise<{ build: ResumeBuild; pdf: Buffer; filename: string }> {
    const build = await this.latestPublished(variant);
    if (!build?.publishedAt) throw new NotFoundException('No resume published yet');
    const pdf = await readFile(build.pdfPath);
    const name = ((build.curated as { name?: string }).name ?? 'Resume').split(/\s+/).slice(0, 2).join('-');
    const month = build.publishedAt.toISOString().slice(0, 7);
    return { build, pdf, filename: `${name}-Resume${RESUME_VARIANTS[variant].fileSuffix}-${month}.pdf` };
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async scheduled() {
    if (this.env.NODE_ENV === 'test' || !this.env.GOTENBERG_URL) return;
    await this.rebuildChanged();
  }

  /**
   * Rebuilds every variant whose inputs changed. Running every 10 minutes is the debounce:
   * a burst of approvals produces one build per variant, not one per approval.
   */
  async rebuildChanged(): Promise<BuildOutcome[]> {
    if (this.running) return [];
    this.running = true;
    try {
      const results: BuildOutcome[] = [];
      for (const variant of VARIANT_NAMES) {
        try {
          results.push(await this.build(variant));
        } catch (err) {
          this.logger.error(`Resume ${variant} build failed: ${(err as Error).message}`);
        }
      }
      return results;
    } finally {
      this.running = false;
    }
  }

  private async emailForApproval(build: ResumeBuild, pdf: Buffer, approveUrl: string, rejectUrl: string) {
    const notifiers = await this.registry.notifiers(true, 'approval');
    if (!notifiers.some((n) => n.key === 'email')) return;
    const label = build.variant === 'default' ? 'Resume' : `Resume (${build.variant})`;
    await this.mail.send({
      subject: `${label} ready for approval`,
      markdown: [
        `# ${label} ready for approval`,
        `A new build from your approved profile, case studies and open-source entries. It's attached${build.pages ? ` (${build.pages} page${build.pages === 1 ? '' : 's'})` : ''}.`,
        'Approve it to make it the download on the portfolio.',
      ].join('\n\n'),
      actions: [
        { label: 'Approve', url: approveUrl, style: 'primary' },
        { label: 'Reject', url: rejectUrl, style: 'danger' },
      ],
      attachments: [{ filename: `${label.replace(/[^\w]+/g, '-')}.pdf`, contentBase64: pdf.toString('base64'), contentType: 'application/pdf' }],
    });
  }
}
