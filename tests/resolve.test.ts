import { describe, expect, test } from '@rstest/core';
import { resolveDiffQuery } from '../src/runtime/resolve';
import type { PageIndex, PageRevision } from '../src/runtime/types';

function revision(hash: string, prevBlob: string | null, blob: string): PageRevision {
  return { hash, date: '2026-09-01T00:00:00+09:00', prevBlob, blob };
}

const page: PageIndex = {
  routePath: '/guide/install',
  revisions: [
    revision('cccc3333', 'blob-b', 'blob-c'),
    revision('bbbb2222', 'blob-a', 'blob-b'),
    revision('bbbb1111', null, 'blob-a'),
  ],
  tags: { 'v1.0': 'blob-b' },
};
// v0.1 is a tag from before the page existed, so the page index leaves it out.
const tagNames = new Set(['v1.0', 'v0.1']);

describe('resolveDiffQuery', () => {
  test.each([
    { query: 'cccc3333', from: 'blob-b', to: 'blob-c', name: 'a full hash compares with the previous version' },
    { query: 'cccc', from: 'blob-b', to: 'blob-c', name: 'a short hash resolves by prefix' },
    { query: 'CCCC', from: 'blob-b', to: 'blob-c', name: 'hashes are case-insensitive' },
    { query: 'bbbb1111', from: null, to: 'blob-a', name: 'the commit that added the page compares with nothing' },
    { query: 'HEAD', from: 'blob-b', to: 'blob-c', name: 'HEAD alone is the latest revision' },
    { query: 'v1.0', from: 'blob-a', to: 'blob-b', name: 'a tag alone is the revision that produced its version' },
    { query: 'v1.0..HEAD', from: 'blob-b', to: 'blob-c', name: 'a range compares the two versions' },
    { query: 'v1.0..', from: 'blob-b', to: 'blob-c', name: 'an empty end of a range means HEAD' },
    { query: 'v0.1..bbbb2222', from: null, to: 'blob-b', name: 'a tag without the page compares with nothing' },
    { query: 'bbbb2222..v1.0', from: 'blob-b', to: 'blob-b', name: 'a range without changes has equal ends' },
  ])('$name', ({ query, from, to }) => {
    const result = resolveDiffQuery(query, page, tagNames);
    expect(result.ok && result.target).toMatchObject({ from, to });
  });

  test.each([
    { query: '', error: { kind: 'syntax' }, name: 'an empty query' },
    { query: '..HEAD', error: { kind: 'syntax' }, name: 'a range without a start' },
    { query: 'a..b..c', error: { kind: 'syntax' }, name: 'a range with three ends' },
    { query: 'dddd', error: { kind: 'not-found', rev: 'dddd' }, name: 'a hash outside the history' },
    { query: 'abc', error: { kind: 'not-found', rev: 'abc' }, name: 'a hash shorter than four characters' },
    { query: 'v9.9..HEAD', error: { kind: 'not-found', rev: 'v9.9' }, name: 'an unknown tag' },
    { query: 'bbbb', error: { kind: 'ambiguous', rev: 'bbbb' }, name: 'a prefix of two hashes' },
  ])('rejects $name', ({ query, error }) => {
    const result = resolveDiffQuery(query, page, tagNames);
    expect(!result.ok && result.error).toMatchObject(error);
  });
});
