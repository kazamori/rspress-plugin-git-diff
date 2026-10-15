import type { PageIndex, PageRevision } from './types';

/** The two page versions to compare. A null blob means the page did not exist. */
export interface DiffTarget {
  from: string | null;
  to: string | null;
  /** Set when the query names a single commit. */
  revision?: PageRevision;
}

export type ResolveError =
  | { kind: 'syntax' }
  | { kind: 'not-found'; rev: string }
  | { kind: 'ambiguous'; rev: string; candidates: PageRevision[] };

export type ResolveResult =
  | { ok: true; target: DiffTarget }
  | { ok: false; error: ResolveError };

type RevResult =
  | { ok: true; blob: string | null; revision?: PageRevision }
  | { ok: false; error: ResolveError };

const HASH_PATTERN = /^[0-9a-f]{4,64}$/i;

/**
 * Resolves the `diff` query parameter against a page's history.
 * `<rev>` compares the page before and after that revision, and
 * `<from>..<to>` compares two versions; an empty `<to>` means HEAD.
 */
export function resolveDiffQuery(query: string, page: PageIndex): ResolveResult {
  const spec = query.trim();
  if (spec === '') {
    return { ok: false, error: { kind: 'syntax' } };
  }

  const separator = spec.indexOf('..');
  if (separator === -1) {
    return resolveSingle(spec, page);
  }

  const fromSpec = spec.slice(0, separator);
  const toSpec = spec.slice(separator + 2) || 'HEAD';
  if (fromSpec === '' || toSpec.includes('..')) {
    return { ok: false, error: { kind: 'syntax' } };
  }
  const from = resolveRev(fromSpec, page);
  if (!from.ok) {
    return from;
  }
  const to = resolveRev(toSpec, page);
  if (!to.ok) {
    return to;
  }
  return { ok: true, target: { from: from.blob, to: to.blob } };
}

function resolveSingle(spec: string, page: PageIndex): ResolveResult {
  const rev = resolveRev(spec, page);
  if (!rev.ok) {
    return rev;
  }
  // A tag or HEAD names a page version rather than a commit, so look up
  // the revision that produced that version.
  const revision =
    rev.revision ?? page.revisions.find((r) => rev.blob !== null && r.blob === rev.blob);
  if (!revision) {
    return { ok: false, error: { kind: 'not-found', rev: spec } };
  }
  return {
    ok: true,
    target: { from: revision.prevBlob, to: revision.blob, revision },
  };
}

function resolveRev(spec: string, page: PageIndex): RevResult {
  if (spec === 'HEAD') {
    const latest = page.revisions[0];
    if (!latest) {
      return { ok: false, error: { kind: 'not-found', rev: spec } };
    }
    return { ok: true, blob: latest.blob, revision: latest };
  }
  if (Object.hasOwn(page.tags, spec)) {
    return { ok: true, blob: page.tags[spec] ?? null };
  }
  if (!HASH_PATTERN.test(spec)) {
    return { ok: false, error: { kind: 'not-found', rev: spec } };
  }

  const prefix = spec.toLowerCase();
  const candidates = page.revisions.filter((r) => r.hash.startsWith(prefix));
  if (candidates.length === 0) {
    return { ok: false, error: { kind: 'not-found', rev: spec } };
  }
  if (candidates.length > 1) {
    return { ok: false, error: { kind: 'ambiguous', rev: spec, candidates } };
  }
  return { ok: true, blob: candidates[0].blob, revision: candidates[0] };
}
