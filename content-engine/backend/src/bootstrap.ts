import { INestApplication } from '@nestjs/common';
import type { Express, NextFunction, Request, Response } from 'express';
import { json, urlencoded } from 'express';

/** Headers for every response. The CSP fits the only HTML we serve: the approval pages. */
export const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  // Approval links carry their token in the URL; never leak it to another site.
  'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};

/** Shared by main.ts and the e2e tests so both run the app the same way. */
export function configureApp(app: INestApplication) {
  const express = app.getHttpAdapter().getInstance() as Express;
  express.disable('x-powered-by');
  // Behind Caddy every request comes from Caddy's IP; trusting one hop makes req.ip
  // (and so the rate limiter) use the real client address from X-Forwarded-For.
  const hops = Number(process.env.TRUST_PROXY ?? 0);
  if (hops > 0) express.set('trust proxy', hops);

  app.use((_req: Request, res: Response, next: NextFunction) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
    next();
  });
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: false, limit: '64kb' }));
  app.enableCors({ origin: process.env.PUBLIC_SITE_URL ?? false, methods: ['GET'] });
  app.enableShutdownHooks();
  return app;
}
