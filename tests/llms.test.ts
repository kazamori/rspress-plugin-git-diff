import { describe, expect, test } from '@rstest/core';
import {
  changesMarkdown,
  rewriteLlmsFullTxt,
  rewriteLlmsTxt,
  routeMdFile,
} from '../src/node/llms';
import type { LogIndex } from '../src/runtime/types';

describe('routeMdFile', () => {
  test.each([
    { routePath: '/changes', expected: 'changes.md' },
    { routePath: '/2.0/ja/changes', expected: '2.0/ja/changes.md' },
    { routePath: '/guide/', expected: 'guide/index.md' },
  ])('$routePath', ({ routePath, expected }) => {
    expect(routeMdFile(routePath)).toBe(expected);
  });
});

describe('rewriteLlmsTxt', () => {
  const isChanges = (path: string) => path === '/docs/changes.md';

  test('removes the entry and the section it leaves empty', () => {
    const source = [
      '# Site',
      '',
      '## Guide',
      '',
      '- [Options](https://example.com/docs/guide/options.md): Pass options.',
      '',
      '## Recent changes',
      '',
      '- [Recent changes](https://example.com/docs/changes.md)',
      '',
      '## Others',
      '',
      '- [Publishing](https://example.com/docs/guide/publishing.md)',
    ].join('\n');
    expect(rewriteLlmsTxt(source, isChanges)).toBe(
      [
        '# Site',
        '',
        '## Guide',
        '',
        '- [Options](https://example.com/docs/guide/options.md): Pass options.',
        '',
        '## Others',
        '',
        '- [Publishing](https://example.com/docs/guide/publishing.md)',
      ].join('\n'),
    );
  });

  test('keeps the section when other entries remain', () => {
    const source = [
      '# Site',
      '',
      '## Others',
      '',
      '- [Recent changes](/docs/changes.md)',
      '- [Options](/docs/guide/options.md)',
    ].join('\n');
    expect(rewriteLlmsTxt(source, isChanges)).toBe(
      ['# Site', '', '## Others', '', '- [Options](/docs/guide/options.md)'].join('\n'),
    );
  });

  test('removes a last section without leaving blank lines', () => {
    const source = ['# Site', '', '## Others', '', '- [Recent changes](/docs/changes.md)'].join('\n');
    expect(rewriteLlmsTxt(source, isChanges)).toBe('# Site');
  });
});

describe('rewriteLlmsFullTxt', () => {
  const block = (url: string, content: string) => `---\nurl: ${url}\n---\n\n${content}\n\n\n`;
  const source =
    block('/guide/options.md', '# Options') +
    block('/changes.md', '# Recent changes\n\nLoading…') +
    block('/guide/publishing.md', '# Publishing');

  test('removes a page', () => {
    expect(
      rewriteLlmsFullTxt(source, (path) => (path === '/changes.md' ? null : undefined)),
    ).toBe(block('/guide/options.md', '# Options') + block('/guide/publishing.md', '# Publishing'));
  });

  test('replaces the content of a page', () => {
    expect(
      rewriteLlmsFullTxt(source, (path) => (path === '/changes.md' ? '# Recent changes\n\n- A\n' : undefined)),
    ).toBe(
      block('/guide/options.md', '# Options') +
        block('/changes.md', '# Recent changes\n\n- A') +
        block('/guide/publishing.md', '# Publishing'),
    );
  });
});

describe('changesMarkdown', () => {
  const log: LogIndex = {
    commits: [
      {
        hash: '0123456789abcdef',
        date: '2026-10-16T10:00:00+09:00',
        subject: 'Fix the options',
        changes: [
          {
            kind: 'page',
            status: 'modified',
            title: 'Options [beta]',
            routePath: '/guide/options',
            prevBlob: 'a',
            blob: 'b',
          },
          { kind: 'page', status: 'deleted', title: 'Old', routePath: null, prevBlob: null, blob: null },
          { kind: 'asset', status: 'modified', path: 'public/a.png' },
        ],
      },
    ],
  };

  test('lists the commits with links to the Markdown of the pages', () => {
    expect(changesMarkdown('最近の変更', log, 'ja', '/docs/')).toBe(
      [
        '# 最近の変更',
        '',
        '## 2026-10-16 10:00 +09:00 Fix the options',
        '',
        '`0123456`',
        '',
        '- [Options \\[beta\\]](/docs/guide/options.md)',
        '- Old (ページを削除しました)',
        '- `public/a.png` (ファイルを変更しました)',
        '',
      ].join('\n'),
    );
  });

  test('says so when there are no commits', () => {
    expect(changesMarkdown('Recent changes', { commits: [] }, 'en', '/')).toBe(
      '# Recent changes\n\nNo changes yet.\n',
    );
  });
});
