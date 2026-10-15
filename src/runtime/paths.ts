/** Directory of the data files, relative to the site base. */
export const DATA_DIR = '_git-diff';

/** Path of a page index, relative to `DATA_DIR`. */
export function pageIndexPath(routePath: string): string {
  let path = routePath.replace(/^\//, '');
  if (path === '' || path.endsWith('/')) {
    path += 'index';
  }
  return `pages/${path}.json`;
}

export function blobPath(hash: string): string {
  return `blobs/${hash}.txt`;
}

export function logIndexPath(scopeKey: string): string {
  return `log/${scopeKey}.json`;
}
