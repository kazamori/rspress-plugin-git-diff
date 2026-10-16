import { describe, expect, test } from '@rstest/core';
import { createTwoFilesPatch } from 'diff';
import { countChangedLines } from '../src/runtime/patchLines';

describe('countChangedLines', () => {
  test.each([
    { before: 'a\nb\n', after: 'a\nc\n', expected: 2, name: 'a rewritten line counts as 2' },
    { before: 'a\n', after: 'a\nb\n', expected: 1, name: 'an added line' },
    { before: 'a\n---\nb\n', after: 'a\nb\n', expected: 1, name: 'a removed horizontal rule' },
    { before: 'a\n', after: 'a\n+++\n', expected: 1, name: 'an added line starting with +++' },
    { before: 'a\n', after: 'a\n', expected: 0, name: 'no change' },
  ])('$name', ({ before, after, expected }) => {
    const patch = createTwoFilesPatch('page.md', 'page.md', before, after);
    expect(countChangedLines(patch)).toBe(expected);
  });
});
