import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

export const STATE_FILE = join(__dirname, '.e2e-state.json');
const CONTAINER = 'content-engine-e2e-pg';

function sh(cmd: string) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
}

/**
 * Gives the e2e suite a real, empty, migrated Postgres. Uses TEST_DATABASE_URL when set (CI service
 * container); otherwise starts a throwaway postgres:16-alpine container on a free port.
 */
export default async function globalSetup() {
  let url = process.env.TEST_DATABASE_URL;
  let container: string | null = null;

  if (!url) {
    try {
      sh(`docker rm -f ${CONTAINER}`);
    } catch {
      /* not running */
    }
    sh(`docker run -d --name ${CONTAINER} -e POSTGRES_PASSWORD=e2e -e POSTGRES_DB=content_e2e -p 127.0.0.1::5432 postgres:16-alpine`);
    container = CONTAINER;
    const port = sh(`docker port ${CONTAINER} 5432/tcp`).split(':').pop();
    url = `postgresql://postgres:e2e@127.0.0.1:${port}/content_e2e`;

    const deadline = Date.now() + 60_000;
    for (;;) {
      try {
        sh(`docker exec ${CONTAINER} pg_isready -U postgres -d content_e2e`);
        sh(`docker exec ${CONTAINER} psql -U postgres -d content_e2e -c "select 1"`);
        break;
      } catch {
        if (Date.now() > deadline) throw new Error('Postgres did not become ready');
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  execSync('npx prisma migrate deploy', {
    cwd: join(__dirname, '..', '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'ignore',
  });

  writeFileSync(STATE_FILE, JSON.stringify({ url, container }));
}
