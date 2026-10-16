import type { PageIndex, PageRevision } from './types';

/** The URL parameter that opens the history of the page, as in `?history`. */
export const HISTORY_PARAM = 'history';

export interface PageHistoryList {
  /** Newest first, at most the limit; the revision that added the page is kept. */
  revisions: PageRevision[];
  /** Revisions beyond the limit. */
  omitted: number;
  /** Revisions that changed the page, without the one that added it. */
  changes: number;
  /** The newest revision listed, for the date of the last change. */
  latest: PageRevision | undefined;
}

/**
 * The revisions the history of a page lists. Hidden revisions are left out, as
 * on the recent changes page, except the one that added the page: without it,
 * a page that never changed would have an empty history.
 */
export function listPageHistory(index: PageIndex, max: number): PageHistoryList {
  const listed = index.revisions.filter((r) => !r.hidden || r.hidden === 'added');
  const revisions = listed.slice(0, Math.max(0, max));
  return {
    revisions,
    omitted: listed.length - revisions.length,
    changes: listed.filter((r) => !r.hidden).length,
    latest: listed[0],
  };
}

/** The search part of a URL with `?history` set, keeping the other parameters. */
export function withHistoryParam(search: string): string {
  const params = new URLSearchParams(search);
  params.delete(HISTORY_PARAM);
  const rest = params.toString();
  return `?${rest ? `${rest}&` : ''}${HISTORY_PARAM}`;
}

/** The search part of a URL without `?history`. */
export function withoutHistoryParam(search: string): string {
  const params = new URLSearchParams(search);
  params.delete(HISTORY_PARAM);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}
