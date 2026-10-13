#!/usr/bin/env node
// Turns a repository's recent git history into an inbox file for the content engine.
//
//   node scripts/export-commits.mjs ../../atlax --project atlax-exchange --since "2 weeks ago"
//   node scripts/export-commits.mjs ~/code/nest-mailer --project nest-mailer --kind oss \
//        --repo github.com/acme/nest-mailer --role contributor --out inbox
//
// Writes <out>/<project>-<YYYY-MM-DD>.md with frontmatter, one section per commit and a
// summary of the files touched. Add your own "## Notes" (why, what broke, numbers) before
// dropping it in the inbox: that context is what makes a good note.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIELD = '\x1f';
const RECORD = '\x1e';

export function parseArgs(argv) {
  const opts = { since: '2 weeks ago', until: undefined, out: join(fileURLToPath(new URL('.', import.meta.url)), '..', 'inbox') };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const value = argv[++i];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    if (!['since', 'until', 'project', 'kind', 'repo', 'role', 'out', 'author'].includes(key)) throw new Error(`Unknown option ${arg}`);
    opts[key] = value;
  }
  if (positional.length !== 1) throw new Error('Usage: export-commits.mjs <repo-path> --project <slug> [--since "2 weeks ago"] [--until DATE] [--kind client|product|oss] [--repo URL] [--role author|maintainer|contributor] [--author NAME] [--out DIR]');
  if (!opts.project) throw new Error('--project <slug> is required');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(opts.project)) throw new Error('--project must be a slug like "atlax-exchange"');
  if (opts.kind && !['client', 'product', 'oss'].includes(opts.kind)) throw new Error('--kind must be client, product or oss');
  if (opts.role && !['author', 'maintainer', 'contributor'].includes(opts.role)) throw new Error('--role must be author, maintainer or contributor');
  return { repoPath: resolve(positional[0]), ...opts };
}

function git(repoPath, args) {
  return execFileSync('git', ['-C', repoPath, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

const TRAILER = /^(co-authored-by|signed-off-by|reviewed-by|acked-by|change-id|claude-session):/i;

/** Drops git trailers (Co-Authored-By, Signed-off-by, …): noise for the writer, not content. */
export function stripTrailers(body) {
  return body
    .split('\n')
    .filter((line) => !TRAILER.test(line.trim()))
    .join('\n')
    .trim();
}

/** Commits oldest first: { hash, date, author, subject, body, files: [{ path, added, removed }] }. */
export function readCommits(repoPath, { since, until, author }) {
  const args = ['log', '--no-merges', '--reverse', `--since=${since}`, '--numstat', `--format=${RECORD}%h${FIELD}%cI${FIELD}%an${FIELD}%s${FIELD}%b${FIELD}`];
  if (until) args.push(`--until=${until}`);
  if (author) args.push(`--author=${author}`);
  return git(repoPath, args)
    .split(RECORD)
    .filter((chunk) => chunk.trim())
    .map((chunk) => {
      const [hash, date, authorName, subject, body, stat = ''] = chunk.split(FIELD);
      const files = stat
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [added, removed, ...path] = line.split('\t');
          return { path: path.join('\t'), added: Number(added) || 0, removed: Number(removed) || 0 };
        });
      return { hash, date, author: authorName, subject: subject.trim(), body: stripTrailers(body), files };
    });
}

/** Top-level areas touched, most-changed first: "src/payments (+420 −80, 12 files)". */
export function summariseFiles(commits, limit = 10) {
  const areas = new Map();
  for (const c of commits) {
    for (const f of c.files) {
      const parts = f.path.split('/');
      const area = parts.length > 2 ? parts.slice(0, 2).join('/') : parts.length === 2 ? parts[0] : '(root)';
      const a = areas.get(area) ?? { area, added: 0, removed: 0, files: new Set() };
      a.added += f.added;
      a.removed += f.removed;
      a.files.add(f.path);
      areas.set(area, a);
    }
  }
  return [...areas.values()]
    .sort((x, y) => y.added + y.removed - (x.added + x.removed))
    .slice(0, limit)
    .map((a) => `${a.area} (+${a.added} −${a.removed}, ${a.files.size} file${a.files.size === 1 ? '' : 's'})`);
}

const yamlString = (v) => (/^[\w./:@-]+$/.test(v) ? v : JSON.stringify(v));

export function renderMarkdown(commits, opts) {
  const first = commits[0].date.slice(0, 10);
  const last = commits[commits.length - 1].date.slice(0, 10);
  const front = [
    '---',
    `project: ${opts.project}`,
    ...(opts.kind ? [`kind: ${opts.kind}`] : []),
    ...(opts.repo ? [`repo: ${yamlString(opts.repo)}`] : []),
    ...(opts.role ? [`role: ${opts.role}`] : []),
    `period: ${first}..${last}`,
    '---',
  ];
  const body = commits.map((c) => {
    const lines = [`- ${c.hash} ${c.date.slice(0, 10)} ${c.subject}`];
    if (c.body) lines.push(...c.body.split('\n').map((l) => `  ${l}`.trimEnd()));
    return lines.join('\n');
  });
  const totals = commits.reduce((t, c) => ({ added: t.added + c.files.reduce((s, f) => s + f.added, 0), removed: t.removed + c.files.reduce((s, f) => s + f.removed, 0) }), { added: 0, removed: 0 });
  return [
    ...front,
    '',
    `## Commits (${commits.length})`,
    '',
    ...body,
    '',
    `## Files changed (+${totals.added} −${totals.removed})`,
    '',
    ...summariseFiles(commits).map((s) => `- ${s}`),
    '',
    '## Notes',
    '',
    '<!-- Why you did this, what broke, numbers, trade-offs. This is what makes a good note. -->',
    '',
  ].join('\n');
}

export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (!existsSync(join(opts.repoPath, '.git')) && !existsSync(join(opts.repoPath, 'HEAD'))) {
    throw new Error(`Not a git repository: ${opts.repoPath}`);
  }
  const commits = readCommits(opts.repoPath, opts);
  if (commits.length === 0) throw new Error(`No commits in ${basename(opts.repoPath)} since "${opts.since}"`);
  mkdirSync(opts.out, { recursive: true });
  const file = join(opts.out, `${opts.project}-${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(file, renderMarkdown(commits, opts));
  return { file, commits: commits.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { file, commits } = main();
    console.log(`Wrote ${commits} commits to ${file}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
