import { describe, expect, test } from '@rstest/core';
import { listPageHistory, withHistoryParam, withoutHistoryParam } from '../src/runtime/historyList';
import type { HiddenReason, PageIndex } from '../src/runtime/types';

const index = (...hidden: (HiddenReason | undefined)[]): PageIndex => ({
  routePath: '/guide/a',
  revisions: hidden.map((reason, i) => ({
    hash: `h${i}`,
    date: `2026-09-${String(30 - i).padStart(2, '0')}T10:00:00+09:00`,
    prevBlob: 'p',
    blob: 'b',
    hidden: reason,
  })),
  tags: {},
});

describe('listPageHistory', () => {
  test('leaves out hidden revisions but keeps the one that added the page', () => {
    const list = listPageHistory(index(undefined, 'format', 'renamed', undefined, 'added'), 20);
    expect(list.revisions.map((r) => r.hash)).toEqual(['h0', 'h3', 'h4']);
    expect(list.changes).toBe(2);
    expect(list.omitted).toBe(0);
    expect(list.latest?.hash).toBe('h0');
  });

  test('counts the revisions beyond the limit', () => {
    const list = listPageHistory(index(undefined, undefined, undefined, 'added'), 2);
    expect(list.revisions.map((r) => r.hash)).toEqual(['h0', 'h1']);
    expect(list.omitted).toBe(2);
    expect(list.changes).toBe(3);
  });

  test('lists only the addition of a page that never changed', () => {
    const list = listPageHistory(index('added'), 20);
    expect(list.revisions.map((r) => r.hidden)).toEqual(['added']);
    expect(list.changes).toBe(0);
  });

  test('lists nothing when every revision is hidden', () => {
    const list = listPageHistory(index('format', 'renamed'), 20);
    expect(list.revisions).toEqual([]);
    expect(list.latest).toBeUndefined();
  });
});

describe('history parameter', () => {
  test.each([
    { search: '', opened: '?history', closed: '' },
    { search: '?diff=abc', opened: '?diff=abc&history', closed: '?diff=abc' },
    { search: '?history', opened: '?history', closed: '' },
    { search: '?history&diff=abc', opened: '?diff=abc&history', closed: '?diff=abc' },
  ])('$search', ({ search, opened, closed }) => {
    expect(withHistoryParam(search)).toBe(opened);
    expect(withoutHistoryParam(search)).toBe(closed);
  });
});
