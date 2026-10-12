import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { loadEnv } from './config/env';

async function main() {
  const env = loadEnv();
  const app = configureApp(await NestFactory.create(AppModule, { bodyParser: false }));
  await app.listen(env.PORT, '0.0.0.0');
}

void main();
