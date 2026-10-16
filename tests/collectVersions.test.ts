import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from '@rstest/core';
import { collectGitData } from '../src/node/collect';
import { resolveOptions } from '../src/node/options';
import type { LogIndex } from '../src/runtime/types';

// A site that starts using multiVersion: its pages move from docs/en/ into
// docs/dev/en/.

let repo: string;
let outDir: string;

function git(...args: string[]): void {
  execFileSync('git', args, {
    cwd: repo,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Alice',
      GIT_AUTHOR_EMAIL: 'alice@example.com',
      GIT_COMMITTER_NAME: 'Alice',
      GIT_COMMITTER_EMAIL: 'alice@example.com',
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
    },
  });
}

function write(file: string, content: string): void {
  const target = path.join(repo, 'docs', file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function commit(message: string): void {
  git('add', '-A');
  git('commit', '-q', '-m', message);
}

beforeAll(async () => {
  repo = mkdtempSync(path.join(tmpdir(), 'git-diff-versions-'));
  outDir = path.join(repo, 'out');
  git('init', '-q', '-b', 'main');
  write('en/guide.md', '# Guide\n\nThe timeout is 30 seconds.\n');
  commit('Add the guide');
  write('en/guide.md', '# Guide\n\nThe timeout is 60 seconds.\n');
  commit('Raise the timeout');
  mkdirSync(path.join(repo, 'docs', 'dev'));
  git('mv', 'docs/en', 'docs/dev/en');
  commit('Move the pages into the dev version');

  await collectGitData({
    docsDir: path.join(repo, 'docs'),
    routes: new Map([[path.join(repo, 'docs', 'dev', 'en', 'guide.md'), '/guide']]),
    layout: { versions: ['dev'], defaultVersion: 'dev', langs: ['en'], defaultLang: 'en' },
    options: resolveOptions(),
    outDir,
    warn: () => {},
  });
});

afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('pages moved into a version directory', () => {
  test('keep their changes from before the move in the recent changes', () => {
    const log = JSON.parse(readFileSync(path.join(outDir, 'log/dev.en.json'), 'utf8')) as LogIndex;
    expect(
      log.commits.map((c) => [
        c.subject,
        c.changes.map((change) => (change.kind === 'page' ? change.routePath : change.path)),
      ]),
    ).toEqual([['Raise the timeout', ['/guide']]]);
  });
});
