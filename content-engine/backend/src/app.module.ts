import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminController } from './admin.controller';
import { ApprovalsController } from './approvals/approvals.controller';
import { ApprovalsService } from './approvals/approvals.service';
import { CaseStudiesService } from './case-studies/case-studies.service';
import { AdminTokenGuard, ServiceTokenGuard } from './common/auth.guards';
import { ConfigModule } from './config/config.module';
import { ContentPublisher } from './content/content-publisher.service';
import { HealthController } from './health/health.controller';
import { IngestService } from './ingest/ingest.service';
import { WatcherService } from './ingest/watcher.service';
import { InternalController } from './internal.controller';
import { MailService } from './notify/mail.service';
import { NotesService } from './notes/notes.service';
import { OssService } from './oss/oss.service';
import { PersonaService } from './persona/persona.service';
import { PipelineClient } from './pipeline/pipeline.client';
import { RunsService } from './pipeline/runs.service';
import { SweeperService } from './pipeline/sweeper.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileService } from './profile/profile.service';
import { ProjectsService } from './projects/projects.service';
import { PublicController } from './public.controller';
import { PublicationsService } from './publications/publications.service';
import { RegistryService } from './registry/registry.service';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    SettingsModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: Number(process.env.THROTTLE_LIMIT ?? 120) }]),
  ],
  controllers: [HealthController, PublicController, ApprovalsController, InternalController, AdminController],
  providers: [
    ServiceTokenGuard,
    AdminTokenGuard,
    PipelineClient,
    IngestService,
    WatcherService,
    SweeperService,
    RunsService,
    PersonaService,
    ProjectsService,
    NotesService,
    CaseStudiesService,
    OssService,
    ProfileService,
    ContentPublisher,
    ApprovalsService,
    RegistryService,
    PublicationsService,
    MailService,
  ],
})
export class AppModule {}
