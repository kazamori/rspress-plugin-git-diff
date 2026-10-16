import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from '@rstest/core';
import { collectGitData } from '../src/node/collect';
import { type GitDiffPluginOptions, resolveOptions } from '../src/node/options';
import type { PageIndex, TagIndex } from '../src/runtime/types';

let repo: string;

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

beforeAll(() => {
  repo = mkdtempSync(path.join(tmpdir(), 'git-diff-tags-'));
  git('init', '-q', '-b', 'main');
  mkdirSync(path.join(repo, 'docs'));
  writeFileSync(path.join(repo, 'docs', 'index.md'), '# Home\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'Add the home page');
  // Release tags of the docs, and tags of packages as in a monorepo.
  for (let i = 0; i < 3; i++) git('tag', `v1.${i}`);
  for (let i = 0; i < 20; i++) git('tag', `pkg@0.${i}.0`);
  // A page added after every tag.
  writeFileSync(path.join(repo, 'docs', 'guide.md'), '# Guide\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'Add the guide');
});

afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
});

async function warningsWith(options: GitDiffPluginOptions): Promise<string[]> {
  const warnings: string[] = [];
  await collectGitData({
    docsDir: path.join(repo, 'docs'),
    routes: new Map([
      [path.join(repo, 'docs', 'index.md'), '/'],
      [path.join(repo, 'docs', 'guide.md'), '/guide'],
    ]),
    layout: { versions: [], defaultVersion: '', langs: [], defaultLang: 'en' },
    options: resolveOptions(options),
    outDir: path.join(repo, 'out'),
    warn: (message) => warnings.push(message),
  });
  return warnings;
}

describe('many tags', () => {
  test('suggest tagPattern when it is not set', async () => {
    const warnings = await warningsWith({});
    expect(warnings).toEqual([expect.stringContaining('23 tags are written')]);
  });

  test('raise no warning with tagPattern', async () => {
    expect(await warningsWith({ tagPattern: /^v\d/ })).toEqual([]);
  });
});

describe('tags in the data', () => {
  const readJson = <T>(relative: string): T =>
    JSON.parse(readFileSync(path.join(repo, 'out', relative), 'utf8')) as T;

  test('a page index lists only the tags at which the page existed', async () => {
    await warningsWith({ tagPattern: /^v\d/ });
    expect(Object.keys(readJson<PageIndex>('pages/index.json').tags).sort()).toEqual([
      'v1.0',
      'v1.1',
      'v1.2',
    ]);
    expect(readJson<PageIndex>('pages/guide.json').tags).toEqual({});
  });

  test('the tag list has every tag written', async () => {
    await warningsWith({ tagPattern: /^v\d/ });
    expect(readJson<TagIndex>('tags.json').tags.sort()).toEqual(['v1.0', 'v1.1', 'v1.2']);
  });
});
