import { describe, expect, test } from '@rstest/core';
import { buildHistories } from '../src/node/history';
import { type Commit, type FileChange, parseLog } from '../src/node/log';
import { formatSubject } from '../src/node/message';
import { DEFAULT_ISSUE_REF_PATTERN, resolveOptions } from '../src/node/options';
import { extractTitle, isFormatOnlyChange } from '../src/node/page';
import { scopedRoutePath, scopeOfPath, type SiteLayout } from '../src/node/scope';

describe('parseLog', () => {
  test('reads commits and their raw changes', () => {
    const zero = '0'.repeat(40);
    const a = 'a'.repeat(40);
    const b = 'b'.repeat(40);
    const output = [
      `\x1e${'1'.repeat(40)}\x1f2026-09-02T10:00:00+09:00\x1fBob\x1fRename\n`,
      `:100644 100644 ${a} ${b} R087\tdocs/old.md\tdocs/new.md`,
      `:100644 000000 ${b} ${zero} D\tdocs/gone.md`,
      `\x1e${'2'.repeat(40)}\x1f2026-09-01T10:00:00+09:00\x1fAlice\x1fAdd\n`,
      `:000000 100644 ${zero} ${a} A\tdocs/old.md`,
    ].join('\n');

    expect(parseLog(output)).toEqual([
      {
        hash: '1'.repeat(40),
        date: '2026-09-02T10:00:00+09:00',
        author: 'Bob',
        subject: 'Rename',
        changes: [
          { status: 'R', similarity: 87, oldPath: 'docs/old.md', path: 'docs/new.md', oldBlob: a, newBlob: b },
          { status: 'D', similarity: undefined, oldPath: 'docs/gone.md', path: 'docs/gone.md', oldBlob: b, newBlob: null },
        ],
      },
      {
        hash: '2'.repeat(40),
        date: '2026-09-01T10:00:00+09:00',
        author: 'Alice',
        subject: 'Add',
        changes: [
          { status: 'A', similarity: undefined, oldPath: 'docs/old.md', path: 'docs/old.md', oldBlob: null, newBlob: a },
        ],
      },
    ]);
  });
});

describe('buildHistories', () => {
  const change = (status: FileChange['status'], path: string, oldPath = path): FileChange => ({
    status,
    oldPath,
    path,
    oldBlob: status === 'A' ? null : 'x',
    newBlob: status === 'D' ? null : 'y',
  });
  const commit = (hash: string, ...changes: FileChange[]): Commit => ({
    hash,
    date: '',
    author: '',
    subject: '',
    changes,
  });

  test('follows renames and starts over after a deletion', () => {
    // Newest first, as git log prints them.
    const histories = buildHistories([
      commit('5', change('A', 'b.md')),
      commit('4', change('D', 'b.md')),
      commit('3', change('R', 'b.md', 'a.md')),
      commit('2', change('M', 'a.md')),
      commit('1', change('A', 'a.md')),
    ]);

    expect(
      histories.map((h) => ({
        path: h.path,
        paths: h.paths,
        deleted: h.deleted,
        commits: h.revisions.map((r) => r.commit.hash),
      })),
    ).toEqual([
      { path: 'b.md', paths: ['b.md', 'a.md'], deleted: true, commits: ['4', '3', '2', '1'] },
      { path: 'b.md', paths: ['b.md'], deleted: false, commits: ['5'] },
    ]);
  });

  test('starts a history for a file changed before the range', () => {
    const histories = buildHistories([commit('1', change('M', 'a.md'))]);
    expect(histories).toHaveLength(1);
    expect(histories[0].revisions[0].change.status).toBe('M');
  });
});

describe('formatSubject', () => {
  test.each([
    { subject: 'インストールの誤記を直す (#12)', expected: 'インストールの誤記を直す' },
    { subject: 'timeout を直す group/docs#45', expected: 'timeout を直す' },
    { subject: 'Fix typo !7', expected: 'Fix typo' },
    { subject: 'Fix typos (#1, #2)', expected: 'Fix typos' },
    { subject: 'Refs #3: update the guide', expected: 'Refs: update the guide' },
    { subject: 'Use C# 12 syntax', expected: 'Use C# 12 syntax' },
    { subject: 'Use C#7 features', expected: 'Use C#7 features' },
    { subject: 'Wow!1 is a word here', expected: 'Wow!1 is a word here' },
    { subject: '設定値を直す（#12）', expected: '設定値を直す' },
    { subject: '#99', expected: undefined },
  ])('strip-refs turns "$subject" into "$expected"', ({ subject, expected }) => {
    expect(formatSubject(subject, 'strip-refs', DEFAULT_ISSUE_REF_PATTERN)).toBe(expected);
  });

  test('full keeps the subject and none hides it', () => {
    expect(formatSubject('Fix (#1)', 'full', DEFAULT_ISSUE_REF_PATTERN)).toBe('Fix (#1)');
    expect(formatSubject('Fix (#1)', 'none', DEFAULT_ISSUE_REF_PATTERN)).toBeUndefined();
  });
});

describe('isFormatOnlyChange', () => {
  test.each([
    { before: 'A、B。\n', after: 'A、\nB。\n', expected: true, name: 'splitting a line' },
    { before: 'one two\nthree\n', after: 'one\ntwo three\n', expected: true, name: 'moving a line break' },
    { before: 'A。\n', after: 'B。\n', expected: false, name: 'changing text' },
    { before: 'A。\n', after: 'A。\n', expected: false, name: 'no change' },
  ])('$name', ({ before, after, expected }) => {
    expect(isFormatOnlyChange(before, after)).toBe(expected);
  });
});

describe('extractTitle', () => {
  test.each([
    { content: '---\ntitle: "設定"\n---\n\n# 見出し\n', expected: '設定' },
    { content: '---\nsidebar: false\n---\n\n# 見出し\n', expected: '見出し' },
    { content: 'Intro\n\n# Install #\n', expected: 'Install' },
    { content: 'No heading\n', expected: undefined },
  ])('reads $expected', ({ content, expected }) => {
    expect(extractTitle(content)).toBe(expected);
  });
});

describe('scope', () => {
  const layout: SiteLayout = {
    versions: ['v1', 'v2'],
    defaultVersion: 'v2',
    langs: ['ja', 'en'],
    defaultLang: 'ja',
  };

  test.each([
    { path: 'v1/en/guide/a.md', expected: { version: 'v1', lang: 'en' } },
    { path: 'v2/ja/index.md', expected: { version: 'v2', lang: 'ja' } },
    { path: 'images/a.png', expected: { version: 'v2', lang: 'ja' } },
  ])('scopeOfPath($path)', ({ path, expected }) => {
    expect(scopeOfPath(path, layout)).toEqual(expected);
  });

  test.each([
    { scope: { version: 'v2', lang: 'ja' }, expected: '/changes' },
    { scope: { version: 'v2', lang: 'en' }, expected: '/en/changes' },
    { scope: { version: 'v1', lang: 'en' }, expected: '/v1/en/changes' },
  ])('scopedRoutePath($scope.version, $scope.lang)', ({ scope, expected }) => {
    expect(scopedRoutePath(scope, layout, '/changes')).toBe(expected);
  });
});

describe('resolveOptions', () => {
  test('a global tag pattern gives the same answer on every call', () => {
    const { tagPattern } = resolveOptions({ tagPattern: /^v\d/g });
    expect([tagPattern?.test('v1.0'), tagPattern?.test('v1.0')]).toEqual([true, true]);
  });

  test('rejects an issue reference pattern without the global flag', () => {
    expect(() => resolveOptions({ issueRefPattern: /#\d+/ })).toThrow(/global/);
  });
});
