import { PrismaClient } from '@prisma/client';
import { seed } from './seed';

/** Runs on every container start; the seed only fills what's missing. */
const prisma = new PrismaClient();
seed(prisma, { dir: process.env.SEED_DATA_DIR, notifyEmailTo: process.env.NOTIFY_EMAIL_TO })
  .then(() => console.log('Seed complete'))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
