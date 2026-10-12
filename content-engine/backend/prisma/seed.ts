import { PrismaClient } from '@prisma/client';
import { seed } from '../src/seed/seed';

const prisma = new PrismaClient();

seed(prisma, { dir: process.env.SEED_DATA_DIR, notifyEmailTo: process.env.NOTIFY_EMAIL_TO })
  .then(() => console.log('Seed complete'))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
