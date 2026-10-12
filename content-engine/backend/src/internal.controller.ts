import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ContentStatus } from '@prisma/client';
import { z } from 'zod';
import { ApprovalsService } from './approvals/approvals.service';
import { CaseStudiesService, revisionInput } from './case-studies/case-studies.service';
import { ServiceTokenGuard } from './common/auth.guards';
import { ENV, Env } from './config/env';
import { ZodPipe } from './common/zod.pipe';
import { APPROVAL_SETTING, ContentPublisher, ENTITY_TYPES, EntityType } from './content/content-publisher.service';
import { IngestService } from './ingest/ingest.service';
import { MailService, sendEmailInput } from './notify/mail.service';
import { noteInput, notePatch, NotesService } from './notes/notes.service';
import { contributionInput, ossInput, OssService, statsInput } from './oss/oss.service';
import { PersonaService } from './persona/persona.service';
import { runInput, runPatch, RunsService, sourcePatch } from './pipeline/runs.service';
import { profileRevisionInput } from './profile/profile.schema';
import { ProfileService } from './profile/profile.service';
import { projectInput, ProjectsService } from './projects/projects.service';
import { claimInput, PublicationsService, resultInput } from './publications/publications.service';
import { RegistryService } from './registry/registry.service';
import { SettingsService } from './settings/settings.service';

const ingestBody = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('source'), filename: z.string().min(1), content: z.string().min(1) }),
  z.object({ kind: z.literal('cv'), filename: z.string().min(1), contentBase64: z.string().min(1) }),
]);

const approvalBody = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().min(1),
  resumeUrl: z.string().url().optional(),
});

const contentActionBody = z.object({ action: z.enum(['submit', 'approve', 'reject', 'publish', 'withdraw']) });
const noteStatusBody = z.object({ status: z.nativeEnum(ContentStatus) });

/** The API n8n drives the pipeline through. Every route needs the service token. */
@Controller()
@UseGuards(ServiceTokenGuard)
export class InternalController {
  constructor(
    private readonly ingest: IngestService,
    private readonly runs: RunsService,
    private readonly persona: PersonaService,
    private readonly projects: ProjectsService,
    private readonly notes: NotesService,
    private readonly caseStudies: CaseStudiesService,
    private readonly oss: OssService,
    private readonly profile: ProfileService,
    private readonly content: ContentPublisher,
    private readonly approvals: ApprovalsService,
    private readonly settings: SettingsService,
    private readonly registry: RegistryService,
    private readonly publications: PublicationsService,
    private readonly mail: MailService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  // ── Ingest & sources ────────────────────────────────────────────
  @Post('api/ingest')
  async ingestDoc(@Body(new ZodPipe(ingestBody)) body: z.infer<typeof ingestBody>) {
    if (body.kind === 'source') return this.ingest.ingestMarkdown(body.filename, body.content);
    try {
      return await this.ingest.ingestCv(body.filename, Buffer.from(body.contentBase64, 'base64'));
    } catch (err) {
      if ((err as Error).message.startsWith('Unsupported CV format')) throw new BadRequestException((err as Error).message);
      throw err;
    }
  }

  @Get('internal/sources/:id')
  getSource(@Param('id') id: string) {
    return this.runs.getSource(id);
  }

  @Patch('internal/sources/:id')
  patchSource(@Param('id') id: string, @Body(new ZodPipe(sourcePatch)) body: z.infer<typeof sourcePatch>) {
    return this.runs.patchSource(id, body);
  }

  @Get('internal/cv/:sourceId/text')
  async cvText(@Param('sourceId') id: string) {
    const source = await this.runs.getSource(id);
    if (source.kind !== 'CV') throw new BadRequestException('Not a CV source');
    return { sourceId: source.id, filename: source.filename, text: source.rawMarkdown };
  }

  @Post('internal/runs')
  createRun(@Body(new ZodPipe(runInput)) body: z.infer<typeof runInput>) {
    return this.runs.create(body);
  }

  @Patch('internal/runs/:id')
  patchRun(@Param('id') id: string, @Body(new ZodPipe(runPatch)) body: z.infer<typeof runPatch>) {
    return this.runs.patch(id, body);
  }

  // ── Persona ─────────────────────────────────────────────────────
  @Get('internal/persona/context')
  personaContext() {
    return this.persona.context();
  }

  @Put('internal/persona/:id/distilled')
  setDistilled(@Param('id') id: string, @Body(new ZodPipe(z.record(z.unknown()))) body: Record<string, unknown>) {
    return this.persona.setDistilled(id, body);
  }

  // ── Projects ────────────────────────────────────────────────────
  @Get('internal/projects')
  listProjects() {
    return this.projects.list();
  }

  @Get('internal/projects/:slug')
  getProject(@Param('slug') slug: string) {
    return this.projects.get(slug);
  }

  @Post('internal/projects')
  upsertProject(@Body(new ZodPipe(projectInput)) body: z.infer<typeof projectInput>) {
    return this.projects.upsert(body);
  }

  // ── Notes ───────────────────────────────────────────────────────
  @Get('internal/notes/recent')
  recentNotes(@Query('limit') limit?: string) {
    const n = Math.min(Math.max(Number(limit) || 10, 1), 50);
    return this.notes.recent(n);
  }

  @Get('internal/notes/:id')
  getNote(@Param('id') id: string) {
    return this.notes.get(id);
  }

  @Post('internal/notes')
  createNote(@Body(new ZodPipe(noteInput)) body: z.infer<typeof noteInput>) {
    return this.notes.createDraft(body);
  }

  @Patch('internal/notes/:id')
  async patchNote(@Param('id') id: string, @Body() body: unknown) {
    const status = noteStatusBody.safeParse(body);
    if (status.success && Object.keys(body as object).length === 1) {
      const note = await this.notes.transition(id, status.data.status);
      return { ...note, url: this.notes.url(this.siteUrl, note.slug) };
    }
    return this.notes.update(id, new ZodPipe(notePatch).transform(body));
  }

  // ── Case studies ────────────────────────────────────────────────
  @Get('internal/case-studies/:projectSlug')
  async currentCaseStudy(@Param('projectSlug') slug: string) {
    return { current: await this.caseStudies.current(slug) };
  }

  @Post('internal/case-studies/:projectSlug/revisions')
  createRevision(@Param('projectSlug') slug: string, @Body(new ZodPipe(revisionInput)) body: z.infer<typeof revisionInput>) {
    return this.caseStudies.createRevision(slug, body);
  }

  // ── Open source ─────────────────────────────────────────────────
  @Get('internal/oss/:projectSlug')
  getOss(@Param('projectSlug') slug: string) {
    return this.oss.get(slug);
  }

  @Put('internal/oss/:projectSlug')
  upsertOss(@Param('projectSlug') slug: string, @Body(new ZodPipe(ossInput)) body: z.infer<typeof ossInput>) {
    return this.oss.upsert(slug, body);
  }

  @Post('internal/oss/:projectSlug/contributions')
  contributions(
    @Param('projectSlug') slug: string,
    @Body(new ZodPipe(z.array(contributionInput).min(1).max(100))) body: z.infer<typeof contributionInput>[],
  ) {
    return this.oss.upsertContributions(slug, body);
  }

  @Patch('internal/oss/:projectSlug/stats')
  stats(@Param('projectSlug') slug: string, @Body(new ZodPipe(statsInput)) body: z.infer<typeof statsInput>) {
    return this.oss.updateStats(slug, body);
  }

  // ── Profile ─────────────────────────────────────────────────────
  @Get('internal/profile')
  async currentProfile() {
    return { current: await this.profile.current() };
  }

  @Post('internal/profile/revisions')
  createProfileRevision(@Body(new ZodPipe(profileRevisionInput)) body: z.infer<typeof profileRevisionInput>) {
    return this.profile.createRevision(body);
  }

  // ── Lifecycle & approvals ───────────────────────────────────────
  /** Used when the approval gate is off: n8n moves content straight through. */
  @Post('internal/content/:type/:id')
  @HttpCode(200)
  applyContent(
    @Param('type') type: string,
    @Param('id') id: string,
    @Body(new ZodPipe(contentActionBody)) body: z.infer<typeof contentActionBody>,
  ) {
    return this.content.apply(this.entityType(type), id, body.action);
  }

  /** Tells n8n whether this content type needs my approval right now. */
  @Get('internal/approvals/required/:type')
  async approvalRequired(@Param('type') type: string) {
    const settings = (await this.settings.all()) as Record<string, unknown>;
    return { required: settings[APPROVAL_SETTING[this.entityType(type)]] === true };
  }

  @Post('internal/approvals')
  createApproval(@Body(new ZodPipe(approvalBody)) body: z.infer<typeof approvalBody>) {
    return this.approvals.create(body.entityType, body.entityId, body.resumeUrl);
  }

  @Get('internal/settings')
  allSettings() {
    return this.settings.all();
  }

  // ── Registries & delivery ───────────────────────────────────────
  @Get('internal/channels')
  channels(@Query('enabled') enabled?: string) {
    return this.registry.channels(enabled === 'true');
  }

  @Get('internal/notifiers')
  notifiers(@Query('enabled') enabled?: string, @Query('event') event?: string) {
    return this.registry.notifiers(enabled === 'true', event);
  }

  @Post('internal/publications/claim')
  claim(@Body(new ZodPipe(claimInput)) body: z.infer<typeof claimInput>) {
    return this.publications.claim(body);
  }

  @Patch('internal/publications/:id')
  recordPublication(@Param('id') id: string, @Body(new ZodPipe(resultInput)) body: z.infer<typeof resultInput>) {
    return this.publications.record(id, body);
  }

  @Post('internal/notify/email')
  sendEmail(@Body(new ZodPipe(sendEmailInput)) body: z.infer<typeof sendEmailInput>) {
    return this.mail.send(body);
  }

  private get siteUrl() {
    return this.env.PUBLIC_SITE_URL;
  }

  private entityType(type: string): EntityType {
    if (!(ENTITY_TYPES as readonly string[]).includes(type)) throw new BadRequestException(`Unknown content type ${type}`);
    return type as EntityType;
  }
}
