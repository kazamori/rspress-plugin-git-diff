import { describe, expect, test } from '@rstest/core';
import { annotatePage } from '../src/runtime/annotate';
import { markChanges, splitLines } from '../src/runtime/lineMap';
import { plainText } from '../src/runtime/textRange';

const PAGE = '/guide/page';

const text = (...lines: string[]) => `${lines.join('\n')}\n`;

/**
 * Builds a page the way Rspress renders it with this plugin: the blocks carry
 * their source lines and the route of `PAGE`.
 */
function render(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html.replaceAll('data-git-diff-lines=', `data-git-diff-page="${PAGE}" data-git-diff-lines=`);
  document.body.replaceChildren(root);
  return root;
}

function annotate(root: HTMLElement, from: string, to: string) {
  return annotatePage(root, PAGE, markChanges(from, to, to), splitLines(to));
}

describe('annotatePage', () => {
  test('marks the changed sentence inside a paragraph', () => {
    const from = text('# T', '', '最初の文。', '古い文。');
    const to = text('# T', '', '最初の文。', '新しい文。');
    const root = render('<h1 data-git-diff-lines="1-1">T</h1><p data-git-diff-lines="3-4">最初の文。\n新しい文。</p>');

    const result = annotate(root, from, to);

    expect(root.querySelector('mark.rp-git-diff-added-inline')?.textContent).toBe('新しい文。');
    expect(root.querySelector('del.rp-git-diff-deleted-inline')?.textContent).toBe('古い文。');
    expect(result.markers).toHaveLength(2);
    // The removed sentence and its replacement are one place to visit.
    expect(result.stops.map((stop) => stop.map((element) => element.tagName))).toEqual([['DEL', 'MARK']]);
    expect(result.unplaced).toBe(0);
  });

  test('marks a whole single-line block and puts removed lines before it', () => {
    const from = text('# T', '', 'Node.js 18 が要る。');
    const to = text('# T', '', 'Node.js 20 が要る。');
    const root = render('<h1 data-git-diff-lines="1-1">T</h1><p data-git-diff-lines="3-3">Node.js 20 が要る。</p>');

    annotate(root, from, to);

    const paragraph = root.querySelector('p');
    expect(paragraph?.classList.contains('rp-git-diff-added')).toBe(true);
    expect(paragraph?.previousElementSibling?.className).toBe('rp-git-diff-deleted');
    expect(paragraph?.previousElementSibling?.textContent).toBe('Node.js 18 が要る。');
  });

  test('marks code lines and inserts removed code lines', () => {
    const from = text('```sh', 'npm i a', 'npm i b', '```');
    const to = text('```sh', 'npm i a', 'npm i c', '```');
    const root = render(
      '<div data-git-diff-lines="1-4"><pre><code><span class="line">npm i a</span>\n<span class="line">npm i c</span></code></pre></div>',
    );

    annotate(root, from, to);

    const lines = root.querySelectorAll('code > span.line:not(.rp-git-diff-deleted-line)');
    expect(lines[1].classList.contains('rp-git-diff-added-line')).toBe(true);
    expect(root.querySelector('.rp-git-diff-deleted-line')?.textContent).toBe('npm i b');
  });

  test('shows a removed table row as a row with cells', () => {
    const from = text('| a | b |', '| --- | --- |', '| x | 1 |', '| y | 2 |');
    const to = text('| a | b |', '| --- | --- |', '| y | 2 |');
    const root = render(
      '<table><thead><tr data-git-diff-lines="1-1"><th>a</th><th>b</th></tr></thead>' +
        '<tbody><tr data-git-diff-lines="3-3"><td>y</td><td>2</td></tr></tbody></table>',
    );

    annotate(root, from, to);

    const removed = root.querySelector('tbody tr.rp-git-diff-deleted');
    expect([...(removed?.querySelectorAll('td') ?? [])].map((cell) => cell.textContent)).toEqual(['x', '1']);
  });

  test('keeps separate changes as separate stops', () => {
    const from = text('# A', '', 'one', '', 'two');
    const to = text('# B', '', 'one', '', 'three');
    const root = render(
      '<h1 data-git-diff-lines="1-1">B</h1><p data-git-diff-lines="3-3">one</p><p data-git-diff-lines="5-5">three</p>',
    );

    const result = annotate(root, from, to);

    expect(result.stops.map((stop) => stop.map((element) => element.textContent))).toEqual([
      ['# A', 'B'],
      ['two', 'three'],
    ]);
  });

  test('ignores the blocks of another page', () => {
    const from = text('old');
    const to = text('new');
    const root = render('<p data-git-diff-lines="1-1">new</p>');
    root.querySelector('p')?.setAttribute('data-git-diff-page', '/previous/page');

    const result = annotate(root, from, to);

    expect(result.markers).toHaveLength(0);
    expect(root.querySelector('[class^="rp-git-diff-"]')).toBeNull();
  });

  test('counts changes outside the rendered blocks and removes every mark', () => {
    const from = text('---', 'title: A', '---', '', 'Body.');
    const to = text('---', 'title: B', '---', '', 'Body!');
    const root = render('<p data-git-diff-lines="5-5">Body!</p>');
    const before = root.innerHTML;

    const result = annotate(root, from, to);
    expect(result.unplaced).toBe(2);

    result.remove();
    expect(root.innerHTML).toBe(before);
  });
});

describe('plainText', () => {
  test.each([
    { line: '- **強調**と[リンク](./a)', expected: '強調とリンク' },
    { line: '> `code` を使う', expected: 'code を使う' },
    { line: '1. 手順', expected: '手順' },
  ])('$line', ({ line, expected }) => {
    expect(plainText(line)).toBe(expected);
  });
});
