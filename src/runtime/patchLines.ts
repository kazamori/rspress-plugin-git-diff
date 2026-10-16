// Kept apart from render.ts, which imports the CSS of diff2html, so that tests
// in Node can import it.

/** Added and removed lines of a patch; a removed line such as `---` counts too. */
export function countChangedLines(patch: string): number {
  let count = 0;
  // The file headers (`---` and `+++`) come before the first hunk.
  let inHunk = false;
  for (const line of patch.split('\n')) {
    if (line.startsWith('@@')) {
      inHunk = true;
    } else if (inHunk && (line.startsWith('+') || line.startsWith('-'))) {
      count++;
    }
  }
  return count;
}
