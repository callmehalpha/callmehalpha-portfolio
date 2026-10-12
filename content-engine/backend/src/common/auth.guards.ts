import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { ENV, Env } from '../config/env';
import { safeCompare } from './safe-compare';

function bearer(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length).trim();
}

abstract class BearerGuard implements CanActivate {
  protected abstract expected(): string;

  canActivate(context: ExecutionContext): boolean {
    const token = bearer(context.switchToHttp().getRequest<Request>());
    if (!token || !safeCompare(token, this.expected())) {
      throw new UnauthorizedException();
    }
    return true;
  }
}

/** n8n -> backend calls on /internal/*. */
@Injectable()
export class ServiceTokenGuard extends BearerGuard {
  constructor(@Inject(ENV) private readonly env: Env) {
    super();
  }
  protected expected() {
    return this.env.INTERNAL_SERVICE_TOKEN;
  }
}

/** My own calls on /admin/*. */
@Injectable()
export class AdminTokenGuard extends BearerGuard {
  constructor(@Inject(ENV) private readonly env: Env) {
    super();
  }
  protected expected() {
    return this.env.ADMIN_TOKEN;
  }
}
