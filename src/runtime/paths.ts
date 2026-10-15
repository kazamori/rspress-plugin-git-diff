/**
 * Directory of the data files, relative to the site base. It must not start
 * with an underscore: hosts that run Jekyll, such as GitHub Pages published
 * from a branch, drop those directories from the site.
 */
export const DATA_DIR = 'git-diff-data';

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
