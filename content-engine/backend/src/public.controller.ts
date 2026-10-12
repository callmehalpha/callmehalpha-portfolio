import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CaseStudiesService } from './case-studies/case-studies.service';
import { ZodPipe } from './common/zod.pipe';
import { ListQuery, listQuery, NotesService } from './notes/notes.service';
import { OssService } from './oss/oss.service';
import { ProfileService } from './profile/profile.service';

/** Everything the portfolio renders. Read-only, published content only, rate limited. */
@Controller('api')
@UseGuards(ThrottlerGuard)
export class PublicController {
  constructor(
    private readonly notes: NotesService,
    private readonly caseStudies: CaseStudiesService,
    private readonly oss: OssService,
    private readonly profile: ProfileService,
  ) {}

  @Get('notes')
  listNotes(@Query(new ZodPipe(listQuery)) q: ListQuery) {
    return this.notes.listPublished(q);
  }

  @Get('notes/:slug')
  getNote(@Param('slug') slug: string) {
    return this.notes.getPublished(slug);
  }

  @Get('case-studies')
  listCaseStudies() {
    return this.caseStudies.listPublic();
  }

  @Get('case-studies/:slug')
  getCaseStudy(@Param('slug') slug: string) {
    return this.caseStudies.getPublic(slug);
  }

  @Get('oss')
  listOss() {
    return this.oss.listPublic();
  }

  @Get('profile')
  getProfile() {
    return this.profile.getPublic();
  }
}
