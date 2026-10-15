import { describe, expect, test } from '@rstest/core';
import { groupChanges, markChanges } from '../src/runtime/lineMap';

const text = (...lines: string[]) => `${lines.join('\n')}\n`;

function marks(from: string, to: string, current: string) {
  const result = markChanges(from, to, current);
  return {
    added: [...result.added].sort((a, b) => a - b),
    later: [...result.later].sort((a, b) => a - b),
    deletions: result.deletions,
  };
}

describe('markChanges', () => {
  test('marks a replaced line as a deletion before the added line', () => {
    const from = text('a', 'b', 'c');
    const to = text('a', 'B', 'c');
    expect(marks(from, to, to)).toEqual({
      added: [2],
      later: [],
      deletions: [{ anchor: 2, lines: ['b'] }],
    });
  });

  test('anchors a deletion at the end past the last line', () => {
    const from = text('a', 'b');
    const to = text('a');
    expect(marks(from, to, to).deletions).toEqual([{ anchor: 2, lines: ['b'] }]);
  });

  test('follows added lines that later commits moved down', () => {
    const from = text('a', 'c');
    const to = text('a', 'b', 'c');
    const current = text('x', 'a', 'b', 'c');
    expect(marks(from, to, current)).toEqual({ added: [3], later: [], deletions: [] });
  });

  test('marks the replacement of an added line as later', () => {
    const from = text('a', 'c');
    const to = text('a', 'b', 'c');
    const current = text('a', 'B2', 'c');
    expect(marks(from, to, current)).toEqual({ added: [], later: [2], deletions: [] });
  });

  test('moves a deletion anchor past lines removed later', () => {
    const from = text('a', 'old', 'b', 'c');
    const to = text('a', 'b', 'c');
    const current = text('a', 'c');
    expect(marks(from, to, current).deletions).toEqual([{ anchor: 2, lines: ['old'] }]);
  });

  test('a page added by the change marks every line', () => {
    expect(marks('', text('a', 'b'), text('a', 'b')).added).toEqual([1, 2]);
  });
});

describe('groupChanges', () => {
  test.each([
    {
      name: 'a replacement is one change',
      marks: { added: [2], later: [], deletions: [{ anchor: 2, lines: ['b'] }] },
      expected: [[2]],
    },
    {
      name: 'added lines with a blank line between are one change',
      marks: { added: [9, 10, 11, 12], later: [], deletions: [] },
      expected: [[9, 10, 11, 12]],
    },
    {
      name: 'a deletion right after added lines joins them',
      marks: { added: [3], later: [], deletions: [{ anchor: 4, lines: ['x'] }] },
      expected: [[3, 4]],
    },
    {
      name: 'separate places stay separate',
      marks: { added: [2, 8], later: [5], deletions: [{ anchor: 12, lines: ['x'] }] },
      expected: [[2], [5], [8], [12]],
    },
  ])('$name', ({ marks, expected }) => {
    expect(groupChanges({ ...marks, added: new Set(marks.added), later: new Set(marks.later) })).toEqual(expected);
  });
});
