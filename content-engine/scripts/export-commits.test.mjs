import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { main, parseArgs, readCommits, renderMarkdown, stripTrailers, summariseFiles } from './export-commits.mjs';

const root = mkdtempSync(join(tmpdir(), 'export-commits-'));
const repo = join(root, 'repo');
const out = join(root, 'inbox');

function git(...args) {
  execFileSync('git', ['-C', repo, ...args], {
    env: { ...process.env, GIT_AUTHOR_NAME: 'Me', GIT_AUTHOR_EMAIL: 'me@x.y', GIT_COMMITTER_NAME: 'Me', GIT_COMMITTER_EMAIL: 'me@x.y' },
    stdio: 'ignore',
  });
}

function commit(path, content, message, date) {
  mkdirSync(join(repo, path, '..'), { recursive: true });
  writeFileSync(join(repo, path), content);
  git('add', '-A');
  execFileSync('git', ['-C', repo, 'commit', '-q', '-m', message], {
    env: { ...process.env, GIT_AUTHOR_NAME: 'Me', GIT_AUTHOR_EMAIL: 'me@x.y', GIT_COMMITTER_NAME: 'Me', GIT_COMMITTER_EMAIL: 'me@x.y', GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
  });
}

before(() => {
  mkdirSync(repo);
  git('init', '-q');
  commit('README.md', 'old\n', 'chore: ancient history', '2020-01-01T10:00:00Z');
  const recent = (d) => new Date(Date.now() - d * 86_400_000).toISOString();
  commit('src/payments/ledger.ts', 'a\nb\nc\n', 'feat(payments): batch ledger writes\n\nCuts round trips per payout.\nSee #12.', recent(3));
  commit('src/payments/failover.ts', 'x\n', 'feat(payments): fail over after 3 errors', recent(2));
  commit('docs/notes.md', 'n\n', 'docs: explain "failover" | edge cases', recent(1));
});

after(() => rmSync(root, { recursive: true, force: true }));

describe('export-commits', () => {
  it('parses options and validates them', () => {
    const o = parseArgs([repo, '--project', 'atlax-exchange', '--since', '1 week ago', '--kind', 'oss', '--role', 'contributor']);
    assert.equal(o.project, 'atlax-exchange');
    assert.equal(o.since, '1 week ago');
    assert.throws(() => parseArgs([repo]), /--project/);
    assert.throws(() => parseArgs([repo, '--project', 'Bad Slug']), /slug/);
    assert.throws(() => parseArgs([repo, '--project', 'x', '--kind', 'spaceship']), /--kind/);
    assert.throws(() => parseArgs([repo, '--project', 'x', '--nope', '1']), /Unknown option/);
    assert.throws(() => parseArgs([repo, '--project']), /Missing value/);
  });

  it('reads only commits in the window, oldest first, with bodies and file stats', () => {
    const commits = readCommits(repo, { since: '2 weeks ago' });
    assert.deepEqual(commits.map((c) => c.subject), [
      'feat(payments): batch ledger writes',
      'feat(payments): fail over after 3 errors',
      'docs: explain "failover" | edge cases',
    ]);
    assert.equal(commits[0].body, 'Cuts round trips per payout.\nSee #12.');
    assert.deepEqual(commits[0].files, [{ path: 'src/payments/ledger.ts', added: 3, removed: 0 }]);
  });

  it('summarises the areas touched, biggest first', () => {
    assert.deepEqual(summariseFiles(readCommits(repo, { since: '2 weeks ago' })), [
      'src/payments (+4 −0, 2 files)',
      'docs (+1 −0, 1 file)',
    ]);
  });

  it('renders frontmatter the backend accepts', () => {
    const md = renderMarkdown(readCommits(repo, { since: '2 weeks ago' }), { project: 'atlax-exchange', kind: 'oss', repo: 'github.com/acme/x', role: 'contributor' });
    assert.match(md, /^---\nproject: atlax-exchange\nkind: oss\nrepo: github.com\/acme\/x\nrole: contributor\nperiod: \d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2}\n---\n/);
    assert.match(md, /## Commits \(3\)/);
    assert.match(md, /- [0-9a-f]{7} \d{4}-\d{2}-\d{2} feat\(payments\): batch ledger writes\n  Cuts round trips per payout\.\n  See #12\./);
    assert.match(md, /## Files changed \(\+5 −0\)/);
    assert.match(md, /## Notes/);
  });

  it('writes the inbox file', () => {
    const { file, commits } = main([repo, '--project', 'atlax-exchange', '--out', out]);
    assert.equal(commits, 3);
    assert.match(file, /atlax-exchange-\d{4}-\d{2}-\d{2}\.md$/);
    assert.match(readFileSync(file, 'utf8'), /docs: explain "failover" \| edge cases/);
  });

  it('drops git trailers from commit bodies', () => {
    assert.equal(
      stripTrailers('Real detail.\n\nCo-Authored-By: Bot <b@x>\nSigned-off-by: Me <m@x>\nClaude-Session: https://x'),
      'Real detail.',
    );
    assert.equal(stripTrailers('Keeps: colons in prose'), 'Keeps: colons in prose');
  });

  it('fails clearly when there is nothing to export or no repository', () => {
    assert.throws(() => main([repo, '--project', 'x', '--since', '2030-01-01', '--out', out]), /No commits/);
    assert.throws(() => main([root, '--project', 'x', '--out', out]), /Not a git repository/);
  });
});
