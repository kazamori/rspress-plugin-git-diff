import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from '@rstest/core';
import { collectGitData } from '../src/node/collect';
import { resolveOptions } from '../src/node/options';
import type { LogIndex, PageIndex } from '../src/runtime/types';

let repo: string;
let outDir: string;
let day = 0;

function git(...args: string[]): string {
  const date = `2026-09-${String(day).padStart(2, '0')}T10:00:00+09:00`;
  return execFileSync('git', args, {
    cwd: repo,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Alice',
      GIT_AUTHOR_EMAIL: 'alice@example.com',
      GIT_COMMITTER_NAME: 'Alice',
      GIT_COMMITTER_EMAIL: 'alice@example.com',
      GIT_AUTHOR_DATE: date,
      GIT_COMMITTER_DATE: date,
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

function commit(message: string): string {
  day++;
  git('add', '-A');
  git('commit', '-q', '-m', message);
  return git('rev-parse', 'HEAD').trim();
}

function readJson<T>(relative: string): T {
  return JSON.parse(readFileSync(path.join(outDir, relative), 'utf8')) as T;
}

const body = (value: number) =>
  ['# Config', '', 'The settings are listed below.', '', `timeout: ${value}`, '', 'Short values may fail on slow networks.', ''].join('\n');

const hashes: Record<string, string> = {};

beforeAll(async () => {
  repo = mkdtempSync(path.join(tmpdir(), 'git-diff-repo-'));
  outDir = path.join(repo, 'out');
  git('init', '-q', '-b', 'main');

  write('config.md', body(30));
  write('other.md', '# Other\n');
  hashes.add = commit('Add pages');
  write('config.md', body(60));
  hashes.value = commit('Raise the timeout (#12)');
  write('config.md', body(60).replace('listed below.', 'listed\nbelow.'));
  hashes.reflow = commit('Reflow');
  git('tag', 'v1.0');
  rmSync(path.join(repo, 'docs', 'config.md'));
  write('settings.md', body(90).replace('listed below.', 'listed\nbelow.'));
  hashes.rename = commit('Rename config to settings');
  rmSync(path.join(repo, 'docs', 'other.md'));
  hashes.remove = commit('Remove other');

  await collectGitData({
    docsDir: path.join(repo, 'docs'),
    routes: new Map([[path.join(repo, 'docs', 'settings.md'), '/settings']]),
    layout: { versions: [], defaultVersion: '', langs: [], defaultLang: 'en' },
    options: resolveOptions({ showAuthor: true }),
    outDir,
    warn: () => {},
  });
});

afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('collectGitData', () => {
  test('writes the history of a page across a rename', () => {
    const page = readJson<PageIndex>('pages/settings.json');
    expect(page.revisions.map((r) => [r.hash, r.subject, r.hidden])).toEqual([
      [hashes.rename, 'Rename config to settings', undefined],
      [hashes.reflow, 'Reflow', 'format'],
      [hashes.value, 'Raise the timeout', undefined],
      [hashes.add, 'Add pages', 'added'],
    ]);
    expect(page.revisions[0].author).toBe('Alice');
    expect(page.tags['v1.0']).toBe(page.revisions[1].blob);
  });

  test('writes the blobs the page refers to', () => {
    const page = readJson<PageIndex>('pages/settings.json');
    const latest = readFileSync(path.join(outDir, `blobs/${page.revisions[0].blob}.txt`), 'utf8');
    expect(latest).toContain('timeout: 90');
  });

  test('lists visible changes in the log, newest first', () => {
    const log = readJson<LogIndex>('log/_.en.json');
    expect(
      log.commits.map((c) => [
        c.hash,
        c.changes.map((change) =>
          change.kind === 'page' ? [change.status, change.title, change.routePath] : change.path,
        ),
      ]),
    ).toEqual([
      [hashes.remove, [['deleted', 'Other', null]]],
      [hashes.rename, [['renamed', 'Config', '/settings']]],
      [hashes.value, [['modified', 'Config', '/settings']]],
    ]);
  });
});
