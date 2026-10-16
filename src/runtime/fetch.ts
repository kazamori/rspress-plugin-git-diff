import { withBase } from '@rspress/core/runtime';
import { blobPath, DATA_DIR, logIndexPath, pageIndexPath, tagIndexPath } from './paths';
import type { LogIndex, PageIndex, TagIndex } from './types';

const cache = new Map<string, Promise<unknown>>();

export class NotFoundError extends Error {}

function load<T>(relative: string, parse: (response: Response) => Promise<T>): Promise<T> {
  const url = withBase(`/${DATA_DIR}/${relative}`);
  let pending = cache.get(url) as Promise<T> | undefined;
  if (!pending) {
    pending = fetch(encodeURI(url)).then((response) => {
      if (response.status === 404) {
        throw new NotFoundError(url);
      }
      if (!response.ok) {
        throw new Error(`${url}: ${response.status}`);
      }
      return parse(response);
    });
    // Drop failures so that a later attempt can retry.
    pending.catch(() => cache.delete(url));
    cache.set(url, pending);
  }
  return pending;
}

function loadJson<T>(relative: string): Promise<T> {
  return load(relative, (response) => response.json() as Promise<T>);
}

/** Loads the history of a page; rejects with `NotFoundError` when it has none. */
export function loadPageIndex(routePath: string): Promise<PageIndex> {
  return loadJson(pageIndexPath(routePath));
}

/** Loads the names of every tag written; empty when the list cannot be read. */
export function loadTagNames(): Promise<Set<string>> {
  return loadJson<TagIndex>(tagIndexPath()).then(
    (index) => new Set(index.tags),
    () => new Set(),
  );
}

/** Loads the recent changes of one version and language. */
export function loadLogIndex(scopeKey: string): Promise<LogIndex> {
  return loadJson(logIndexPath(scopeKey));
}

/** Loads a blob; a null hash stands for a missing file and yields an empty string. */
export function loadBlob(hash: string | null): Promise<string> {
  if (hash === null) {
    return Promise.resolve('');
  }
  return load(blobPath(hash), (response) => response.text());
}
