import { Body, Controller, Get, HttpException, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { EntityType } from '../content/content-publisher.service';
import { confirmPage, resultPage } from './approval-page';
import { ApprovalsService, ENTITY_LABEL } from './approvals.service';

/** The pages behind the links in approval emails. GET shows a button; only POST decides. */
@Controller('approvals')
@UseGuards(ThrottlerGuard)
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Get('confirm')
  async confirm(@Query('token') token: string | undefined, @Res() res: Response) {
    res.setHeader('cache-control', 'no-store');
    try {
      const { item, action } = await this.approvals.inspect(token ?? '');
      if (item.status !== 'PENDING') {
        return res.status(409).type('html').send(resultPage('Already decided', `This request is ${item.status.toLowerCase()}.`));
      }
      const label = ENTITY_LABEL[item.entityType as EntityType] ?? item.entityType;
      return res.type('html').send(confirmPage({ token: token!, action, entityLabel: label }));
    } catch (err) {
      return this.fail(res, err);
    }
  }

  @Post('decide')
  async decide(@Body('token') token: string | undefined, @Res() res: Response) {
    res.setHeader('cache-control', 'no-store');
    try {
      const result = await this.approvals.decideByToken(token ?? '');
      const title = result.decision === 'approve' ? 'Approved' : 'Rejected';
      return res.status(200).type('html').send(resultPage(title, `The ${result.entity.type.replace(/_/g, ' ')} is now ${result.entity.status.toLowerCase().replace(/_/g, ' ')}.`));
    } catch (err) {
      return this.fail(res, err);
    }
  }

  private fail(res: Response, err: unknown) {
    const status = err instanceof HttpException ? err.getStatus() : 500;
    const message = err instanceof HttpException ? err.message : 'Something went wrong';
    return res.status(status).type('html').send(resultPage('Link not usable', message));
  }
}
