import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { FSWatcher, watch } from 'chokidar';
import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import { basename, dirname, extname, join, relative, sep } from 'path';
import { ENV, Env } from '../config/env';
import { IngestService } from './ingest.service';
import { isSupportedCv } from './text-extract';

const MARKDOWN = new Set(['.md', '.markdown']);

/**
 * Watches `inbox/` (project updates), `inbox/cv/` (CVs) and `persona/`. Polling is used
 * because inotify events don't cross Docker bind mounts reliably.
 */
@Injectable()
export class WatcherService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(WatcherService.name);
  private watchers: FSWatcher[] = [];
  private readonly inFlight = new Set<Promise<unknown>>();

  constructor(
    private readonly ingest: IngestService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async onApplicationBootstrap() {
    if (this.env.WATCH_ENABLED) await this.start();
  }

  async onApplicationShutdown() {
    await this.stop();
  }

  async start() {
    const inbox = this.env.INBOX_DIR;
    await Promise.all(
      [inbox, join(inbox, 'cv'), join(inbox, 'processed'), join(inbox, 'failed'), this.env.PERSONA_DIR].map((d) =>
        mkdir(d, { recursive: true }),
      ),
    );

    const options = {
      ignoreInitial: false,
      usePolling: true,
      interval: this.env.WATCH_POLL_INTERVAL_MS,
      awaitWriteFinish: { stabilityThreshold: Math.max(200, this.env.WATCH_POLL_INTERVAL_MS), pollInterval: 100 },
    };

    const inboxWatcher = watch(inbox, {
      ...options,
      depth: 1,
      ignored: (path: string) => {
        const rel = relative(inbox, path);
        return rel.startsWith('processed') || rel.startsWith('failed') || basename(path).startsWith('.');
      },
    });
    inboxWatcher.on('add', (path) => this.track(this.handleInbox(path)));

    const personaWatcher = watch(this.env.PERSONA_DIR, { ...options, depth: 0 });
    personaWatcher.on('add', (path) => this.track(this.handlePersona(path)));
    personaWatcher.on('change', (path) => this.track(this.handlePersona(path)));

    this.watchers = [inboxWatcher, personaWatcher];
    await Promise.all(this.watchers.map((w) => new Promise<void>((r) => w.once('ready', () => r()))));
    this.logger.log(`Watching ${inbox} and ${this.env.PERSONA_DIR}`);
  }

  async stop() {
    await Promise.all(this.watchers.map((w) => w.close()));
    this.watchers = [];
    await Promise.allSettled([...this.inFlight]);
  }

  private track(p: Promise<unknown>) {
    this.inFlight.add(p);
    p.finally(() => this.inFlight.delete(p));
  }

  async handleInbox(path: string): Promise<void> {
    const rel = relative(this.env.INBOX_DIR, path);
    const inCvFolder = rel.split(sep)[0] === 'cv' && rel.includes(sep);
    const ext = extname(path).toLowerCase();
    try {
      if (inCvFolder) {
        if (!isSupportedCv(path)) return;
        await this.ingest.ingestCv(basename(path), await readFile(path));
      } else if (dirname(path) === this.env.INBOX_DIR && MARKDOWN.has(ext)) {
        await this.ingest.ingestMarkdown(basename(path), await readFile(path, 'utf8'));
      } else {
        return;
      }
      await this.moveTo(path, 'processed');
    } catch (err) {
      this.logger.error(`Failed to ingest ${rel}: ${(err as Error).message}`);
      await this.moveTo(path, 'failed', (err as Error).message);
    }
  }

  async handlePersona(path: string): Promise<void> {
    try {
      await this.ingest.ingestPersona(path, await readFile(path, 'utf8'));
    } catch (err) {
      this.logger.error(`Failed to ingest persona ${basename(path)}: ${(err as Error).message}`);
    }
  }

  private async moveTo(path: string, folder: 'processed' | 'failed', error?: string) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const target = join(this.env.INBOX_DIR, folder, `${stamp}-${basename(path)}`);
    try {
      await rename(path, target);
      if (error) await writeFile(`${target}.error.txt`, `${error}\n`);
    } catch (err) {
      this.logger.error(`Could not move ${basename(path)} to ${folder}: ${(err as Error).message}`);
    }
  }
}
