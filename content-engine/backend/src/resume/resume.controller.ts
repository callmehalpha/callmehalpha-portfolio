import { BadRequestException, Body, Controller, Get, HttpCode, NotFoundException, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { z } from 'zod';
import { AdminTokenGuard } from '../common/auth.guards';
import { ZodPipe } from '../common/zod.pipe';
import { ResumeService } from './resume.service';
import { isVariant, ResumeVariant, VARIANT_NAMES } from './variants';

function variantOf(v: unknown): ResumeVariant {
  if (v === undefined || v === '') return 'default';
  if (!isVariant(v)) throw new BadRequestException(`Unknown variant. Use one of: ${VARIANT_NAMES.join(', ')}`);
  return v;
}

/** The resume download. Serves the latest approved build; never builds on request. */
@Controller('api')
@UseGuards(ThrottlerGuard)
export class ResumePublicController {
  constructor(private readonly resume: ResumeService) {}

  @Get('resume')
  available() {
    return this.resume.available();
  }

  @Get('resume.pdf')
  async pdf(@Query('variant') variant: string | undefined, @Res() res: Response) {
    const { build, pdf, filename } = await this.resume.file(variantOf(variant));
    const etag = `"${build.contentHash.slice(0, 32)}"`;
    res.setHeader('etag', etag);
    res.setHeader('cache-control', 'public, max-age=300');
    if (res.req.headers['if-none-match'] === etag) return res.status(304).end();
    res.setHeader('content-type', 'application/pdf');
    res.setHeader('content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('content-length', String(pdf.length));
    return res.status(200).end(pdf);
  }

  @Get('resume.json')
  async json(@Query('variant') variant: string | undefined) {
    const build = await this.resume.latestPublished(variantOf(variant));
    if (!build) throw new NotFoundException('No resume published yet');
    return { ...(build.curated as object), publishedAt: build.publishedAt };
  }
}

const buildBody = z.object({ variant: z.string().optional(), force: z.boolean().default(false) });

@Controller('admin/resume')
@UseGuards(AdminTokenGuard)
export class ResumeAdminController {
  constructor(private readonly resume: ResumeService) {}

  @Get('builds')
  builds() {
    return this.resume.list();
  }

  /** Builds one variant (or all, when none is given) now instead of waiting for the 10-minute job. */
  @Post('build')
  @HttpCode(200)
  async build(@Body(new ZodPipe(buildBody)) body: z.infer<typeof buildBody>) {
    if (body.variant) return [await this.resume.build(variantOf(body.variant), { force: body.force })];
    if (body.force) return Promise.all(VARIANT_NAMES.map((v) => this.resume.build(v, { force: true })));
    return this.resume.rebuildChanged();
  }
}
