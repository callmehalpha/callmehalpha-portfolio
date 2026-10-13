import { execSync } from 'child_process';
import { existsSync, readFileSync, rmSync } from 'fs';
import { STATE_FILE } from './global-setup';

export default async function globalTeardown() {
  if (!existsSync(STATE_FILE)) return;
  const { container, gotenbergContainer } = JSON.parse(readFileSync(STATE_FILE, 'utf8')) as {
    container: string | null;
    gotenbergContainer: string | null;
  };
  if (container && !process.env.KEEP_E2E_DB) execSync(`docker rm -f ${container}`, { stdio: 'ignore' });
  if (gotenbergContainer) execSync(`docker rm -f ${gotenbergContainer}`, { stdio: 'ignore' });
  rmSync(STATE_FILE, { force: true });
}
