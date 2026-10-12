import { INestApplication } from '@nestjs/common';
import { json, urlencoded } from 'express';

/** Shared by main.ts and the e2e tests so both run the app the same way. */
export function configureApp(app: INestApplication) {
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: false, limit: '64kb' }));
  app.enableCors({ origin: process.env.PUBLIC_SITE_URL ?? false, methods: ['GET'] });
  app.enableShutdownHooks();
  return app;
}
