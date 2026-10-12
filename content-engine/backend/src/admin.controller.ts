import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ApprovalsService } from './approvals/approvals.service';
import { CaseStudiesService } from './case-studies/case-studies.service';
import { AdminTokenGuard } from './common/auth.guards';
import { ZodPipe } from './common/zod.pipe';
import { ContentPublisher, ENTITY_TYPES } from './content/content-publisher.service';
import { IngestService } from './ingest/ingest.service';
import { PersonaService } from './persona/persona.service';
import { PrismaService } from './prisma/prisma.service';
import { projectPatch, ProjectsService } from './projects/projects.service';
import { registryPatch, RegistryService } from './registry/registry.service';
import { SettingsService } from './settings/settings.service';

const decisionBody = z.object({ decision: z.enum(['approve', 'reject']) });
const contentBody = z.object({ action: z.enum(['approve', 'reject', 'publish', 'withdraw']) });

/** My own controls: drafts, toggles, registries, retries. Needs the admin token. */
@Controller('admin')
@UseGuards(AdminTokenGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly registry: RegistryService,
    private readonly projects: ProjectsService,
    private readonly approvals: ApprovalsService,
    private readonly content: ContentPublisher,
    private readonly caseStudies: CaseStudiesService,
    private readonly persona: PersonaService,
    private readonly ingest: IngestService,
  ) {}

  @Get('settings')
  getSettings() {
    return this.settings.all();
  }

  @Patch('settings/:key')
  setSetting(@Param('key') key: string, @Body(new ZodPipe(z.object({ value: z.unknown() }))) body: { value: unknown }) {
    return this.settings.set(key, body.value);
  }

  @Get('notes')
  notes(@Query('status') status?: string) {
    return this.prisma.note.findMany({
      where: status ? { status: status as never } : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Get('approvals')
  pendingApprovals() {
    return this.prisma.approvalItem.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
  }

  @Post('approvals/:id')
  @HttpCode(200)
  decide(@Param('id') id: string, @Body(new ZodPipe(decisionBody)) body: z.infer<typeof decisionBody>) {
    return this.approvals.decide(id, body.decision);
  }

  @Post('content/:type/:id')
  @HttpCode(200)
  applyContent(
    @Param('type') type: string,
    @Param('id') id: string,
    @Body(new ZodPipe(contentBody)) body: z.infer<typeof contentBody>,
  ) {
    const parsed = z.enum(ENTITY_TYPES).parse(type);
    return this.content.apply(parsed, id, body.action);
  }

  @Get('case-studies/:projectSlug/revisions')
  revisions(@Param('projectSlug') slug: string) {
    return this.caseStudies.revisions(slug);
  }

  @Get('persona')
  personaVersions() {
    return this.persona.versions();
  }

  @Get('channels')
  channels() {
    return this.registry.channels(false);
  }

  @Patch('channels/:key')
  patchChannel(@Param('key') key: string, @Body(new ZodPipe(registryPatch)) body: z.infer<typeof registryPatch>) {
    return this.registry.patchChannel(key, body);
  }

  @Get('notifiers')
  notifiers() {
    return this.registry.notifiers(false);
  }

  @Patch('notifiers/:key')
  patchNotifier(@Param('key') key: string, @Body(new ZodPipe(registryPatch)) body: z.infer<typeof registryPatch>) {
    return this.registry.patchNotifier(key, body);
  }

  @Patch('projects/:slug')
  patchProject(@Param('slug') slug: string, @Body(new ZodPipe(projectPatch)) body: z.infer<typeof projectPatch>) {
    return this.projects.update(slug, body);
  }

  @Post('sources/:id/retry')
  @HttpCode(200)
  async retrySource(@Param('id') id: string) {
    const source = await this.prisma.sourceDocument.update({
      where: { id },
      data: { status: 'RECEIVED', triggerAttempts: 0, error: null },
    });
    return this.ingest.triggerSource(source);
  }
}
