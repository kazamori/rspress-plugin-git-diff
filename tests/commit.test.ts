import { describe, expect, test } from '@rstest/core';
import { formatCommitDate, splitCommitDate } from '../src/runtime/commit';

describe('splitCommitDate', () => {
  test.each([
    { iso: '2026-09-11T14:05:33+09:00', expected: { date: '2026-09-11', time: '14:05', offset: '+09:00' } },
    { iso: '2026-09-11T05:05:33-07:00', expected: { date: '2026-09-11', time: '05:05', offset: '-07:00' } },
    { iso: '2026-09-11T05:05:33Z', expected: { date: '2026-09-11', time: '05:05', offset: '+00:00' } },
    { iso: 'not a date', expected: { date: 'not a date', time: '', offset: '' } },
  ])('$iso', ({ iso, expected }) => {
    expect(splitCommitDate(iso)).toEqual(expected);
  });
});

describe('formatCommitDate', () => {
  test('keeps the time zone of the commit', () => {
    expect(formatCommitDate('2026-09-11T14:05:33+09:00')).toBe('2026-09-11 14:05 +09:00');
  });
});
